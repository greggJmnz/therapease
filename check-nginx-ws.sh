#!/bin/bash

# Script to check if the /ws location block exists in the running Nginx config

echo "🔍 Checking Nginx Configuration for WebSocket Support"
echo "======================================================"

# Test Nginx config syntax
echo ""
echo "📋 Testing Nginx configuration syntax..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx configuration syntax is valid"
else
    echo "❌ Nginx configuration has syntax errors"
    sudo nginx -t
    exit 1
fi

# Check if /ws location block exists in running config
echo ""
echo "🔍 Checking for /ws location block in running config..."
if sudo nginx -T 2>/dev/null | grep -A 10 "location /ws" | grep -q "proxy_pass.*5000/ws"; then
    echo "✅ /ws location block found in running config"
    echo ""
    echo "📋 /ws location block details:"
    sudo nginx -T 2>/dev/null | grep -A 15 "location /ws" | head -20
else
    echo "❌ /ws location block NOT found in running config!"
    echo ""
    echo "📋 Checking all location blocks for 'ws':"
    sudo nginx -T 2>/dev/null | grep -B 2 -A 10 "location.*ws"
    exit 1
fi

# Check if map directive for connection_upgrade exists
echo ""
echo "🔍 Checking for connection_upgrade map directive..."
if sudo nginx -T 2>/dev/null | grep -A 5 "map.*connection_upgrade" | grep -q "connection_upgrade"; then
    echo "✅ connection_upgrade map directive found"
else
    echo "⚠️  Warning: connection_upgrade map directive not found"
    echo "   This might cause WebSocket connection issues"
fi

# Check which server block has /ws
echo ""
echo "🔍 Checking which server blocks have /ws location..."
echo "   Frontend (therapease.site):"
# Check if /ws exists after therapease.site server block starts
if sudo nginx -T 2>/dev/null | awk '/server_name.*therapease\.site/,/^}/ {if (/location \/ws/) found=1} END {exit !found}'; then
    echo "   ✅ /ws found in therapease.site server block"
else
    # Alternative check: count /ws blocks and verify at least one is in therapease.site context
    WS_COUNT=$(sudo nginx -T 2>/dev/null | grep -c "location /ws" || echo "0")
    if [ "$WS_COUNT" -ge 1 ]; then
        echo "   ✅ /ws location block exists (found $WS_COUNT total)"
    else
        echo "   ❌ /ws NOT found in therapease.site server block"
    fi
fi

echo ""
echo "   API (api.therapease.site):"
if sudo nginx -T 2>/dev/null | awk '/server_name.*api\.therapease\.site/,/^}/ {if (/location \/ws/) found=1} END {exit !found}'; then
    echo "   ✅ /ws found in api.therapease.site server block"
else
    echo "   ⚠️  /ws not found in api.therapease.site server block (this is OK if not needed)"
fi

echo ""
echo "✅ WebSocket configuration check completed!"

