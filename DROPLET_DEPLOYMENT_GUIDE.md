# 🚀 DigitalOcean Droplet Manual Deployment Guide

This guide will help you deploy TherapEase to your DigitalOcean Droplet (Ubuntu 25.04 x64) using manual setup.

## 📋 Your Droplet Specifications
- **OS**: Ubuntu 25.04 x64
- **CPU**: 1 Intel CPU
- **RAM**: 2 GB
- **Storage**: 70 GB NVMe SSD
- **Transfer**: 2 TB
- **Cost**: $16/month

## 🎯 Prerequisites
- DigitalOcean Droplet created and running
- Root access to your droplet (password authentication)
- Domain name (optional but recommended)
- Your TherapEase code repository

## 🔐 Step 1: Initial Server Setup

### 1.1 Connect to Your Droplet
```bash
# Connect via SSH (replace YOUR_DROPLET_IP with your actual IP)
ssh root@YOUR_DROPLET_IP

# Or if you have a non-root user
ssh username@YOUR_DROPLET_IP
```

### 1.2 Update System Packages
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

### 1.3 Create Application User (Security Best Practice)
```bash
# Create a dedicated user for the application
sudo adduser therapease
sudo usermod -aG sudo therapease

# Switch to the new user
su - therapease
```

## 🟢 Step 2: Install Node.js

### 2.1 Install Node.js 18.x (LTS)
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 2.2 Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
# Follow the instructions provided by PM2
```

## 🗄️ Step 3: Install and Configure MySQL

### 3.1 Install MySQL Server
```bash
# Install MySQL
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation
```

**During MySQL secure installation, choose:**
- Set root password: **Yes** (choose a strong password)
- Remove anonymous users: **Yes**
- Disallow root login remotely: **Yes**
- Remove test database: **Yes**
- Reload privilege tables: **Yes**

### 3.2 Create Database and User
```bash
# Login to MySQL as root
sudo mysql -u root -p

# Create database and user (replace PASSWORD with a strong password)
CREATE DATABASE therapease_db;
CREATE USER 'therapease_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON therapease_db.* TO 'therapease_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.3 Configure MySQL for Production
```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add/modify these settings:
[mysqld]
bind-address = 127.0.0.1
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
query_cache_size = 64M
query_cache_type = 1

# Restart MySQL
sudo systemctl restart mysql
sudo systemctl enable mysql
```

## 🌐 Step 4: Install and Configure Nginx

### 4.1 Install Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

### 4.2 Configure Firewall
```bash
# Configure UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

## 📁 Step 5: Deploy Application Code

### 5.1 Clone Repository
```bash
# Navigate to home directory
cd /home/therapease

# Clone your repository (replace with your actual repository URL)
git clone https://github.com/your-username/therapease.git
cd therapease

# Install dependencies
cd server && npm install
cd ../client && npm install
cd ../public-website && npm install
```

### 5.2 Build Frontend
```bash
# Build the React frontend
cd /home/therapease/therapease/client
npm run build
```

## ⚙️ Step 6: Configure Environment Variables

### 6.1 Create Production Environment File
```bash
# Create production environment file
cd /home/therapease/therapease/server
nano .env.production
```

### 6.2 Add Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_USER=therapease_user
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=therapease_db
DB_PORT=3306

# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Security Keys (Generate new ones for production)
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SESSION_SECRET=your_session_secret_here

# CORS Configuration
CORS_ORIGIN=http://YOUR_DROPLET_IP:3000

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
```

### 6.3 Generate Secure Keys
```bash
# Generate secure keys (run this on your local machine or on the server)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

## 🚀 Step 7: Configure PM2 for Production

### 7.1 Create PM2 Ecosystem File
```bash
# Create PM2 configuration
cd /home/therapease/therapease
nano ecosystem.config.js
```

### 7.2 PM2 Configuration
```javascript
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './server/index.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_file: './server/.env.production',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'therapease-public',
      script: './public-website/server.js',
      cwd: '/home/therapease/therapease',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      error_file: './logs/public-error.log',
      out_file: './logs/public-out.log',
      log_file: './logs/public-combined.log',
      time: true
    }
  ]
};
```

### 7.3 Create Logs Directory and Start Applications
```bash
# Create logs directory
mkdir -p /home/therapease/therapease/logs

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

## 🌐 Step 8: Configure Nginx Reverse Proxy

### 8.1 Create Nginx Configuration
```bash
# Create Nginx configuration for TherapEase
sudo nano /etc/nginx/sites-available/therapease
```

### 8.2 Nginx Configuration
```nginx
# API Server (Port 5000)
server {
    listen 80;
    server_name YOUR_DROPLET_IP api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend (Static Files)
server {
    listen 80;
    server_name YOUR_DROPLET_IP yourdomain.com;

    root /home/therapease/therapease/client/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# Public Website (Port 8080)
server {
    listen 80;
    server_name www.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 8.3 Enable Site and Test Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🗄️ Step 9: Initialize Database

### 9.1 Run Database Migrations
```bash
# Navigate to server directory
cd /home/therapease/therapease/server

# Run database setup (if you have a setup script)
npm run setup:production

# Or manually run the database initialization
node -e "
const db = require('./config/database');
db.initializeDatabase().then(() => {
  console.log('Database initialized successfully');
  process.exit(0);
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
"
```

## 🔒 Step 10: Set Up SSL with Let's Encrypt (Optional but Recommended)

### 10.1 Install Certbot
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 10.2 Obtain SSL Certificate
```bash
# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🧪 Step 11: Test Your Deployment

### 11.1 Check All Services
```bash
# Check PM2 processes
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql

# Check logs
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

### 11.2 Test Application Endpoints
```bash
# Test API
curl http://YOUR_DROPLET_IP/api/health

# Test frontend
curl http://YOUR_DROPLET_IP

# Test public website
curl http://YOUR_DROPLET_IP:8080
```

## 🔧 Step 12: Production Optimizations

### 12.1 Configure Log Rotation
```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 12.2 Set Up Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop
```

### 12.3 Configure Automatic Updates
```bash
# Install unattended-upgrades
sudo apt install -y unattended-upgrades

# Configure automatic security updates
sudo dpkg-reconfigure -plow unattended-upgrades
```

## 🚨 Troubleshooting

### Common Issues and Solutions

1. **Port Already in Use**:
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :5000
   # Kill the process if needed
   sudo kill -9 PID
   ```

2. **Permission Issues**:
   ```bash
   # Fix ownership
   sudo chown -R therapease:therapease /home/therapease/therapease
   ```

3. **Database Connection Issues**:
   ```bash
   # Check MySQL status
   sudo systemctl status mysql
   # Check MySQL logs
   sudo tail -f /var/log/mysql/error.log
   ```

4. **Nginx Configuration Issues**:
   ```bash
   # Test configuration
   sudo nginx -t
   # Check Nginx logs
   sudo tail -f /var/log/nginx/error.log
   ```

## 📊 Monitoring and Maintenance

### Daily Tasks
- Check PM2 status: `pm2 status`
- Monitor logs: `pm2 logs`
- Check disk space: `df -h`

### Weekly Tasks
- Update system packages: `sudo apt update && sudo apt upgrade`
- Check SSL certificate expiry: `sudo certbot certificates`
- Review application logs for errors

### Monthly Tasks
- Review and clean old logs
- Check database size and performance
- Update application dependencies

## 🎉 Congratulations!

Your TherapEase application is now deployed on your DigitalOcean Droplet! 

### Access URLs:
- **Frontend**: `http://YOUR_DROPLET_IP` or `https://yourdomain.com`
- **API**: `http://YOUR_DROPLET_IP/api` or `https://api.yourdomain.com`
- **Public Website**: `http://YOUR_DROPLET_IP:8080` or `https://www.yourdomain.com`

### Default Admin Credentials:
- **Email**: admin@therapease.com
- **Password**: SecureAdmin2024!@#$

### Next Steps:
1. Change default admin password
2. Configure your domain DNS to point to your droplet IP
3. Set up SSL certificates if using a domain
4. Configure email/SMS services if needed
5. Set up monitoring and backups

## 📞 Support

For issues:
- Check PM2 logs: `pm2 logs`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check MySQL logs: `sudo tail -f /var/log/mysql/error.log`
- Monitor system resources: `htop`

---

**Happy Deploying! 🚀**
