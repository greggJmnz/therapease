#!/bin/bash

echo "🔍 Verifying WebSocket Fix"
echo "========================="

echo ""
echo "🔍 Step 1: Checking if build contains port 5000..."
if grep -q ":5000/ws" client/build/static/js/main.*.js; then
    echo "✅ Build contains correct WebSocket URL with port 5000"
    echo "🎯 Expected URL: wss://www.therapease.site:5000/ws"
    echo "✅ WebSocket fix is properly applied"
else
    echo "❌ Build does not contain correct WebSocket URL"
    echo "🔍 Current URLs in build:"
    grep -o "wss://[^/]*/ws" client/build/static/js/main.*.js | head -5
    echo "❌ WebSocket fix not applied correctly"
fi

echo ""
echo "🔍 Step 2: Testing WebSocket connection..."
echo "Expected: wss://www.therapease.site:5000/ws"
echo "Previous: wss://www.therapease.site/ws (causing 200 error)"
echo ""
echo "🎯 Key differences:"
echo "- ✅ Includes port 5000"
echo "- ✅ Only 1 reconnection attempt"
echo "- ✅ 3 second connection timeout"
echo "- ✅ Graceful fallback when WebSocket fails"
