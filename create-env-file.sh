#!/bin/bash

echo "🔧 TherapEase .env File Creation Helper"
echo "======================================"

# Check if .env already exists
if [ -f "server/.env" ]; then
    echo "⚠️  server/.env already exists!"
    echo "Current contents:"
    cat server/.env
    echo ""
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Aborted. Please manually edit server/.env if needed."
        exit 1
    fi
fi

echo "📝 Creating server/.env file..."
echo "Please provide the correct database credentials:"
echo ""

# Get database credentials from user
read -p "Database Username (default: therapease_user): " DB_USER
DB_USER=${DB_USER:-therapease_user}

read -s -p "Database Password: " DB_PASS
echo ""

read -p "Database Name (default: therapease_db): " DB_NAME
DB_NAME=${DB_NAME:-therapease_db}

read -p "Database Host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Server Port (default: 5000): " PORT
PORT=${PORT:-5000}

# Create the .env file
cat > server/.env << EOF
# Database Configuration
DB_HOST=${DB_HOST}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}

# Server Configuration
PORT=${PORT}

# Encryption Key (if needed)
ENCRYPTION_KEY=your_encryption_key_here

# Other Configuration
NODE_ENV=production
EOF

echo ""
echo "✅ Created server/.env file with the following configuration:"
echo "   DB_HOST: ${DB_HOST}"
echo "   DB_USER: ${DB_USER}"
echo "   DB_PASSWORD: [HIDDEN]"
echo "   DB_NAME: ${DB_NAME}"
echo "   PORT: ${PORT}"
echo ""
echo "📄 File contents:"
cat server/.env
echo ""
echo "💡 Next steps:"
echo "1. Verify the credentials are correct"
echo "2. Run: ./fix-restart-and-test.sh"
echo "3. Test: node test-all-endpoints.js"
