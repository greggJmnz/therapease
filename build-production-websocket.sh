#!/bin/bash

echo "🔧 Building production with optimized WebSocket..."

# Clean previous build
rm -rf client/build

# Build the frontend
cd client
npm run build
cd ..

echo "✅ Production build complete with optimized WebSocket"
echo "🎯 Key optimizations:"
echo "- ✅ WebSocket URL includes port 5000"
echo "- ✅ Only 1 reconnection attempt"
echo "- ✅ 3 second connection timeout"
echo "- ✅ Faster 2 second reconnection delay"
echo "- ✅ Graceful fallback when WebSocket fails"
