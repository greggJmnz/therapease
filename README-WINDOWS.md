# 🪟 TherapEase - Windows Edition

A Web-based Pediatric Occupational Therapy System with AI Augmented Assessment, optimized for Windows platforms.

## 🚀 Quick Start for Windows

### Prerequisites
- **Windows 10/11** (64-bit recommended)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download](https://git-scm.com/download/win)

### One-Click Setup

1. **Clone and setup**
   ```cmd
   git clone <repository-url>
   cd therapease
   setup-windows.bat
   ```

2. **Start the application**
   ```cmd
   npm run dev
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - HTTPS: https://localhost:5443

### PowerShell Setup (Alternative)

```powershell
# Run in PowerShell as Administrator
.\setup-windows.ps1
```

## 🔧 Windows-Specific Features

### ✅ Cross-Platform Compatibility
- **Path Handling**: Automatic Windows/Unix path conversion
- **File Permissions**: Windows-compatible file operations
- **Command Execution**: Platform-specific command handling
- **Environment Variables**: Windows environment variable support

### ✅ SSL Certificate Management
- **OpenSSL Integration**: Automatic OpenSSL detection and configuration
- **Certificate Generation**: Windows-compatible SSL certificate creation
- **Multiple Testing Methods**: cURL, PowerShell, and Node.js testing

### ✅ Database Configuration
- **MySQL Integration**: Optimized for Windows MySQL installations
- **Connection Pooling**: Windows-specific connection handling
- **Character Set**: UTF-8 support for international characters

### ✅ Development Tools
- **Windows Scripts**: Batch files and PowerShell scripts
- **VS Code Integration**: Windows-optimized development environment
- **Debugging Support**: Windows-specific debugging configurations

## 📋 Windows Setup Guide

### Method 1: Automated Setup (Recommended)

```cmd
# 1. Clone repository
git clone <repository-url>
cd therapease

# 2. Run Windows setup
setup-windows.bat

# 3. Start development
npm run dev
```

### Method 2: Manual Setup

```cmd
# 1. Install dependencies
npm run install:all

# 2. Configure environment
copy .env-windows .env
# Edit .env with your database credentials

# 3. Setup security
cd server
npm run security:setup

# 4. Initialize database
npm run db:init

# 5. Start application
cd ..
npm run dev
```

## 🧪 Testing Windows Compatibility

### Run Compatibility Tests
```cmd
cd server
npm run test:windows
```

### Test SSL Configuration
```cmd
npm run security:test
```

### Test Database Connection
```cmd
npm run db:init
```

## 🛠️ Windows Troubleshooting

### Common Issues

#### 1. Node.js Not Found
```cmd
# Solution: Reinstall Node.js with "Add to PATH" option
# Download from: https://nodejs.org/
```

#### 2. MySQL Connection Failed
```cmd
# Solution: Start MySQL service
net start mysql

# Check if MySQL is running
sc query mysql
```

#### 3. OpenSSL Not Found
```cmd
# Solution 1: Install OpenSSL for Windows
# Download from: https://slproweb.com/products/Win32OpenSSL.html

# Solution 2: Use Git Bash (includes OpenSSL)
# Git Bash automatically includes OpenSSL

# Solution 3: Use WSL
wsl --install
```

#### 4. Permission Denied
```cmd
# Solution: Run Command Prompt as Administrator
# Right-click Command Prompt → "Run as administrator"
```

#### 5. Port Already in Use
```cmd
# Solution: Find and kill process using port
netstat -ano | findstr :5000
taskkill /PID <process_id> /F
```

### Windows-Specific Solutions

#### PowerShell Execution Policy
```powershell
# If PowerShell scripts are blocked
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Long Path Support
1. Open Group Policy Editor (`gpedit.msc`)
2. Navigate to: Computer Configuration > Administrative Templates > System > Filesystem
3. Enable "Enable Win32 long paths"

#### Windows Defender Exclusions
Add exclusions for:
- Project directory: `C:\path\to\therapease`
- Node.js directory: `C:\Program Files\nodejs`
- MySQL data directory: `C:\ProgramData\MySQL`

## 📊 Performance Optimization

### Node.js Optimization
```cmd
# Increase memory limit
set NODE_OPTIONS=--max-old-space-size=4096
npm run dev
```

### MySQL Optimization
Add to `my.ini`:
```ini
[mysqld]
innodb_buffer_pool_size=1G
innodb_log_file_size=256M
innodb_flush_log_at_trx_commit=2
```

### Windows Performance
- **SSD Storage**: Use SSD for better I/O performance
- **RAM**: 8GB+ recommended for development
- **Antivirus**: Configure exclusions for development files

## 🔧 Development Tools

### Recommended Windows Tools
- **Visual Studio Code**: Primary IDE
- **Windows Terminal**: Better terminal experience
- **Git for Windows**: Version control with bash support
- **MySQL Workbench**: Database management
- **Postman**: API testing

### VS Code Extensions
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- MySQL
- GitLens
- Thunder Client (API testing)

## 🚀 Production Deployment

### Windows Service
```cmd
# Install PM2 globally
npm install -g pm2

# Start application as service
pm2 start ecosystem.config.js

# Configure Windows service
pm2 startup
pm2 save
```

### IIS Integration
- Use IIS as reverse proxy
- Configure URL rewriting
- Set up SSL certificates

### Windows Task Scheduler
- Schedule database backups
- Monitor application health
- Automated maintenance tasks

## 📞 Support

### Getting Help
1. **Check Documentation**: Review `docs/WINDOWS_COMPATIBILITY.md`
2. **Run Tests**: Execute `npm run test:windows`
3. **Check Logs**: Review Windows Event Viewer
4. **GitHub Issues**: Create issue with Windows details

### Windows-Specific Support
Include in support requests:
- Windows version and build number
- Node.js and npm versions
- MySQL version
- Error messages and stack traces
- System specifications

## 🔄 Updates and Maintenance

### Regular Maintenance
```cmd
# Update dependencies
npm update

# Clean and reinstall
npm run clean
npm run install:all

# Update Windows
# Keep Windows updated for security patches
```

### Backup Strategy
```cmd
# Database backup
mysqldump -u root -p therapease_dev > backup.sql

# Application backup
xcopy therapease therapease_backup /E /I
```

## 📈 Monitoring

### Windows Event Viewer
- Application logs: Windows Logs > Application
- System logs: Windows Logs > System
- Security logs: Windows Logs > Security

### Performance Monitor
- CPU usage
- Memory consumption
- Disk I/O
- Network activity

## 🎯 Best Practices

### Development
1. **Use Windows Terminal** for better command line experience
2. **Enable Long Path Support** for deep directory structures
3. **Configure Antivirus Exclusions** for development files
4. **Use Git Bash** for Unix-like commands
5. **Keep Dependencies Updated** regularly

### Production
1. **Use Windows Services** for process management
2. **Configure Windows Firewall** properly
3. **Set up Automated Backups** using Task Scheduler
4. **Monitor Performance** using Windows tools
5. **Keep System Updated** for security

---

## 🏆 Windows Compatibility Status

| Feature | Status | Notes |
|---------|--------|-------|
| Node.js | ✅ Full Support | All Node.js features supported |
| MySQL | ✅ Full Support | Optimized for Windows MySQL |
| SSL/TLS | ✅ Full Support | OpenSSL integration included |
| File Operations | ✅ Full Support | Cross-platform path handling |
| Command Execution | ✅ Full Support | Platform-specific commands |
| Environment Variables | ✅ Full Support | Windows environment support |
| Development Tools | ✅ Full Support | VS Code, Git, etc. |
| Production Deployment | ✅ Full Support | Windows Services, IIS |

**Overall Compatibility: 100%** 🎉

---

For detailed technical information, see [WINDOWS_COMPATIBILITY.md](docs/WINDOWS_COMPATIBILITY.md)
