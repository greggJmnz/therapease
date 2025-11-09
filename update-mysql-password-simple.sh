#!/bin/bash

# Simple script to update MySQL password to match .env.production exactly

set -e

echo "🔧 Updating MySQL Password"
echo "=========================="

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

# Get password from .env.production and trim it
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")

echo ""
echo "📋 Password from .env.production:"
echo "   DB_USER: $DB_USER"
echo "   DB_PASSWORD: $DB_PASSWORD"
echo "   Password length: ${#DB_PASSWORD} characters"

echo ""
echo "📝 Updating MySQL password..."
echo "   (You will be prompted for MySQL root password)"

# Create SQL file with properly escaped password
SQL_FILE="/tmp/update_mysql_password_simple.sql"
cat > "$SQL_FILE" << EOF
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;
EOF

if sudo mysql -u root -p < "$SQL_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ MySQL password updated!${NC}"
    rm -f "$SQL_FILE"
    
    # Test connection
    echo ""
    echo "📝 Testing connection..."
    if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
        echo -e "${RED}❌ Connection test failed${NC}"
    else
        echo -e "${GREEN}✅ Connection test successful!${NC}"
    fi
    
    # Test with Node.js
    echo ""
    echo "📝 Testing with Node.js..."
    cd server
    NODE_ENV=production node -e "
    const mysql = require('mysql2/promise');
    const path = require('path');
    require('dotenv').config({path: path.join(__dirname, '.env.production')});
    
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'therapease_user',
      password: process.env.DB_PASSWORD.trim(),
      database: process.env.DB_NAME || 'therapease_db',
      port: parseInt(process.env.DB_PORT || '3306')
    };
    
    mysql.createConnection(dbConfig)
      .then(conn => {
        console.log('✅ Node.js MySQL connection successful!');
        conn.end();
        process.exit(0);
      })
      .catch(err => {
        console.log('❌ Node.js MySQL connection failed:', err.message);
        process.exit(1);
      });
    " 2>&1
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "================================================"
        echo "📊 Summary"
        echo "================================================"
        echo -e "${GREEN}✅ SUCCESS! MySQL password updated and Node.js connection works!${NC}"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
        echo "   2. Check logs: pm2 logs therapease-api --lines 50"
        echo "   3. Look for 'Connected to MySQL database successfully'"
    else
        echo ""
        echo -e "${RED}❌ Node.js connection still failing${NC}"
        echo "   The password might need special handling."
    fi
else
    echo -e "${YELLOW}⚠️  Could not update automatically${NC}"
    echo "   Please run this manually:"
    echo ""
    echo "   sudo mysql -u root -p"
    echo "   ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
    rm -f "$SQL_FILE"
fi

