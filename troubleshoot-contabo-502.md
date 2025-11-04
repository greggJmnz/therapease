# 🔧 Troubleshooting 502 Bad Gateway on Contabo

A 502 error means nginx can't connect to the backend server. Here's how to fix it:

## Step 1: Check if PM2 Services are Running

```bash
# Check PM2 status
pm2 status

# If nothing is running, check logs
pm2 logs

# If services are not running, start them
cd /home/therapease_user/therapease
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

## Step 2: Check if Backend Server is Listening

```bash
# Check if port 5000 is being used
sudo netstat -tlnp | grep 5000
# Or
sudo ss -tlnp | grep 5000

# Test the API directly
curl http://localhost:5000/api/health
```

## Step 3: Check PM2 Logs for Errors

```bash
# View API logs
pm2 logs therapease-api

# View last 50 lines
pm2 logs therapease-api --lines 50

# Check for errors
pm2 logs therapease-api --err
```

## Step 4: Check Environment Variables

```bash
# Verify .env.production exists and is configured
cd /home/therapease_user/therapease/server
cat .env.production | grep -E "PORT|NODE_ENV|DB_"

# Check if database is accessible
mysql -u therapease_user -p therapease_db -e "SELECT 1;"
```

## Step 5: Restart PM2 Services

```bash
# Stop all services
pm2 stop all

# Delete all processes
pm2 delete all

# Restart with ecosystem config
cd /home/therapease_user/therapease
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs
```

## Step 6: Check Nginx Configuration

```bash
# Test nginx configuration
sudo nginx -t

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if nginx can reach backend
curl http://localhost:5000/api/health
```

## Step 7: Verify Database Connection

```bash
# Test database connection
cd /home/therapease_user/therapease/server
node -e "
const mysql = require('mysql2/promise');
const config = require('./config/database');
mysql.createConnection(config.dbConfig).then(() => {
  console.log('✅ Database connection successful');
  process.exit(0);
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
  process.exit(1);
});
"
```

## Step 8: Manual Start Test

```bash
# Try starting the server manually to see errors
cd /home/therapease_user/therapease/server
NODE_ENV=production node index.js
```

## Common Issues and Solutions

### Issue 1: PM2 not running
**Solution**: Start PM2 services
```bash
cd /home/therapease_user/therapease
pm2 start ecosystem.config.js
pm2 save
```

### Issue 2: Database connection failed
**Solution**: Check database credentials in `.env.production`
```bash
cd /home/therapease_user/therapease/server
nano .env.production
# Verify DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
```

### Issue 3: Port 5000 already in use
**Solution**: Check what's using the port
```bash
sudo lsof -i :5000
# Kill the process if needed
sudo kill -9 <PID>
```

### Issue 4: Missing dependencies
**Solution**: Reinstall server dependencies
```bash
cd /home/therapease_user/therapease/server
npm ci --production
```

### Issue 5: Environment variables not loaded
**Solution**: Ensure .env.production exists
```bash
cd /home/therapease_user/therapease/server
ls -la .env.production
cat .env.production
```

## Quick Fix Commands

```bash
# Full restart sequence
cd /home/therapease_user/therapease
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
pm2 logs therapease-api --lines 20

# Test API
curl http://localhost:5000/api/health

# If health check works, test from nginx
curl http://localhost/api/health
curl https://api.therapease.site/api/health
```

