#!/bin/bash

# Network Connectivity Test Script for Email SMTP
# Tests if SMTP ports are accessible

echo "🔍 Testing Network Connectivity to Gmail SMTP Servers..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test port 587 (STARTTLS)
echo "🧪 Testing Port 587 (STARTTLS)..."
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/587" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 587 is accessible${NC}"
    PORT_587_OPEN=true
else
    echo -e "${RED}❌ Port 587 is blocked or unreachable${NC}"
    PORT_587_OPEN=false
fi

# Test port 465 (SSL)
echo "🧪 Testing Port 465 (SSL)..."
if timeout 5 bash -c "echo > /dev/tcp/smtp.gmail.com/465" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 465 is accessible${NC}"
    PORT_465_OPEN=true
else
    echo -e "${RED}❌ Port 465 is blocked or unreachable${NC}"
    PORT_465_OPEN=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check firewall status
echo ""
echo "🔍 Checking Firewall Status..."
if command -v ufw &> /dev/null; then
    FIREWALL_STATUS=$(sudo ufw status | head -n 1)
    echo "   $FIREWALL_STATUS"
    
    if echo "$FIREWALL_STATUS" | grep -q "active"; then
        echo ""
        echo "💡 Firewall is active. Checking SMTP port rules..."
        if sudo ufw status | grep -q "587"; then
            echo -e "${GREEN}   ✅ Port 587 rule exists${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Port 587 rule not found${NC}"
            echo -e "${YELLOW}   💡 Run: sudo ufw allow 587/tcp${NC}"
        fi
        
        if sudo ufw status | grep -q "465"; then
            echo -e "${GREEN}   ✅ Port 465 rule exists${NC}"
        else
            echo -e "${YELLOW}   ⚠️  Port 465 rule not found${NC}"
            echo -e "${YELLOW}   💡 Run: sudo ufw allow 465/tcp${NC}"
        fi
    else
        echo -e "${YELLOW}   ⚠️  Firewall is inactive${NC}"
    fi
else
    echo "   ⚠️  UFW not installed or not available"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Summary and recommendations
echo ""
echo "📋 Summary:"
echo ""

if [ "$PORT_587_OPEN" = true ] && [ "$PORT_465_OPEN" = true ]; then
    echo -e "${GREEN}✅ Network connectivity is OK - ports are accessible${NC}"
    echo "   The issue may be:"
    echo "   1. Gmail blocking your server IP"
    echo "   2. Incorrect email credentials"
    echo "   3. Need app-specific password (not regular password)"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Verify you're using Gmail App Password: https://myaccount.google.com/apppasswords"
    echo "   2. Try using SendGrid or AWS SES instead (more reliable)"
else
    echo -e "${RED}❌ Network connectivity FAILED - ports are blocked${NC}"
    echo ""
    echo "💡 Fix firewall rules:"
    echo "   sudo ufw allow 587/tcp"
    echo "   sudo ufw allow 465/tcp"
    echo "   sudo ufw reload"
    echo ""
    echo "   Or test with telnet:"
    echo "   telnet smtp.gmail.com 587"
    echo "   (Should connect. If not, firewall is blocking)"
fi

# Test SendGrid connectivity if configured
if [ -f "server/.env.production" ] && grep -q "EMAIL_HOST=smtp.sendgrid.net" server/.env.production; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🧪 Testing SendGrid SMTP connectivity..."
    echo "Test 5: Testing SendGrid port 587..."
    if timeout 5 bash -c "echo > /dev/tcp/smtp.sendgrid.net/587" 2>/dev/null; then
        echo -e "${GREEN}✅ SendGrid port 587 is accessible${NC}"
        SENDGRID_587_OPEN=true
    else
        echo -e "${RED}❌ SendGrid port 587 is blocked or unreachable${NC}"
        SENDGRID_587_OPEN=false
    fi
    
    echo "Test 6: Testing SendGrid port 2525 (alternative)..."
    if timeout 5 bash -c "echo > /dev/tcp/smtp.sendgrid.net/2525" 2>/dev/null; then
        echo -e "${GREEN}✅ SendGrid port 2525 is accessible${NC}"
        SENDGRID_2525_OPEN=true
    else
        echo -e "${YELLOW}⚠️  SendGrid port 2525 is blocked (this is optional)${NC}"
        SENDGRID_2525_OPEN=false
    fi
    
    if [ "$SENDGRID_587_OPEN" = false ]; then
        echo ""
        echo -e "${RED}❌ SendGrid SMTP is blocked${NC}"
        echo "   This may be due to:"
        echo "   1. DigitalOcean firewall blocking outbound SMTP"
        echo "   2. Network restrictions"
        echo ""
        echo "💡 Solutions:"
        echo "   Option A: Use SendGrid API instead of SMTP (recommended)"
        echo "   Option B: Contact DigitalOcean support to allow outbound SMTP"
        echo "   Option C: Use SendGrid webhook/API integration"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Alternative: Use SendGrid (Recommended for Production)"
echo "   1. Sign up at: https://sendgrid.com (free tier: 100 emails/day)"
echo "   2. Get API key from SendGrid dashboard"
echo "   3. Update .env.production:"
echo "      EMAIL_HOST=smtp.sendgrid.net"
echo "      EMAIL_PORT=587"
echo "      EMAIL_SECURE=false"
echo "      EMAIL_REQUIRE_TLS=true"
echo "      EMAIL_USER=apikey"
echo "      EMAIL_PASSWORD=your-sendgrid-api-key"
echo ""
echo "   If SMTP is blocked, use SendGrid API instead:"
echo "   Option 1: Use port 2525 (alternative SendGrid port)"
echo "   Option 2: Implement SendGrid API client (requires code changes)"

