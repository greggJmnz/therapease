# Windows Database Setup Guide

## Overview

This guide provides comprehensive instructions for setting up the TherapEase database on Windows systems, including the appointment approval workflow schema.

## Quick Start

### Option 1: Automated Setup (Recommended)

**PowerShell (Recommended):**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup-windows-database.ps1
```

**Command Prompt:**
```cmd
setup-windows-database.bat
```

### Option 2: Manual Setup

```bash
# 1. Copy environment file
copy .env-windows .env

# 2. Install dependencies
npm install

# 3. Initialize database
node server/scripts/init-database.js

# 4. Run Windows migration
node server/scripts/windows-database-migration.js

# 5. Generate VAPID keys (optional)
node server/scripts/generate-vapid-keys.js
```

## Prerequisites

### Required Software:
- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **Git** (for cloning the repository)

### Required Environment Variables:
```env
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_mysql_password

# Security (REQUIRED)
JWT_SECRET=your-super-secure-jwt-secret-key
ENCRYPTION_KEY=your-64-character-hex-encryption-key
```

## Database Schema

### Core Tables:
- **users** - User accounts (admin, therapist, patient)
- **patients** - Patient information
- **therapists** - Therapist information
- **appointments** - Appointment scheduling with approval workflow
- **notifications** - System notifications
- **assessments** - Patient assessments
- **progress_tracking** - Progress monitoring

### Appointment Approval Workflow:
```sql
-- Key columns for approval workflow
approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
approvedBy INT NULL -- Foreign key to users.id
approvedAt TIMESTAMP NULL
reason TEXT NULL -- Appointment reason
```

## Migration Script Details

### `windows-database-migration.js`

**Features:**
- ✅ **Safe column addition** - Checks if columns exist before adding
- ✅ **Foreign key management** - Handles constraint creation safely
- ✅ **Data migration** - Updates existing records appropriately
- ✅ **Windows compatibility** - Uses Windows-compatible paths and settings
- ✅ **Comprehensive error handling** - Detailed error messages and troubleshooting

**What it does:**
1. **Connects to database** using environment variables
2. **Checks existing schema** for required columns
3. **Adds missing columns** safely without data loss
4. **Creates foreign key constraints** for data integrity
5. **Updates existing records** to have proper approval status
6. **Verifies final schema** is correct

## Troubleshooting

### Common Issues:

#### 1. **MySQL Connection Failed**
```
Error: Access denied for user 'root'@'localhost'
```
**Solution:**
- Check `DB_PASSWORD` in `.env` file
- Ensure MySQL server is running
- Verify user has proper permissions

#### 2. **Foreign Key Constraint Errors**
```
Error: Duplicate foreign key constraint name
```
**Solution:**
- Run the migration script - it handles duplicate constraints safely
- The script checks for existing constraints before creating new ones

#### 3. **VAPID Key Errors**
```
Error: VAPID key should be 65 bytes long when decoded
```
**Solution:**
- Run: `node server/scripts/generate-vapid-keys.js`
- Or disable push notifications by commenting out VAPID keys in `.env`

#### 4. **Port Already in Use**
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution:**
- Kill existing processes: `taskkill /f /im node.exe`
- Or change port in `.env` file

### Windows-Specific Issues:

#### 1. **Path Separator Issues**
- The migration script uses Windows-compatible paths
- Uses forward slashes for web paths, backslashes for file paths

#### 2. **Permission Issues**
- Run PowerShell as Administrator if needed
- Ensure MySQL user has CREATE/ALTER permissions

#### 3. **Character Encoding**
- Database uses UTF8MB4 charset for full Unicode support
- Handles Windows-specific character encoding issues

## Manual Database Setup

If automated setup fails, you can run the migration manually:

```bash
# 1. Connect to MySQL
mysql -u root -p

# 2. Create database
CREATE DATABASE therapease_dev;

# 3. Run initialization
node server/scripts/init-database.js

# 4. Run migration
node server/scripts/windows-database-migration.js
```

## Verification

After setup, verify everything is working:

```bash
# 1. Start the server
npm run dev

# 2. Check for errors in console
# Should see: "Database tables created successfully"

# 3. Test database connection
node -e "const db = require('./server/config/database'); db.connect().then(() => console.log('✅ Database connected')).catch(err => console.log('❌ Database error:', err.message));"
```

## Production Considerations

### Security:
- Use strong, unique passwords
- Rotate keys regularly
- Use environment-specific configurations
- Enable SSL in production

### Performance:
- Configure MySQL connection pooling
- Set appropriate timeouts
- Monitor database performance
- Regular backups

### Monitoring:
- Set up database monitoring
- Log all database operations
- Monitor foreign key constraint violations
- Track approval workflow metrics

## Support

If you encounter issues:

1. **Check the logs** for specific error messages
2. **Verify environment variables** are correct
3. **Ensure MySQL is running** and accessible
4. **Check Windows permissions** for database operations
5. **Review the troubleshooting section** above

## Files Created

- `server/scripts/windows-database-migration.js` - Main migration script
- `setup-windows-database.bat` - Windows batch setup script
- `setup-windows-database.ps1` - PowerShell setup script
- `README-WINDOWS-DATABASE.md` - This documentation

All files are included in the git repository for Windows compatibility.
