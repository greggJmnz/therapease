#!/bin/bash

echo "🧪 Testing Admin Profile Settings"
echo "================================"

echo ""
echo "🔍 Step 1: Testing profile GET endpoint..."
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     https://www.therapease.site/api/admin/profile \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🔍 Step 2: Testing profile update endpoint..."
curl -X PUT \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Test","lastName":"Admin","email":"admin@therapease.com","phone":"09123456789"}' \
     https://www.therapease.site/api/admin/profile \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🔍 Step 3: Testing password change endpoint..."
curl -X POST \
     -H "Authorization: Bearer $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"currentPassword":"SecureAdmin2024!@#$","newPassword":"NewSecurePassword123!"}' \
     https://www.therapease.site/api/admin/change-password \
     -w "\nHTTP Status: %{http_code}\n" \
     -s

echo ""
echo "🏁 Profile settings test complete!"
echo ""
echo "📋 Expected results:"
echo "- ✅ Profile GET: 200 OK"
echo "- ✅ Profile UPDATE: 200 OK"  
echo "- ✅ Password CHANGE: 200 OK"
echo ""
echo "🔧 If any test fails:"
echo "1. Check server logs: pm2 logs therapease-api"
echo "2. Check database connection"
echo "3. Verify JWT token is valid"
echo "4. Check if user exists in database"
