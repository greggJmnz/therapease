#!/bin/bash

# Troubleshoot MySQL Connection Issues
echo "🔍 Troubleshooting MySQL Connection Issues..."

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

# 1. Check MySQL service status
print_status "Checking MySQL service status..."
sudo systemctl status mysql --no-pager -l

# 2. Check MySQL version and authentication
print_status "Checking MySQL version and authentication..."
mysql --version

# 3. Try different connection methods
print_status "Trying different MySQL connection methods..."

# Method 1: Try without password
print_status "Method 1: Trying without password..."
if mysql -u root -e "SELECT 1;" 2>/dev/null; then
    print_status "✅ MySQL root access works without password"
    MYSQL_METHOD="no_password"
else
    print_warning "❌ No password access failed"
fi

# Method 2: Try with sudo
print_status "Method 2: Trying with sudo..."
if sudo mysql -u root -e "SELECT 1;" 2>/dev/null; then
    print_status "✅ MySQL root access works with sudo"
    MYSQL_METHOD="sudo"
else
    print_warning "❌ Sudo access failed"
fi

# Method 3: Try with the provided password
print_status "Method 3: Trying with provided password..."
if mysql -u root -p"TherapEase2025!@#" -e "SELECT 1;" 2>/dev/null; then
    print_status "✅ MySQL root access works with provided password"
    MYSQL_METHOD="password"
else
    print_warning "❌ Provided password access failed"
fi

# Method 4: Try with existing password from .env
print_status "Method 4: Trying with existing password from .env..."
if mysql -u root -p"SecureDB2024!@#\$" -e "SELECT 1;" 2>/dev/null; then
    print_status "✅ MySQL root access works with existing password"
    MYSQL_METHOD="existing_password"
else
    print_warning "❌ Existing password access failed"
fi

# 4. Check MySQL user table
print_status "Checking MySQL user authentication methods..."
if [ "$MYSQL_METHOD" = "sudo" ]; then
    sudo mysql -e "SELECT user, host, plugin, authentication_string FROM mysql.user WHERE user='root';"
elif [ "$MYSQL_METHOD" = "no_password" ]; then
    mysql -u root -e "SELECT user, host, plugin, authentication_string FROM mysql.user WHERE user='root';"
fi

# 5. Try to reset root password if needed
print_status "Attempting to reset MySQL root password..."

if [ "$MYSQL_METHOD" = "sudo" ]; then
    print_status "Resetting root password using sudo access..."
    sudo mysql -e "
    ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'TherapEase2025!@#';
    FLUSH PRIVILEGES;
    "
    
    # Test new password
    if mysql -u root -p"TherapEase2025!@#" -e "SELECT 1;" 2>/dev/null; then
        print_status "✅ Root password reset successful!"
        MYSQL_METHOD="password"
    else
        print_error "❌ Root password reset failed"
    fi
fi

# 6. Create database and user
if [ "$MYSQL_METHOD" = "password" ] || [ "$MYSQL_METHOD" = "sudo" ] || [ "$MYSQL_METHOD" = "no_password" ]; then
    print_status "Creating database and user..."
    
    if [ "$MYSQL_METHOD" = "password" ]; then
        MYSQL_CMD="mysql -u root -p'TherapEase2025!@#'"
    elif [ "$MYSQL_METHOD" = "sudo" ]; then
        MYSQL_CMD="sudo mysql -u root"
    else
        MYSQL_CMD="mysql -u root"
    fi
    
    eval "$MYSQL_CMD -e \"
    CREATE DATABASE IF NOT EXISTS therapease_db;
    CREATE USER IF NOT EXISTS 'therapease_user'@'localhost' IDENTIFIED BY 'TherapEase2025!@#';
    GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
    FLUSH PRIVILEGES;
    SHOW DATABASES;
    \"" && print_status "✅ Database and user created successfully"
    
    # Test the new user
    print_status "Testing therapease_user connection..."
    if mysql -u therapease_user -p"TherapEase2025!@#" -e "USE therapease_db; SELECT 1;" 2>/dev/null; then
        print_status "✅ therapease_user connection successful!"
        
        # Update .env.production
        print_status "Updating .env.production with correct settings..."
        cd /home/therapease/therapease/server
        
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

        print_status "✅ .env.production updated with correct database settings"
        
        # Create basic tables
        print_status "Creating basic database tables..."
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
        
        # Restart PM2
        print_status "Restarting PM2 with new database configuration..."
        pm2 restart therapease-api
        
        # Wait and test
        print_status "Waiting for server to start..."
        sleep 5
        
        # Test the API
        print_status "Testing API endpoints..."
        if curl -f http://localhost:5000/api/maintenance-status >/dev/null 2>&1; then
            print_status "✅ API is working! Testing response:"
            curl -s http://localhost:5000/api/maintenance-status
            echo ""
            print_status "🎉 SUCCESS! Your API is now working with MySQL!"
        else
            print_error "❌ API still not working. Checking logs..."
            pm2 logs therapease-api --lines 10
        fi
        
    else
        print_error "❌ therapease_user connection failed"
    fi
else
    print_error "❌ No working MySQL connection method found"
    print_status "Please check MySQL installation and configuration"
fi

print_status "MySQL troubleshooting complete!"
