#!/bin/bash

echo "🔧 Fixing API Server Connection Issues..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Check PM2 status and logs
echo "[INFO] Checking PM2 status..."
/usr/bin/pm2 list

echo "[INFO] Checking PM2 logs for therapease-api..."
/usr/bin/pm2 logs therapease-api --lines 20

# 2. Check what's running on port 5000
echo "[INFO] Checking what's running on port 5000..."
netstat -tlnp | grep :5000 || echo "Nothing running on port 5000"

# 3. Check if the server is running on a different port
echo "[INFO] Checking for Node.js processes..."
ps aux | grep node | grep -v grep

# 4. Check the ecosystem config
echo "[INFO] Checking ecosystem config..."
cat server/ecosystem.config.js

# 5. Check the server index.js for port configuration
echo "[INFO] Checking server port configuration..."
grep -n "PORT\|listen" server/index.js

# 6. Check environment variables
echo "[INFO] Checking environment variables..."
cd server
if [ -f ".env.production" ]; then
    echo "Production environment file found:"
    grep -E "PORT|HOST|NODE_ENV" .env.production
else
    echo "No .env.production file found"
fi

# 7. Try to start the server manually to see errors
echo "[INFO] Trying to start server manually to see errors..."
cd /root/therapease/therapease/server
node index.js &
SERVER_PID=$!
sleep 3

# Check if server started
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server started manually on PID $SERVER_PID"
    
    # Test the endpoint
    echo "[INFO] Testing endpoint with manual server..."
    curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status
    echo " - Maintenance status response"
    
    # Kill the manual server
    kill $SERVER_PID
    echo "Manual server stopped"
else
    echo "❌ Failed to start server manually"
fi

# 8. Fix PM2 configuration and restart
echo "[INFO] Fixing PM2 configuration..."

# Stop all PM2 processes
/usr/bin/pm2 stop all
/usr/bin/pm2 delete all

# Create a proper ecosystem config
cat > server/ecosystem.config.js << 'EOF'
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
      time: true
    }
  ]
};
EOF

# Create logs directory
mkdir -p /root/therapease/logs

# Start PM2 with the new config
echo "[INFO] Starting PM2 with new configuration..."
cd /root/therapease/therapease/server
/usr/bin/pm2 start ecosystem.config.js

# Wait for server to start
sleep 5

# 9. Test the endpoints
echo "[INFO] Testing endpoints after fix..."

# Test maintenance status
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"

# Test therapists endpoint
THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/therapists)
echo "Therapists endpoint: HTTP $THERAPISTS_RESPONSE"

# Test patients endpoint
PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/patients)
echo "Patients endpoint: HTTP $PATIENTS_RESPONSE"

# Test notifications endpoint
NOTIFICATIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/notifications)
echo "Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"

# 10. Test external API
echo "[INFO] Testing external API..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/admin/therapists)
echo "External therapists: HTTP $EXTERNAL_THERAPISTS_RESPONSE"

# 11. Show final PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

echo "[INFO] API server connection fix complete!"
