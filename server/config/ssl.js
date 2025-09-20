const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// SSL/TLS Configuration
const SSL_CONFIG = {
  // Cipher suites (compatible with both TLS 1.2 and 1.3)
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  
  // Honor client cipher order
  honorCipherOrder: true,
  
  // Session management
  sessionTimeout: 300, // 5 minutes
  sessionIdContext: 'therapease-ssl-context',
  
  // Certificate validation
  rejectUnauthorized: false, // Allow self-signed certificates in development
  requestCert: false,
  agent: false
};

// Generate self-signed certificate for development
const generateSelfSignedCert = () => {
  const { execSync } = require('child_process');
  const certDir = path.join(__dirname, '../certs');
  
  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }
  
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.crt');
  
  // Check if certificates already exist
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('✅ SSL certificates already exist');
    return { keyPath, certPath };
  }
  
  try {
    console.log('🔐 Generating self-signed SSL certificates...');
    
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 4096`, { stdio: 'inherit' });
    
    // Generate certificate
    const certCommand = `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost"`;
    execSync(certCommand, { stdio: 'inherit' });
    
    console.log('✅ SSL certificates generated successfully');
    return { keyPath, certPath };
  } catch (error) {
    console.error('❌ Failed to generate SSL certificates:', error.message);
    console.log('💡 Make sure OpenSSL is installed on your system');
    return null;
  }
};

// Load SSL certificates
const loadSSLCertificates = () => {
  const certDir = path.join(__dirname, '../certs');
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.crt');
  
  // Check if certificates exist
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.log('⚠️  SSL certificates not found. Generating self-signed certificates...');
    const generated = generateSelfSignedCert();
    if (!generated) {
      return null;
    }
    return {
      key: fs.readFileSync(generated.keyPath),
      cert: fs.readFileSync(generated.certPath)
    };
  }
  
  try {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
  } catch (error) {
    console.error('❌ Failed to load SSL certificates:', error.message);
    return null;
  }
};

// Create HTTPS server
const createHTTPSServer = (app) => {
  const sslOptions = loadSSLCertificates();
  
  if (!sslOptions) {
    console.error('❌ Cannot create HTTPS server without SSL certificates');
    return null;
  }
  
  const httpsOptions = {
    ...SSL_CONFIG,
    ...sslOptions
  };
  
  try {
    const httpsServer = https.createServer(httpsOptions, app);
    
    // Add security headers
    httpsServer.on('secureConnection', (tlsSocket) => {
      console.log('🔒 Secure connection established');
      console.log(`   Protocol: ${tlsSocket.getProtocol()}`);
      console.log(`   Cipher: ${tlsSocket.getCipher()}`);
    });
    
    return httpsServer;
  } catch (error) {
    console.error('❌ Failed to create HTTPS server:', error.message);
    return null;
  }
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // HTTPS enforcement
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.header('host')}${req.url}`);
  }
  
  // Security headers
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'");
  
  next();
};

// TLS version checker
const checkTLSVersion = (req, res, next) => {
  const tlsVersion = req.connection.getProtocol();
  console.log(`🔍 TLS Version: ${tlsVersion}`);
  
  if (tlsVersion !== 'TLSv1.3') {
    console.warn(`⚠️  Using ${tlsVersion} instead of TLS 1.3`);
  }
  
  next();
};

// Certificate information
const getCertificateInfo = () => {
  const sslOptions = loadSSLCertificates();
  if (!sslOptions) {
    return null;
  }
  
  try {
    const x509 = require('crypto').X509Certificate;
    const cert = new x509(sslOptions.cert);
    
    return {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      fingerprint: cert.fingerprint,
      serialNumber: cert.serialNumber
    };
  } catch (error) {
    console.error('Failed to parse certificate:', error.message);
    return null;
  }
};

// Health check for SSL
const sslHealthCheck = (req, res) => {
  const certInfo = getCertificateInfo();
  const tlsVersion = req.connection.getProtocol();
  
  res.json({
    status: 'OK',
    ssl: {
      enabled: true,
      tlsVersion: tlsVersion,
      certificate: certInfo ? {
        subject: certInfo.subject,
        validFrom: certInfo.validFrom,
        validTo: certInfo.validTo,
        fingerprint: certInfo.fingerprint
      } : null
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  SSL_CONFIG,
  createHTTPSServer,
  loadSSLCertificates,
  generateSelfSignedCert,
  securityHeaders,
  checkTLSVersion,
  getCertificateInfo,
  sslHealthCheck
};
