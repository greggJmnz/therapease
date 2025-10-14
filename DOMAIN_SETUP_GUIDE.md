# 🌐 TherapEase Domain Setup Guide

## 🎯 Your Custom Domain: `therapease.site`

This guide will help you configure your custom domain `therapease.site` with DigitalOcean App Platform.

## 📋 Domain Configuration Overview

### **Recommended Subdomain Structure:**
- **Main App**: `https://therapease.site` (Frontend)
- **API**: `https://api.therapease.site` (Backend API)
- **Public Website**: `https://www.therapease.site` (Marketing site)

## 🚀 Step 1: Configure Domain in DigitalOcean App Platform

### **In your DigitalOcean App Platform dashboard:**

1. **Go to your TherapEase app**
2. **Click on "Settings" tab**
3. **Click on "Domains" section**
4. **Add your domains:**

   **Add these domains:**
   - `therapease.site` (Main domain)
   - `api.therapease.site` (API subdomain)
   - `www.therapease.site` (WWW subdomain)

5. **DigitalOcean will automatically provision SSL certificates** for all domains

## 🔧 Step 2: DNS Configuration

### **In your domain registrar (where you bought therapease.site):**

**Add these DNS records:**

```
Type: A
Name: @
Value: [Your DigitalOcean App Platform IP]
TTL: 3600

Type: CNAME
Name: api
Value: [Your DigitalOcean App Platform URL]
TTL: 3600

Type: CNAME
Name: www
Value: [Your DigitalOcean App Platform URL]
TTL: 3600
```

### **Alternative DNS Configuration (if using DigitalOcean DNS):**

1. **Go to DigitalOcean DNS**
2. **Add domain**: `therapease.site`
3. **Add these records:**

```
Type: A
Name: @
Value: [Your App Platform IP]

Type: CNAME
Name: api
Value: [Your App Platform URL]

Type: CNAME
Name: www
Value: [Your App Platform URL]
```

## 🔄 Step 3: Update App Configuration

### **The app configuration has been updated with your domain:**

**Updated URLs:**
- **Frontend**: `https://therapease.site`
- **API**: `https://api.therapease.site`
- **Public Website**: `https://www.therapease.site`

**Updated Environment Variables:**
- `CORS_ORIGIN`: `https://therapease.site`
- `API_BASE_URL`: `https://api.therapease.site`
- `REACT_APP_API_URL`: `https://api.therapease.site`

## 📱 Step 4: Deploy Updated Configuration

### **Push the updated configuration:**

```bash
git add .
git commit -m "Update configuration for therapease.site domain"
git push origin main
```

### **Redeploy your app:**
1. **Go to DigitalOcean App Platform**
2. **Click "Actions" → "Force Rebuild"**
3. **Wait for deployment to complete**

## 🔐 Step 5: SSL Certificate Verification

### **DigitalOcean automatically provides SSL certificates, but verify:**

1. **Check SSL status** in your app dashboard
2. **Test HTTPS access** to all domains:
   - `https://therapease.site`
   - `https://api.therapease.site`
   - `https://www.therapease.site`

## 🧪 Step 6: Test Your Application

### **Test all endpoints:**

1. **Main Application**: Visit `https://therapease.site`
2. **API Health Check**: Visit `https://api.therapease.site/health`
3. **Public Website**: Visit `https://www.therapease.site`

### **Expected Results:**
- ✅ All domains load with HTTPS
- ✅ SSL certificates are valid
- ✅ API responds correctly
- ✅ Frontend connects to API
- ✅ No CORS errors

## 🔧 Step 7: Email Configuration (Optional)

### **If you want to use therapease.site for emails:**

**Update email settings:**
```env
EMAIL_FROM=noreply@therapease.site
VAPID_SUBJECT=mailto:admin@therapease.site
```

## 📊 Step 8: Monitoring and Analytics

### **Set up monitoring for your custom domain:**

1. **Google Analytics**: Add tracking code for `therapease.site`
2. **DigitalOcean Monitoring**: Monitor app performance
3. **SSL Monitoring**: Set up alerts for certificate expiration

## 🚨 Troubleshooting

### **Common Issues:**

1. **DNS Propagation**: Wait 24-48 hours for DNS changes
2. **SSL Certificate**: May take 10-15 minutes to provision
3. **CORS Errors**: Verify environment variables are updated
4. **Domain Not Loading**: Check DNS records and app status

### **Debug Steps:**

1. **Check DNS propagation**: Use `nslookup therapease.site`
2. **Test SSL**: Use SSL Labs SSL Test
3. **Check app logs**: Review DigitalOcean app logs
4. **Verify environment variables**: Ensure all URLs are updated

## 🎉 Success Checklist

- [ ] Domain added to DigitalOcean App Platform
- [ ] DNS records configured correctly
- [ ] SSL certificates provisioned
- [ ] App configuration updated
- [ ] App redeployed successfully
- [ ] All domains accessible via HTTPS
- [ ] API endpoints responding
- [ ] No CORS errors
- [ ] Email configuration updated (if needed)

## 🔗 Your Final URLs

After successful configuration:

- **Main App**: `https://therapease.site`
- **API**: `https://api.therapease.site`
- **Public Website**: `https://www.therapease.site`
- **Admin Login**: `https://therapease.site/admin`

## 💡 Pro Tips

1. **Use HTTPS everywhere**: All traffic should be encrypted
2. **Set up redirects**: Redirect HTTP to HTTPS
3. **Monitor performance**: Use DigitalOcean monitoring
4. **Backup regularly**: Set up automated backups
5. **Update DNS TTL**: Lower TTL for faster changes

---

**🎉 Congratulations! Your TherapEase application is now live on therapease.site!**
