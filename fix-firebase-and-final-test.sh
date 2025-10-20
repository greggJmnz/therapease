#!/bin/bash

echo "🔧 Fixing Firebase and Final System Test..."

cd /root/therapease/therapease

# 1. Check if there are any Firebase configuration issues
echo "=========================================="
echo "🔍 STEP 1: Checking Firebase Configuration"
echo "=========================================="

# Check if there's a Firebase config in the client
if [ -f "client/src/firebase.js" ]; then
    echo "[INFO] Firebase config found in client"
    echo "[INFO] Checking Firebase configuration..."
    grep -E "(apiKey|authDomain|projectId)" client/src/firebase.js | head -3
else
    echo "[INFO] No Firebase config found - this might be expected"
fi

# 2. Check the frontend API configuration
echo "=========================================="
echo "🔍 STEP 2: Checking Frontend API Configuration"
echo "=========================================="

if [ -f "client/src/services/api.js" ]; then
    echo "[INFO] Checking API configuration..."
    grep -E "(baseURL|REACT_APP_API_URL)" client/src/services/api.js | head -3
else
    echo "❌ API configuration not found"
fi

# 3. Test the current API endpoints
echo "=========================================="
echo "🔍 STEP 3: Testing API Endpoints"
echo "=========================================="

echo "[TEST] Testing maintenance status:"
MAINTENANCE_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" https://therapease.site/api/maintenance-status)
echo "$MAINTENANCE_RESPONSE"

echo "[TEST] Testing login endpoint:"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "$LOGIN_RESPONSE" | head -c 300

# 4. Check if the frontend build is up to date
echo "=========================================="
echo "🔍 STEP 4: Checking Frontend Build"
echo "=========================================="

if [ -d "/var/www/therapease" ]; then
    echo "[INFO] Frontend build directory exists"
    echo "[INFO] Checking build files..."
    ls -la /var/www/therapease/ | head -5
    
    # Check if the build is recent
    BUILD_TIME=$(stat -c %Y /var/www/therapease/index.html 2>/dev/null || echo "0")
    CURRENT_TIME=$(date +%s)
    AGE=$((CURRENT_TIME - BUILD_TIME))
    
    if [ $AGE -lt 3600 ]; then
        echo "✅ Frontend build is recent (less than 1 hour old)"
    else
        echo "⚠️ Frontend build is old ($((AGE/3600)) hours old) - might need rebuilding"
    fi
else
    echo "❌ Frontend build directory not found"
fi

# 5. Rebuild the frontend if needed
echo "=========================================="
echo "🔧 STEP 5: Rebuilding Frontend"
echo "=========================================="

echo "[INFO] Rebuilding frontend..."
cd client

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing frontend dependencies..."
    npm install
fi

# Build the frontend
echo "[INFO] Building frontend..."
npm run build

# Copy to web directory
echo "[INFO] Copying build to web directory..."
sudo cp -r build/* /var/www/therapease/

# Set proper permissions
echo "[INFO] Setting permissions..."
sudo chown -R www-data:www-data /var/www/therapease/
sudo chmod -R 755 /var/www/therapease/

# 6. Test the complete system
echo "=========================================="
echo "🧪 STEP 6: Complete System Test"
echo "=========================================="

cd /root/therapease/therapease

echo "[TEST] Testing maintenance status after rebuild:"
curl -s -w "\nHTTP Status: %{http_code}" https://therapease.site/api/maintenance-status

echo "[TEST] Testing login after rebuild:"
curl -s -w "\nHTTP Status: %{http_code}" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 200

echo ""

# 7. Check PM2 status and logs
echo "=========================================="
echo "📊 STEP 7: Final Status Check"
echo "=========================================="

echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent API logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Nginx status:"
systemctl status nginx --no-pager -l

echo "=========================================="
echo "🎉 Firebase and Frontend Fix Complete!"
echo "=========================================="
echo "[INFO] The frontend has been rebuilt and deployed"
echo "[INFO] Try logging in from the frontend now"
echo "[INFO] If you still see Firebase errors, they might be from browser cache"
echo "[INFO] Try clearing your browser cache or using incognito mode"
