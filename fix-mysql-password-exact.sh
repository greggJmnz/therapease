#!/bin/bash

# Script to fix MySQL password to match exactly what's in .env.production

set -e

echo "🔧 Fixing MySQL Password to Match .env.production Exactly"
echo "========================================================="

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

# Get password from .env.production
DB_PASSWORD=$(grep "^DB_PASSWORD=" "$SERVER_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
DB_USER=$(grep "^DB_USER=" "$SERVER_ENV" | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs || echo "therapease_user")

echo ""
echo "📋 Password from .env.production:"
echo "   DB_USER: $DB_USER"
echo "   DB_PASSWORD: $DB_PASSWORD"
echo "   Password length: ${#DB_PASSWORD} characters"

# Check for special characters
if [[ "$DB_PASSWORD" == *"!"* ]] || [[ "$DB_PASSWORD" == *"@"* ]] || [[ "$DB_PASSWORD" == *"#"* ]]; then
    echo -e "${YELLOW}⚠️  Password contains special characters (!@#)${NC}"
    echo "   These may need special handling in MySQL"
fi

# Test current MySQL password
echo ""
echo "📝 Step 1: Testing current MySQL password..."
if mysql -h localhost -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" 2>&1 | grep -q "ERROR"; then
    echo -e "${RED}❌ Current password doesn't work${NC}"
    echo ""
    echo "📝 Step 2: Updating MySQL password to match .env.production exactly..."
    echo "   (You will be prompted for MySQL root password)"
    
    # Create SQL file with properly escaped password
    SQL_FILE="/tmp/update_mysql_password_exact.sql"
    cat > "$SQL_FILE" << EOF
-- Update password to match .env.production exactly
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASSWORD';
FLUSH PRIVILEGES;

-- Verify the user exists
SELECT User, Host FROM mysql.user WHERE User = '$DB_USER';
EOF
    
    if sudo mysql -u root -p < "$SQL_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ MySQL password updated!${NC}"
        rm -f "$SQL_FILE"
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
        read -p "   Press Enter after updating MySQL password manually..."
    fi
else
    echo -e "${GREEN}✅ Current password works!${NC}"
    echo ""
    echo "💡 The password works from command line but not from Node.js."
    echo "   This might be a special character encoding issue."
    echo ""
    echo "   Let's test with Node.js directly..."
fi

# Test with Node.js
echo ""
echo "📝 Step 3: Testing with Node.js..."
cd server
NODE_ENV=production node -e "
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({path: path.join(__dirname, '.env.production')});

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'therapease_db',
  port: parseInt(process.env.DB_PORT || '3306')
};

console.log('Testing with password:', dbConfig.password.substring(0, 10) + '... (' + dbConfig.password.length + ' chars)');

mysql.createConnection(dbConfig)
  .then(conn => {
    console.log('✅ Node.js MySQL connection successful!');
    conn.end();
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Node.js MySQL connection failed:', err.message);
    console.log('Error code:', err.code);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('');
      console.log('💡 The password works from command line but not from Node.js.');
      console.log('   This suggests the password in MySQL might be different.');
      console.log('   Or there might be a special character encoding issue.');
      console.log('');
      console.log('   Try updating MySQL password again with the exact value:');
      console.log('   ALTER USER \\'$DB_USER\\'@\\'localhost\\' IDENTIFIED BY \\'$DB_PASSWORD\\';');
    }
    process.exit(1);
  });
" 2>&1

echo ""
echo "================================================"
echo "📊 Summary"
echo "================================================"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js MySQL connection successful!${NC}"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Restart PM2: pm2 restart therapease-api --update-env"
    echo "   2. Check logs: pm2 logs therapease-api --lines 50"
    echo "   3. Look for 'Connected to MySQL database successfully'"
else
    echo -e "${RED}❌ Node.js MySQL connection still failing${NC}"
    echo ""
    echo "💡 The password might need to be updated in MySQL again."
    echo "   Or there might be a special character encoding issue."
    echo ""
    echo "   Try this:"
    echo "   1. Update MySQL password: sudo mysql -u root -p"
    echo "   2. Run: ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
    echo "   3. Run: FLUSH PRIVILEGES;"
    echo "   4. Test again with this script"
fi

