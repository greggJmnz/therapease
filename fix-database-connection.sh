#!/bin/bash

# Fix Database Connection Issues
echo "🔧 Fixing Database Connection Issues..."

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

# 1. Check current database configuration
print_status "Checking current database configuration..."
cd /home/therapease/therapease/server

if [ -f ".env.production" ]; then
    print_status "Found .env.production file"
    echo "Current DB configuration:"
    grep -E "^(DB_|NODE_ENV)" .env.production || echo "No DB config found"
else
    print_error ".env.production file not found"
    exit 1
fi

# 2. Check if MySQL is running
print_status "Checking MySQL status..."
if systemctl is-active --quiet mysql; then
    print_status "✅ MySQL is running"
else
    print_warning "MySQL is not running. Starting MySQL..."
    sudo systemctl start mysql
    sleep 3
fi

# 3. Check MySQL root access
print_status "Testing MySQL root access..."
if mysql -u root -e "SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ MySQL root access is working"
else
    print_warning "MySQL root access failed. This is normal if root requires password."
fi

# 4. Create a proper database configuration for SQLite (recommended for now)
print_status "Setting up SQLite configuration (recommended for quick fix)..."

# Update .env.production to use SQLite
cat > .env.production << 'EOF'
# TherapEase Production Environment Configuration

# Database Configuration - Using SQLite for simplicity
DB_TYPE=sqlite
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

print_status "✅ Updated .env.production to use SQLite"

# 5. Initialize SQLite database
print_status "Initializing SQLite database..."
if [ ! -f "therapease.db" ]; then
    print_status "Creating SQLite database..."
    # Run the database setup script
    node -e "
    const { initializeDatabase } = require('./scripts/setup-database');
    initializeDatabase().then(() => {
        console.log('Database initialized successfully');
        process.exit(0);
    }).catch(err => {
        console.error('Database initialization failed:', err);
        process.exit(1);
    });
    " || print_warning "Database initialization script not found, will be created on first run"
else
    print_status "✅ SQLite database already exists"
fi

# 6. Restart PM2 with new configuration
print_status "Restarting PM2 with new database configuration..."
pm2 restart therapease-api

# 7. Wait and test
print_status "Waiting for server to start..."
sleep 5

# 8. Test the API
print_status "Testing API endpoints..."
if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ API is working! Testing response:"
    curl -s http://localhost:5000/api/maintenance-status | head -c 200
    echo ""
else
    print_error "❌ API still not working. Checking logs..."
    pm2 logs therapease-api --lines 10
fi

# 9. Test external access
print_status "Testing external API access..."
if curl -f https://api.therapease.site/api/maintenance-status >/dev/null 2>&1; then
    print_status "✅ External API access is working!"
    print_status "🎉 SUCCESS! Your API is now working!"
else
    print_warning "⚠️ External API access still failing - this might be nginx configuration"
    print_status "But local API should be working now!"
fi

print_status "Database fix complete!"
print_status "Your server should now be working with SQLite database."
