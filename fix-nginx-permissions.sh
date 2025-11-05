#!/bin/bash
# Fix Nginx file permissions for client/dist directory

set -e

echo "=========================================="
echo "  Fix Nginx File Permissions"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

DIST_DIR="/home/therapease_user/therapease/client/dist"

if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Directory not found: $DIST_DIR"
    echo "   Make sure the frontend has been built"
    exit 1
fi

echo "1. Setting ownership to www-data:www-data..."
chown -R www-data:www-data "$DIST_DIR"
echo "✅ Ownership set"

echo ""
echo "2. Setting directory permissions..."
find "$DIST_DIR" -type d -exec chmod 755 {} \;
echo "✅ Directory permissions set (755)"

echo ""
echo "3. Setting file permissions..."
find "$DIST_DIR" -type f -exec chmod 644 {} \;
echo "✅ File permissions set (644)"

echo ""
echo "4. Verifying permissions..."
ls -ld "$DIST_DIR"
echo ""

echo "=========================================="
echo "  Permissions Fixed"
echo "=========================================="
echo ""
echo "✅ Nginx should now be able to access the files"
echo ""
echo "Test by reloading Nginx:"
echo "  sudo nginx -t"
echo "  sudo systemctl reload nginx"
echo ""

