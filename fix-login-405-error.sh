#!/bin/bash

echo "🔧 Fixing Login 405 Error..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Check if API server is running
echo "[INFO] Checking if API server is running..."
/usr/bin/pm2 list

# 2. Check what's listening on port 5000
echo "[INFO] Checking what's listening on port 5000..."
netstat -tlnp | grep :5000 || echo "Nothing listening on port 5000"

# 3. Check PM2 logs for errors
echo "[INFO] Checking PM2 logs for errors..."
/usr/bin/pm2 logs therapease-api --lines 20

# 4. Test the API server directly
echo "[INFO] Testing API server directly..."
curl -v http://localhost:5000/api/maintenance-status 2>&1 | head -10

# 5. Test the login endpoint
echo "[INFO] Testing login endpoint..."
curl -v -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' 2>&1 | head -10

# 6. Check if the server is responding to external requests
echo "[INFO] Testing external API access..."
curl -v https://api.therapease.site/api/maintenance-status 2>&1 | head -10

# 7. Check Nginx configuration
echo "[INFO] Checking Nginx configuration..."
nginx -t

# 8. Check if the server files exist and are correct
echo "[INFO] Checking server files..."
ls -la /root/therapease/therapease/server/
ls -la /root/therapease/therapease/server/routes/

# 9. Check the auth routes file
echo "[INFO] Checking auth routes file..."
if [ -f "/root/therapease/therapease/server/routes/authRoutes.js" ]; then
    echo "Auth routes file exists"
    head -20 /root/therapease/therapease/server/routes/authRoutes.js
else
    echo "❌ Auth routes file missing!"
fi

# 10. Check the main server file
echo "[INFO] Checking main server file..."
if [ -f "/root/therapease/therapease/server/index.js" ]; then
    echo "Main server file exists"
    grep -n "authRoutes\|app.use" /root/therapease/therapease/server/index.js
else
    echo "❌ Main server file missing!"
fi

# 11. Try to restart the API server
echo "[INFO] Restarting API server..."
/usr/bin/pm2 restart therapease-api
sleep 5

# 12. Test again after restart
echo "[INFO] Testing after restart..."
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status after restart: HTTP $MAINTENANCE_RESPONSE"

LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "Login endpoint after restart: HTTP $LOGIN_RESPONSE"

# 13. Test external API after restart
echo "[INFO] Testing external API after restart..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login endpoint: HTTP $EXTERNAL_LOGIN_RESPONSE"

# 14. Show final PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

echo "[INFO] Login 405 error fix complete!"
echo "[INFO] Check the results above to see what's causing the issue"
