#!/bin/bash

# Script to sync environment configurations between server and client

set -e

echo "🔄 Syncing Environment Configurations"
echo "======================================"

# Navigate to project directory
cd /home/therapease_user/therapease || {
    echo "❌ Error: Could not navigate to project directory"
    exit 1
}

SERVER_ENV="server/.env.production"
CLIENT_ENV="client/.env.production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure client .env.production exists
if [ ! -f "$CLIENT_ENV" ]; then
    echo "📝 Creating client/.env.production..."
    touch "$CLIENT_ENV"
fi

# Get VAPID_PUBLIC_KEY from server config
if [ -f "$SERVER_ENV" ]; then
    VAPID_PUBLIC_KEY=$(grep "^VAPID_PUBLIC_KEY=" "$SERVER_ENV" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs || echo "")
    
    if [ -n "$VAPID_PUBLIC_KEY" ]; then
        echo -e "${GREEN}✅ Found VAPID_PUBLIC_KEY in server config${NC}"
        
        # Update or add VITE_VAPID_PUBLIC_KEY in client config
        if grep -q "^VITE_VAPID_PUBLIC_KEY=" "$CLIENT_ENV" 2>/dev/null; then
            # Update existing
            sed -i "s|^VITE_VAPID_PUBLIC_KEY=.*|VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY|" "$CLIENT_ENV"
            echo -e "${GREEN}✅ Updated VITE_VAPID_PUBLIC_KEY in client config${NC}"
        else
            # Add new
            echo "VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY" >> "$CLIENT_ENV"
            echo -e "${GREEN}✅ Added VITE_VAPID_PUBLIC_KEY to client config${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  VAPID_PUBLIC_KEY not found in server config${NC}"
        echo "   Push notifications may not work until VAPID keys are generated"
    fi
fi

# Ensure VITE_API_URL is set correctly
if ! grep -q "^VITE_API_URL=" "$CLIENT_ENV" 2>/dev/null; then
    echo "VITE_API_URL=https://api.therapease.site/api" >> "$CLIENT_ENV"
    echo -e "${GREEN}✅ Added VITE_API_URL to client config${NC}"
else
    # Verify it's correct
    CURRENT_API_URL=$(grep "^VITE_API_URL=" "$CLIENT_ENV" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
    if [[ "$CURRENT_API_URL" != "https://api.therapease.site/api" ]]; then
        echo -e "${YELLOW}⚠️  VITE_API_URL is set to: $CURRENT_API_URL${NC}"
        echo "   Expected: https://api.therapease.site/api"
        read -p "   Update to correct value? (y/n): " UPDATE
        if [ "$UPDATE" = "y" ]; then
            sed -i "s|^VITE_API_URL=.*|VITE_API_URL=https://api.therapease.site/api|" "$CLIENT_ENV"
            echo -e "${GREEN}✅ Updated VITE_API_URL${NC}"
        fi
    else
        echo -e "${GREEN}✅ VITE_API_URL is correct${NC}"
    fi
fi

echo ""
echo "✅ Configuration sync completed!"
echo ""
echo "📋 Client .env.production contents:"
echo "-----------------------------------"
cat "$CLIENT_ENV"
echo ""

