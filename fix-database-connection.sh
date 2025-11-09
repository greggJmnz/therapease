#!/bin/bash

# Comprehensive script to fix database connection issues

set -e

echo "🔧 Fixing Database Connection"
echo "============================="

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

SERVER_ENV="server/.env.production"

if [ ! -f "$SERVER_ENV" ]; then
    echo "❌ Error: $SERVER_ENV not found!"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Database password
DB_PASSWORD="TherapEase123!@#"

# Get database configuration
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")
DB_HOST=$(grep "^DB_HOST=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "localhost")
DB_NAME=$(grep "^DB_NAME=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_db")

echo ""
echo "📋 Database Configuration:"
echo "   DB_USER: $DB_USER"
echo "   DB_HOST: $DB_HOST"
echo "   DB_NAME: $DB_NAME"
echo "   DB_PASSWORD: [UPDATING]"

# Step 1: Update .env.production
echo ""
echo "📝 Step 1: Updating .env.production..."
if grep -q "^DB_PASSWORD=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" "$SERVER_ENV"
    echo -e "${GREEN}✅ Updated DB_PASSWORD in .env.production${NC}"
else
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$SERVER_ENV"
    echo -e "${GREEN}✅ Added DB_PASSWORD to .env.production${NC}"
fi

# Verify the password was set correctly
CURRENT_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
if [ "$CURRENT_PASSWORD" = "$DB_PASSWORD" ]; then
    echo -e "${GREEN}✅ Password in .env.production is correct${NC}"
else
    echo -e "${RED}❌ Password in .env.production doesn't match!${NC}"
    echo "   Expected: $DB_PASSWORD"
    echo "   Found: $CURRENT_PASSWORD"
    exit 1
fi

# Step 2: Update MySQL password
echo ""
echo "📝 Step 2: Updating MySQL user password..."
echo "   (You will be prompted for MySQL root password)"

SQL_FILE="/tmp/update_mysql_password.sql"
cat > "$SQL_FILE" << EOF
-- Update password for therapease_user
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;

-- Verify the user exists and has privileges
SELECT User, Host FROM mysql.user WHERE User = '$DB_USER';
SHOW GRANTS FOR '$DB_USER'@'localhost';
EOF

echo "   Running SQL commands..."
if sudo mysql -u root -p < "$SQL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ MySQL password updated successfully!${NC}"
    rm -f "$SQL_FILE"
else
    echo -e "${YELLOW}⚠️  Could not update MySQL password automatically${NC}"
    echo "   Please run this manually:"
    echo ""
    echo "   sudo mysql -u root -p"
    echo "   ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
    rm -f "$SQL_FILE"
    read -p "   Press Enter after updating MySQL password manually..."
fi

# Step 3: Test connection
echo ""
echo "📝 Step 3: Testing database connection..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ Connection test failed${NC}"
    echo "   Please check:"
    echo "   1. MySQL user '$DB_USER' exists"
    echo "   2. MySQL password was updated correctly"
    echo "   3. MySQL service is running: sudo systemctl status mysql"
    exit 1
else
    echo -e "${GREEN}✅ Database connection successful!${NC}"
fi

# Step 4: Test database access
echo ""
echo "📝 Step 4: Testing database access..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${YELLOW}⚠️  Cannot access database '$DB_NAME'${NC}"
    echo "   Creating database if it doesn't exist..."
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || {
        echo -e "${RED}❌ Could not create database${NC}"
        echo "   Please create it manually:"
        echo "   mysql -u root -p"
        echo "   CREATE DATABASE IF NOT EXISTS $DB_NAME;"
        echo "   GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
        echo "   FLUSH PRIVILEGES;"
        echo "   EXIT;"
    }
else
    echo -e "${GREEN}✅ Database access successful!${NC}"
fi

# Step 5: Restart PM2 with updated environment
echo ""
echo "📝 Step 5: Restarting PM2 with updated environment..."
pm2 restart therapease-api --update-env

echo ""
echo "⏳ Waiting 3 seconds for application to start..."
sleep 3

# Step 6: Check logs
echo ""
echo "📝 Step 6: Checking application logs..."
echo "-----------------------------------"
pm2 logs therapease-api --lines 20 --nostream

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo -e "${GREEN}✅ Database connection fix completed!${NC}"
echo ""
echo "📋 Check the logs above for:"
echo "   ✅ 'Connected to MySQL database successfully'"
echo "   ❌ 'Database connection error' (if you see this, the password still doesn't match)"
echo ""
echo "💡 If you still see connection errors:"
echo "   1. Verify MySQL password: mysql -u $DB_USER -p'$DB_PASSWORD' -e 'SELECT 1;'"
echo "   2. Check PM2 environment: pm2 env therapease-api | grep DB_PASSWORD"
echo "   3. Restart PM2 again: pm2 restart therapease-api --update-env"
