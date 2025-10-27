# 🚀 TherapEase Production Deployment Guide

This guide covers deploying and optimizing the TherapEase backend for production on a DigitalOcean Droplet, with integration to a Vercel-deployed frontend.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Optimizations Implemented](#optimizations-implemented)
- [Deployment Steps](#deployment-steps)
- [Security Configuration](#security-configuration)
- [Verifying API Connectivity](#verifying-api-connectivity)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

- DigitalOcean Droplet (Ubuntu 22.04 LTS)
- Domain configured: `therapease.site`
- Vercel account with frontend deployed
- SSH access to droplet
- Root or sudo access on droplet

## Optimizations Implemented

### ✅ 1. Gzip Compression
- Added `compression` middleware to Express.js
- Enabled Nginx gzip compression for static assets and API responses
- Configurable compression level (6) for optimal performance

### ✅ 2. PM2 Process Manager
- Configured PM2 with cluster mode (2 instances for load balancing)
- Memory limits: 1GB for API, 512MB for public website
- Auto-restart on crash with max 10 restarts
- Log aggregation and monitoring
- Node.js optimization flags

### ✅ 3. Nginx Reverse Proxy
- Optimized reverse proxy configuration
- Rate limiting (10 req/s for API, 5 req/min for login)
- WebSocket support for real-time features
- Health check endpoint
- Connection timeouts and buffer sizes optimized

### ✅ 4. CORS Security
- Restricted to Vercel frontend domains only
- Allowed origins:
  - `https://therapease-site.vercel.app` (Production)
  - `https://therapease-site-git-main-*.vercel.app` (Preview deployments)
  - `https://therapease.site` (Custom domain)
- Credentials enabled for authenticated requests

### ✅ 5. HTTPS & SSL
- Let's Encrypt certificates via Certbot
- Automatic certificate renewal
- HSTS headers configured
- TLS 1.2+ only

### ✅ 6. UFW Firewall
- Allow only necessary ports:
  - 22 (SSH)
  - 80 (HTTP)
  - 443 (HTTPS)
- Block all other incoming connections
- Enable fail2ban for brute-force protection

## Deployment Steps

### Step 1: Prepare Development Environment

```bash
# Clone repository
cd /path/to/therapease

# Install compression package
cd server
npm install compression@^1.7.4

# Update CORS configuration if needed
# Edit server/index.js to add your Vercel domain
```

### Step 2: Connect to Droplet

```bash
ssh root@167.71.199.133
```

### Step 3: Install Dependencies

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

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install UFW firewall
sudo apt install -y ufw
```

### Step 4: Setup UFW Firewall

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify firewall status
sudo ufw status
```

### Step 5: Deploy Application

```bash
# Create application directory
sudo mkdir -p /home/therapease
cd /home/therapease

# Clone repository (replace with your actual repo URL)
git clone https://github.com/your-username/therapease.git
cd therapease

# Install production dependencies
cd server
npm ci --production

# Create production environment file
nano .env.production
```

Update `.env.production` with:

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=YourSecurePassword123!
DB_NAME=therapease_db
DB_PORT=3306

# Security - REGENERATE THESE
JWT_SECRET=your_very_long_and_random_jwt_secret_here_min_32_chars
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here
SESSION_SECRET=your_random_session_secret_here

# CORS - Update with your Vercel URL
CORS_ORIGIN=https://therapease-site.vercel.app,https://therapease-site-git-main-*.vercel.app,https://therapease.site

# SSL
SSL_ENABLED=false

# Admin
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=YourSecureAdminPassword123!

# API Base URL
API_BASE_URL=https://api.therapease.site
REACT_APP_API_URL=https://api.therapease.site
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### Step 6: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx-therapease.conf /etc/nginx/sites-available/therapease

# Enable the site
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Get SSL certificates
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# Follow the prompts and enter your email

# Test automatic renewal
sudo certbot renew --dry-run

# Certbot will automatically update Nginx configuration
```

### Step 8: Start Application with PM2

```bash
# Navigate to project root
cd /home/therapease/therapease

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it provides

# Check status
pm2 status
pm2 logs
```

### Step 9: Configure Database

```bash
# Install MySQL if not already installed
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Create database and user
sudo mysql -u root -p

# In MySQL console:
CREATE DATABASE therapease_db;
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Security Configuration

### 1. Update Security Keys

```bash
# Generate secure random keys
openssl rand -base64 32  # For JWT_SECRET
openssl rand -hex 32     # For ENCRYPTION_KEY
openssl rand -base64 32  # For SESSION_SECRET
```

Update these in `.env.production`

### 2. Enable Fail2Ban

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Configure Automatic Security Updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## Verifying API Connectivity

### From Droplet (Local Testing)

```bash
# Test API health
curl http://localhost:5000/health

# Test with domain (after DNS propagation)
curl https://api.therapease.site/health

# Test CORS headers
curl -H "Origin: https://therapease-site.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://api.therapease.site/api/auth/test
```

### From Vercel Frontend

1. **Update Frontend Environment Variables in Vercel:**
   - Go to your Vercel project settings
   - Navigate to Environment Variables
   - Add: `VITE_API_URL=https://api.therapease.site`
   - Add: `VITE_CORS_ORIGIN=https://therapease-site.vercel.app`

2. **Redeploy Frontend** to apply changes

3. **Test from Browser Console:**
   ```javascript
   // Open browser console on your Vercel app
   fetch('https://api.therapease.site/health')
     .then(r => r.json())
     .then(console.log)
   ```

4. **Test Authentication Flow:**
   - Login with admin credentials
   - Verify API calls are successful
   - Check Network tab for any CORS errors

### Common Issues and Solutions

#### CORS Errors
```bash
# Check CORS configuration
sudo nano /home/therapease/.env.production

# Verify CORS_ORIGIN includes your Vercel URL
# Restart PM2 after changes
pm2 restart therapease-api
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### API Not Responding
```bash
# Check PM2 status
pm2 status

# Check PM2 logs
pm2 logs therapease-api --lines 100

# Restart application
pm2 restart therapease-api
```

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View logs in real-time
pm2 logs

# Monitor resources
pm2 monit

# View specific app info
pm2 info therapease-api

# Restart all apps
pm2 restart all
```

### Nginx Monitoring

```bash
# Check Nginx status
sudo systemctl status nginx

# View access logs
sudo tail -f /var/log/nginx/access.log

# View error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t
```

### Health Checks

Create a monitoring script:

```bash
#!/bin/bash
# health-check.sh
response=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/health)
if [ "$response" != "200" ]; then
    echo "Health check failed!"
    pm2 restart therapease-api
fi
```

Add to crontab:
```bash
crontab -e
# Add: */5 * * * * /path/to/health-check.sh
```

### Log Rotation

```bash
# Configure log rotation for PM2 logs
sudo nano /etc/logrotate.d/pm2

# Add:
/home/therapease/therapease/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 therapease therapease
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Production URLs

After deployment, your application will be available at:

- **Frontend**: https://therapease.site
- **API**: https://api.therapease.site
- **Health Check**: https://api.therapease.site/health
- **Public Website**: https://www.therapease.site

## Next Steps

1. ✅ Install compression middleware
2. ✅ Configure CORS for Vercel frontend
3. ✅ Setup PM2 for process management
4. ✅ Configure Nginx as reverse proxy
5. ✅ Enable HTTPS with Let's Encrypt
6. ✅ Configure UFW firewall
7. ✅ Test API connectivity from Vercel frontend
8. ✅ Setup monitoring and alerting
9. ✅ Configure log rotation
10. ✅ Enable automatic backups

## Support

For issues or questions:
- Check logs: `pm2 logs` and `sudo tail /var/log/nginx/error.log`
- Verify configuration: `sudo nginx -t` and `pm2 status`
- Test connectivity: Use curl commands above
- Check firewall: `sudo ufw status`

---

**🎉 Your TherapEase backend is now optimized and deployed for production!**
