# Windows Environment Setup Guide

## Overview

The `.env-windows` file contains all the environment variables needed for Windows development. This file is **required** for the application to run properly on Windows systems.

## Required vs Optional Variables

### 🔴 **REQUIRED** - Must be configured for basic functionality:

```env
# Database Configuration (REQUIRED)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_mysql_password_here

# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secure-jwt-secret-key-here-make-it-long-and-random
JWT_EXPIRES_IN=24h

# Encryption Configuration (REQUIRED)
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here

# Server Configuration (REQUIRED)
PORT=5000
NODE_ENV=development

# Client Configuration (REQUIRED)
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_ENABLED=true

# Database Type (REQUIRED)
DB_TYPE=mysql
```

### 🟡 **OPTIONAL** - For enhanced features:

```env
# AI Features (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# Email Features (Optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
FRONTEND_URL=http://localhost:3000

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:admin@therapease.com

# SMS Features (Optional)
SMS_ENABLED=false
VONAGE_API_KEY=your_vonage_api_key_here
VONAGE_API_SECRET=your_vonage_api_secret_here
VONAGE_BASE_URL=https://api.nexmo.com
VONAGE_FROM_NUMBER=TherapEase
API_BASE_URL=http://localhost:5000

# SSL/HTTPS (Optional)
SSL_PORT=5443
SSL_ENABLED=false
```

## Setup Instructions

### 1. **Copy the Environment File**
```bash
# Copy the Windows environment template
copy .env-windows .env
```

### 2. **Configure Required Variables**

#### Database Setup:
```env
DB_PASSWORD=your_actual_mysql_password
```

#### Security Keys:
```env
# Generate a secure JWT secret (32+ characters)
JWT_SECRET=your-super-secure-jwt-secret-key-here-make-it-long-and-random

# Generate a 64-character hex encryption key
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
```

### 3. **Optional Features Setup**

#### For AI Features:
```env
OPENAI_API_KEY=sk-your-actual-openai-api-key
```

#### For Email Features:
```env
EMAIL_USER=your-actual-email@gmail.com
EMAIL_PASSWORD=your-actual-app-password
```

#### For Push Notifications:
```bash
# Generate VAPID keys
node server/scripts/generate-vapid-keys.js
```

#### For SMS Features:
```env
SMS_ENABLED=true
VONAGE_API_KEY=your-vonage-api-key
VONAGE_API_SECRET=your-vonage-api-secret
```

## Windows-Specific Considerations

### Path Handling
The application uses Windows-compatible path handling:
- Uses `server/certs` instead of `server/certs/`
- Handles Windows path separators automatically
- Uses forward slashes for web paths

### Service Configuration
If running as a Windows service:
```env
SERVICE_NAME=TherapEase
SERVICE_DISPLAY_NAME=TherapEase Pediatric OT System
SERVICE_DESCRIPTION=Web-based Pediatric Occupational Therapy System with AI Augmented Assessment
```

### SSL Configuration
For HTTPS in development:
```env
SSL_ENABLED=true
SSL_PORT=5443
```

## Feature Dependencies

### Core Features (Always Available):
- ✅ User authentication
- ✅ Database operations
- ✅ Basic appointment management
- ✅ Patient/therapist management

### Optional Features:
- 🤖 **AI Features**: Requires `OPENAI_API_KEY`
- 📧 **Email**: Requires `EMAIL_USER` and `EMAIL_PASSWORD`
- 📱 **Push Notifications**: Requires VAPID keys
- 📱 **SMS**: Requires Vonage API credentials
- 🔒 **HTTPS**: Requires SSL certificates

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Check `DB_PASSWORD` is correct
   - Ensure MySQL is running
   - Verify `DB_HOST` and `DB_PORT`

2. **Authentication Errors**
   - Verify `JWT_SECRET` is set
   - Check `ENCRYPTION_KEY` is 64 characters

3. **Client Connection Issues**
   - Ensure `REACT_APP_API_URL` matches server port
   - Check CORS configuration

4. **Optional Features Not Working**
   - Verify required API keys are set
   - Check feature-specific configuration

## Security Notes

- **Never commit `.env` files to version control**
- **Use strong, unique secrets for production**
- **Rotate keys regularly**
- **Use environment-specific configurations**

## Production vs Development

### Development (Current Setup):
- Uses localhost URLs
- SSL disabled by default
- Optional features can be disabled
- Debug logging enabled

### Production (Future):
- Use production URLs
- Enable SSL
- Configure all required services
- Use production-grade secrets
