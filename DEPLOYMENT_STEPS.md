# 🚀 TherapEase Production Deployment Steps

## Overview

This guide walks you through deploying the optimized TherapEase backend to your DigitalOcean Droplet.

## Prerequisites

- DigitalOcean Droplet running Ubuntu 22.04 LTS
- SSH access to the droplet
- Domain configured (therapease.site)
- Vercel frontend deployed

---

## Part 1: Local Preparation (On Your Mac)

### 1. Verify Changes Are Committed

```bash
git status
git add .
git commit -m "Optimize for production: CORS, compression, PM2 config"
git push origin main
```

### 2. Test Build Locally (Optional)

```bash
cd server
npm install
npm start  # Test locally, then Ctrl+C to stop
cd ..
```

---

## Part 2: Deploy to Droplet

### Step 1: Connect to Droplet

```bash
ssh root@167.71.199.133
```

### Step 2: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Node.js 18.x

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x.x
```

### Step 4: Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

### Step 5: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl status nginx
```

### Step 6: Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 7: Setup UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Step 8: Clone Repository

```bash
cd /home
git clone https://github.com/your-username/therapease.git
cd therapease
```

### Step 9: Install Server Dependencies

```bash
cd server
npm ci --production
cd ..
```

### Step 10: Create Production Environment File

```bash
cd server

# Create .env.production
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

# Security Keys - GENERATE THESE!
# JWT_SECRET=$(openssl rand -base64 32)
# ENCRYPTION_KEY=$(openssl rand -hex 32)
# SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=generate_with_openssl_rand_base64_32
ENCRYPTION_KEY=generate_with_openssl_rand_hex_32
SESSION_SECRET=generate_with_openssl_rand_base64_32

# CORS Configuration - Update with your Vercel URLs
CORS_ORIGIN=https://therapease-gnu5.vercel.app,https://therapease.site,https://www.therapease.site

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

# Generate secure keys
echo "🔐 Generating secure keys..."
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Update .env.production with generated keys
sed -i "s/generate_with_openssl_rand_base64_32/$JWT_SECRET/g" .env.production
sed -i "s/generate_with_openssl_rand_hex_32/$ENCRYPTION_KEY/g" .env.production
sed -i "2s/generate_with_openssl_rand_base64_32/$SESSION_SECRET/g" .env.production

echo "✅ Security keys generated and saved"

cd ..
```

### Step 11: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx-therapease.conf /etc/nginx/sites-available/therapease

# Create symbolic link
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 12: Setup SSL with Let's Encrypt

```bash
# Get SSL certificates
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# Follow the prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS

# Test certificate renewal
sudo certbot renew --dry-run
```

### Step 13: Start Application with PM2

```bash
# Navigate to project root
cd /home/therapease

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions it provides (usually: sudo env PATH=$PATH:...)

# Check status
pm2 status
pm2 logs
```

### Step 14: Verify Deployment

```bash
# Test API health
curl https://api.therapease.site/health

# Check PM2 status
pm2 status

# Check Nginx
sudo systemctl status nginx

# Check logs
pm2 logs therapease-api --lines 50
```

---

## Part 3: Verify API Connectivity from Vercel

### Test from Browser Console

Open your Vercel frontend in the browser and run in console:

```javascript
// Test health endpoint
fetch('https://api.therapease.site/health')
  .then(r => r.json())
  .then(console.log);
```

### Test Authentication

Try logging in from your Vercel frontend and verify:
- Login works
- API calls succeed
- No CORS errors in browser console

---

## Troubleshooting

### API Not Responding

```bash
# Check PM2
pm2 status
pm2 restart therapease-api

# Check Nginx
sudo nginx -t
sudo systemctl restart nginx

# Check logs
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

### CORS Errors

```bash
# Verify CORS_ORIGIN in .env.production
cat server/.env.production | grep CORS_ORIGIN

# Restart PM2
pm2 restart therapease-api
```

### SSL Issues

```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew

# Restart Nginx
sudo systemctl restart nginx
```

---

## Post-Deployment Checklist

- [ ] API health endpoint responds
- [ ] SSL certificate valid
- [ ] CORS working from Vercel frontend
- [ ] Authentication works
- [ ] PM2 monitoring configured
- [ ] Firewall rules active
- [ ] Logs rotating properly
- [ ] Backups configured (optional)

---

## Monitoring Commands

```bash
# PM2
pm2 status
pm2 logs
pm2 monit
pm2 info therapease-api

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System
df -h  # Disk space
free -h  # Memory
top  # CPU and processes
```

---

## Next Steps

1. Test all API endpoints from Vercel frontend
2. Monitor logs for errors
3. Setup log rotation
4. Configure backups (optional)
5. Setup monitoring alerts (optional)

---

**Your TherapEase backend is now live and optimized for production!** 🎉

