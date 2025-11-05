# Nginx Error Guide

## 🔴 Critical: Connection Refused (111)

**Error**: `connect() failed (111: Connection refused) while connecting to upstream`

**Meaning**: Nginx is trying to forward requests to your backend (port 5000), but the backend is not running.

**How to Fix**:

1. **Check if backend is running**:
   ```bash
   cd /home/therapease_user/therapease
   ./check-backend-status.sh
   ```

2. **Or manually check PM2**:
   ```bash
   pm2 status
   pm2 logs therapease-api --lines 50
   ```

3. **If backend is stopped, restart it**:
   ```bash
   cd /home/therapease_user/therapease
   pm2 restart therapease-api
   # Or start it if it's not running
   pm2 start ecosystem.config.js --only therapease-api
   ```

4. **Check backend logs for errors**:
   ```bash
   pm2 logs therapease-api --lines 100
   ```

Common causes:
- Database connection failed
- Application crashed due to a bug
- Out of memory
- Environment variables missing or incorrect
- Port 5000 already in use by another process

---

## ℹ️ Informational: Missing Files (404)

These errors are **NORMAL** and **EXPECTED**. They do not indicate a problem with your server.

### 1. Missing Frontend Assets

**Error**: `open() "/home/therapease_user/therapease/client/dist/assets/PieChart-CJC3E3Fu.js" failed`

**Cause**: User has an old version of your website cached in their browser. After you deploy a new build, old asset filenames are no longer valid (Vite generates new hashes).

**Fix**: **No server-side action needed**. The user needs to:
- Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache
- Or wait for the browser to automatically fetch the new files

**Action**: None required. This is normal behavior after deployments.

---

### 2. Security Scan Probes

**Errors**:
- `open() "/usr/share/nginx/html/.env" failed`
- `open() "/usr/share/nginx/html/.git/HEAD" failed`
- `open() "/usr/share/nginx/html/vendor/phpunit/..." failed`

**Cause**: Automated bots and scanners are probing your server for common vulnerabilities. These are:
- Looking for exposed `.env` files (environment variables)
- Looking for exposed `.git` repositories
- Looking for known PHP framework vulnerabilities

**Fix**: **No action needed**. Your server is correctly returning 404 errors, which means:
- ✅ These files don't exist (you're not vulnerable)
- ✅ Your server is working correctly
- ✅ This is normal internet background noise

**Action**: None required. These are harmless security scans that happen to all public websites.

---

## Quick Diagnostic Commands

### Check Backend Status
```bash
cd /home/therapease_user/therapease
./check-backend-status.sh
```

### Check PM2 Status
```bash
pm2 status
pm2 logs therapease-api --lines 50
```

### Check if Port 5000 is Listening
```bash
ss -tlnp | grep :5000
# or
netstat -tlnp | grep :5000
```

### Test Backend Directly
```bash
curl http://127.0.0.1:5000/api/health
# Should return: {"status":"OK",...}
```

### Check Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Restart Services
```bash
# Restart backend
pm2 restart therapease-api

# Reload Nginx (after config changes)
sudo nginx -t  # Test first
sudo systemctl reload nginx
```

---

## Summary

| Error Type | Severity | Action Required |
|------------|----------|-----------------|
| `connect() failed (111)` | 🔴 Critical | Yes - Check and restart backend |
| Missing frontend assets (404) | ℹ️ Normal | No - User needs to refresh |
| Security scan probes (404) | ℹ️ Normal | No - Expected behavior |

