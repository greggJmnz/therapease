#!/bin/bash

echo "🔧 Fixing getRow Error - Database Function Mismatch..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Check the current index.js file
echo "[INFO] Checking current index.js for getRow usage..."
grep -n "getRow" index.js || echo "No getRow found"

# 3. Fix the database function calls in index.js
echo "[INFO] Fixing getRow to getOne in index.js..."
sed -i 's/getRow/getOne/g' index.js

# 4. Check if there are any other database function mismatches
echo "[INFO] Checking for other database function mismatches..."
grep -n -E "(getAll|runQuery)" index.js | head -5

# 5. Verify the database exports
echo "[INFO] Checking database.js exports..."
grep -A 10 "module.exports" config/database.js

# 6. Test the syntax
echo "[INFO] Testing index.js syntax..."
node -c index.js && echo "✅ Syntax OK" || echo "❌ Syntax error"

# 7. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

# Wait for services to start
sleep 10

# 8. Test the maintenance status endpoint
echo "[INFO] Testing maintenance status endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/maintenance-status

# 9. Test the login endpoint
echo "[INFO] Testing login endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 200

echo ""

# 10. Show PM2 status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Fix complete! The getRow error should be resolved."
