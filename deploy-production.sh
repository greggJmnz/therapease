#!/bin/bash
# TherapEase Production Deployment Script
# This script optimizes and deploys the backend to DigitalOcean Droplet

set -e  # Exit on error

echo "🚀 Starting TherapEase Production Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DROPLET_IP="167.71.199.133"
DOMAIN="therapease.site"
API_DOMAIN="api.therapease.site"

echo -e "${BLUE}📋 Configuration:${NC}"
echo "  Droplet IP: $DROPLET_IP"
echo "  Domain: $DOMAIN"
echo "  API Domain: $API_DOMAIN"

# Step 1: Clean dependencies
echo -e "\n${BLUE}🧹 Step 1: Cleaning dependencies...${NC}"
cd server
npm ci --production  # Install only production dependencies
echo -e "${GREEN}✅ Dependencies cleaned${NC}"

# Step 2: Install compression package if not already installed
echo -e "\n${BLUE}📦 Step 2: Installing compression middleware...${NC}"
npm install compression@^1.7.4 --save
echo -e "${GREEN}✅ Compression middleware installed${NC}"

# Step 3: Create production environment file
echo -e "\n${BLUE}⚙️  Step 3: Creating production environment file...${NC}"
cat > .env.production << 'EOF'
# TherapEase Production Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=TherapEase2025!@#
DB_NAME=therapease_db
DB_PORT=3306

# Security Keys - REGENERATE THESE FOR PRODUCTION
JWT_SECRET=change_this_jwt_secret_in_production_use_long_random_string
ENCRYPTION_KEY=change_this_encryption_key_in_production_64_chars_hex
SESSION_SECRET=change_this_session_secret_in_production

# CORS Configuration - Allow Vercel frontend
CORS_ORIGIN=https://therapease-site.vercel.app,https://therapease-site-git-main-*.vercel.app,https://therapease.site

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false
OPENAI_API_KEY=

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$

# API Base URL
API_BASE_URL=https://api.therapease.site
REACT_APP_API_URL=https://api.therapease.site
EOF
echo -e "${GREEN}✅ Production environment file created${NC}"
echo -e "${YELLOW}⚠️  Remember to update security keys in .env.production!${NC}"

cd ..

# Step 4: Verify PM2 (will be installed on droplet)
echo -e "\n${BLUE}🔧 Step 4: Verifying PM2 configuration...${NC}"
if [ -f "ecosystem.config.js" ]; then
    echo -e "${GREEN}✅ PM2 ecosystem config found${NC}"
    echo -e "${YELLOW}ℹ️  PM2 will be installed on the droplet during deployment${NC}"
else
    echo -e "${RED}❌ PM2 ecosystem config missing${NC}"
    exit 1
fi

# Step 5: Create deployment instructions
cat > DEPLOYMENT_INSTRUCTIONS.md << 'DEPLOYMENT_EOF'
# 🚀 TherapEase Production Deployment Instructions

## Prerequisites
- DigitalOcean Droplet (Ubuntu 22.04 LTS)
- Domain configured (therapease.site)
- SSH access to droplet

## Deployment Steps

### 1. Connect to Droplet
```bash
ssh root@167.71.199.133
```

### 2. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install UFW (Firewall)
sudo apt install -y ufw
```

### 3. Setup UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### 4. Configure Nginx
```bash
# Copy Nginx configuration
sudo cp nginx-therapease.conf /etc/nginx/sites-available/therapease
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Setup SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# Test automatic renewal
sudo certbot renew --dry-run
```

### 6. Deploy Application
```bash
# Clone repository (if not already done)
cd /home
git clone https://github.com/your-username/therapease.git
cd therapease

# Install dependencies
cd server
npm ci --production
cd ..

# Copy production environment file
cp server/.env.production.example server/.env.production
# Edit and update security keys in server/.env.production

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Verify Deployment
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Test API endpoints
curl http://localhost:5000/health
curl https://api.therapease.site/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 8. Configure Vercel Frontend
Update your Vercel environment variables:
- `VITE_API_URL=https://api.therapease.site`

### 9. Test API Connectivity
From your Vercel frontend, test API endpoints:
- Login endpoint
- Health check endpoint
- Authentication flows

## Monitoring

### PM2 Commands
```bash
pm2 status          # View status
pm2 logs            # View logs
pm2 restart all     # Restart all processes
pm2 monit           # Monitor resources
pm2 info therapease-api  # View app info
```

### Nginx Commands
```bash
sudo nginx -t                    # Test configuration
sudo systemctl status nginx      # Check status
sudo systemctl restart nginx      # Restart Nginx
sudo tail -f /var/log/nginx/access.log
```

### UFW Commands
```bash
sudo ufw status
sudo ufw allow <port>
sudo ufw deny <port>
```

## Troubleshooting

### API Not Responding
1. Check PM2 status: `pm2 status`
2. Check logs: `pm2 logs therapease-api`
3. Check database connection
4. Verify environment variables

### SSL Certificate Issues
1. Check certificate: `sudo certbot certificates`
2. Renew certificate: `sudo certbot renew`
3. Check Nginx config: `sudo nginx -t`

### CORS Errors
1. Verify CORS origin in server/.env.production
2. Check Vercel frontend URL
3. Check browser console for exact error

## Security Checklist
- [ ] UFW firewall enabled
- [ ] SSL certificates configured
- [ ] Security keys regenerated
- [ ] CORS configured for Vercel domain only
- [ ] Database credentials changed
- [ ] Admin password changed
- [ ] PM2 monitoring enabled
- [ ] Log rotation configured

## Production URLs
- Frontend: https://therapease.site
- API: https://api.therapease.site
- Health Check: https://api.therapease.site/health
DEPLOYMENT_EOF

echo -e "${GREEN}✅ Deployment instructions created in DEPLOYMENT_INSTRUCTIONS.md${NC}"

# Step 6: Create verification script
cat > verify-production.sh << 'VERIFY_EOF'
#!/bin/bash
# Production Deployment Verification Script

echo "🔍 Verifying TherapEase Production Deployment..."

# Test PM2
echo "Testing PM2..."
pm2 status

# Test API
echo "Testing API..."
curl -f http://localhost:5000/health || echo "❌ API health check failed"

# Test Nginx
echo "Testing Nginx..."
sudo nginx -t

# Test SSL
echo "Testing SSL..."
curl -I https://api.therapease.site/health || echo "❌ HTTPS failed"

# Test UFW
echo "Testing UFW..."
sudo ufw status

# Test CORS
echo "Testing CORS..."
curl -H "Origin: https://therapease-site.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://api.therapease.site/api/auth/test

echo "✅ Verification complete!"
VERIFY_EOF

chmod +x verify-production.sh
echo -e "${GREEN}✅ Verification script created${NC}"

echo -e "\n${GREEN}🎉 Production optimization complete!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review DEPLOYMENT_INSTRUCTIONS.md"
echo "2. Update security keys in server/.env.production"
echo "3. Run: ssh root@$DROPLET_IP"
echo "4. Follow deployment instructions on the droplet"
echo "5. Run: ./verify-production.sh to verify deployment"

echo -e "\n${BLUE}📝 Important:${NC}"
echo "- Update CORS_ORIGIN with your actual Vercel frontend URL"
echo "- Regenerate all security keys"
echo "- Enable SSL with Let's Encrypt"
echo "- Configure UFW firewall"
echo "- Test API connectivity from Vercel frontend"
