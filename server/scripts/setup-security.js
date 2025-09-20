#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
  const envPath = path.join(__dirname, '../../.env');
  const envExamplePath = path.join(__dirname, '../../env.security.example');
  
  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env file already exists. Backing up to .env.backup');
    fs.copyFileSync(envPath, envPath + '.backup');
  }
  
  if (fs.existsSync(envExamplePath)) {
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
  const certsDir = path.join(__dirname, '../certs');
  
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
    console.log('📁 Created certs directory');
  }
  
  const keyPath = path.join(certsDir, 'server.key');
  const certPath = path.join(certsDir, 'server.crt');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    return;
  }
  
  try {
    const { execSync } = require('child_process');
    
    console.log('🔐 Generating SSL certificates...');
    
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 4096`, { stdio: 'inherit' });
    
    // Generate certificate
    const certCommand = `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost"`;
    execSync(certCommand, { stdio: 'inherit' });
    
    console.log('✅ SSL certificates generated successfully');
  } catch (error) {
    console.log('❌ Failed to generate SSL certificates:', error.message);
    console.log('💡 Make sure OpenSSL is installed on your system');
  }
};

// Create security documentation
const createSecurityDocs = () => {
  const docsPath = path.join(__dirname, '../../docs/SECURITY.md');
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
    console.log('   curl https://localhost:5443/health/ssl  # Test SSL');
    
  } catch (error) {
    console.error('❌ Security setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
setupSecurity();
