# 🚀 DigitalOcean Deployment Guide for TherapEase

This guide will help you deploy your TherapEase application to DigitalOcean using the App Platform with managed MySQL database.

## 📋 Prerequisites

- DigitalOcean account
- GitHub repository with your TherapEase code
- Node.js 18+ installed locally (for generating environment variables)

## 🎯 Deployment Options

### Option 1: DigitalOcean App Platform (Recommended)
- **Cost**: ~$27-40/month
- **Features**: Fully managed, auto-scaling, automatic SSL
- **Best for**: Production deployments, easy maintenance

### Option 2: DigitalOcean Droplet + Managed MySQL
- **Cost**: ~$21-33/month
- **Features**: Full control, custom configurations
- **Best for**: Advanced users, custom requirements

## 🚀 Quick Deployment (App Platform)

### Step 1: Prepare Your Repository

1. **Update GitHub Repository URL**:
   ```bash
   # Edit .do/app.yaml and update the repository URL
   nano .do/app.yaml
   # Change: repo: your-username/therapease
   ```

2. **Generate Environment Variables**:
   ```bash
   node generate-env-vars.js
   ```

3. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Setup for DigitalOcean deployment"
   git push origin main
   ```

### Step 2: Create DigitalOcean App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select the main branch
5. DigitalOcean will auto-detect your `.do/app.yaml` configuration
6. Review the configuration and click "Next"

### Step 3: Configure Environment Variables

In the App Platform settings, add these environment variables:

**Required Variables** (from `env-vars-generated.txt`):
- `JWT_SECRET`: Your generated JWT secret
- `ENCRYPTION_KEY`: Your generated encryption key
- `SESSION_SECRET`: Your generated session secret
- `VAPID_PUBLIC_KEY`: Your generated VAPID public key
- `VAPID_PRIVATE_KEY`: Your generated VAPID private key

**Optional Variables**:
- `OPENAI_API_KEY`: Your OpenAI API key (for AI features)
- `EMAIL_ENABLED`: Set to "true" to enable email notifications
- `SMS_ENABLED`: Set to "true" to enable SMS notifications

### Step 4: Deploy

1. Click "Create Resources"
2. Wait for deployment to complete (5-10 minutes)
3. Your app will be available at the provided URLs

## 🔗 Application URLs

After deployment, your app will be available at:

- **Frontend**: `https://therapease.site`
- **API**: `https://api.therapease.site`
- **Public Website**: `https://www.therapease.site`

## 🗄️ Database Configuration

The managed MySQL database will be automatically:
- Created with MySQL 8.0
- Configured with proper security settings
- Connected to your application
- Backed up daily with 7-day retention

## 🔐 Security Features

Your deployed application includes:
- SSL/TLS encryption (automatic)
- JWT authentication
- Password hashing with bcrypt
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

## 📊 Monitoring and Logs

DigitalOcean App Platform provides:
- Application logs
- Performance metrics
- Error tracking
- Resource usage monitoring

## 🔧 Custom Domain (Optional)

To use your own domain:

1. **Add Domain in App Platform**:
   - Go to your app settings
   - Add your domain (e.g., `therapease.com`)

2. **Update DNS Records**:
   - Add CNAME record pointing to your app URL
   - DigitalOcean will automatically provision SSL certificate

3. **Update CORS Settings**:
   - Update `CORS_ORIGIN` in environment variables
   - Update `REACT_APP_API_URL` if needed

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check that all dependencies are in package.json
   - Ensure Node.js version compatibility
   - Review build logs in App Platform

2. **Database Connection Issues**:
   - Verify database credentials in environment variables
   - Check that database is in the same region as your app

3. **Environment Variable Issues**:
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify values are properly formatted

### Getting Help

1. Check DigitalOcean App Platform logs
2. Review application logs in the console
3. Verify environment variables are set correctly
4. Test database connection

## 💰 Cost Breakdown

### App Platform + Managed MySQL
- **App Platform**: $12-25/month (3 services)
- **Managed MySQL**: $15/month (Basic plan)
- **Total**: ~$27-40/month

### Scaling Options
- **Professional MySQL**: $30/month (2GB RAM, 25GB storage)
- **Larger App Instances**: $24-48/month (4GB+ RAM)
- **Multiple Regions**: Additional costs for global deployment

## 🔄 Updates and Maintenance

### Updating Your Application

1. **Make Changes Locally**:
   ```bash
   # Make your changes
   git add .
   git commit -m "Update application"
   git push origin main
   ```

2. **Automatic Deployment**:
   - DigitalOcean will automatically detect changes
   - New deployment will be triggered
   - Zero-downtime deployment

### Database Maintenance

- **Backups**: Automatic daily backups
- **Updates**: Managed by DigitalOcean
- **Monitoring**: Built-in performance monitoring
- **Scaling**: Easy to upgrade resources

## 📱 Post-Deployment Setup

### 1. Test Your Application

1. **Access the Frontend**: Visit your frontend URL
2. **Test Login**: Use admin credentials (admin@therapease.com / admin123)
3. **Verify API**: Check API endpoints are responding
4. **Test Database**: Ensure data is being saved/retrieved

### 2. Configure Optional Services

**Email Notifications**:
```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**SMS Notifications**:
```env
SMS_ENABLED=true
VONAGE_API_KEY=your-vonage-key
VONAGE_API_SECRET=your-vonage-secret
```

**AI Features**:
```env
OPENAI_API_KEY=your-openai-api-key
```

### 3. Set Up Monitoring

- Enable DigitalOcean monitoring
- Set up alerts for errors and performance
- Monitor database performance
- Track application usage

## 🎉 Congratulations!

Your TherapEase application is now successfully deployed on DigitalOcean! 

The system includes:
- ✅ Fully managed infrastructure
- ✅ Automatic SSL certificates
- ✅ Managed MySQL database
- ✅ Daily backups
- ✅ High availability
- ✅ Easy scaling options

## 📞 Support

For issues with:
- **DigitalOcean**: Check DigitalOcean documentation and support
- **Application**: Review logs and environment variables
- **Database**: Check connection settings and credentials

---

**Happy Deploying! 🚀**
