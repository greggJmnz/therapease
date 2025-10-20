# TherapEase Diagnostic Scripts

This directory contains comprehensive diagnostic and fix scripts for the TherapEase application to help identify and resolve system issues.

## Scripts Overview

### 1. `comprehensive-system-diagnostic.sh`
**Purpose**: Complete system health check covering all components

**What it checks**:
- PM2 process status (API server, Public website)
- Network connectivity (ports 80, 443, 5000, 8080)
- Nginx service and configuration
- MySQL database connection and schema
- API endpoint functionality
- Frontend accessibility
- Login functionality
- SSL/HTTPS certificate status
- System resources (disk, memory, load)
- Recent error logs

**Usage**:
```bash
./comprehensive-system-diagnostic.sh
```

**Output**: Detailed diagnostic report with color-coded status indicators and recommendations.

### 2. `fix-login-issue.sh`
**Purpose**: Fixes the specific admin login issue by updating the password hash

**What it does**:
- Checks Node.js and bcrypt availability
- Tests database connection
- Verifies admin user exists
- Generates new bcrypt hash for admin password
- Updates password in database
- Tests login functionality

**Usage**:
```bash
./fix-login-issue.sh
```

**Admin Credentials** (after running the fix):
- Email: `admin@therapease.com`
- Password: `SecureAdmin2024!@#$`

## Prerequisites

- Node.js installed
- MySQL database running
- PM2 process manager
- Nginx web server
- bcrypt npm package

## Common Issues and Solutions

### 1. API Server Not Running
**Symptom**: 502 Bad Gateway errors
**Solution**: The diagnostic script will automatically attempt to start the API server

### 2. Database Connection Issues
**Symptom**: "Access denied" or connection timeout errors
**Solution**: Check MySQL service status and credentials

### 3. Login Failures
**Symptom**: "Invalid email or password" errors
**Solution**: Run `fix-login-issue.sh` to update the password hash

### 4. Frontend Not Loading
**Symptom**: Blank page or 404 errors
**Solution**: Check if React build files exist in `/var/www/therapease/`

### 5. SSL Certificate Issues
**Symptom**: HTTPS not working or certificate errors
**Solution**: Check Let's Encrypt certificate status and Nginx SSL configuration

## System Architecture

```
Internet → Nginx (Port 80/443) → React Frontend (/var/www/therapease/)
                                → API Server (Port 5000) → MySQL Database
                                → Public Website (Port 8080)
```

## Troubleshooting Steps

1. **Run comprehensive diagnostic**:
   ```bash
   ./comprehensive-system-diagnostic.sh
   ```

2. **Check specific issues**:
   - For login problems: `./fix-login-issue.sh`
   - For PM2 issues: `pm2 status` and `pm2 logs`
   - For Nginx issues: `sudo nginx -t` and `sudo systemctl status nginx`
   - For database issues: `mysql -u therapease_user -p therapease_db`

3. **Review logs**:
   - API logs: `pm2 logs therapease-api`
   - Nginx logs: `sudo tail -f /var/log/nginx/error.log`
   - System logs: `journalctl -u nginx -f`

## Configuration Files

- **PM2 Config**: `ecosystem.config.js`
- **Nginx Config**: `/etc/nginx/sites-available/therapease`
- **Database Config**: `server/.env.production`
- **Frontend Config**: `client/src/services/api.js`

## Health Check Endpoints

- **Maintenance Status**: `https://therapease.site/api/maintenance-status`
- **API Health**: `http://localhost:5000/api/maintenance-status`
- **Frontend**: `https://www.therapease.site`

## Support

If issues persist after running the diagnostic scripts:

1. Check the system health score in the diagnostic output
2. Review the recommendations section
3. Check recent error logs
4. Verify all services are running: `pm2 status`, `sudo systemctl status nginx`, `sudo systemctl status mysql`

## Security Notes

- Admin credentials are hardcoded in the scripts for diagnostic purposes
- In production, consider using environment variables for sensitive data
- Regularly update passwords and rotate credentials
- Monitor system logs for security issues

---

**Last Updated**: $(date)
**Version**: 1.0
**Compatibility**: Ubuntu 20.04+, Node.js 16+, MySQL 8.0+
