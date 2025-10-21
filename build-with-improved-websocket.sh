#!/bin/bash

echo "🔧 Building frontend with improved WebSocket handling..."

# Build the frontend
cd client
npm run build
cd ..

echo "✅ Frontend built with improved WebSocket handling"
echo "🎯 Expected results:"
echo "- WebSocket connections are less aggressive"
echo "- Faster login experience"
echo "- Real-time features work when connected"
echo "- Graceful fallback when WebSocket fails"
