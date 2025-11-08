#!/bin/bash

# Script to diagnose and fix MySQL database connection issues

set -e

echo "🔧 Diagnosing MySQL Database Connection"
echo "======================================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Check if .env.production exists
echo ""
echo "📋 Checking environment configuration..."
if [ -f "server/.env.production" ]; then
    echo "✅ Found server/.env.production"
    
    # Extract database credentials (without showing password)
    DB_USER=$(grep "^DB_USER=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
    DB_HOST=$(grep "^DB_HOST=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "127.0.0.1")
    DB_NAME=$(grep "^DB_NAME=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "therapease")
    DB_PORT=$(grep "^DB_PORT=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "3306")
    HAS_PASSWORD=$(grep "^DB_PASSWORD=" server/.env.production | wc -l)
    
    echo "   DB_USER: $DB_USER"
    echo "   DB_HOST: $DB_HOST"
    echo "   DB_NAME: $DB_NAME"
    echo "   DB_PORT: $DB_PORT"
    if [ "$HAS_PASSWORD" -gt 0 ]; then
        echo "   DB_PASSWORD: [SET]"
    else
        echo "   DB_PASSWORD: [NOT SET]"
    fi
else
    echo "❌ server/.env.production not found"
    echo "   Please create it with database credentials"
    exit 1
fi

# Test MySQL connection
echo ""
echo "🧪 Testing MySQL connection..."
if command -v mysql &> /dev/null; then
    echo "   MySQL client found"
    
    # Try to connect with the credentials
    if [ -n "$DB_USER" ] && [ "$HAS_PASSWORD" -gt 0 ]; then
        echo ""
        echo "   Attempting to connect to MySQL..."
        echo "   (You may be prompted for the MySQL password)"
        
        # Read password from .env.production
        DB_PASSWORD=$(grep "^DB_PASSWORD=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
        
        if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
            echo "   ❌ Connection failed"
            echo ""
            echo "💡 Possible issues:"
            echo "   1. MySQL user '$DB_USER' doesn't exist"
            echo "   2. Password is incorrect"
            echo "   3. User doesn't have permission to connect from 'localhost'"
            echo ""
            echo "🔧 To fix:"
            echo "   1. Connect to MySQL as root: sudo mysql -u root -p"
            echo "   2. Check if user exists: SELECT User, Host FROM mysql.user WHERE User='$DB_USER';"
            echo "   3. If user doesn't exist, create it:"
            echo "      CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY 'your_password';"
            echo "      GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
            echo "      FLUSH PRIVILEGES;"
            echo "   4. Update server/.env.production with the correct password"
        else
            echo "   ✅ Connection successful!"
        fi
    else
        echo "   ⚠️  Cannot test connection - missing credentials"
    fi
else
    echo "   ⚠️  MySQL client not found - cannot test connection"
fi

# Check if MySQL service is running
echo ""
echo "📋 Checking MySQL service status..."
if systemctl is-active --quiet mysql || systemctl is-active --quiet mysqld; then
    echo "   ✅ MySQL service is running"
else
    echo "   ❌ MySQL service is not running"
    echo "   Start it with: sudo systemctl start mysql"
fi

echo ""
echo "✅ Database connection diagnosis completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Verify MySQL user exists and has correct password"
echo "   2. Update server/.env.production if needed"
echo "   3. Restart the application: pm2 restart therapease-api"

