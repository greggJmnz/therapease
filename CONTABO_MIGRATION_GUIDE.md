# 🚀 TherapEase Migration Guide: Vercel + DigitalOcean → Contabo

This guide will help you migrate TherapEase from:
- **Current**: Client on Vercel + Server on DigitalOcean Droplet
- **Target**: Both Client and Server on Contabo (IP: 62.72.47.195)

---

## 📋 Prerequisites

- [ ] Contabo VPS/Server (IP: 62.72.47.195)
- [ ] SSH access to Contabo server
- [ ] Domain name configured (therapease.site)
- [ ] DNS access to update records
- [ ] Backup of current database
- [ ] Current environment variables documented

---

## 🎯 Migration Overview

### Current Setup
- **Frontend**: Vercel (therapease.site)
- **Backend**: DigitalOcean Droplet (api.therapease.site)
- **Database**: MySQL on DigitalOcean

### Target Setup
- **Frontend**: Contabo (therapease.site) - Served by Nginx
- **Backend**: Contabo (api.therapease.site) - Node.js + PM2
- **Database**: MySQL on Contabo (same server)

---

## 📦 Part 1: Contabo Server Setup

### Step 1: Connect to Contabo Server

```bash
# Replace with your Contabo server IP
ssh root@62.72.47.195
# Or if using a different user:
ssh your-username@62.72.47.195
```

### Step 2: Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 3: Install Essential Packages

```bash
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip
```

### Step 4: Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version
```

### Step 5: Install PM2 Globally

```bash
sudo npm install -g pm2
pm2 --version
```

### Step 6: Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### Step 7: Install Certbot (for SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Step 8: Install MySQL (if not already installed)

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Create database and user (same as DigitalOcean)
sudo mysql -u root -p
```

In MySQL:

```sql
CREATE DATABASE therapease_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YourSecurePassword';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 9: Setup UFW Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 📥 Part 2: Migrate Application Code

### Step 10: Clone Repository

```bash
cd /home
# Create application user (optional but recommended)
sudo adduser therapease_user
sudo usermod -aG sudo therapease_user

# Switch to application user
su - therapease_user
cd /home/therapease_user

# Clone repository
git clone https://github.com/greggJmnz/therapease.git
cd therapease
```

### Step 11: Install Server Dependencies

```bash
cd server
npm ci --production
cd ..
```

### Step 12: Install Client Dependencies

```bash
cd client
npm ci
cd ..
```

### Step 13: Build Client for Production

```bash
cd client

# Set environment variable for build
export VITE_API_URL=https://api.therapease.site/api

# Build the client
npm run build

# Verify build output
ls -la dist/
cd ..
```

**Important**: The build output is in `dist/` (Vite uses `dist`, not `build`)

### Step 14: Migrate Database

#### Option A: Export from DigitalOcean and Import to Contabo

```bash
# On DigitalOcean server (or local machine with DB access)
mysqldump -u therapease_user -p therapease_db > therapease_backup.sql

# Transfer to Contabo server
scp therapease_backup.sql root@62.72.47.195:/home/

# On Contabo server
mysql -u therapease_user -p therapease_db < /home/therapease_backup.sql
```

#### Option B: Export from DigitalOcean directly to Contabo

```bash
# On Contabo server
mysqldump -h YOUR_DIGITALOCEAN_IP -u therapease_user -p therapease_db | \
  mysql -u therapease_user -p therapease_db
```

---

## ⚙️ Part 3: Configure Environment Variables

### Step 15: Create Production Environment File

```bash
cd /home/therapease_user/therapease/server
nano .env.production
```

**Copy your existing `.env.production` from DigitalOcean** and update:

```env
# TherapEase Production Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration (now on same server)
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=YourSecurePassword
DB_NAME=therapease_db
DB_PORT=3306

# Security Keys (keep same as DigitalOcean)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SESSION_SECRET=your_session_secret_here

# CORS Configuration - Update for Contabo
# Since both client and API are on same server, we can use same domain
CORS_ORIGIN=https://therapease.site,https://www.therapease.site,https://api.therapease.site

# API Base URL (for client)
API_BASE_URL=https://api.therapease.site

# Email Configuration (keep same)
EMAIL_ENABLED=true
EMAIL_USE_API=true
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=therapease16@gmail.com
EMAIL_FROM_NAME=TherapEase

# SSL Configuration
SSL_ENABLED=false

# Optional Services
SMS_ENABLED=false
OPENAI_API_KEY=your_openai_key_if_using

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdminPassword
```

### Step 16: Create Client Environment File (Optional)

```bash
cd /home/therapease_user/therapease/client
nano .env.production
```

```env
VITE_API_URL=https://api.therapease.site/api
```

---

## 🌐 Part 4: Configure Nginx

### Step 17: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/therapease
```

Copy the following configuration (updated for Contabo):

```nginx
# Rate limiting zones - Add these to /etc/nginx/nginx.conf if not already there
# Add to http block in /etc/nginx/nginx.conf:
# limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
# limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# API Server (Port 5000) - https://api.therapease.site
server {
    listen 80;
    server_name api.therapease.site;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Rate limiting
    location / {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support for API subdomain
    location /ws {
        proxy_pass http://localhost:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Stricter rate limiting for login endpoints
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint (no rate limiting)
    location /api/health {
        proxy_pass http://localhost:5000/api/health;
        access_log off;
    }
}

# Frontend (Static Files) - https://therapease.site
server {
    listen 80 default_server;
    server_name therapease.site www.therapease.site;

    # Updated path: Vite builds to 'dist', not 'build'
    root /home/therapease_user/therapease/client/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Main application - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache control for HTML files
        location ~* \.html$ {
            expires 1h;
            add_header Cache-Control "public, no-cache";
        }
    }

    # Static assets with long-term caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Handle CORS for static assets
        add_header Access-Control-Allow-Origin "*";
    }

    # API proxy for frontend (optional - can use api.therapease.site directly)
    location /api/ {
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support - proxy to API server
    location /ws {
        proxy_pass http://localhost:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host api.therapease.site;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

# Public Website - http://www.therapease.site:8080 (if needed)
server {
    listen 8080;
    server_name www.therapease.site;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Step 18: Add Rate Limiting to Nginx Main Config

```bash
sudo nano /etc/nginx/nginx.conf
```

Add to the `http` block:

```nginx
http {
    # ... existing configuration ...
    
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    
    # ... rest of configuration ...
}
```

### Step 19: Enable Nginx Site

```bash
# Create symlink
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

### Step 20: Fix File Permissions

```bash
# Set proper ownership
sudo chown -R therapease_user:therapease_user /home/therapease_user/therapease

# Ensure nginx can read client files
sudo chmod -R 755 /home/therapease_user/therapease/client/dist
```

---

## 🚀 Part 5: Start Application Services

### Step 21: Update PM2 Configuration

```bash
cd /home/therapease_user/therapease
nano ecosystem.config.js
```

Ensure it's configured correctly:

```javascript
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: 'server/index.js',
      instances: 2, // Adjust based on server resources
      exec_mode: 'cluster',
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true,
      merge_logs: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', '*.log'],
      autorestart: true,
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size'
      ]
    },
    {
      name: 'therapease-public',
      script: 'public-website/server.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true,
      merge_logs: true,
      watch: false,
      autorestart: true
    }
  ]
};
```

### Step 22: Create Logs Directory

```bash
mkdir -p /home/therapease_user/therapease/logs
```

### Step 23: Start Application with PM2

```bash
cd /home/therapease_user/therapease

# Start services
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown
```

---

## 🔒 Part 6: Setup SSL (Let's Encrypt)

### Step 24: Obtain SSL Certificates

```bash
# Request certificates for all domains
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### Step 25: Verify SSL Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is set up automatically
# Check with:
sudo systemctl status certbot.timer
```

---

## 🌍 Part 7: Update DNS Records

### Step 26: Update DNS Records

**Important**: Update these DNS records to point to Contabo server (62.72.47.195):

1. **A Record**: `therapease.site` → `62.72.47.195`
2. **A Record**: `www.therapease.site` → `62.72.47.195`
3. **A Record**: `api.therapease.site` → `62.72.47.195`

**DNS Propagation**: Can take 24-48 hours, but usually updates within a few hours.

**Verify DNS**:
```bash
# Check DNS propagation
dig therapease.site
dig www.therapease.site
dig api.therapease.site

# Or use online tools:
# https://www.whatsmydns.net/
```

---

## 🧪 Part 8: Testing & Verification

### Step 27: Test API Server

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test from external IP
curl http://62.72.47.195/api/health

# Test with domain (after DNS propagates)
curl https://api.therapease.site/api/health
```

### Step 28: Test Frontend

```bash
# Test locally
curl http://localhost/

# Test from external IP
curl http://62.72.47.195/

# Test with domain (after DNS propagates)
curl https://therapease.site/
```

### Step 29: Verify Services

```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Check logs
pm2 logs therapease-api
sudo tail -f /var/log/nginx/error.log
```

### Step 30: Test Full Application

1. **Visit**: `https://therapease.site`
2. **Test Login**: Use admin credentials
3. **Test API Calls**: Check browser console for errors
4. **Test File Uploads**: Verify proof images work
5. **Test WebSocket**: Check real-time features

---

## 🔄 Part 9: Update Client Build Configuration

### Step 31: Update Client Environment Variables

Since the client is now on the same server, update the build:

```bash
cd /home/therapease_user/therapease/client

# Create/update .env.production
nano .env.production
```

```env
VITE_API_URL=https://api.therapease.site/api
```

### Step 32: Rebuild Client

```bash
# Rebuild with new environment
npm run build

# Verify build
ls -la dist/
```

### Step 33: Restart Services

```bash
# Restart PM2 services
pm2 restart all

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📝 Part 10: Post-Migration Checklist

### ✅ Verification Checklist

- [ ] API server responds at `https://api.therapease.site/api/health`
- [ ] Frontend loads at `https://therapease.site`
- [ ] Login works correctly
- [ ] File uploads work (proof images)
- [ ] WebSocket connections work
- [ ] Database queries work
- [ ] Email sending works (SendGrid)
- [ ] SSL certificates are valid
- [ ] PM2 services are running
- [ ] Nginx is serving correctly
- [ ] DNS records are updated
- [ ] All environment variables are set
- [ ] Logs are being written correctly

### 🔧 Maintenance Tasks

1. **Monitor Logs**:
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Update Application**:
   ```bash
   cd /home/therapease_user/therapease
   git pull origin main
   cd server && npm ci --production
   cd ../client && npm ci && npm run build
   pm2 restart all
   ```

3. **Backup Database**:
   ```bash
   # Create backup script
   mysqldump -u therapease_user -p therapease_db > /home/therapease_user/backups/therapease_$(date +%Y%m%d).sql
   ```

---

## 🚨 Troubleshooting

### Issue: Frontend shows blank page

**Solution**: Check that:
- Client build is in `dist/` directory (not `build/`)
- Nginx root path is correct: `/home/therapease_user/therapease/client/dist`
- File permissions are correct: `sudo chmod -R 755 /home/therapease_user/therapease/client/dist`

### Issue: API calls fail

**Solution**: Check:
- `VITE_API_URL` is set correctly in client build
- CORS is configured correctly in server
- Nginx proxy is working: `curl http://localhost:5000/api/health`

### Issue: Database connection fails

**Solution**: Verify:
- MySQL is running: `sudo systemctl status mysql`
- Database credentials in `.env.production` are correct
- Database was migrated successfully

### Issue: SSL certificate errors

**Solution**: 
- Check DNS records are updated
- Verify Certbot ran successfully: `sudo certbot certificates`
- Check Nginx config: `sudo nginx -t`

---

## 📞 Support

If you encounter issues during migration:

1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check server logs: `pm2 logs therapease-api`
4. Verify environment variables: `cat server/.env.production`
5. Test API directly: `curl http://localhost:5000/api/health`

---

## 🎉 Migration Complete!

After completing all steps:

1. ✅ Both client and server are running on Contabo
2. ✅ SSL certificates are configured
3. ✅ DNS records are updated
4. ✅ All services are running with PM2
5. ✅ Nginx is serving both client and API

**Next Steps**:
- Monitor the application for 24-48 hours
- Verify all features work correctly
- Set up automated backups
- Configure monitoring/alerts (optional)

---

**Last Updated**: 2025-01-XX
**Server IP**: 62.72.47.195
**Domains**: therapease.site, api.therapease.site

