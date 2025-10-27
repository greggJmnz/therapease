# Testing Production Build Locally

## Understanding the Issue

When you run `npm run preview` to test the production build, you're seeing errors like:

```
GET https://api.therapease.com/maintenance-status net::ERR_NAME_NOT_RESOLVED
```

This happens because:
- The production build is hardcoded with API URLs from when it was built
- Without `VITE_API_URL` set during build, it may use placeholder values
- The domain `api.therapease.com` doesn't exist yet

## ✅ Solution 1: Test with Dev Server (Recommended)

**For actual testing, use the dev server instead:**

```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend (with proxy)
cd client
npm run dev
```

Visit `http://localhost:3000` - this works because the proxy in `vite.config.js` handles API requests.

## ✅ Solution 2: Test Production Build with Local API

To test the actual production build with your local backend:

**1. Rebuild with localhost API:**
```bash
cd client
VITE_API_URL=http://localhost:5000 npm run build
npm run preview
```

**2. In another terminal, make sure backend is running:**
```bash
cd server
npm start
```

**3. Test the preview:**
- Frontend: `http://localhost:4173`
- API should work since it's pointing to `http://localhost:5000`

## ✅ Solution 3: Build for Vercel Deployment (Production)

When you're ready to deploy to Vercel:

**1. Build without VITE_API_URL** (or leave it as production URL):
```bash
cd client
npm run build
```

**2. The built code will use relative URLs** (`/api`) which Vercel will proxy correctly, OR you'll set `VITE_API_URL` in Vercel's environment variables to your production API.

**3. Deploy to Vercel:**
```bash
vercel --prod
```

## Production vs Development Behavior

### Development Mode (`npm run dev`)
- Uses vite's proxy configuration
- API calls go to `http://localhost:5000/api`
- Hot module replacement works
- **Use this for development**

### Production Build (`npm run build` + `npm run preview`)
- Environment variables are **baked in** at build time
- If `VITE_API_URL` was set during build, it uses that URL
- If not set, it falls back to `/api` (relative URL)
- No hot reload
- **Use this to test optimized production bundle**

### Actual Deployment (Vercel)
- Environment variables set in Vercel dashboard override build-time variables
- Vercel's proxy handles `/api` requests
- **This is your real production environment**

## Quick Reference

| Scenario | Frontend | Backend | API Calls |
|----------|----------|---------|-----------|
| **Development** | `npm run dev` (port 3000) | `npm start` (port 5000) | Proxy to localhost:5000 |
| **Local Preview** | `npm run preview` (port 4173) | `npm start` (port 5000) | Direct to localhost:5000 |
| **Vercel Deploy** | Vercel (your-domain.vercel.app) | Your production server | Via VERCEL_API_URL env var |

## What You Should Do Now

### For Development Work:
```bash
# This is what you should use day-to-day
cd client
npm run dev  # Runs with proxy, no API errors
```

### For Testing Production Build:
Only do this when you want to verify the production bundle works:

```bash
# Build for local testing
cd client
VITE_API_URL=http://localhost:5000 npm run build
npm run preview

# Make sure backend is running
cd ../server
npm start
```

### For Actual Deployment:
```bash
cd client
npm run build
vercel --prod
```

## The Current Issue Explained

You built with production settings (probably had `api.therapease.com` set somewhere), and when previewing, it's trying to reach that non-existent domain.

**Quick fix for now:**
- Just use `npm run dev` for all your testing
- Production build testing isn't necessary unless you're debugging build-specific issues
- When you deploy to Vercel with proper environment variables, it will work correctly

## Recommendation

**Don't worry about the production build errors right now.** 

Your workflow should be:
1. ✅ Use `npm run dev` for development (works perfectly)
2. ✅ Deploy to Vercel when ready (will work in production)
3. ✅ Test on Vercel preview deployments if needed

The `npm run preview` is mainly for:
- Testing bundle optimization
- Checking minified output
- Debugging production-specific issues

For day-to-day development, stick with `npm run dev`.

