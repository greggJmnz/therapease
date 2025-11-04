#!/bin/bash
# Remove backup files from nginx sites-enabled directory

set -e

echo "=========================================="
echo "  Remove Nginx Backup Files"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"

# Find all backup files
echo "1. Finding backup files in $NGINX_SITES_ENABLED..."
BACKUP_FILES=$(find "$NGINX_SITES_ENABLED" -name "*.backup*" -o -name "*backup*" 2>/dev/null || echo "")

if [ -z "$BACKUP_FILES" ]; then
    echo "✅ No backup files found"
else
    echo "⚠️  Found backup files:"
    echo "$BACKUP_FILES"
    echo ""
    
    echo "2. Removing backup files..."
    for backup in $BACKUP_FILES; do
        echo "   Removing: $backup"
        rm -f "$backup"
    done
    echo "✅ Backup files removed"
fi
echo ""

# List remaining files
echo "3. Files remaining in $NGINX_SITES_ENABLED:"
ls -la "$NGINX_SITES_ENABLED" | grep -v "^total"
echo ""

# Test nginx config
echo "4. Testing nginx configuration..."
NGINX_TEST=$(nginx -t 2>&1)
NGINX_TEST_EXIT=$?

if [ $NGINX_TEST_EXIT -eq 0 ] && echo "$NGINX_TEST" | grep -q "test is successful"; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo ""
    echo "Full error output:"
    echo "$NGINX_TEST"
    echo ""
    echo "⚠️  Please check the configuration manually"
    exit 1
fi

# Reload nginx
echo ""
echo "5. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

echo ""
echo "=========================================="
echo "  Backup Files Removal Complete"
echo "=========================================="

