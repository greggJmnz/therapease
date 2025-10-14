# 🚀 TherapEase Installation Guide

## 📋 Prerequisites

Before installing TherapEase, ensure you have the following installed on your system:

### Required Software
- **Node.js**: Version 18.0.0 or higher
- **NPM**: Version 8.0.0 or higher
- **MySQL**: Version 8.0 or higher
- **Git**: For cloning the repository

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: At least 2GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

## 🔧 Installation Steps

### 1. Clone the Repository
```bash
git clone <repository-url>
cd therapease
```

### 2. Quick Installation (Recommended)
```bash
# Install all dependencies and setup the system
npm run fresh-install
```

This command will:
- Install all dependencies for root, server, client, and public-website
- Set up environment configuration
- Initialize the database
- Generate SSL certificates
- Create VAPID keys for push notifications
- Seed the database with test data

### 3. Manual Installation (Step by Step)

#### Step 3.1: Install Dependencies
```bash
# Install all dependencies
npm run install:all
```

#### Step 3.2: Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
# Update database credentials, API keys, etc.
```

#### Step 3.3: Database Setup
```bash
# Initialize database structure
npm run db:init

# Seed with test data
npm run db:seed
```

#### Step 3.4: Security Setup
```bash
# Generate SSL certificates
npm run setup:ssl

# Generate VAPID keys for push notifications
npm run setup:vapid

# Setup security configuration
npm run setup:security
```

## 🗄️ Database Configuration

### MySQL Setup
1. **Install MySQL** (if not already installed)
2. **Create Database User** (optional, can use root)
3. **Update .env file** with your database credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=therapease
DB_PORT=3306
```

### Database Initialization
The system will automatically:
- Create the database if it doesn't exist
- Create all required tables with proper relationships
- Set up indexes for optimal performance
- Seed with comprehensive test data

## 🔐 Security Configuration

### Environment Variables
The system generates secure random values for:
- JWT secret keys
- Encryption keys
- Session secrets
- VAPID keys for push notifications

### SSL Certificates
- Self-signed certificates are generated for development
- For production, replace with certificates from a trusted CA

## 📊 Test Data

The system includes comprehensive test data:

### Users (16 total)
- **1 Admin**: admin@therapease.com / admin123
- **5 Therapists**: Various specializations and credentials
- **10 Patients**: Complete medical information and therapy goals

### Sample Data
- **10 Assessments**: Comprehensive therapy assessments
- **20 Daily Notes**: Therapy session documentation
- **15 Appointments**: Scheduled therapy sessions
- **10 Notifications**: System notifications

## 🚀 Running the Application

### Development Mode
```bash
# Start all services (server, client, public website)
npm run dev
```

### Production Mode
```bash
# Build the client
npm run build

# Start production server
npm start
```

### Access URLs
- **Client Application**: http://localhost:3000
- **Server API**: http://localhost:5000
- **HTTPS Server**: https://localhost:5443
- **Public Website**: http://localhost:8080

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Error
```bash
# Check MySQL service
sudo systemctl status mysql  # Linux
brew services list | grep mysql  # macOS

# Verify credentials in .env file
# Ensure MySQL user has CREATE privileges
```

#### 2. Port Already in Use
```bash
# Check what's using the port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in .env
```

#### 3. Permission Errors (Linux/macOS)
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### 4. Windows-Specific Issues
```bash
# Run as Administrator
# Disable antivirus temporarily during installation
# Use Windows Subsystem for Linux (WSL) if issues persist
```

### Reset Everything
```bash
# Clean installation
npm run reset

# Fresh start with seeding
npm run fresh-install
```

## 📱 Optional Services

### Email Configuration
Update .env file to enable email notifications:
```env
EMAIL_ENABLED=true
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### SMS Configuration
Update .env file to enable SMS notifications:
```env
SMS_ENABLED=true
VONAGE_API_KEY=your-vonage-key
VONAGE_API_SECRET=your-vonage-secret
```

### OpenAI Integration
Add your OpenAI API key for AI features:
```env
OPENAI_API_KEY=your-openai-key
```

## 🔄 Maintenance

### Update Dependencies
```bash
# Check for outdated packages
npm run check-deps

# Update all dependencies
npm run update-deps
```

### Database Backup
```bash
# Create backup
mysqldump -u root -p therapease > backup_$(date +%Y%m%d).sql

# Restore backup
mysql -u root -p therapease < backup_20240101.sql
```

### Log Files
- **Server logs**: `server/server.log`
- **Error logs**: Check console output during development

## 📞 Support

### Getting Help
1. Check the troubleshooting section above
2. Review the documentation in the `docs/` folder
3. Check the GitHub issues page
4. Contact the development team

### Useful Commands
```bash
# View all available scripts
npm run

# Check system status
npm run check-deps

# Clean and reinstall
npm run clean:install

# Database operations
npm run db:init    # Initialize database
npm run db:seed    # Seed with test data
npm run db:reset   # Reset and reseed database
```

---

## ✅ Installation Checklist

- [ ] Node.js 18+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] Repository cloned
- [ ] Dependencies installed (`npm run install:all`)
- [ ] Environment configured (`.env` file)
- [ ] Database initialized (`npm run db:init`)
- [ ] Test data seeded (`npm run db:seed`)
- [ ] SSL certificates generated
- [ ] VAPID keys generated
- [ ] Application running (`npm run dev`)
- [ ] All services accessible via URLs

**🎉 Congratulations! TherapEase is now installed and ready to use.**
