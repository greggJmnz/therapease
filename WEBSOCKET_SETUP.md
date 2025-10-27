# WebSocket Configuration Guide

## Quick Setup for WebSocket Support

### Step 1: Pull Latest Changes on Droplet

```bash
cd ~/therapease
git pull origin main
```

### Step 2: Rebuild and Redeploy Frontend to Vercel

The frontend WebSocket fix has been pushed to GitHub. Vercel should automatically detect the change and redeploy.

If it doesn't auto-redeploy:
1. Go to your Vercel dashboard
2. Find the TherapEase project
3. Click "Redeploy"

### Step 3: Verify Nginx WebSocket Configuration

The Nginx config already has WebSocket support configured on lines 40-53 and 121-134. Verify it's in use:

```bash
# On droplet
cat /etc/nginx/sites-enabled/therapease | grep -A 15 "location /ws"
```

Expected output should show the WebSocket proxy configuration.

### Step 4: Test the Connection

After Vercel redeploys:
1. Refresh your browser at https://therapease.site
2. Open browser DevTools → Console
3. You should see WebSocket connecting to `wss://api.therapease.site/ws`
4. No more connection errors!

## What Changed

### Frontend (websocketService.js)
- Changed WebSocket URL from `wss://therapease.site:5000/ws` to `wss://api.therapease.site/ws`
- Now uses the API subdomain which has Nginx WebSocket proxy configured
- Port 5000 is not exposed externally (security)

### Backend (Already Configured)
- Nginx WebSocket proxy at `/ws` location
- Long timeouts (86400 seconds) for persistent connections
- Proper upgrade headers for WebSocket protocol

## Troubleshooting

### Still seeing connection errors?

1. **Check if Nginx is configured correctly:**
   ```bash
   sudo nginx -t
   ```

2. **Check if WebSocket endpoint exists on backend:**
   ```bash
   curl http://localhost:5000/ws
   ```
   (Should show "Upgrade required" or similar)

3. **Restart Nginx if needed:**
   ```bash
   sudo systemctl restart nginx
   ```

### WebSocket not working?

The app works fine without WebSocket - it's an enhancement, not essential. You can safely ignore the connection errors if they persist.

## Benefits of WebSocket

- ✅ Real-time notifications
- ✅ Live chat between users
- ✅ Instant dashboard updates
- ✅ No page refreshes needed
- ✅ Better user experience

## Current Status

- ✅ Nginx WebSocket proxy configured
- ✅ Frontend URL fixed
- ⏳ Waiting for Vercel redeploy
- ⏳ Testing after redeploy

