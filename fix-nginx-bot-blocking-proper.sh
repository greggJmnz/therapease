#!/bin/bash
# Fix Nginx Bot Blocking - Proper placement and syntax

set -e

echo "=========================================="
echo "  Fix Nginx Bot Blocking Properly"
echo "=========================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found: $NGINX_CONFIG"
    exit 1
fi

# Backup config
echo "1. Backing up nginx config..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo "✅ Backup created: $BACKUP_CONFIG"
echo ""

# Check current nginx config status
echo "2. Checking current nginx config..."
NGINX_TEST=$(nginx -t 2>&1 || true)
if echo "$NGINX_TEST" | grep -q "test is successful"; then
    echo "✅ Nginx config is valid"
else
    echo "⚠️  Nginx config has errors (will fix)"
    echo "Error:"
    echo "$NGINX_TEST" | grep -i "error\|directive" | head -3
fi
echo ""

# Find and remove incorrectly placed if statements
echo "3. Removing incorrectly placed if statements..."
# Find all if statements that might be in wrong places
# Remove if statements that are outside server blocks
sed -i '/^[[:space:]]*if.*block_bot/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*if.*host.*therapease/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*# Validate Host header/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*# Block bots FIRST/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*return 403/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*return 400/d' "$NGINX_CONFIG"
# Remove empty lines around removed blocks
sed -i '/^[[:space:]]*}[[:space:]]*$/d' "$NGINX_CONFIG"
sed -i '/^[[:space:]]*$/N;/^\n$/d' "$NGINX_CONFIG"
echo "✅ Removed incorrectly placed if statements"
echo ""

# Find server blocks
echo "4. Finding server blocks..."
FRONTEND_SERVER_START=$(grep -n "server_name.*therapease\.site.*www\.therapease\.site" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
API_SERVER_START=$(grep -n "server_name.*api\.therapease\.site" "$NGINX_CONFIG" | head -1 | cut -d: -f1)

if [ -z "$FRONTEND_SERVER_START" ]; then
    echo "❌ Could not find frontend server block"
    exit 1
fi

echo "✅ Found frontend server block at line $FRONTEND_SERVER_START"
if [ -n "$API_SERVER_START" ]; then
    echo "✅ Found API server block at line $API_SERVER_START"
fi
echo ""

# Find location blocks in frontend server
echo "5. Finding location blocks..."
FRONTEND_FIRST_LOC=$(grep -n "^[[:space:]]*location " "$NGINX_CONFIG" | awk -F: -v start="$FRONTEND_SERVER_START" '$1 > start {print $1; exit}')

if [ -z "$FRONTEND_FIRST_LOC" ]; then
    echo "❌ Could not find location blocks in frontend server"
    exit 1
fi

echo "✅ Found first location block at line $FRONTEND_FIRST_LOC"
echo ""

# Add bot blocking to location / block properly
echo "6. Adding bot blocking to location / block..."
if grep -A 10 "location / {" "$NGINX_CONFIG" | grep -q "if.*block_bot"; then
    echo "   ✅ Bot blocking already in location / block"
else
    # Find the exact line of "location / {" and add bot blocking right after it
    LOC_LINE=$(grep -n "^[[:space:]]*location / {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -n "$LOC_LINE" ]; then
        # Create bot blocking code
        cat > /tmp/bot_block_location.txt << 'EOF'
    # Block bots FIRST (before rate limiting)
    if ($block_bot) {
        return 403;
    }
EOF
        
        # Insert after location / { line
        awk -v n="$LOC_LINE" -v file="/tmp/bot_block_location.txt" '
            NR == n {
                print
                while ((getline line < file) > 0) {
                    print line
                }
                close(file)
                next
            }
            { print }
        ' "$NGINX_CONFIG" > "${NGINX_CONFIG}.tmp"
        mv "${NGINX_CONFIG}.tmp" "$NGINX_CONFIG"
        rm -f /tmp/bot_block_location.txt
        echo "   ✅ Added bot blocking to location / block"
    fi
fi

# Add bot blocking to location /api/ block
echo ""
echo "7. Adding bot blocking to location /api/ block..."
if grep -A 15 "location /api/ {" "$NGINX_CONFIG" | grep -q "if.*block_bot"; then
    echo "   ✅ Bot blocking already in location /api/ block"
else
    # Find the exact line of "location /api/ {" and add bot blocking right after it
    API_LOC_LINE=$(grep -n "^[[:space:]]*location /api/ {" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    
    if [ -n "$API_LOC_LINE" ]; then
        # Create bot blocking code
        cat > /tmp/bot_block_api.txt << 'EOF'
    # Block bots FIRST (before OPTIONS handling)
    if ($block_bot) {
        return 403;
    }
EOF
        
        # Insert after location /api/ { line
        awk -v n="$API_LOC_LINE" -v file="/tmp/bot_block_api.txt" '
            NR == n {
                print
                while ((getline line < file) > 0) {
                    print line
                }
                close(file)
                next
            }
            { print }
        ' "$NGINX_CONFIG" > "${NGINX_CONFIG}.tmp"
        mv "${NGINX_CONFIG}.tmp" "$NGINX_CONFIG"
        rm -f /tmp/bot_block_api.txt
        echo "   ✅ Added bot blocking to location /api/ block"
    fi
fi

# Test nginx config
echo ""
echo "8. Testing nginx configuration..."
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
    echo "Checking for common issues..."
    
    # Check for syntax errors
    if echo "$NGINX_TEST" | grep -q "directive is not allowed"; then
        ERROR_LINE=$(echo "$NGINX_TEST" | grep -o "line [0-9]*" | grep -o "[0-9]*" | head -1)
        if [ -n "$ERROR_LINE" ]; then
            echo "Error at line $ERROR_LINE:"
            sed -n "${ERROR_LINE}p" "$NGINX_CONFIG"
            echo ""
            echo "Context (lines $((ERROR_LINE-2))-$((ERROR_LINE+2))):"
            sed -n "$((ERROR_LINE-2)),$((ERROR_LINE+2))p" "$NGINX_CONFIG" | cat -n
        fi
    fi
    
    echo ""
    echo "⚠️  Script stopped. Please fix the nginx config manually or restore the backup."
    echo "Backup saved at: $BACKUP_CONFIG"
    echo ""
    echo "To restore backup:"
    echo "  sudo cp $BACKUP_CONFIG $NGINX_CONFIG"
    echo "  sudo nginx -t"
    echo "  sudo systemctl reload nginx"
    exit 1
fi

# Reload nginx
echo ""
echo "9. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Test bot blocking
echo ""
echo "10. Testing bot blocking..."
sleep 2

# Test with Go-http-client user agent
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "200" ]; then
    echo "❌ Bot blocking NOT working - still getting 200"
    echo "   This means the map isn't matching. Check the map configuration."
else
    echo "⚠️  Got HTTP $TEST_RESPONSE"
fi

echo ""
echo "=========================================="
echo "  Bot Blocking Fix Complete"
echo "=========================================="
echo ""
echo "If bot blocking still doesn't work:"
echo "1. Check if map is in http block: sudo nginx -T | grep -A 15 'map.*block_bot'"
echo "2. Verify map pattern matches: ~*Go-http-client should match 'Go-http-client/1.1'"
echo "3. Check logs: sudo tail -f /var/log/nginx/access.log | grep 'Go-http-client'"
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

