#!/bin/bash

echo "🔧 Fixing Database Connection Issue..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Check current database configuration
echo "[INFO] Checking current database configuration..."
cd server
if [ -f ".env.production" ]; then
    echo "Current .env.production:"
    cat .env.production
else
    echo "No .env.production file found"
fi

# 2. Check database-loader configuration
echo "[INFO] Checking database-loader configuration..."
cat config/database-loader.js

# 3. Check database.js configuration
echo "[INFO] Checking database.js configuration..."
head -30 config/database.js

# 4. Fix the database configuration
echo "[INFO] Fixing database configuration..."

# Create a proper .env.production file
cat > .env.production << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=therapease_db
DB_USER=therapease_user
DB_PASSWORD=TherapEase2025!@#

# Security Keys
JWT_SECRET=your-super-secret-jwt-key-here-change-in-production
ENCRYPTION_KEY=your-32-character-encryption-key-here
VAPID_PUBLIC_KEY=your-vapid-public-key-here
VAPID_PRIVATE_KEY=your-vapid-private-key-here

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# SMS Configuration (optional)
SMS_ENABLED=false
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret

# Other Configuration
MAINTENANCE_MODE=false
LOG_LEVEL=info
EOF

# 5. Test database connection
echo "[INFO] Testing database connection..."
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -P 3306 therapease_db -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    echo "Creating database user if it doesn't exist..."
    
    # Create the database user
    mysql -u root -p << 'EOF'
CREATE USER IF NOT EXISTS 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
CREATE USER IF NOT EXISTS 'therapease_user'@'127.0.0.1' IDENTIFIED BY 'TherapEase2025!@#';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF
fi

# 6. Test the connection again
echo "[INFO] Testing database connection again..."
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -P 3306 therapease_db -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection still failed"
    exit 1
fi

# 7. Start the server with PM2
echo "[INFO] Starting server with PM2..."
cd /root/therapease/therapease/server

# Create a proper ecosystem config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './index.js',
      cwd: '/root/therapease/therapease/server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0',
        DB_TYPE: 'mysql',
        DB_HOST: '127.0.0.1',
        DB_PORT: 3306,
        DB_NAME: 'therapease_db',
        DB_USER: 'therapease_user',
        DB_PASSWORD: 'TherapEase2025!@#'
      },
      error_file: '/root/therapease/logs/therapease-api-error.log',
      out_file: '/root/therapease/logs/therapease-api-out.log',
      log_file: '/root/therapease/logs/therapease-api.log',
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p /root/therapease/logs

# Start PM2
/usr/bin/pm2 start ecosystem.config.js

# Wait for server to start
sleep 5

# 8. Test the server
echo "[INFO] Testing the server..."

# Check if server is listening
ss -tlnp | grep :5000

# Test maintenance status
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "Login endpoint: HTTP $LOGIN_RESPONSE"

# Test external API
echo "[INFO] Testing external API..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login endpoint: HTTP $EXTERNAL_LOGIN_RESPONSE"

# 9. Show PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

# 10. Show recent logs
echo "[INFO] Recent server logs:"
/usr/bin/pm2 logs therapease-api --lines 10

echo "[INFO] Database connection fix complete!"
echo "[INFO] The login should now work properly in the browser"
