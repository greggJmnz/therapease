#!/bin/bash

echo "🔧 Building frontend with disabled WebSocket..."

# Build the frontend
cd client
npm run build
cd ..

echo "✅ Frontend built with WebSocket disabled"
echo "🎯 Expected results:"
echo "- No more WebSocket connection attempts"
echo "- Faster login experience"
echo "- No reconnection loops"
echo "- Smooth data fetching"
