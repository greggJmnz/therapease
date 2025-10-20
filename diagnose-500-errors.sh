#!/bin/bash

echo "🔍 Diagnosing 500 Errors - Comprehensive System Check..."

cd /root/therapease/therapease

# 1. Check PM2 status and logs
echo "=========================================="
echo "🔍 STEP 1: PM2 Status and Logs"
echo "=========================================="

echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent API server logs:"
/usr/bin/pm2 logs therapease-api --lines 20

# 2. Test API endpoints directly
echo "=========================================="
echo "🔍 STEP 2: Direct API Testing"
echo "=========================================="

echo "[TEST] Testing maintenance status endpoint:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/maintenance-status

echo "[TEST] Testing login endpoint:"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}'

# 3. Check database connection
echo "=========================================="
echo "🔍 STEP 3: Database Connection Check"
echo "=========================================="

cd server

echo "[TEST] Testing database connection:"
mysql -u therapease_user -p'TherapEase2025!@#' -h 127.0.0.1 -e "SELECT 1 as test;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi

# 4. Check if API server is actually running
echo "=========================================="
echo "🔍 STEP 4: API Server Process Check"
echo "=========================================="

echo "[TEST] Checking if API server is running on port 5000:"
ss -tlnp | grep ":5000" || echo "❌ No process listening on port 5000"

echo "[TEST] Testing local API server:"
curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:5000/api/maintenance-status

# 5. Check environment variables
echo "=========================================="
echo "🔍 STEP 5: Environment Variables Check"
echo "=========================================="

echo "[TEST] Checking .env.production:"
if [ -f ".env.production" ]; then
    echo "✅ .env.production exists"
    echo "Key variables:"
    grep -E "(DB_|JWT_|NODE_ENV)" .env.production | head -5
else
    echo "❌ .env.production not found"
fi

# 6. Check if there are any syntax errors in the code
echo "=========================================="
echo "🔍 STEP 6: Code Syntax Check"
echo "=========================================="

echo "[TEST] Checking server/index.js syntax:"
node -c index.js && echo "✅ index.js syntax OK" || echo "❌ index.js syntax error"

echo "[TEST] Checking routes/authRoutes.js syntax:"
node -c routes/authRoutes.js && echo "✅ authRoutes.js syntax OK" || echo "❌ authRoutes.js syntax error"

echo "[TEST] Checking config/database.js syntax:"
node -c config/database.js && echo "✅ database.js syntax OK" || echo "❌ database.js syntax error"

# 7. Test a simple API call to see the actual error
echo "=========================================="
echo "🔍 STEP 7: Detailed Error Analysis"
echo "=========================================="

echo "[TEST] Making a test API call with verbose output:"
curl -v -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' 2>&1 | head -20

# 8. Check if there are any missing dependencies
echo "=========================================="
echo "🔍 STEP 8: Dependencies Check"
echo "=========================================="

echo "[TEST] Checking if all required packages are installed:"
cd /root/therapease/therapease/server
npm list --depth=0 | grep -E "(bcryptjs|jsonwebtoken|mysql2|express)" || echo "❌ Some packages might be missing"

# 9. Restart services and test again
echo "=========================================="
echo "🔧 STEP 9: Service Restart and Re-test"
echo "=========================================="

echo "[FIX] Restarting PM2 services..."
/usr/bin/pm2 restart all

sleep 10

echo "[TEST] Testing after restart:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/maintenance-status

echo "[TEST] Testing login after restart:"
curl -s -w "\nHTTP Status: %{http_code}\n" -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}'

# 10. Final status
echo "=========================================="
echo "📊 FINAL STATUS"
echo "=========================================="

echo "PM2 Status:"
/usr/bin/pm2 list

echo "Port Status:"
ss -tlnp | grep -E ":(5000|8080)"

echo "Recent Error Logs:"
/usr/bin/pm2 logs therapease-api --lines 10 --err

echo "=========================================="
echo "🎯 Diagnosis Complete!"
echo "=========================================="
