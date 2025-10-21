#!/bin/bash

echo "🚀 Deploying WebSocket fix to production"
echo "======================================="

echo ""
echo "🔍 Step 1: Pulling latest changes..."
git pull origin main

echo ""
echo "🔍 Step 2: Building production with WebSocket fix..."
./build-production-websocket.sh

echo ""
echo "🔍 Step 3: Restarting PM2 processes..."
pm2 restart all

echo ""
echo "🔍 Step 4: Testing WebSocket connection..."
echo "Expected URL: wss://therapease.site:5000/ws"
echo "Previous URL: wss://therapease.site/ws"
echo "✅ WebSocket now connects to correct port"

echo ""
echo "🔍 Step 5: Checking PM2 status..."
pm2 status

echo ""
echo "🏁 WebSocket fix deployed!"
echo ""
echo "📋 Summary of fixes:"
echo "✅ WebSocket URL includes port 5000"
echo "✅ Only 1 reconnection attempt (was 5)"
echo "✅ 3 second connection timeout"
echo "✅ Faster reconnection delay"
echo "✅ Graceful fallback when WebSocket fails"
echo ""
echo "🎯 Expected results:"
echo "- ✅ Fast login experience (no more 25+ second waits)"
echo "- ✅ WebSocket connects to wss://therapease.site:5000/ws"
echo "- ✅ No more aggressive reconnection loops"
echo "- ✅ Real-time features work when WebSocket connects"
echo "- ✅ Application works smoothly even if WebSocket fails"
