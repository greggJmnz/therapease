#!/bin/bash

# Script to fix MySQL password mismatch

set -e

echo "🔧 Fixing MySQL Password Mismatch"
echo "================================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

# Read database configuration
if [ ! -f "server/.env.production" ]; then
    echo "❌ Error: server/.env.production not found"
    exit 1
fi

DB_USER=$(grep "^DB_USER=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")
DB_PASSWORD=$(grep "^DB_PASSWORD=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -z "$DB_USER" ]; then
    echo "❌ Error: DB_USER not found in server/.env.production"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: DB_PASSWORD not found in server/.env.production"
    exit 1
fi

echo ""
echo "📋 Current Configuration:"
echo "   DB_USER: $DB_USER"
echo "   DB_PASSWORD: [SET]"

# Test current password
echo ""
echo "🧪 Testing current password..."
if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo "   ❌ Current password is incorrect"
    echo ""
    echo "💡 Options:"
    echo "   1. Reset MySQL password to match .env.production"
    echo "   2. Update .env.production to match MySQL password"
    echo ""
    read -p "   Choose option (1 or 2): " OPTION
    
    if [ "$OPTION" = "1" ]; then
        echo ""
        echo "🔧 Resetting MySQL password to match .env.production..."
        echo "   (You will be prompted for MySQL root password)"
        
        SQL_FILE="/tmp/reset_mysql_password.sql"
        cat > "$SQL_FILE" << EOF
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF
        
        if sudo mysql -u root -p < "$SQL_FILE"; then
            echo "   ✅ MySQL password reset successfully!"
            rm -f "$SQL_FILE"
        else
            echo "   ❌ Failed to reset MySQL password"
            rm -f "$SQL_FILE"
            exit 1
        fi
    elif [ "$OPTION" = "2" ]; then
        echo ""
        echo "🔧 Updating .env.production to match MySQL password..."
        read -p "   Enter the correct MySQL password: " -s NEW_PASSWORD
        echo ""
        
        if [ -z "$NEW_PASSWORD" ]; then
            echo "❌ Error: Password cannot be empty"
            exit 1
        fi
        
        # Update .env.production
        if grep -q "^DB_PASSWORD=" server/.env.production; then
            sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD='$NEW_PASSWORD'|" server/.env.production
        else
            echo "DB_PASSWORD='$NEW_PASSWORD'" >> server/.env.production
        fi
        
        echo "   ✅ .env.production updated successfully!"
        DB_PASSWORD="$NEW_PASSWORD"
    else
        echo "❌ Invalid option"
        exit 1
    fi
else
    echo "   ✅ Current password is correct!"
fi

# Test connection again
echo ""
echo "🧪 Testing connection..."
if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo "   ❌ Connection still failing"
    echo "   Check the error message above"
    exit 1
else
    echo "   ✅ Connection successful!"
fi

# Test database access
DB_NAME=$(grep "^DB_NAME=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "therapease")
echo ""
echo "🧪 Testing database access..."
if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo "   ⚠️  Cannot access database '$DB_NAME'"
    echo "   Database might not exist or user doesn't have permissions"
else
    echo "   ✅ Database access successful!"
fi

echo ""
echo "✅ Password fix completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Restart the application: pm2 restart therapease-api"
echo "   2. Check logs: pm2 logs therapease-api --lines 50"

