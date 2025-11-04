#!/bin/bash
# Fix Bot Blocking - Ensure bots are blocked with 403 instead of 400

set -e

echo "=========================================="
echo "  Fix Bot Blocking Configuration"
echo "=========================================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-enabled/therapease"
BACKUP_CONFIG="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Backup config
echo "1. Backing up nginx config..."
cp "$NGINX_CONFIG" "$BACKUP_CONFIG"
echo "✅ Backup created: $BACKUP_CONFIG"
echo ""

# Check if bot blocking map exists
echo "2. Checking bot blocking configuration..."
if grep -q "map.*block_bot" "$NGINX_CONFIG"; then
    echo "✅ Bot blocking map exists"
else
    echo "❌ Bot blocking map not found - will add it"
fi

# Check if bot blocking is in location blocks
echo ""
echo "3. Checking location blocks for bot blocking..."
LOCATION_BOT_BLOCK=$(grep -A 5 "location / {" "$NGINX_CONFIG" | grep -c "block_bot" || true)
LOCATION_API_BOT_BLOCK=$(grep -A 5 "location /api/ {" "$NGINX_CONFIG" | grep -c "block_bot" || true)

if [ "$LOCATION_BOT_BLOCK" -gt 0 ]; then
    echo "✅ Bot blocking in location / block"
else
    echo "⚠️  Bot blocking NOT in location / block - will add"
fi

if [ "$LOCATION_API_BOT_BLOCK" -gt 0 ]; then
    echo "✅ Bot blocking in location /api/ block"
else
    echo "⚠️  Bot blocking NOT in location /api/ block - will add"
fi

# Check for 400 error sources (invalid Host headers)
echo ""
echo "4. Checking for invalid Host headers..."
if grep -q "server_name" "$NGINX_CONFIG"; then
    echo "✅ Server names configured"
else
    echo "⚠️  Server names not found"
fi

# Add bot blocking to location blocks if needed
echo ""
echo "5. Adding bot blocking to location blocks..."

# Check if we need to add bot blocking to location /
if ! grep -A 5 "location / {" "$NGINX_CONFIG" | grep -q "block_bot"; then
    echo "   Adding bot blocking to location / block..."
    
    # Create temp file with bot blocking added to location /
    python3 << 'PYTHON_SCRIPT'
import re
import sys

config_file = "/etc/nginx/sites-enabled/therapease"
with open(config_file, 'r') as f:
    content = f.read()

# Pattern to match location / block (not /api/ or other paths)
# We need to be careful to match only the root location block
pattern = r'(location / \{[^}]*?)(limit_req|try_files|proxy_pass)'

def add_bot_block(match):
    location_block = match.group(1)
    next_directive = match.group(2)
    
    # Check if bot blocking already exists
    if 'block_bot' in location_block:
        return match.group(0)
    
    # Add bot blocking before the next directive
    bot_block = """    # Block bots FIRST (before rate limiting)
    if ($block_bot) {
        return 403;
    }
    
    """
    
    return location_block + bot_block + next_directive

# Replace location / block
new_content = re.sub(pattern, add_bot_block, content, flags=re.DOTALL)

# Also handle case where location / block is on multiple lines
pattern2 = r'(location / \{)\s*\n\s*(limit_req|try_files|proxy_pass)'
def add_bot_block2(match):
    location_start = match.group(1)
    next_directive = match.group(2)
    
    bot_block = """    # Block bots FIRST (before rate limiting)
    if ($block_bot) {
        return 403;
    }
    
    """
    
    return location_start + "\n" + bot_block + "    " + next_directive

new_content = re.sub(pattern2, add_bot_block2, new_content)

with open(config_file, 'w') as f:
    f.write(new_content)

print("✅ Added bot blocking to location / block")
PYTHON_SCRIPT

else
    echo "   ✅ Bot blocking already in location / block"
fi

# Add bot blocking to location /api/ if needed
if ! grep -A 10 "location /api/ {" "$NGINX_CONFIG" | grep -q "block_bot"; then
    echo "   Adding bot blocking to location /api/ block..."
    
    # Create temp file with bot blocking added to location /api/
    python3 << 'PYTHON_SCRIPT'
import re
import sys

config_file = "/etc/nginx/sites-enabled/therapease"
with open(config_file, 'r') as f:
    content = f.read()

# Pattern to match location /api/ block
# We need to add bot blocking BEFORE OPTIONS handling
pattern = r'(location /api/ \{[^}]*?)(if.*OPTIONS|limit_req|proxy_pass)'

def add_bot_block_api(match):
    location_block = match.group(1)
    next_directive = match.group(2)
    
    # Check if bot blocking already exists
    if 'block_bot' in location_block:
        return match.group(0)
    
    # Add bot blocking before the next directive
    bot_block = """    # Block bots FIRST (before OPTIONS handling)
    if ($block_bot) {
        return 403;
    }
    
    """
    
    return location_block + bot_block + next_directive

# Replace location /api/ block
new_content = re.sub(pattern, add_bot_block_api, content, flags=re.DOTALL)

# Also handle case where location /api/ block is on multiple lines
pattern2 = r'(location /api/ \{)\s*\n\s*(if.*OPTIONS|limit_req|proxy_pass)'
def add_bot_block_api2(match):
    location_start = match.group(1)
    next_directive = match.group(2)
    
    bot_block = """    # Block bots FIRST (before OPTIONS handling)
    if ($block_bot) {
        return 403;
    }
    
    """
    
    return location_start + "\n" + bot_block + "    " + next_directive

new_content = re.sub(pattern2, add_bot_block_api2, new_content)

with open(config_file, 'w') as f:
    f.write(new_content)

print("✅ Added bot blocking to location /api/ block")
PYTHON_SCRIPT

else
    echo "   ✅ Bot blocking already in location /api/ block"
fi

# Test nginx config
echo ""
echo "6. Testing nginx configuration..."
if nginx -t 2>&1 | grep -q "test is successful"; then
    echo "✅ Nginx configuration test passed"
else
    echo "❌ Nginx configuration test failed!"
    echo "Restoring backup..."
    cp "$BACKUP_CONFIG" "$NGINX_CONFIG"
    echo "❌ Changes reverted. Please check the configuration manually."
    exit 1
fi

# Reload nginx
echo ""
echo "7. Reloading nginx..."
if systemctl reload nginx; then
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Failed to reload nginx!"
    exit 1
fi

# Verify bot blocking works
echo ""
echo "8. Testing bot blocking..."
TEST_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: Go-http-client/1.1" http://localhost/ 2>/dev/null || echo "000")

if [ "$TEST_RESPONSE" = "403" ]; then
    echo "✅ Bot blocking working! Got 403 for Go-http-client"
elif [ "$TEST_RESPONSE" = "400" ]; then
    echo "⚠️  Still getting 400 - may need additional fixes (check Host headers)"
else
    echo "⚠️  Got HTTP $TEST_RESPONSE - verify manually"
fi

echo ""
echo "=========================================="
echo "  Bot Blocking Fix Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check logs: sudo tail -f /var/log/nginx/access.log | grep 'Go-http-client'"
echo "2. Should see 403 errors instead of 400"
echo "3. If still seeing 400, check for invalid Host headers"
echo ""
echo "Backup saved at: $BACKUP_CONFIG"

