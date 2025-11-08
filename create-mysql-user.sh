#!/bin/bash

# Script to create MySQL user and grant permissions

set -e

echo "🔧 Creating MySQL User and Granting Permissions"
echo "================================================"

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
DB_NAME=$(grep "^DB_NAME=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "therapease")
DB_PASSWORD=$(grep "^DB_PASSWORD=" server/.env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" || echo "")

if [ -z "$DB_USER" ]; then
    echo "❌ Error: DB_USER not found in server/.env.production"
    exit 1
fi

if [ -z "$DB_NAME" ]; then
    echo "❌ Error: DB_NAME not found in server/.env.production"
    exit 1
fi

echo ""
echo "📋 Database Configuration:"
echo "   DB_USER: $DB_USER"
echo "   DB_NAME: $DB_NAME"
echo "   DB_PASSWORD: [SET]"

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
    echo ""
    echo "⚠️  Warning: DB_PASSWORD is not set in server/.env.production"
    echo "   You need to set a password for the MySQL user"
    echo ""
    read -p "   Enter password for MySQL user '$DB_USER': " -s NEW_PASSWORD
    echo ""
    if [ -z "$NEW_PASSWORD" ]; then
        echo "❌ Error: Password cannot be empty"
        exit 1
    fi
    DB_PASSWORD="$NEW_PASSWORD"
fi

echo ""
echo "🔧 Creating MySQL user and granting permissions..."
echo "   (You will be prompted for MySQL root password)"

# Create SQL script
SQL_FILE="/tmp/create_mysql_user.sql"
cat > "$SQL_FILE" << EOF
-- Create user if it doesn't exist
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';

-- Grant all privileges on the database
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';

-- Grant privileges to create the database if it doesn't exist
GRANT CREATE ON *.* TO '$DB_USER'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show user to verify
SELECT User, Host FROM mysql.user WHERE User='$DB_USER';
EOF

echo ""
echo "📋 SQL commands to execute:"
cat "$SQL_FILE"

echo ""
echo "🔧 Executing SQL commands..."
if sudo mysql -u root -p < "$SQL_FILE"; then
    echo "✅ MySQL user created and permissions granted successfully!"
    
    # Clean up
    rm -f "$SQL_FILE"
    
    echo ""
    echo "🧪 Testing connection..."
    if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
        echo "   ⚠️  Connection test failed, but user was created"
        echo "   This might be a password issue - verify the password in server/.env.production"
    else
        echo "   ✅ Connection test successful!"
    fi
    
    echo ""
    echo "✅ MySQL user setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify the password in server/.env.production matches what you set"
    echo "   2. Restart the application: pm2 restart therapease-api"
    echo "   3. Check logs: pm2 logs therapease-api"
else
    echo "❌ Failed to create MySQL user"
    echo "   Check the error message above"
    rm -f "$SQL_FILE"
    exit 1
fi

