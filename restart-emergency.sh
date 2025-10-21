#!/bin/bash

echo "🔄 Restarting TherapEase server with emergency configuration..."

# Stop all PM2 processes
pm2 stop all
pm2 delete all

# Wait a moment
sleep 3

# Start with emergency configuration
echo "🚀 Starting emergency server..."
node emergency-server.js &

# Wait for server to start
sleep 5

# Check if server is running
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Emergency server is running"
    echo "🧪 Testing routes..."
    
    # Test maintenance-status
    curl -s http://localhost:5000/api/maintenance-status | head -c 100
    echo ""
    
    # Test auth/login
    curl -s -X POST http://localhost:5000/api/auth/login \
         -H "Content-Type: application/json" \
         -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 100
    echo ""
    
else
    echo "❌ Emergency server failed to start"
    echo "🔧 Trying to start original server..."
    pm2 start ecosystem.config.js
fi

echo "🏁 Server restart complete!"
