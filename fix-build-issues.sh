#!/bin/bash

echo "🔧 Fixing build and server issues..."

# Create logs directory
mkdir -p logs

# Fix permissions
chmod +x server/index.js
chmod +x public-website/server.js

# Clean and rebuild
cd client
rm -rf build
npm run build
cd ..

# Start PM2 processes
pm2 start ecosystem.config.js

# Check status
pm2 status

echo "✅ Build and server issues fixed!"
