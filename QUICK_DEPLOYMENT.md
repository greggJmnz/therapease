# 🚀 TherapEase Quick Deployment Guide

## One-Command Deployment

For experienced users who want to deploy quickly:

### 1. Connect to Your Droplet
```bash
ssh root@167.71.199.133
```

### 2. Run Automated Setup
```bash
# Download and run the automated deployment script
curl -o automated-deploy.sh https://raw.githubusercontent.com/your-username/therapease/main/automated-deploy.sh
chmod +x automated-deploy.sh
sudo ./automated-deploy.sh
```

### 3. Clone and Setup Application
```bash
# Switch to therapease user
su - therapease

# Clone repository (replace with your actual repository URL)
git clone https://github.com/your-username/therapease.git
cd therapease

# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build
cd ../public-website && npm install

# Copy environment file
cp /home/therapease/.env.production server/.env.production

# Start application
pm2 start ecosystem.config.js
pm2 save
```

### 4. Configure Domain (Optional)
```bash
# Run domain configuration helper
./configure-domain.sh

# Follow the DNS setup instructions
# Then set up SSL certificates
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site
```

### 5. Verify Deployment
```bash
# Run verification script
curl -o verify-deployment.sh https://raw.githubusercontent.com/your-username/therapease/main/verify-deployment.sh
chmod +x verify-deployment.sh
./verify-deployment.sh
```

## 🎉 Done!

Your TherapEase application is now live at:
- **Frontend**: http://167.71.199.133 (or https://therapease.site if domain configured)
- **API**: http://167.71.199.133/api (or https://api.therapease.site if domain configured)
- **Public Website**: http://167.71.199.133:8080 (or https://www.therapease.site if domain configured)

**Admin Login:**
- Email: admin@therapease.com
- Password: SecureAdmin2024!@#$

## 📋 What Was Installed

- ✅ Ubuntu 22.04 LTS with latest updates
- ✅ Node.js 18.x with PM2 process manager
- ✅ MySQL 8.0 with secure configuration
- ✅ Nginx with reverse proxy setup
- ✅ UFW firewall with proper rules
- ✅ SSL-ready configuration
- ✅ Automated update scripts

## 🔧 Useful Commands

```bash
# Check application status
pm2 status

# View logs
pm2 logs

# Restart application
pm2 restart all

# Update application
/home/therapease/update-therapease.sh

# Check system resources
htop

# Check Nginx status
sudo systemctl status nginx

# Check MySQL status
sudo systemctl status mysql
```

## 🆘 Troubleshooting

If something goes wrong:

1. **Check logs**: `pm2 logs`
2. **Restart services**: `pm2 restart all`
3. **Check Nginx**: `sudo nginx -t`
4. **Check MySQL**: `sudo systemctl status mysql`
5. **Check firewall**: `sudo ufw status`

## 📞 Support

For detailed instructions, see: `COMPLETE_DEPLOYMENT_GUIDE.md`

---

**Total deployment time: ~15-20 minutes** ⏱️
