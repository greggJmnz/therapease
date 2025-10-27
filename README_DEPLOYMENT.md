# 🚀 TherapEase Deployment Guide

## ⚠️ Important: Don't Run deploy-production.sh Locally!

The `deploy-production.sh` script caused permission errors because it's designed to run on your **DigitalOcean Droplet**, not on your local macOS machine.

## Correct Deployment Workflow

### On Your Local Machine (macOS)

**Do this first** to prepare your code:

```bash
# 1. Make sure all changes are committed
git add .
git commit -m "Production optimizations: CORS, compression, PM2"
git push origin main

# 2. That's it! Now proceed to droplet deployment
```

### On Your DigitalOcean Droplet

**Follow these steps on the droplet**:

1. **Connect to droplet**:
   ```bash
   ssh root@167.71.199.133
   ```

2. **Follow the complete step-by-step guide**:
   ```bash
   # See DEPLOYMENT_STEPS.md for detailed instructions
   cat DEPLOYMENT_STEPS.md
   ```

   Or follow the guide in `DEPLOYMENT_STEPS.md` file.

---

## Quick Reference: Key Deployment Steps on Droplet

```bash
# 1. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# 4. Setup Firewall
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable

# 5. Clone your repo
cd /home
git clone https://github.com/your-username/therapease.git
cd therapease

# 6. Install dependencies
cd server && npm ci --production && cd ..

# 7. Create .env.production with secure keys
cd server
# (Follow DEPLOYMENT_STEPS.md for exact commands)
cd ..

# 8. Configure Nginx
sudo cp nginx-therapease.conf /etc/nginx/sites-available/therapease
sudo ln -sf /etc/nginx/sites-available/therapease /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. Setup SSL
sudo certbot --nginx -d therapease.site -d www.therapease.site -d api.therapease.site

# 10. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions

# 11. Verify
curl https://api.therapease.site/health
```

---

## What to Do Now

Since you already ran the script locally, you can ignore those permission errors. They happened because the script tried to install PM2 globally on macOS without sudo.

**Next Steps**:
1. ✅ Your code is already optimized
2. ✅ CORS is configured correctly
3. ✅ Compression middleware is added
4. ✅ PM2 config is ready

**Now you need to**:
1. Commit and push your changes
2. Connect to your droplet
3. Follow `DEPLOYMENT_STEPS.md` on the droplet

---

## Files Ready for Deployment

✅ `server/index.js` - CORS configured  
✅ `server/package.json` - Compression added  
✅ `ecosystem.config.js` - PM2 optimized  
✅ `nginx-therapease.conf` - Nginx ready  
✅ `env.production.template` - Environment template  
✅ `DEPLOYMENT_STEPS.md` - Deployment guide  

---

## TL;DR

The error you saw is normal - the script was designed for the droplet. Just follow `DEPLOYMENT_STEPS.md` when you're on your droplet. Don't worry about the local errors! 🎉

