# 🌐 TherapEase Domain Setup Guide

This guide will help you configure your domain `therapease.site` to work with your DigitalOcean droplet.

## 📋 **Your Domain Configuration**

- **Main Domain**: therapease.site
- **API Subdomain**: api.therapease.site  
- **WWW Subdomain**: www.therapease.site
- **Droplet IP**: 167.71.199.133

## 🔧 **Step 1: Update DNS Records**

### **In your domain registrar (where you bought therapease.site):**

Add these DNS records:

```
Type: A
Name: @
Value: 167.71.199.133
TTL: 300

Type: A  
Name: www
Value: 167.71.199.133
TTL: 300

Type: A
Name: api
Value: 167.71.199.133
TTL: 300
```

## 🚀 **Step 2: Update Nginx Configuration on Droplet**

```bash
# Edit the Nginx configuration
sudo nano /etc/nginx/sites-available/therapease
```

**Update the server_name directives to:**
```nginx
# API Server
server_name api.therapease.site;

# Frontend
server_name therapease.site www.therapease.site;

# Public Website  
server_name www.therapease.site;
```

## 🔒 **Step 3: Set Up SSL Certificates**

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificates
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# Test automatic renewal
sudo certbot renew --dry-run
```

## ⚙️ **Step 4: Update Environment Variables**

```bash
# Edit the environment file
nano server/.env.production
```

**Update these values:**
```env
CORS_ORIGIN=https://therapease.site
API_BASE_URL=https://api.therapease.site
REACT_APP_API_URL=https://api.therapease.site
```

## 🎯 **Step 5: Restart Services**

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Restart PM2 processes
pm2 restart all
```

## 🧪 **Step 6: Test Your Domain**

### **Test DNS Resolution:**
```bash
# Test domain resolution
nslookup therapease.site
nslookup api.therapease.site
nslookup www.therapease.site
```

### **Test Application URLs:**
- **Frontend**: https://therapease.site
- **API**: https://api.therapease.site
- **Public Website**: https://www.therapease.site

## 📱 **Step 7: Update Client Configuration**

If you have any hardcoded URLs in your client code, update them to use the domain:

```javascript
// Update API endpoints
const API_URL = 'https://api.therapease.site';

// Update CORS settings
const CORS_ORIGIN = 'https://therapease.site';
```

## 🔧 **Troubleshooting**

### **DNS Not Working:**
- Wait 5-10 minutes for DNS propagation
- Check DNS records with: `nslookup therapease.site`
- Verify records in your domain registrar

### **SSL Certificate Issues:**
- Check certificate status: `sudo certbot certificates`
- Renew certificates: `sudo certbot renew`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### **Application Not Loading:**
- Check PM2 status: `pm2 status`
- Check PM2 logs: `pm2 logs`
- Test API directly: `curl https://api.therapease.site/health`

## 🎉 **Final Configuration**

After completing all steps, your TherapEase application will be available at:

- **Main Application**: https://therapease.site
- **API Endpoints**: https://api.therapease.site
- **Public Website**: https://www.therapease.site

## 🔐 **Security Features Enabled**

- ✅ SSL/TLS encryption
- ✅ Security headers
- ✅ CORS protection
- ✅ Rate limiting
- ✅ Firewall configuration

## 📞 **Support**

If you encounter issues:
1. Check DNS propagation: https://dnschecker.org
2. Verify SSL certificates: https://www.ssllabs.com/ssltest/
3. Check application logs: `pm2 logs`

---

**Your TherapEase application is now ready for production with your custom domain! 🚀**