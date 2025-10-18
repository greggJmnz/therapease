# 🚀 Complete TherapEase Deployment Guide
## DigitalOcean Droplet Setup & Hosting

This guide will walk you through deploying TherapEase on a DigitalOcean Droplet from start to finish. All commands are tested and verified to work.

---

## 📋 Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- Basic terminal/SSH knowledge
- Git repository access

---

## 🖥️ Part 1: Droplet Setup

### Step 1: Create DigitalOcean Droplet

1. **Log into DigitalOcean** and click "Create Droplet"
2. **Choose Configuration:**
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (minimum 2GB RAM, 1 vCPU)
   - **Datacenter**: Choose closest to your users
   - **Authentication**: SSH Key (recommended) or Password
   - **Hostname**: `therapease-server`

3. **Create Droplet** and note the IP address (e.g., `167.71.199.133`)

### Step 2: Connect to Your Droplet

```bash
# Replace with your actual IP address
ssh root@167.71.199.133
```

**Expected Output:**
```
Welcome to Ubuntu 22.04 LTS (GNU/Linux 5.15.0-xxx-generic x86_64)
```

---

## 🔧 Part 2: System Configuration

### Step 3: Update System Packages

```bash
# Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y
```

**Expected Output:**
```
Reading package lists... Done
Building dependency tree... Done
Calculating upgrade... Done
The following packages will be upgraded:
  [list of packages]
```

### Step 4: Install Essential Packages

```bash
# Install essential development tools
sudo apt install -y curl wget git unzip software-properties-common \
    apt-transport-https ca-certificates gnupg lsb-release \
    build-essential python3 python3-pip
```

**Expected Output:**
```
Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  [list of packages]
```

### Step 5: Install Node.js 18.x

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

**Expected Output:**
```
v18.17.0
9.6.7
```

### Step 6: Install PM2 Globally

```bash
# Install PM2 process manager
sudo npm install -g pm2

# Verify installation
pm2 --version
```

**Expected Output:**
```
5.3.0
```

### Step 7: Install MySQL Server

```bash
# Install MySQL
sudo apt install -y mysql-server

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure MySQL installation
sudo mysql_secure_installation
```

**During MySQL secure installation, answer:**
- Set root password: **Y** (choose a strong password)
- Remove anonymous users: **Y**
- Disallow root login remotely: **Y**
- Remove test database: **Y**
- Reload privilege tables: **Y**

### Step 8: Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

**Expected Output:**
```
● nginx.service - A high performance web server and a reverse proxy server
     Active: active (running)
```

---

## 🔒 Part 3: Security Setup

### Step 9: Configure Firewall

```bash
# Install UFW firewall
sudo apt install -y ufw

# Configure firewall rules
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000  # API port
sudo ufw allow 8080  # Public website port

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

**Expected Output:**
```
Status: active
To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
5000                       ALLOW       Anywhere
8080                       ALLOW       Anywhere
```

### Step 10: Create Application User

```bash
# Create therapease user
sudo adduser --disabled-password --gecos "" therapease

# Add to sudo group
sudo usermod -aG sudo therapease

# Switch to therapease user
su - therapease
```

---

## 🗄️ Part 4: Database Setup

### Step 11: Configure MySQL Database

```bash
# Connect to MySQL as root
sudo mysql -u root -p
```

**Run these SQL commands in MySQL:**

```sql
-- Create database
CREATE DATABASE therapease_db;

-- Create user
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';

-- Grant privileges
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';

-- Flush privileges
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

**Expected Output:**
```
Query OK, 1 row affected (0.00 sec)
Query OK, 0 rows affected (0.00 sec)
Query OK, 0 rows affected (0.00 sec)
Query OK, 0 rows affected (0.00 sec)
```

---

## 📦 Part 5: Project Deployment

### Step 12: Clone Repository

```bash
# Navigate to home directory
cd /home/therapease

# Clone your repository (replace with your actual repository URL)
git clone https://github.com/your-username/therapease.git

# Navigate to project directory
cd therapease
```

### Step 13: Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Install public website dependencies
cd ../public-website
npm install

# Return to project root
cd ..
```

**Expected Output:**
```
added 170 packages, and audited 171 packages in 15s
added 946 packages, and audited 947 packages in 45s
added 15 packages, and audited 16 packages in 3s
```

### Step 14: Build Frontend

```bash
# Build React application
cd client
npm run build
```

**Expected Output:**
```
Creating an optimized production build...
Compiled successfully.

File sizes after gzip:
  520 kB    build/static/js/main.xxx.js
  32.95 kB  build/static/css/main.xxx.css

The build folder is ready to be deployed.
```

### Step 15: Configure Environment Variables

```bash
# Navigate to server directory
cd ../server

# Create production environment file
nano .env.production
```

**Add this content to `.env.production`:**

```env
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=YourStrongPassword123!
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security Keys (Generate these)
JWT_SECRET=your_jwt_secret_here_64_characters_long
ENCRYPTION_KEY=your_encryption_key_here_64_characters_long
SESSION_SECRET=your_session_secret_here_32_characters_long

# CORS Configuration
CORS_ORIGIN=https://therapease.site

# SSL Configuration
SSL_ENABLED=false

# Optional Services
EMAIL_ENABLED=false
SMS_ENABLED=false
OPENAI_API_KEY=your_openai_key_if_needed

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@therapease.com

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$

# API Base URL
API_BASE_URL=https://api.therapease.site

# Client Configuration
REACT_APP_API_URL=https://api.therapease.site
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key
```

**Generate secure keys:**

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 16: Initialize Database

```bash
# Navigate to server directory
cd /home/therapease/therapease/server

# Initialize database
npm run setup:db

# Seed database
npm run db:seed
```

**Expected Output:**
```
✅ Connected to MySQL database successfully
✅ Database tables created successfully
✅ Secure admin account created successfully
```

---

## 🌐 Part 6: Nginx Configuration

### Step 17: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /home/therapease/therapease/nginx-therapease.conf /etc/nginx/sites-available/therapease

# Enable the site
sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t
```

**Expected Output:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 18: Restart Nginx

```bash
# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx
```

---

## 🚀 Part 7: Process Management with PM2

### Step 19: Configure PM2

```bash
# Navigate to project root
cd /home/therapease/therapease

# Create logs directory
mkdir -p logs

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Expected Output:**
```
[PM2] Starting ecosystem.config.js
[PM2] Process therapease-api started
[PM2] Process therapease-public started
[PM2] Saving current process list...
[PM2] Successfully saved in /home/therapease/.pm2/dump.pm2
```

### Step 20: Verify PM2 Status

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs
```

**Expected Output:**
```
┌─────┬─────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id  │ name                │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├─────┼─────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0   │ therapease-api      │ default     │ 1.0.0   │ fork    │ 1234     │ 0s     │ 0    │ online    │ 0%       │ 45.2mb   │ therapease│ disabled │
│ 1   │ therapease-public   │ default     │ 1.0.0   │ fork    │ 1235     │ 0s     │ 0    │ online    │ 0%       │ 12.1mb   │ therapease│ disabled │
└─────┴─────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 🔍 Part 8: Testing and Verification

### Step 21: Test API Endpoints

```bash
# Test API health endpoint
curl http://localhost:5000/health

# Test API with external IP
curl http://167.71.199.133/api/health
```

**Expected Output:**
```json
{
  "status": "OK",
  "message": "TherapEase API is running",
  "database": "mysql",
  "encryption": "AES-256-GCM",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Step 22: Test Frontend

```bash
# Test frontend
curl http://167.71.199.133

# Test public website
curl http://167.71.199.133:8080
```

**Expected Output:**
```html
<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>TherapEase - Therapy Management System</title>
```

### Step 23: Check Application Logs

```bash
# Check PM2 logs
pm2 logs therapease-api
pm2 logs therapease-public

# Check Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🌍 Part 9: Domain Configuration (Optional)

### Step 24: Configure Domain (if you have one)

1. **Point your domain to the droplet IP:**
   - `therapease.site` → `167.71.199.133`
   - `api.therapease.site` → `167.71.199.133`

2. **Update Nginx configuration:**

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/therapease
```

**Update server_name directives:**
```nginx
server_name therapease.site www.therapease.site;
# and
server_name api.therapease.site;
```

3. **Test and reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Part 10: SSL Certificate Setup (Optional)

### Step 25: Install Certbot

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site
```

**Expected Output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/therapease.site/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/therapease.site/privkey.pem
```

### Step 26: Auto-renewal Setup

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 🔄 Part 11: Update Automation (Optional)

### Step 27: Create Update Script

```bash
# Create update script
nano /home/therapease/update-therapease.sh
```

**Add this content:**

```bash
#!/bin/bash
cd /home/therapease/therapease
git pull origin main
cd server && npm install
cd ../client && npm install && npm run build
cd ../public-website && npm install
pm2 restart all
echo "TherapEase updated successfully!"
```

```bash
# Make executable
chmod +x /home/therapease/update-therapease.sh

# Test the script
/home/therapease/update-therapease.sh
```

---

## 🎉 Part 12: Final Verification

### Step 28: Complete System Test

```bash
# Check all services
sudo systemctl status nginx
sudo systemctl status mysql
pm2 status

# Test all endpoints
curl -I http://167.71.199.133
curl -I http://167.71.199.133/api/health
curl -I http://167.71.199.133:8080

# Check disk space
df -h

# Check memory usage
free -h
```

### Step 29: Access Your Application

**Your TherapEase application is now live at:**

- **Frontend**: `http://167.71.199.133` or `https://therapease.site`
- **API**: `http://167.71.199.133/api` or `https://api.therapease.site`
- **Public Website**: `http://167.71.199.133:8080`

**Default Admin Login:**
- **Email**: `admin@therapease.com`
- **Password**: `SecureAdmin2024!@#$`

---

## 🛠️ Troubleshooting

### Common Issues and Solutions

#### 1. **Port Already in Use**
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>
```

#### 2. **Database Connection Failed**
```bash
# Check MySQL status
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql

# Check database exists
mysql -u therapease_user -p -e "SHOW DATABASES;"
```

#### 3. **PM2 Process Crashed**
```bash
# Check PM2 logs
pm2 logs

# Restart all processes
pm2 restart all

# Check for errors
pm2 show therapease-api
```

#### 4. **Nginx Configuration Error**
```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### 5. **Permission Issues**
```bash
# Fix ownership
sudo chown -R therapease:therapease /home/therapease/therapease

# Fix permissions
chmod -R 755 /home/therapease/therapease
```

---

## 📊 Monitoring Commands

### Useful Commands for Monitoring

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check PM2 processes
pm2 monit

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# View application logs
pm2 logs --lines 100

# Check firewall status
sudo ufw status verbose
```

---

## 🔧 Maintenance Commands

### Regular Maintenance

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /home/therapease/therapease
npm update

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Clean up logs
pm2 flush
sudo journalctl --vacuum-time=7d
```

---

## ✅ Deployment Checklist

- [ ] DigitalOcean Droplet created
- [ ] SSH access configured
- [ ] System packages updated
- [ ] Node.js 18.x installed
- [ ] PM2 installed globally
- [ ] MySQL installed and secured
- [ ] Nginx installed and configured
- [ ] Firewall configured
- [ ] Application user created
- [ ] Database created and configured
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Frontend built
- [ ] Environment variables configured
- [ ] PM2 processes started
- [ ] Nginx configuration applied
- [ ] All endpoints tested
- [ ] SSL certificate installed (optional)
- [ ] Domain configured (optional)
- [ ] Monitoring setup
- [ ] Backup strategy implemented

---

## 🎯 Success Indicators

Your deployment is successful when:

1. ✅ **API Health Check**: `curl http://your-ip/api/health` returns 200 OK
2. ✅ **Frontend Loads**: Browser shows TherapEase interface
3. ✅ **Database Connected**: No connection errors in logs
4. ✅ **PM2 Processes**: All processes show "online" status
5. ✅ **Nginx Running**: No configuration errors
6. ✅ **Admin Login**: Can access admin dashboard
7. ✅ **SSL Working**: HTTPS redirects properly (if configured)
8. ✅ **Domain Resolves**: Custom domain points to your app

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `pm2 logs` and `sudo journalctl -u nginx`
2. **Verify configuration**: Test each component individually
3. **Check permissions**: Ensure proper file ownership
4. **Review firewall**: Confirm ports are open
5. **Test database**: Verify MySQL connection

---

## 🎉 Congratulations!

Your TherapEase application is now successfully deployed and running on your DigitalOcean Droplet! 

The system is production-ready with:
- ✅ Secure database configuration
- ✅ Process management with PM2
- ✅ Reverse proxy with Nginx
- ✅ SSL encryption (if configured)
- ✅ Firewall protection
- ✅ Automatic restarts
- ✅ Comprehensive logging

Your therapy management system is now live and ready to serve patients and therapists! 🚀
