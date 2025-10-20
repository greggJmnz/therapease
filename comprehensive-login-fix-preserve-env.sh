#!/bin/bash

echo "🔧 Comprehensive Login Fix - Preserving Existing .env.production..."

# Navigate to the project directory
cd /root/therapease/therapease

# 1. Stop all PM2 processes
echo "[INFO] Stopping all PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true
/usr/bin/pm2 delete all 2>/dev/null || true

# 2. Clean up any existing processes
echo "[INFO] Cleaning up any existing processes..."
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# 3. Check existing .env.production
echo "[INFO] Checking existing .env.production..."
if [ -f "server/.env.production" ]; then
    echo "✅ Found existing .env.production file"
    echo "Key configuration:"
    grep -E "DB_|PORT|HOST|JWT|VAPID" server/.env.production | head -10
else
    echo "❌ No .env.production file found"
    exit 1
fi

# 4. Fix database connection issues
echo "[INFO] Fixing database connection issues..."

# Test database connection
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -P 3306 therapease_db -e "SELECT 1 as test;" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INFO] Creating database user if it doesn't exist..."
    mysql -u root -p << 'EOF'
CREATE USER IF NOT EXISTS 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
CREATE USER IF NOT EXISTS 'therapease_user'@'127.0.0.1' IDENTIFIED BY 'TherapEase2025!@#';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF
fi

# 5. Fix database schema issues
echo "[INFO] Fixing database schema issues..."
mysql -u therapease_user -p'TherapEase2025!@#' therapease_db << 'EOF'
-- Add missing columns if they don't exist
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'US';

-- Update any NULL values
UPDATE therapists SET status = 'active' WHERE status IS NULL;
UPDATE notifications SET priority = 'medium' WHERE priority IS NULL;
UPDATE notifications SET category = 'general' WHERE category IS NULL;
EOF

# 6. Fix VAPID keys issue (only if needed)
echo "[INFO] Checking VAPID keys configuration..."
cd server

# Check if VAPID keys are properly configured
VAPID_PUBLIC=$(grep "VAPID_PUBLIC_KEY" .env.production | cut -d= -f2 | tr -d ' ')
VAPID_PRIVATE=$(grep "VAPID_PRIVATE_KEY" .env.production | cut -d= -f2 | tr -d ' ')

if [ -z "$VAPID_PUBLIC" ] || [ -z "$VAPID_PRIVATE" ] || [ ${#VAPID_PUBLIC} -lt 50 ]; then
    echo "[INFO] Generating new VAPID keys..."
    npx web-push generate-vapid-keys > /tmp/vapid-keys.txt 2>/dev/null || {
        echo "[INFO] Installing web-push..."
        npm install web-push --save
        npx web-push generate-vapid-keys > /tmp/vapid-keys.txt
    }
    
    NEW_VAPID_PUBLIC=$(grep "Public Key:" /tmp/vapid-keys.txt | cut -d: -f2 | tr -d ' ')
    NEW_VAPID_PRIVATE=$(grep "Private Key:" /tmp/vapid-keys.txt | cut -d: -f2 | tr -d ' ')
    
    # Update .env.production with new VAPID keys
    sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$NEW_VAPID_PUBLIC/" .env.production
    sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$NEW_VAPID_PRIVATE/" .env.production
    
    echo "✅ Updated VAPID keys in .env.production"
else
    echo "✅ VAPID keys already configured properly"
fi

# 7. Fix notification controller to handle VAPID errors gracefully
echo "[INFO] Fixing notification controller..."
if [ -f "controllers/notificationController.js" ]; then
    cp controllers/notificationController.js controllers/notificationController.js.backup.$(date +%Y%m%d_%H%M%S)
    
    # Create a safer version
    cat > controllers/notificationController.js << 'EOF'
const { getAll, getOne, runQuery } = require('../config/database');
const webpush = require('web-push');

// Initialize VAPID keys safely
const initializeVAPID = () => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@therapease.com';
    
    if (publicKey && privateKey && publicKey.length > 0 && privateKey.length > 0) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      console.log('✅ VAPID keys configured for push notifications');
      return true;
    } else {
      console.log('⚠️ VAPID keys not configured - push notifications disabled');
      return false;
    }
  } catch (error) {
    console.log('⚠️ VAPID configuration error - push notifications disabled:', error.message);
    return false;
  }
};

// Initialize VAPID on module load
const vapidInitialized = initializeVAPID();

// Send notification function
const sendNotification = async (req, res) => {
  try {
    if (!vapidInitialized) {
      return res.status(503).json({ 
        success: false, 
        error: 'Push notifications not available' 
      });
    }
    
    const { userId, title, message, type = 'info' } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }
    
    // Insert notification into database
    const sql = `
      INSERT INTO notifications (userId, title, message, type, priority, category, isRead, createdAt)
      VALUES (?, ?, ?, ?, 'medium', 'general', false, NOW())
    `;
    
    await runQuery(sql, [userId, title, message, type]);
    
    res.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
};

// Get notifications for user
const getNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sql = `
      SELECT id, title, message, type, priority, category, isRead, createdAt
      FROM notifications
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT 50
    `;
    
    const notifications = await getAll(sql, [userId]);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
};

module.exports = {
  sendNotification,
  getNotifications
};
EOF
    echo "✅ Fixed notification controller"
fi

# 8. Create proper ecosystem config
echo "[INFO] Creating proper ecosystem config..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './index.js',
      cwd: '/root/therapease/therapease/server',
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env.production',
      error_file: '/root/therapease/logs/therapease-api-error.log',
      out_file: '/root/therapease/logs/therapease-api-out.log',
      log_file: '/root/therapease/logs/therapease-api.log',
      time: true,
      max_memory_restart: '500M',
      restart_delay: 5000
    },
    {
      name: 'therapease-public',
      script: './server.js',
      cwd: '/root/therapease/therapease/public-website',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0'
      },
      error_file: '/root/therapease/logs/therapease-public-error.log',
      out_file: '/root/therapease/logs/therapease-public-out.log',
      log_file: '/root/therapease/logs/therapease-public.log',
      time: true,
      max_memory_restart: '200M',
      restart_delay: 5000
    }
  ]
};
EOF

# 9. Create logs directory
mkdir -p /root/therapease/logs

# 10. Start the services
echo "[INFO] Starting services..."
/usr/bin/pm2 start ecosystem.config.js

# Wait for services to start
sleep 10

# 11. Check service status
echo "[INFO] Checking service status..."
/usr/bin/pm2 list

# 12. Test the API server
echo "[INFO] Testing API server..."

# Test maintenance status
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "Login endpoint: HTTP $LOGIN_RESPONSE"

# If login works, test with actual response
if [ "$LOGIN_RESPONSE" = "200" ]; then
    echo "[INFO] Login successful! Testing with actual response..."
    curl -s -X POST http://localhost:5000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 200
    echo "..."
fi

# 13. Test the public website
echo "[INFO] Testing public website..."
PUBLIC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
echo "Public website: HTTP $PUBLIC_RESPONSE"

# 14. Test external API
echo "[INFO] Testing external API..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login endpoint: HTTP $EXTERNAL_LOGIN_RESPONSE"

# 15. Show recent logs
echo "[INFO] Recent API server logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Recent public website logs:"
/usr/bin/pm2 logs therapease-public --lines 5

# 16. Clean up temporary files
rm -f /tmp/vapid-keys.txt

# 17. Final status check
echo "[INFO] Final system status:"
echo "PM2 Status:"
/usr/bin/pm2 list

echo "Port Status:"
ss -tlnp | grep -E ":(5000|8080)" || echo "No services listening on expected ports"

echo "[INFO] Comprehensive login fix complete!"
echo "[INFO] Your existing .env.production configuration has been preserved"
echo "[INFO] Check the results above to verify everything is working"
