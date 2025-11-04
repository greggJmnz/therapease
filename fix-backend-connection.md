# Fix Backend Connection Refused Error

## Problem Identified

The nginx log analysis shows:
- **289 upstream connection errors** - "Connection refused" (111) when connecting to `http://127.0.0.1:5000`
- **1216 requests per minute** - Very high, likely from retries
- All errors are for `/api/maintenance-status` endpoint

## Root Cause

The backend API server (port 5000) is **not running** or not accessible.

## Solution

### Step 1: Check PM2 Status
```bash
# Check if backend is running
pm2 status

# Should show:
# therapease-api - online (if running)
# therapease-api - stopped/errored (if not running)
```

### Step 2: Check if Port 5000 is Listening
```bash
# Check if port 5000 is in use
sudo ss -tlnp | grep :5000

# Or
sudo netstat -tlnp | grep :5000

# Should show node or PM2 process listening on port 5000
# If empty, backend is not running
```

### Step 3: Check PM2 Logs
```bash
# Check backend logs for errors
pm2 logs therapease-api --lines 50

# Look for:
# - Database connection errors
# - Port already in use errors
# - Crash/restart loops
```

### Step 4: Restart Backend
```bash
# Stop the backend
pm2 stop therapease-api

# Start the backend
pm2 start therapease-api

# Or restart
pm2 restart therapease-api

# Check status
pm2 status
```

### Step 5: Verify Backend is Running
```bash
# Test backend directly (bypass nginx)
curl http://localhost:5000/api/health

# Should return:
# {"status":"OK","message":"TherapEase API is running",...}

# If this fails, backend is not running
```

### Step 6: Check PM2 Process Health
```bash
# Check if backend is crashing
pm2 logs therapease-api --err --lines 100

# Check restart count
pm2 status

# If restart count is high, backend is crashing repeatedly
```

## Common Issues

### Issue 1: Backend Crashed
**Symptoms**: PM2 shows "errored" or high restart count
**Fix**: Check logs for errors and fix them
```bash
pm2 logs therapease-api --lines 100 | grep -i error
```

### Issue 2: Port 5000 Already in Use
**Symptoms**: Error "EADDRINUSE" or port already in use
**Fix**: Kill the process using port 5000
```bash
# Find process using port 5000
sudo lsof -i :5000
# Or
sudo fuser -k 5000/tcp

# Then restart PM2
pm2 restart therapease-api
```

### Issue 3: Database Connection Failed
**Symptoms**: Backend starts but crashes immediately
**Fix**: Check database connection
```bash
# Test database connection
cd /home/therapease_user/therapease/server
node -e "
require('dotenv').config({ path: '.env.production' });
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).then(() => console.log('✅ Database OK')).catch(e => console.error('❌ Database Error:', e.message));
"
```

### Issue 4: PM2 Process Not Running
**Symptoms**: `pm2 status` shows nothing or "stopped"
**Fix**: Start PM2 processes
```bash
# Navigate to project directory
cd /home/therapease_user/therapease

# Start all PM2 processes
pm2 start ecosystem.config.js

# Or start specific app
pm2 start ecosystem.config.js --only therapease-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## High Request Count (1216/minute)

The high request count is likely from:
1. **Frontend retrying failed requests** - Browser retrying when backend is down
2. **Multiple browser tabs** - Each tab polling maintenance-status
3. **Polling interval too short** - Frontend polling too frequently

### Fix: Reduce Polling Frequency
The frontend is already optimized to poll every 5 minutes, but if backend is down, requests queue up.

**Solution**: Once backend is running, requests will normalize.

## Quick Fix Script

```bash
#!/bin/bash
echo "=== Fixing Backend Connection ==="

# 1. Check PM2 status
echo "Checking PM2 status..."
pm2 status

# 2. Check port 5000
echo "Checking port 5000..."
sudo ss -tlnp | grep :5000 || echo "❌ Port 5000 not listening"

# 3. Test backend
echo "Testing backend..."
curl -s http://localhost:5000/api/health || echo "❌ Backend not responding"

# 4. Restart backend
echo "Restarting backend..."
pm2 restart therapease-api

# 5. Wait a moment
sleep 3

# 6. Test again
echo "Testing backend again..."
curl -s http://localhost:5000/api/health && echo "✅ Backend is running" || echo "❌ Backend still not running"

# 7. Check logs
echo "Checking recent logs..."
pm2 logs therapease-api --lines 20 --nostream
```

## After Fix

Once backend is running:
1. **Monitor nginx logs** - Upstream errors should stop
2. **Check request count** - Should drop to normal levels
3. **Test API endpoints** - Should work correctly
4. **Monitor PM2** - Should stay online without restarts

Run the diagnostic script again to verify:
```bash
./check-nginx-logs.sh
```

