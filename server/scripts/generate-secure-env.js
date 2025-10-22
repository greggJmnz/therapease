#!/usr/bin/env node

/**
 * Generate Secure Environment Values
 * 
 * This script generates secure random values for environment variables
 * to help users create secure .env files.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 TherapEase Secure Environment Generator\n');

// Generate secure values
const secureValues = {
  jwtSecret: crypto.randomBytes(32).toString('hex'),
  encryptionKey: crypto.randomBytes(32).toString('hex'),
  sessionSecret: crypto.randomBytes(32).toString('hex'),
  adminPassword: generateSecurePassword()
};

function generateSecurePassword() {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 4; i < 16; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Display generated values
console.log('Generated secure values:');
console.log('=====================================');
console.log(`JWT_SECRET=${secureValues.jwtSecret}`);
console.log(`ENCRYPTION_KEY=${secureValues.encryptionKey}`);
console.log(`SESSION_SECRET=${secureValues.sessionSecret}`);
console.log(`ADMIN_PASSWORD=${secureValues.adminPassword}`);
console.log('=====================================\n');

// Create .env template with secure values
const envTemplate = `# TherapEase Secure Environment Configuration
# Generated on ${new Date().toISOString()}

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_mysql_password_here

# Secure Admin Account
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=${secureValues.adminPassword}

# JWT Configuration
JWT_SECRET=${secureValues.jwtSecret}
JWT_EXPIRES_IN=24h

# Encryption Configuration
ENCRYPTION_KEY=${secureValues.encryptionKey}
SESSION_SECRET=${secureValues.sessionSecret}

# OpenAI Configuration (Add your API key)
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_ENABLED=true
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key_here

# Database Type
DB_TYPE=mysql

# Email Configuration (Optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password_here
FRONTEND_URL=http://localhost:3000

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=your_vapid_public_key_here
VAPID_PRIVATE_KEY=your_vapid_private_key_here
VAPID_SUBJECT=mailto:admin@therapease.com

# SMS Configuration (Optional)
SMS_ENABLED=false
VONAGE_API_KEY=your_vonage_api_key_here
VONAGE_API_SECRET=your_vonage_api_secret_here
VONAGE_BASE_URL=https://api.nexmo.com
VONAGE_FROM_NUMBER=TherapEase
API_BASE_URL=http://localhost:5000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,https://localhost:5443

# SSL Configuration (Optional)
SSL_PORT=5443
SSL_ENABLED=false
`;

// Write to .env.secure file
const envPath = path.join(__dirname, '../../.env.secure');
fs.writeFileSync(envPath, envTemplate);

console.log('✅ Secure environment template created: .env.secure');
console.log('\n📋 Next steps:');
console.log('1. Copy .env.secure to .env: cp .env.secure .env');
console.log('2. Update database password in .env');
console.log('3. Add your OpenAI API key to .env');
console.log('4. Add your email credentials to .env (if needed)');
console.log('5. Generate VAPID keys: npm run generate-vapid-keys');
console.log('\n⚠️  IMPORTANT: Never commit .env files to version control!');
console.log('✅ The .gitignore file has been updated to exclude .env files.');

// Security recommendations
console.log('\n🔒 Security Recommendations:');
console.log('- Use strong, unique passwords for all services');
console.log('- Regularly rotate API keys and secrets');
console.log('- Enable HTTPS in production');
console.log('- Monitor for unauthorized access');
console.log('- Keep dependencies updated');
console.log('- Use environment-specific configuration files');

console.log('\n🚨 If you had exposed credentials, revoke them immediately!');
console.log('   Check the main README.md for security setup instructions.');
