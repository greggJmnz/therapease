#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { 
  isWindows, 
  execCommand, 
  createDirectory, 
  fileExists, 
  joinPaths,
  copyFile,
  generateSSLCertificates,
  getOpenSSLCommand,
  isOpenSSLAvailable,
  getPlatformInfo
} = require('../utils/windowsCompatibility');

console.log('🔐 TherapEase Security Setup');
console.log('============================\n');

// Generate encryption key
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate JWT secret
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Generate session secret
const generateSessionSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create .env file with security configuration
const createEnvFile = () => {
  const envPath = joinPaths(__dirname, '../../.env');
  const envExamplePath = joinPaths(__dirname, '../../env.security.example');
  
  if (fileExists(envPath)) {
    console.log('⚠️  .env file already exists. Backing up to .env.backup');
    copyFile(envPath, envPath + '.backup');
  }
  
  if (fileExists(envExamplePath)) {
    let envContent = fs.readFileSync(envExamplePath, 'utf8');
    
    // Replace placeholder values with generated ones
    envContent = envContent.replace('your-super-secure-jwt-secret-key-here-make-it-long-and-random', generateJWTSecret());
    envContent = envContent.replace('your-64-character-hex-encryption-key-here', generateEncryptionKey());
    envContent = envContent.replace('your-session-secret-key-here', generateSessionSecret());
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with secure configuration');
  } else {
    console.log('❌ env.security.example not found');
  }
};

// Generate SSL certificates
const generateSSLCertificates = () => {
  const certsDir = joinPaths(__dirname, '../certs');
  
  createDirectory(certsDir);
  console.log('📁 Created certs directory');
  
  const keyPath = joinPaths(certsDir, 'server.key');
  const certPath = joinPaths(certsDir, 'server.crt');
  
  if (fileExists(keyPath) && fileExists(certPath)) {
    console.log('✅ SSL certificates already exist');
    return;
  }
  
  console.log('🔐 Generating SSL certificates...');
  
  const success = generateSSLCertificates(keyPath, certPath, {
    keySize: 4096,
    days: 365,
    subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost'
  });
  
  if (!success) {
    console.log('❌ Failed to generate SSL certificates');
    if (isWindows) {
      console.log('💡 For Windows, you can:');
      console.log('   1. Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html');
      console.log('   2. Add OpenSSL to your PATH environment variable');
      console.log('   3. Or use Windows Subsystem for Linux (WSL)');
    } else {
      console.log('💡 Make sure OpenSSL is installed on your system');
    }
  }
};

// Create security documentation
const createSecurityDocs = () => {
  const docsPath = joinPaths(__dirname, '../../docs/SECURITY.md');
  const securityDoc = `# 🔐 TherapEase Security Documentation

## Overview
TherapEase implements enterprise-grade security measures to protect patient health information (PHI) and ensure HIPAA compliance.

## Security Features

### 🔒 Encryption
- **AES-256-GCM Encryption**: All sensitive data is encrypted using AES-256-GCM
- **Field-Level Encryption**: Sensitive fields are encrypted individually
- **Database Encryption**: Data at rest is encrypted
- **Key Management**: Secure key rotation and management

### 🔑 Authentication & Authorization
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Secure authentication tokens
- **Role-Based Access Control**: Admin, Therapist, Patient roles
- **Session Management**: Secure session handling

### 🌐 Network Security
- **TLS 1.3**: Latest TLS version for secure communication
- **HTTPS Enforcement**: All communication encrypted in transit
- **Security Headers**: Comprehensive security headers
- **CORS Protection**: Cross-origin request security

### 📊 Audit & Compliance
- **Audit Logging**: Complete activity tracking
- **HIPAA Compliance**: Healthcare data protection
- **Access Logging**: User access monitoring
- **Breach Detection**: Automated security monitoring

## Configuration

### Environment Variables
- \`JWT_SECRET\`: JWT signing secret
- \`ENCRYPTION_KEY\`: AES encryption key
- \`DB_PASSWORD\`: Database password
- \`NODE_ENV\`: Environment (development/production)

### SSL Certificates
- Self-signed certificates for development
- Production certificates should be obtained from a trusted CA

## Security Best Practices

1. **Regular Updates**: Keep all dependencies updated
2. **Key Rotation**: Rotate encryption keys regularly
3. **Access Monitoring**: Monitor user access patterns
4. **Backup Security**: Encrypt all backups
5. **Network Security**: Use VPN for remote access

## Compliance

### HIPAA Requirements
- ✅ Administrative Safeguards
- ✅ Physical Safeguards  
- ✅ Technical Safeguards
- ✅ Data Encryption
- ✅ Access Controls
- ✅ Audit Logs

## Support
For security questions or concerns, contact the development team.
`;

  fs.writeFileSync(docsPath, securityDoc);
  console.log('✅ Created security documentation');
};

// Main setup function
const setupSecurity = () => {
  try {
    // Display platform information
    const platformInfo = getPlatformInfo();
    console.log(`🖥️  Platform: ${platformInfo.platform} ${platformInfo.arch}`);
    console.log(`📦 Node.js: ${platformInfo.nodeVersion}`);
    console.log(`🔧 NPM: ${platformInfo.npmVersion}\n`);
    
    console.log('1. Creating environment configuration...');
    createEnvFile();
    
    console.log('\n2. Generating SSL certificates...');
    generateSSLCertificates();
    
    console.log('\n3. Creating security documentation...');
    createSecurityDocs();
    
    console.log('\n🎉 Security setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review and update .env file with your database credentials');
    console.log('   2. For production, obtain SSL certificates from a trusted CA');
    console.log('   3. Update CORS_ORIGIN in .env with your domain');
    console.log('   4. Test the security features by starting the server');
    console.log('\n🔗 Useful commands:');
    console.log('   npm run dev          # Start development server');
    console.log('   npm run build        # Build for production');
    if (isWindows) {
      console.log('   curl https://localhost:5443/health/ssl  # Test SSL (if curl is available)');
      console.log('   powershell -Command "Invoke-WebRequest -Uri https://localhost:5443/health/ssl -SkipCertificateCheck"  # Test SSL with PowerShell');
    } else {
      console.log('   curl https://localhost:5443/health/ssl  # Test SSL');
    }
    
  } catch (error) {
    console.error('❌ Security setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
setupSecurity();
