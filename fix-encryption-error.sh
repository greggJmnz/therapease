#!/bin/bash

echo "🔐 TherapEase Encryption Key Fix"
echo "================================="
echo ""

# Generate encryption key
ENCRYPTION_KEY="441d463fc6384ae3e0bfc84e728615393bd18663e142f218cb6664aad0db4798"

echo "1. 🔧 Adding encryption key to .env file..."
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY" >> .env

echo "✅ Encryption key added to .env file"
echo ""

echo "2. 🔄 Restarting PM2 processes..."
pm2 restart therapease-api
pm2 restart therapease-public

echo "✅ PM2 processes restarted"
echo ""

echo "3. ⏳ Waiting for services to start..."
sleep 5

echo "4. 🧪 Testing API endpoints..."

# Test health endpoint
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint: OK"
else
    echo "❌ Health endpoint: FAILED ($HEALTH_RESPONSE)"
fi

# Test auth endpoint
echo "Testing auth endpoint..."
AUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/test)
if [ "$AUTH_RESPONSE" = "200" ]; then
    echo "✅ Auth endpoint: OK"
else
    echo "❌ Auth endpoint: FAILED ($AUTH_RESPONSE)"
fi

# Test login endpoint
echo "Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' \
  -o /dev/null -w "%{http_code}")

if [ "$LOGIN_RESPONSE" = "200" ]; then
    echo "✅ Login endpoint: OK"
else
    echo "❌ Login endpoint: FAILED ($LOGIN_RESPONSE)"
fi

echo ""
echo "5. 📊 PM2 Status:"
pm2 status

echo ""
echo "6. 📋 Recent logs (last 10 lines):"
pm2 logs therapease-api --lines 10

echo ""
echo "🎉 Encryption key fix completed!"
echo ""
echo "If you still see 500 errors, check the logs with:"
echo "pm2 logs therapease-api --lines 50"
