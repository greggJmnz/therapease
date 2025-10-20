#!/bin/bash

echo "🔧 Fixing Port Binding Issue..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Check what's actually listening on ports
echo "[INFO] Checking what's listening on ports..."
ss -tlnp | grep -E ":(5000|3000|8000)" || echo "No services found on these ports"

# 2. Check the server configuration
echo "[INFO] Checking server configuration..."
cd server
grep -n "PORT\|listen\|server.listen" index.js

# 3. Check environment variables
echo "[INFO] Checking environment variables..."
if [ -f ".env.production" ]; then
    echo "Production environment file:"
    grep -E "PORT|HOST|NODE_ENV" .env.production
else
    echo "No .env.production file found"
fi

# 4. Check if the server is actually starting
echo "[INFO] Checking if server is actually starting..."
cd /root/therapease/therapease/server

# Try to start the server manually to see what happens
echo "[INFO] Starting server manually to see what happens..."
timeout 10s node index.js &
SERVER_PID=$!
sleep 3

# Check if the server process is running
if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server process is running on PID $SERVER_PID"
    
    # Check what port it's listening on
    echo "[INFO] Checking what port the server is listening on..."
    ss -tlnp | grep $SERVER_PID || echo "Server not listening on any port"
    
    # Test the endpoint
    echo "[INFO] Testing endpoint with manual server..."
    curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status
    echo " - Maintenance status response"
    
    # Kill the manual server
    kill $SERVER_PID
    echo "Manual server stopped"
else
    echo "❌ Server process failed to start"
fi

# 5. Check PM2 configuration
echo "[INFO] Checking PM2 configuration..."
cat ecosystem.config.js

# 6. Stop and restart PM2 with explicit port
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all
/usr/bin/pm2 delete all

# 7. Start the server with explicit environment variables
echo "[INFO] Starting server with explicit environment variables..."
cd /root/therapease/therapease/server
PORT=5000 HOST=0.0.0.0 NODE_ENV=production node index.js &
SERVER_PID=$!
sleep 5

# Check if it's listening
echo "[INFO] Checking if server is listening after explicit start..."
ss -tlnp | grep :5000

if ss -tlnp | grep :5000 > /dev/null; then
    echo "✅ Server is now listening on port 5000"
    
    # Test the endpoints
    echo "[INFO] Testing endpoints..."
    MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
    echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"
    
    LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
    echo "Login endpoint: HTTP $LOGIN_RESPONSE"
    
    # Kill the manual server
    kill $SERVER_PID
    echo "Manual server stopped"
    
    # 8. Start PM2 with the working configuration
    echo "[INFO] Starting PM2 with working configuration..."
    PORT=5000 HOST=0.0.0.0 NODE_ENV=production /usr/bin/pm2 start index.js --name therapease-api
    
    sleep 3
    
    # Test PM2 server
    echo "[INFO] Testing PM2 server..."
    MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
    echo "PM2 Maintenance status: HTTP $MAINTENANCE_RESPONSE"
    
    LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
    echo "PM2 Login endpoint: HTTP $LOGIN_RESPONSE"
    
else
    echo "❌ Server still not listening on port 5000"
    kill $SERVER_PID 2>/dev/null
fi

# 9. Test external API
echo "[INFO] Testing external API..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login endpoint: HTTP $EXTERNAL_LOGIN_RESPONSE"

# 10. Show final PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

echo "[INFO] Port binding fix complete!"
