#!/bin/bash

# Script to update database password in .env.production and MySQL

set -e

echo "🔧 Updating Database Password"
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

# Get database user and host from .env.production
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")
DB_HOST=$(grep "^DB_HOST=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "localhost")

echo ""
echo "📋 Database Configuration:"
echo "   DB_USER: $DB_USER"
echo "   DB_HOST: $DB_HOST"
echo "   DB_PASSWORD: [UPDATING]"

# Backup the file
BACKUP_FILE="${SERVER_ENV}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SERVER_ENV" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Update DB_PASSWORD in .env.production
echo ""
echo "📋 Updating DB_PASSWORD in .env.production..."
if grep -q "^DB_PASSWORD=" "$SERVER_ENV" 2>/dev/null; then
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$DB_PASSWORD|" "$SERVER_ENV"
    echo -e "${GREEN}✅ Updated DB_PASSWORD in .env.production${NC}"
else
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$SERVER_ENV"
    echo -e "${GREEN}✅ Added DB_PASSWORD to .env.production${NC}"
fi

# Update MySQL password
echo ""
echo "📋 Updating MySQL user password..."
echo "   (You will be prompted for MySQL root password)"

SQL_FILE="/tmp/update_mysql_password.sql"
cat > "$SQL_FILE" << EOF
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF

if sudo mysql -u root -p < "$SQL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ MySQL password updated successfully!${NC}"
    rm -f "$SQL_FILE"
else
    echo -e "${YELLOW}⚠️  Could not update MySQL password automatically${NC}"
    echo "   You may need to run this manually:"
    echo ""
    echo "   sudo mysql -u root -p"
    echo "   ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
    rm -f "$SQL_FILE"
fi

# Test connection
echo ""
echo "🧪 Testing database connection..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ Connection test failed${NC}"
    echo "   Please check:"
    echo "   1. MySQL user '$DB_USER' exists"
    echo "   2. MySQL password was updated correctly"
    echo "   3. MySQL service is running"
else
    echo -e "${GREEN}✅ Database connection successful!${NC}"
fi

# Test database access
DB_NAME=$(grep "^DB_NAME=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_db")
echo ""
echo "🧪 Testing database access..."
if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${YELLOW}⚠️  Cannot access database '$DB_NAME'${NC}"
    echo "   Database might not exist or user doesn't have permissions"
else
    echo -e "${GREEN}✅ Database access successful!${NC}"
fi

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"
echo -e "${GREEN}✅ Database password update completed!${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Restart the application: pm2 restart therapease-api --update-env"
echo "   2. Check logs: pm2 logs therapease-api --lines 50"
echo "   3. Look for 'Connected to MySQL database successfully' in the logs"
echo ""
echo "💡 To restore backup: cp $BACKUP_FILE $SERVER_ENV"

