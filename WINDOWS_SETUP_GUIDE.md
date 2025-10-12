# 🪟 TherapEase Windows Setup Guide

This comprehensive guide will help you set up TherapEase on Windows systems with all necessary dependencies and configurations.

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18.0.0 or higher
  - Download from: https://nodejs.org/
  - Choose the LTS version for stability
- **MySQL**: Version 5.7 or higher (or MySQL 8.0+)
  - Download from: https://dev.mysql.com/downloads/
  - Or use XAMPP: https://www.apachefriends.org/

### Optional but Recommended
- **Git**: For version control
  - Download from: https://git-scm.com/
- **OpenSSL**: For SSL certificate generation
  - Download from: https://slproweb.com/products/Win32OpenSSL.html
- **Visual Studio Code**: For development
  - Download from: https://code.visualstudio.com/

## 🚀 Quick Setup (Recommended)

### Method 1: Automated Setup Script
```cmd
# Run the complete Windows setup script
setup-windows-complete.bat
```

### Method 2: PowerShell Setup
```powershell
# Run PowerShell setup script
.\setup-windows.ps1
```

### Method 3: Manual Setup
```cmd
# Clone the repository (if not already done)
git clone <repository-url>
cd therapease

# Run the comprehensive setup
npm run setup
```

## 🔧 Detailed Setup Instructions

### Step 1: Install Node.js
1. Download Node.js from https://nodejs.org/
2. Run the installer and follow the setup wizard
3. Verify installation:
   ```cmd
   node --version
   npm --version
   ```

### Step 2: Install MySQL
1. Download MySQL from https://dev.mysql.com/downloads/
2. Run the installer and configure:
   - Set root password
   - Enable MySQL service to start automatically
   - Configure port (default: 3306)
3. Verify installation:
   ```cmd
   mysql --version
   ```

### Step 3: Clone and Setup TherapEase
1. Open Command Prompt or PowerShell as Administrator
2. Navigate to your desired directory
3. Clone the repository:
   ```cmd
   git clone <repository-url>
   cd therapease
   ```
4. Run the setup:
   ```cmd
   npm run setup
   ```

## 🛠️ Windows-Specific Considerations

### Antivirus Software
Windows Defender or third-party antivirus may interfere with:
- npm package installation
- SSL certificate generation
- File operations

**Solutions:**
- Add the project folder to antivirus exclusions
- Temporarily disable real-time protection during setup
- Run setup as Administrator

### Path Length Limitations
Windows has a 260-character path limit that may cause issues with deep node_modules.

**Solutions:**
- Enable long path support in Windows 10/11
- Use shorter directory names
- Install packages in a shorter path

### PowerShell Execution Policy
PowerShell scripts may be blocked by execution policy.

**Solutions:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### MySQL Service Issues
MySQL service may not start automatically on Windows.

**Solutions:**
```cmd
# Start MySQL service manually
net start MySQL

# Or use Services.msc to configure automatic startup
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Node.js Not Found
```
ERROR: Node.js is not installed or not in PATH
```
**Solution:**
- Reinstall Node.js and ensure "Add to PATH" is checked
- Restart Command Prompt after installation
- Verify PATH environment variable includes Node.js

#### 2. MySQL Connection Failed
```
ERROR: Database initialization failed
```
**Solutions:**
- Ensure MySQL service is running
- Check MySQL credentials in .env file
- Verify MySQL port (default: 3306)
- Test connection manually:
  ```cmd
  mysql -u root -p
  ```

#### 3. SSL Certificate Generation Failed
```
ERROR: Failed to generate SSL certificates
```
**Solutions:**
- Install OpenSSL for Windows
- Add OpenSSL to PATH environment variable
- Or use Git Bash (includes OpenSSL)
- Or use Windows Subsystem for Linux (WSL)

#### 4. Permission Denied Errors
```
ERROR: EACCES: permission denied
```
**Solutions:**
- Run Command Prompt as Administrator
- Check file/folder permissions
- Disable antivirus real-time protection temporarily

#### 5. Port Already in Use
```
ERROR: Port 3000/5000/5443 already in use
```
**Solutions:**
```cmd
# Find process using port
netstat -ano | findstr :3000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

#### 6. npm Install Fails
```
ERROR: Failed to install dependencies
```
**Solutions:**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json
- Check internet connection
- Try using different npm registry: `npm config set registry https://registry.npmjs.org/`

### Advanced Troubleshooting

#### Reset Everything
If you encounter persistent issues:
```cmd
npm run reset
```

#### Clean Installation
```cmd
# Remove all node_modules
npm run clean

# Reinstall everything
npm run install:all

# Run setup again
npm run setup
```

#### Manual Database Setup
If automatic database setup fails:
```cmd
# Connect to MySQL
mysql -u root -p

# Create database manually
CREATE DATABASE therapease;

# Exit MySQL
exit

# Run database setup only
cd server
npm run setup:db
```

## 📁 Windows File Structure

After successful setup, your directory structure should look like:
```
therapease/
├── client/                 # React frontend
├── server/                 # Node.js backend
│   ├── config/
│   │   └── database.js     # Database configuration
│   ├── certs/              # SSL certificates
│   │   ├── server.key
│   │   └── server.crt
│   └── node_modules/       # Server dependencies
├── .env                    # Environment configuration
├── setup-windows.bat       # Windows batch setup
├── setup-windows.ps1       # PowerShell setup
├── setup-windows-complete.bat # Complete Windows setup
└── package.json           # Root package configuration
```

## 🌐 Access URLs

After successful setup:
- **Client Application**: http://localhost:3000
- **Server API**: http://localhost:5000
- **HTTPS Server**: https://localhost:5443
- **Public Website**: http://localhost:8080

## 🔐 Default Credentials

- **Email**: admin@therapease.com
- **Password**: SecureAdmin2024!@#$

⚠️ **IMPORTANT**: Change these credentials immediately after first login!

## 🚀 Starting the Application

### Development Mode
```cmd
npm run dev
```

### Production Mode
```cmd
npm run build
npm start
```

## 📞 Support

### Getting Help
1. Check this troubleshooting guide
2. Review the main SETUP_GUIDE.md
3. Check server logs in `server/server.log`
4. Verify all prerequisites are installed

### Windows-Specific Resources
- [Node.js Windows Installation Guide](https://nodejs.org/en/download/package-manager/#windows)
- [MySQL Windows Installation Guide](https://dev.mysql.com/doc/mysql-installation-excerpt/8.0/en/windows-installation.html)
- [OpenSSL Windows Installation](https://slproweb.com/products/Win32OpenSSL.html)

## ✅ Verification Checklist

After setup, verify these components:
- [ ] Node.js 18+ installed and in PATH
- [ ] MySQL service running
- [ ] .env file created with proper configuration
- [ ] SSL certificates generated (optional)
- [ ] Database tables created
- [ ] Admin user created
- [ ] All npm packages installed
- [ ] Application starts without errors
- [ ] Can access http://localhost:3000
- [ ] Can log in with admin credentials

## 🎉 Success!

Once all items are checked, your TherapEase application is ready to use on Windows!

The system includes:
- ✅ Cross-platform compatibility
- ✅ Windows-specific optimizations
- ✅ Automatic dependency management
- ✅ Database setup and configuration
- ✅ Security configuration
- ✅ SSL/HTTPS support
- ✅ Push notification setup
- ✅ Complete error handling

Happy coding! 🚀
