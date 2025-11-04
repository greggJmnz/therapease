#!/bin/bash
# Database connection check script
# Run this to verify your database credentials

echo "🔍 Checking database configuration..."
echo ""

# Check if .env file exists
if [ -f "server/.env.production" ]; then
    echo "✅ Found server/.env.production"
    echo ""
    echo "Current database configuration:"
    grep -E "^DB_|^DATABASE_" server/.env.production | sed 's/=.*/=***/' || echo "No DB_ variables found"
elif [ -f ".env" ]; then
    echo "✅ Found .env"
    echo ""
    echo "Current database configuration:"
    grep -E "^DB_|^DATABASE_" .env | sed 's/=.*/=***/' || echo "No DB_ variables found"
else
    echo "❌ No .env or .env.production file found!"
    echo ""
    echo "Please create a .env file with your database credentials:"
    echo "  DB_HOST=localhost"
    echo "  DB_USER=your_username"
    echo "  DB_PASSWORD=your_password"
    echo "  DB_NAME=your_database"
    echo "  DB_PORT=3306"
    exit 1
fi

echo ""
echo "📋 To fix database connection issues:"
echo ""
echo "1. Verify your MySQL credentials:"
echo "   mysql -u root -p"
echo ""
echo "2. Check if the user exists:"
echo "   SELECT User, Host FROM mysql.user WHERE User='therapease_user';"
echo ""
echo "3. If user doesn't exist, create it:"
echo "   CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'your_password';"
echo "   GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo ""
echo "4. If user exists but password is wrong, reset it:"
echo "   ALTER USER 'therapease_user'@'localhost' IDENTIFIED BY 'your_password';"
echo "   FLUSH PRIVILEGES;"
echo ""
echo "5. Update your .env file with correct credentials"
echo "6. Restart PM2: pm2 restart all"
echo ""

