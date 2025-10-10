# TherapEase Security Setup

## 🔐 Secure Admin-Only Initial Setup

The TherapEase system now implements a secure, admin-only initial setup where only the system administrator account is hardcoded, and all other users (patients and therapists) must go through the proper onboarding process.

## 🛡️ Security Features

### ✅ Secure Admin Account
- **Single Hardcoded User**: Only the admin account is created automatically
- **Strong Password**: Complex password with special characters and numbers
- **Environment Variables**: Admin credentials stored in environment variables
- **Immediate Change Required**: Admin must change credentials after first login

### ✅ No Hardcoded Patient/Therapist Accounts
- **Onboarding Required**: All patients and therapists must register through the system
- **No Default Credentials**: No pre-created user accounts for testing
- **Secure Registration**: Proper validation and verification process

## 🔑 Default Admin Credentials

### Environment Variables
The admin credentials are configured in your `.env` file:

```bash
# Secure Admin Account (REQUIRED - Change these credentials!)
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$%
```

### ⚠️ Security Warning
**CRITICAL**: Change these credentials immediately after first login!

## 🚀 Initial Setup Process

### 1. Database Initialization
When the server starts for the first time:
- Database tables are created
- **Only** the admin account is created
- No other users are hardcoded

### 2. Admin Login
- Login with the default admin credentials
- **Immediately change the password** in the admin panel
- Update email if needed

### 3. User Onboarding
- **Therapists**: Must register through the admin panel or registration process
- **Patients**: Must be invited by therapists or register through the system
- **Proper Verification**: All new users go through verification process

## 🔒 Security Best Practices

### Admin Account Security
1. **Change Default Password**: Use a strong, unique password
2. **Two-Factor Authentication**: Enable if available
3. **Regular Password Updates**: Change password periodically
4. **Secure Environment**: Keep admin credentials secure

### User Management
1. **No Hardcoded Users**: All users must register properly
2. **Verification Required**: New users must be verified
3. **Role-Based Access**: Proper permissions for each user type
4. **Audit Trail**: Track user creation and modifications

## 📋 Environment Configuration

### Required Environment Variables
```bash
# Admin Account (REQUIRED)
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$%

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Encryption
ENCRYPTION_KEY=your_64_character_encryption_key
```

### Windows Environment
For Windows users, use the `.env-windows` file as a template:
```bash
cp .env-windows .env
# Edit .env with your specific settings
```

## 🛠️ Development vs Production

### Development Environment
- Default admin credentials are acceptable for development
- Change credentials before deploying to production
- Use strong passwords in production

### Production Environment
- **MUST** change admin credentials
- Use environment-specific configuration
- Implement additional security measures
- Regular security audits

## 🔄 Database Reset

### Clear All Data
If you need to reset the database to the secure admin-only state:

1. **Stop the server**
2. **Clear the database**:
   ```bash
   mysql -u root -p -e "USE therapease_dev; DELETE FROM users;"
   ```
3. **Restart the server** - only admin account will be created

### Verify Secure Setup
After reset, verify:
- Only 1 user exists (admin)
- No hardcoded patients or therapists
- Admin can login with secure credentials
- Other users must register through onboarding

## 🚨 Security Checklist

### Initial Setup
- [ ] Admin credentials changed from default
- [ ] Strong password implemented
- [ ] Environment variables secured
- [ ] No hardcoded users except admin

### Ongoing Security
- [ ] Regular password updates
- [ ] User access reviews
- [ ] Security monitoring
- [ ] Backup and recovery procedures

## 📞 Support

If you encounter issues with the secure setup:

1. **Check Environment Variables**: Ensure ADMIN_EMAIL and ADMIN_PASSWORD are set
2. **Database Connection**: Verify database credentials
3. **Server Logs**: Check for initialization errors
4. **Reset Database**: Clear and restart if needed

## 🎯 Benefits of Secure Setup

### Enhanced Security
- **No Default Users**: Eliminates security risks from hardcoded accounts
- **Proper Onboarding**: Ensures all users are properly verified
- **Admin Control**: Full control over user creation and management

### Better User Experience
- **Professional Onboarding**: Proper registration and verification process
- **Role-Based Access**: Appropriate permissions for each user type
- **Audit Trail**: Track all user activities and changes

### Compliance Ready
- **HIPAA Compliance**: Proper user management for healthcare data
- **Security Standards**: Meets healthcare security requirements
- **Audit Requirements**: Full tracking of user creation and access

This secure setup ensures that TherapEase meets the highest security standards for healthcare applications while providing a professional user experience.
