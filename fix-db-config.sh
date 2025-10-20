#!/bin/bash

# Fix Database Configuration
echo "🔧 Fixing Database Configuration..."

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

cd /home/therapease/therapease/server

# 1. Check current .env.production
print_status "Checking current .env.production configuration..."
echo "Current database configuration:"
grep -E "^(DB_|NODE_ENV)" .env.production || echo "No DB config found"

# 2. Test database connection with therapease_user
print_status "Testing database connection with therapease_user..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ therapease_user connection is working"
else
    print_error "❌ therapease_user connection failed"
    print_status "Recreating therapease_user..."
    
    # Recreate user with sudo access
    sudo mysql -e "
    DROP USER IF EXISTS 'therapease_user'@'localhost';
    CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
    GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
    FLUSH PRIVILEGES;
    "
    
    # Test again
    if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
        print_status "✅ therapease_user recreated and working"
    else
        print_error "❌ Still cannot connect with therapease_user"
        exit 1
    fi
fi

# 3. Update .env.production with correct database settings
print_status "Updating .env.production with correct database settings..."

# Create a new .env.production with correct settings
cat > .env.production << 'EOF'
# TherapEase Production Environment Configuration

# Database Configuration - Using MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=TherapEase2025!@#
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security Keys (Generated)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SESSION_SECRET=your_session_secret_here

# CORS Configuration
CORS_ORIGIN=https://therapease.site

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false
OPENAI_API_KEY=your_openai_key_if_needed

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@therapease.com

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$

# API Base URL
API_BASE_URL=https://api.therapease.site

# Client Configuration (for React app)
REACT_APP_API_URL=https://api.therapease.site/api
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key
EOF

# Generate secure keys
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')

# Replace placeholder values
sed -i "s/your_jwt_secret_here/$JWT_SECRET/g" .env.production
sed -i "s/your_encryption_key_here/$ENCRYPTION_KEY/g" .env.production
sed -i "s/your_session_secret_here/$SESSION_SECRET/g" .env.production

# Get the VAPID keys from the previous run if they exist
if grep -q "VAPID_PUBLIC_KEY=" .env.production.bak 2>/dev/null; then
    VAPID_PUBLIC_KEY=$(grep "VAPID_PUBLIC_KEY=" .env.production.bak | cut -d'=' -f2)
    VAPID_PRIVATE_KEY=$(grep "VAPID_PRIVATE_KEY=" .env.production.bak | cut -d'=' -f2)
    sed -i "s/VAPID_PUBLIC_KEY=.*/VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY/" .env.production
    sed -i "s/VAPID_PRIVATE_KEY=.*/VAPID_PRIVATE_KEY=$VAPID_PRIVATE_KEY/" .env.production
    print_status "✅ Preserved existing VAPID keys"
fi

print_status "✅ Updated .env.production with correct database settings"

# 4. Verify the configuration
print_status "Verifying new configuration..."
echo "New database configuration:"
grep -E "^(DB_|NODE_ENV)" .env.production

# 5. Test database connection with new config
print_status "Testing database connection with new configuration..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ Database connection test successful"
else
    print_error "❌ Database connection test failed"
    exit 1
fi

# 6. Restart PM2
print_status "Restarting PM2 with corrected database configuration..."
pm2 restart therapease-api

# 7. Wait and check status
print_status "Waiting for server to start..."
sleep 5

# 8. Check PM2 status
print_status "Checking PM2 status..."
pm2 status

# 9. Test the API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status
    echo ""
    print_status "🎉 SUCCESS! Your API is now working with MySQL!"
else
    print_error "❌ API still not working. Checking logs..."
    pm2 logs therapease-api --lines 5
fi

# 10. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 COMPLETE SUCCESS! Your API is fully working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "Database configuration fix complete!"
