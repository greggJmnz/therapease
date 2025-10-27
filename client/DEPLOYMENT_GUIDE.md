# TherapEase - Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Vite migration completed
- [x] Build tested successfully
- [x] Dev server verified working
- [x] Environment variables updated
- [x] Vercel configuration created

## 🚀 Deployment Steps

### Step 1: Prepare Environment Variables

Create a `.env` file in the `client/` directory with your production environment variables:

```bash
cd client
cat > .env << 'EOF'
# Production Environment Variables
VITE_API_URL=https://your-production-api-url.com
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key-here
EOF
```

**Note:** For security, do NOT commit the `.env` file to version control.

### Step 2: Deploy to Vercel

#### Option A: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Navigate to client directory**:
```bash
cd client
```

4. **Deploy**:
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (Select your account)
- Link to existing project? **N**
- Project name: `therapease-client`
- Directory to deploy: `./` (current directory)
- Override settings? **N**

5. **Add production environment variables**:
```bash
vercel env add VITE_API_URL
vercel env add VITE_VAPID_PUBLIC_KEY
```

Enter the values when prompted.

6. **Deploy to production**:
```bash
vercel --prod
```

#### Option B: Deploy via Vercel Dashboard

1. **Push to GitHub** (if not already done):
```bash
git add .
git commit -m "Migrate to Vite and prepare for Vercel deployment"
git push origin main
```

2. **Import Project**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the `client/` directory as the root directory

3. **Configure Build Settings**:
   - Framework Preset: **Vite** (auto-detected)
   - Root Directory: **client**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add the following:
     - `VITE_API_URL` = your API URL
     - `VITE_VAPID_PUBLIC_KEY` = your VAPID key

5. **Deploy**:
   - Click "Deploy"

### Step 3: Verify Deployment

1. **Check Build Logs**:
   - Visit your Vercel dashboard
   - Click on the deployment
   - Review the build logs for any errors

2. **Test the Live Site**:
   - Visit the deployment URL provided by Vercel
   - Verify all functionality works

3. **Test API Connection**:
   - Check browser console for API errors
   - Verify environment variables are loaded correctly

## 📝 Post-Deployment

### Update Backend CORS Configuration

Update your backend server to allow requests from your Vercel domain:

```javascript
// server/index.js or wherever CORS is configured
const allowedOrigins = [
  'https://your-app.vercel.app',
  'https://your-custom-domain.com',
  'http://localhost:3000' // for local development
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Custom Domain Setup

1. **Add Domain in Vercel**:
   - Go to Project Settings → Domains
   - Add your custom domain

2. **Configure DNS**:
   - Add the CNAME record provided by Vercel
   - Wait for DNS propagation (usually 24-48 hours)

## 🔄 Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- ✅ Deploy on every push to `main`
- ✅ Create preview deployments for pull requests
- ✅ Run builds automatically

## 🛠️ Development Workflow

### Local Development
```bash
cd client
npm run dev
# App runs on http://localhost:3000
```

### Build for Testing
```bash
npm run build
npm run preview
# Preview runs on http://localhost:4173
```

### Debugging Build Issues

If you encounter build errors:

1. **Check Environment Variables**:
```bash
cd client
cat .env
```

2. **Test Build Locally**:
```bash
npm run build
```

3. **Check Vercel Logs**:
   - Go to your deployment in Vercel dashboard
   - View the logs for specific error messages

## 📊 Monitoring

### Vercel Analytics
- Enable Vercel Analytics in project settings
- Monitor performance metrics

### Error Tracking
- Consider integrating Sentry or similar for error tracking
- Monitor API health

## 🔐 Security Notes

1. **Environment Variables**:
   - Never commit `.env` files
   - Use Vercel's environment variable management
   - Rotate keys regularly

2. **API Security**:
   - Use HTTPS for all API calls
   - Implement proper authentication
   - Validate all user inputs

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vercel Documentation](https://vercel.com/docs)
- [Vite + React Guide](https://vitejs.dev/guide/)
- [TherapEase Vite Migration Guide](./VITE_MIGRATION.md)

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Site loads without errors
- ✅ API calls work correctly
- ✅ Authentication functions properly
- ✅ All features accessible
- ✅ Mobile responsive
- ✅ PWA features work (if applicable)

## 🆘 Troubleshooting

### Common Issues

**Issue**: Build fails with "Cannot find module"
- **Solution**: Run `npm install` and ensure all dependencies are up to date

**Issue**: Environment variables not loading
- **Solution**: Check variable names start with `VITE_`, not `REACT_APP_`

**Issue**: API calls failing
- **Solution**: Verify CORS configuration and API URL in environment variables

**Issue**: Assets not loading
- **Solution**: Check that `index.html` is in the root of `client/` directory

## 📞 Need Help?

Check the following:
- [VITE_MIGRATION.md](./VITE_MIGRATION.md) for migration details
- [Vercel Status](https://vercel-status.com/)
- Project documentation in `/docs`

