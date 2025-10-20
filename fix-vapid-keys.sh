#!/bin/bash

# Fix VAPID Keys Issue
echo "🔧 Fixing VAPID Keys Issue..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. Generate proper VAPID keys
print_status "Generating proper VAPID keys..."

# Generate VAPID keys using web-push library
cd /home/therapease/therapease/server

# Create a temporary script to generate VAPID keys
cat > generate-vapid.js << 'EOF'
const webpush = require('web-push');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
EOF

# Run the script to generate keys
VAPID_KEYS=$(node generate-vapid.js)
VAPID_PUBLIC_KEY=$(echo "$VAPID_KEYS" | grep "VAPID_PUBLIC_KEY=" | cut -d'=' -f2)
VAPID_PRIVATE_KEY=$(echo "$VAPID_KEYS" | grep "VAPID_PRIVATE_KEY=" | cut -d'=' -f2)

print_status "Generated VAPID keys:"
echo "Public Key: ${VAPID_PUBLIC_KEY:0:20}..."
echo "Private Key: ${VAPID_PRIVATE_KEY:0:20}..."

# 2. Update .env.production with proper VAPID keys
print_status "Updating .env.production with proper VAPID keys..."

# Read current .env.production and update VAPID keys
sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY/" .env.production
sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY/" .env.production

print_status "✅ Updated .env.production with proper VAPID keys"

# 3. Clean up temporary file
rm -f generate-vapid.js

# 4. Restart PM2
print_status "Restarting PM2 with fixed VAPID keys..."
pm2 restart therapease-api

# 5. Wait and test
print_status "Waiting for server to start..."
sleep 5

# 6. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 7. Test the API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
    print_status "🎉 SUCCESS! Your API is now working!"
else
    print_error "❌ API still not working. Checking logs..."
    pm2 logs therapease-api --lines 5
fi

# 8. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 COMPLETE SUCCESS! Your API is fully working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "VAPID keys fix complete!"
