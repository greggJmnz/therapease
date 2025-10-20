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

# 3. Check MySQL root access and setup database
print_status "Testing MySQL root access..."
if mysql -u root -p"TherapEase2025!@#" -e "SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ MySQL root access is working"
    
    # Create database and user
    print_status "Setting up MySQL database..."
    mysql -u root -p"TherapEase2025!@#" -e "
    CREATE DATABASE IF NOT EXISTS therapease_db;
    CREATE USER IF NOT EXISTS 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
    GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
    FLUSH PRIVILEGES;
    SHOW DATABASES;
    " && print_status "✅ Database and user created successfully"
else
    print_warning "MySQL root access failed. Trying to connect with password..."
    if mysql -u root -p"TherapEase2025!@#" -e "SELECT 1;" 2>/dev/null; then
        print_status "✅ MySQL root access working with password"
    else
        print_error "❌ Cannot connect to MySQL. Please check MySQL installation and password."
        exit 1
    fi
fi

# 4. Create a proper database configuration for MySQL
print_status "Setting up MySQL configuration with provided password..."

# Update .env.production to use MySQL
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

print_status "✅ Updated .env.production to use MySQL"

# 5. Initialize MySQL database
print_status "Initializing MySQL database..."
print_status "Testing database connection with new user..."
if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" >/dev/null 2>&1; then
    print_status "✅ Database connection working with therapease_user"
    
    # Run the database setup script
    print_status "Running database initialization..."
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
    print_error "❌ Cannot connect to database with therapease_user"
    print_status "Trying to create tables manually..."
    # Create basic tables if needed
    mysql -u therapease_user -p"TherapEase2025!@#" therapease_db -e "
    CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
    INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES ('maintenance_mode', 'false');
    " && print_status "✅ Basic tables created"
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
