#!/bin/bash
# Fix MySQL user and database setup on Contabo

set -e

echo "🔧 Fixing MySQL user and database setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration (update these if needed)
DB_USER="therapease_user"
DB_NAME="therapease_db"

echo "📋 Configuration:"
echo "  Database User: $DB_USER"
echo "  Database Name: $DB_NAME"
echo ""

# Prompt for MySQL root password
echo -e "${YELLOW}⚠️  Enter MySQL root password:${NC}"
read -s ROOT_PASSWORD

# Prompt for new database user password
echo ""
echo -e "${YELLOW}⚠️  Enter new password for $DB_USER:${NC}"
read -s DB_PASSWORD

echo ""
echo "🔍 Checking if database exists..."
if mysql -u root -p"$ROOT_PASSWORD" -e "USE $DB_NAME;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database '$DB_NAME' exists${NC}"
else
    echo -e "${YELLOW}⚠️  Database '$DB_NAME' does not exist, creating...${NC}"
    mysql -u root -p"$ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
    echo -e "${GREEN}✅ Database '$DB_NAME' created${NC}"
fi

echo ""
echo "🔍 Checking if user exists..."
if mysql -u root -p"$ROOT_PASSWORD" -e "SELECT User FROM mysql.user WHERE User='$DB_USER';" 2>/dev/null | grep -q "$DB_USER"; then
    echo -e "${YELLOW}⚠️  User '$DB_USER' exists, updating password...${NC}"
    mysql -u root -p"$ROOT_PASSWORD" << EOF
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF
    echo -e "${GREEN}✅ User password updated${NC}"
else
    echo -e "${YELLOW}⚠️  User '$DB_USER' does not exist, creating...${NC}"
    mysql -u root -p"$ROOT_PASSWORD" << EOF
CREATE USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    echo -e "${GREEN}✅ User '$DB_USER' created${NC}"
fi

echo ""
echo "🔍 Verifying permissions..."
mysql -u root -p"$ROOT_PASSWORD" << EOF
SHOW GRANTS FOR '$DB_USER'@'localhost';
EOF

echo ""
echo "🧪 Testing database connection..."
if mysql -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT 1;" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful!${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ MySQL user and database setup complete!${NC}"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env.production with the password:"
echo "      DB_PASSWORD=$DB_PASSWORD"
echo "   2. Restart PM2 services:"
echo "      pm2 restart all"
echo ""

