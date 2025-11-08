const EnvironmentSecurity = require('../utils/envSecurity');

/**
 * Security Middleware
 * Validates environment security and prevents sensitive data exposure
 */

const envSecurity = new EnvironmentSecurity();

/**
 * Environment Security Validation Middleware
 */
const validateEnvironmentSecurity = (req, res, next) => {
  // Only run security checks in development
  if (process.env.NODE_ENV === 'development') {
    const validation = envSecurity.validateEnvironment();
    
    if (validation.issues.length > 0) {
      console.error('🚨 SECURITY ISSUES DETECTED:');
      validation.issues.forEach(issue => console.error(`  ❌ ${issue}`));
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  SECURITY WARNINGS:');
      validation.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
    }
  }
  
  next();
};

/**
 * Prevent sensitive data exposure in responses
 */
const sanitizeResponse = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Sanitize any sensitive data in responses
    if (data && typeof data === 'object') {
      data = sanitizeObject(data);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Sanitize object to remove sensitive data
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    const sensitiveKeys = [
      'password', 'token', 'secret', 'key', 'apiKey', 'api_key',
      'openai_api_key', 'jwt_secret', 'encryption_key', 'vapid_private_key',
      'email_password', 'philsms_api_token', 'db_password'
    ];
    
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
      
      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Prevent sensitive data exposure in headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

/**
 * Environment variable exposure check
 */
const checkEnvironmentExposure = (req, res, next) => {
  const exposed = envSecurity.checkFrontendExposure();
  
  if (exposed.length > 0) {
    console.error('🚨 FRONTEND EXPOSURE DETECTED:');
    exposed.forEach(issue => console.error(`  ❌ ${issue}`));
  }
  
  next();
};

/**
 * Log security events
 */
const logSecurityEvent = (event, details = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = envSecurity.sanitizeForLogging(details);
  
  console.log(`[${timestamp}] SECURITY EVENT: ${event}`, sanitizedDetails);
};

module.exports = {
  validateEnvironmentSecurity,
  sanitizeResponse,
  securityHeaders,
  checkEnvironmentExposure,
  logSecurityEvent,
  envSecurity
};
