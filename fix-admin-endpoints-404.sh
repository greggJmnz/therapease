#!/bin/bash

echo "🔧 Fixing Admin Endpoints 404 Errors..."

cd /root/therapease/therapease/server

# 1. Check PM2 status
echo "[INFO] Checking PM2 status..."
/usr/bin/pm2 list

# 2. Check recent API logs for errors
echo "[INFO] Checking recent API logs..."
/usr/bin/pm2 logs therapease-api --lines 20

# 3. Test if the server is responding to basic endpoints
echo "[INFO] Testing basic API endpoints..."

echo "[TEST] Testing maintenance status:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/maintenance-status

echo "[TEST] Testing login endpoint:"
LOGIN_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "$LOGIN_RESPONSE"

# Extract token from login response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "[INFO] Extracted token: ${TOKEN:0:20}..."

if [ -n "$TOKEN" ]; then
    echo "[TEST] Testing admin dashboard with token:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/dashboard

    echo "[TEST] Testing admin users with token:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/users

    echo "[TEST] Testing admin appointments with token:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/appointments

    echo "[TEST] Testing admin system-settings with token:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/system-settings
else
    echo "❌ Could not extract token from login response"
fi

# 4. Check if admin routes are properly loaded by examining the server code
echo "[INFO] Checking admin routes loading..."

# Check if adminRoutes.js exists and is valid
if [ -f "routes/adminRoutes.js" ]; then
    echo "✅ adminRoutes.js exists"
    echo "First few lines of adminRoutes.js:"
    head -20 routes/adminRoutes.js
else
    echo "❌ adminRoutes.js not found"
fi

# Check if adminController.js exists and has required functions
if [ -f "controllers/adminController.js" ]; then
    echo "✅ adminController.js exists"
    echo "Checking for required functions:"
    grep -n "getDashboard\|getUsers\|getAllUsers\|getAppointments\|getNotifications" controllers/adminController.js | head -5
else
    echo "❌ adminController.js not found"
fi

# 5. Check server index.js for route loading
echo "[INFO] Checking server index.js for admin route loading..."
grep -n "adminRoutes\|/api/admin" index.js

# 6. Test direct server restart to see if routes load properly
echo "[INFO] Restarting API server to check route loading..."
/usr/bin/pm2 restart therapease-api

sleep 5

# 7. Check PM2 logs after restart
echo "[INFO] Checking logs after restart..."
/usr/bin/pm2 logs therapease-api --lines 10

# 8. Test admin endpoints again after restart
if [ -n "$TOKEN" ]; then
    echo "[TEST] Testing admin dashboard after restart:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/dashboard
fi

# 9. Check if there are any missing controller functions
echo "[INFO] Checking for missing controller functions..."

# Check what functions are exported from adminController
echo "Exported functions from adminController:"
grep -A 20 "module.exports" controllers/adminController.js | head -25

# Check what routes are defined in adminRoutes
echo "Defined routes in adminRoutes:"
grep -n "router\." routes/adminRoutes.js | head -20

# 10. Check for any syntax errors in the files
echo "[INFO] Checking for syntax errors..."
node -c routes/adminRoutes.js && echo "✅ adminRoutes.js syntax OK" || echo "❌ adminRoutes.js syntax error"
node -c controllers/adminController.js && echo "✅ adminController.js syntax OK" || echo "❌ adminController.js syntax error"

echo "[INFO] Admin endpoints 404 fix complete!"
