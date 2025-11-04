#!/bin/bash
# Quick dependency installation script for Contabo server
# Run this after pulling changes: bash install-dependencies.sh

echo "📦 Installing dependencies for TherapEase..."

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies (if needed for build)
echo "Installing client dependencies..."
cd client
npm install
cd ..

# Install public-website dependencies
echo "Installing public-website dependencies..."
cd public-website
npm install
cd ..

echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Restart PM2: pm2 restart all"
echo "2. Check logs: pm2 logs"
echo ""

