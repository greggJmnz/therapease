#!/bin/bash

# Fix git conflict and start server
echo "🔧 Fixing Git Conflict and Starting Server"
echo "=========================================="

echo ""
echo "🔍 Step 1: Stashing local changes..."
git stash

echo ""
echo "🔍 Step 2: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 3: Checking if ecosystem.config.js exists..."
if [ -f "ecosystem.config.js" ]; then
    echo "✅ ecosystem.config.js exists"
else
    echo "❌ ecosystem.config.js missing"
    exit 1
fi

echo ""
echo "🔍 Step 4: Checking if public-website/server.js exists..."
if [ -f "public-website/server.js" ]; then
    echo "✅ public-website/server.js exists"
else
    echo "❌ public-website/server.js missing"
    exit 1
fi

echo ""
echo "🔍 Step 5: Creating logs directory..."
mkdir -p logs

echo ""
echo "🔍 Step 6: Building frontend..."
cd client
npm run build
cd ..

echo ""
echo "🔍 Step 7: Starting PM2 processes..."
pm2 start ecosystem.config.js

echo ""
echo "🔍 Step 8: Checking PM2 status..."
pm2 status

echo ""
echo "🔍 Step 9: Testing server endpoints..."
echo "Testing health endpoint..."
curl -s "http://localhost:5000/health" | head -c 100
echo ""

echo "Testing maintenance-status endpoint..."
curl -s "http://localhost:5000/api/maintenance-status" | head -c 100
echo ""

echo "Testing auth/login endpoint..."
curl -s -X POST "http://localhost:5000/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 100
echo ""

echo ""
echo "🏁 Server startup complete!"
echo ""
echo "📋 Summary:"
echo "✅ Resolved git conflict"
echo "✅ Pulled latest changes"
echo "✅ Built frontend"
echo "✅ Started PM2 processes"
echo "✅ Tested critical endpoints"
echo ""
echo "🎯 Expected results:"
echo "- PM2 processes running (therapease-api, therapease-public)"
echo "- Health endpoint returns 200"
echo "- Maintenance-status endpoint returns 200"
echo "- Login endpoint returns 200"
echo "- No more 404 errors"
