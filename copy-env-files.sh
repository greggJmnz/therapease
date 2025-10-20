#!/bin/bash

echo "📁 Copying environment files..."

# Check if .env file exists outside therapease folder
if [ -f "/home/therapease/.env" ]; then
    echo "✅ Found .env file outside therapease folder"
    
    # Copy to main therapease folder
    echo "📋 Copying .env to main therapease folder..."
    cp /home/therapease/.env /home/therapease/therapease/.env
    
    # Copy to server .env.production
    echo "📋 Copying .env to server .env.production..."
    cp /home/therapease/.env /home/therapease/therapease/server/.env.production
    
    # Verify the files were copied
    echo "🔍 Verifying copied files..."
    echo "Main .env file:"
    ls -la /home/therapease/therapease/.env
    
    echo ""
    echo "Server .env.production file:"
    ls -la /home/therapease/therapease/server/.env.production
    
    # Show first few lines of each file to confirm content
    echo ""
    echo "📄 Content preview of main .env:"
    head -5 /home/therapease/therapease/.env
    
    echo ""
    echo "📄 Content preview of server .env.production:"
    head -5 /home/therapease/therapease/server/.env.production
    
    # Restart PM2 to pick up new environment variables
    echo "🔄 Restarting PM2 to pick up new environment variables..."
    pm2 restart all
    
    echo ""
    echo "✅ Environment files copied successfully!"
    echo "🔄 PM2 restarted with new environment variables"
    
else
    echo "❌ No .env file found at /home/therapease/.env"
    echo "🔍 Checking what files exist in /home/therapease/:"
    ls -la /home/therapease/ | grep -E "\.(env|config)"
    
    echo ""
    echo "🔍 Checking for any .env files in therapease folder:"
    find /home/therapease/therapease -name "*.env*" -type f
    
    echo ""
    echo "Please check the correct path to your .env file and update the script accordingly."
fi
