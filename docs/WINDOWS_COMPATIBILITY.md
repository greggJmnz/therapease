# 🪟 Windows Compatibility Guide

This document provides comprehensive guidance for running TherapEase on Windows systems.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Setup](#quick-setup)
3. [Manual Setup](#manual-setup)
4. [Troubleshooting](#troubleshooting)
5. [Windows-Specific Features](#windows-specific-features)
6. [Performance Optimization](#performance-optimization)

## 🔧 Prerequisites

### Required Software
- **Node.js**: 18.0.0 or higher
  - Download from [nodejs.org](https://nodejs.org/)
  - Choose the Windows Installer (.msi)
  - Ensure "Add to PATH" is checked during installation

- **MySQL**: 8.0.20 or higher
  - Download from [mysql.com](https://dev.mysql.com/downloads/mysql/)
  - Choose MySQL Community Server
  - Use MySQL Installer for Windows

- **Git**: Latest version
  - Download from [git-scm.com](https://git-scm.com/download/win)
  - Use Git for Windows

### Optional Software
- **OpenSSL**: For SSL certificate generation
  - Download from [slproweb.com](https://slproweb.com/products/Win32OpenSSL.html)
  - Choose Win64 OpenSSL v3.x.x
  - Add to PATH during installation

- **PowerShell**: For advanced scripting (usually pre-installed)
- **Windows Subsystem for Linux (WSL)**: Alternative development environment

## 🚀 Quick Setup

### Method 1: Automated Setup (Recommended)

1. **Clone the repository**
   ```cmd
   git clone <repository-url>
   cd therapease
   ```

2. **Run the Windows setup script**
   ```cmd
   setup-windows.bat
   ```
   Or in PowerShell:
   ```powershell
   .\setup-windows.ps1
   ```

3. **Start the application**
   ```cmd
   npm run dev
   ```

### Method 2: Manual Setup

1. **Install dependencies**
   ```cmd
   npm run install:all
   ```

2. **Configure environment**
   ```cmd
   copy .env-windows .env
   ```
   Edit `.env` with your database credentials.

3. **Setup security**
   ```cmd
   cd server
   npm run security:setup
   ```

4. **Initialize database**
   ```cmd
   npm run db:init
   ```

5. **Start the application**
   ```cmd
   npm run dev
   ```

## 🛠️ Manual Setup

### Step 1: Environment Configuration

1. Copy the Windows environment template:
   ```cmd
   copy .env-windows .env
   ```

2. Edit `.env` file with your settings:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=therapease_dev
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   
   # JWT Configuration
   JWT_SECRET=your-super-secure-jwt-secret-key-here
   
   # Other configurations...
   ```

### Step 2: Database Setup

1. **Start MySQL service**
   ```cmd
   net start mysql
   ```

2. **Initialize database**
   ```cmd
   cd server
   npm run db:init
   ```

3. **Seed sample data (optional)**
   ```cmd
   npm run db:seed
   ```

### Step 3: SSL Configuration

1. **Generate SSL certificates**
   ```cmd
   npm run ssl:generate
   ```

2. **Test SSL configuration**
   ```cmd
   npm run security:test
   ```

## 🔍 Troubleshooting

### Common Issues

#### 1. Node.js Not Found
**Error**: `'node' is not recognized as an internal or external command`

**Solution**:
- Reinstall Node.js with "Add to PATH" option
- Restart Command Prompt/PowerShell
- Check PATH environment variable

#### 2. MySQL Connection Failed
**Error**: `ER_ACCESS_DENIED_ERROR` or `ECONNREFUSED`

**Solutions**:
- Ensure MySQL service is running: `net start mysql`
- Check credentials in `.env` file
- Verify MySQL is listening on port 3306
- Check Windows Firewall settings

#### 3. OpenSSL Not Found
**Error**: `openssl is not recognized as an internal or external command`

**Solutions**:
- Install OpenSSL for Windows
- Add OpenSSL to PATH
- Use Git Bash (includes OpenSSL)
- Use WSL for development

#### 4. Permission Denied Errors
**Error**: `EACCES: permission denied`

**Solutions**:
- Run Command Prompt as Administrator
- Check file permissions
- Ensure antivirus isn't blocking operations

#### 5. Port Already in Use
**Error**: `EADDRINUSE: address already in use`

**Solutions**:
- Kill process using the port: `netstat -ano | findstr :5000`
- Change port in `.env` file
- Restart the application

### Windows-Specific Solutions

#### PowerShell Execution Policy
If PowerShell scripts are blocked:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Long Path Support
Enable long path support in Windows:
1. Open Group Policy Editor (`gpedit.msc`)
2. Navigate to: Computer Configuration > Administrative Templates > System > Filesystem
3. Enable "Enable Win32 long paths"

#### Windows Defender
Add exclusions for:
- Project directory
- Node.js installation directory
- MySQL data directory

## 🪟 Windows-Specific Features

### 1. Windows Service Support
The application can be run as a Windows service using tools like:
- **node-windows**: `npm install -g node-windows`
- **pm2**: `npm install -g pm2`

### 2. Windows Event Logging
Integration with Windows Event Log for better monitoring:
```javascript
const { EventLog } = require('node-windows');
const log = new EventLog('TherapEase');
log.info('Application started successfully');
```

### 3. Windows Performance Counters
Monitor application performance using Windows Performance Counters.

### 4. Windows Authentication
Integration with Windows Active Directory (future feature).

## ⚡ Performance Optimization

### 1. Node.js Optimization
```cmd
set NODE_OPTIONS=--max-old-space-size=4096
npm run dev
```

### 2. MySQL Optimization
Add to `my.ini`:
```ini
[mysqld]
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
innodb_flush_log_at_trx_commit=2
```

### 3. Windows Memory Management
- Close unnecessary applications
- Use SSD for better I/O performance
- Ensure sufficient RAM (8GB+ recommended)

### 4. Antivirus Configuration
- Add project directory to exclusions
- Exclude Node.js and npm from real-time scanning
- Configure real-time scanning to skip development files

## 🔧 Development Tools

### Recommended Windows Development Tools
- **Visual Studio Code**: Primary IDE
- **Windows Terminal**: Better terminal experience
- **Git for Windows**: Version control
- **MySQL Workbench**: Database management
- **Postman**: API testing

### VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- MySQL
- GitLens
- Thunder Client (API testing)

## 📊 Monitoring and Logging

### Windows Event Viewer
Application logs are available in Windows Event Viewer:
- Open Event Viewer
- Navigate to: Windows Logs > Application
- Filter by source: "TherapEase"

### Performance Monitoring
Use Windows Performance Monitor to track:
- CPU usage
- Memory consumption
- Disk I/O
- Network activity

## 🚀 Deployment on Windows

### Production Deployment
1. **Use PM2 for process management**
   ```cmd
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

2. **Configure Windows Service**
   ```cmd
   pm2 startup
   pm2 save
   ```

3. **Use IIS as reverse proxy** (optional)
4. **Configure Windows Firewall**
5. **Set up Windows Task Scheduler** for maintenance tasks

### Docker on Windows
```dockerfile
FROM node:18-windowsservercore
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000
CMD ["npm", "start"]
```

## 📞 Support

### Getting Help
1. Check this documentation
2. Review error logs in Windows Event Viewer
3. Check application logs in `server/logs/`
4. Create an issue in the GitHub repository

### Windows-Specific Issues
For Windows-specific problems:
1. Include Windows version and build number
2. Include Node.js and npm versions
3. Include MySQL version
4. Include error messages and stack traces
5. Include system specifications

## 🔄 Updates and Maintenance

### Regular Maintenance
1. **Update dependencies**: `npm update`
2. **Clean node_modules**: `npm run clean`
3. **Update Windows**: Keep Windows updated
4. **Update Node.js**: Keep Node.js updated
5. **Backup database**: Regular MySQL backups

### Windows Updates
- Keep Windows updated for security patches
- Test application after major Windows updates
- Monitor for compatibility issues

---

**Note**: This guide is regularly updated. For the latest information, check the GitHub repository or contact the development team.
