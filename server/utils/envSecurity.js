const crypto = require('crypto');

/**
 * Environment Security Validation and Protection
 * Ensures sensitive data is properly secured and not exposed
 */

class EnvironmentSecurity {
  constructor() {
    this.requiredVars = [
      'DB_PASSWORD',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'ADMIN_PASSWORD'
    ];
    
    this.sensitiveVars = [
      'OPENAI_API_KEY',
      'EMAIL_PASSWORD',
      'VAPID_PRIVATE_KEY',
      'PHILSMS_API_TOKEN'
    ];
    
    this.frontendVars = [
      'VITE_API_URL',
      'VITE_PUBLIC_WEBSITE_URL',
      'VITE_VAPID_PUBLIC_KEY'
    ];
  }

  /**
   * Validate environment variables for security
   */
  validateEnvironment() {
    const issues = [];
    const warnings = [];

    // Check for required variables
    for (const varName of this.requiredVars) {
      if (!process.env[varName]) {
        issues.push(`Missing required environment variable: ${varName}`);
      } else if (this.isDefaultValue(varName, process.env[varName])) {
        issues.push(`Using default/placeholder value for: ${varName}`);
      }
    }

    // Check for sensitive variables with default values
    for (const varName of this.sensitiveVars) {
      if (process.env[varName] && this.isDefaultValue(varName, process.env[varName])) {
        warnings.push(`Using default/placeholder value for sensitive variable: ${varName}`);
      }
    }

    // Check for weak passwords
    if (process.env.ADMIN_PASSWORD && this.isWeakPassword(process.env.ADMIN_PASSWORD)) {
      issues.push('Admin password is too weak. Use a strong password with at least 12 characters.');
    }

    // Check for weak JWT secret
    if (process.env.JWT_SECRET && this.isWeakJWTSecret(process.env.JWT_SECRET)) {
      issues.push('JWT secret is too weak. Use a random string with at least 32 characters.');
    }

    // Check for weak encryption key
    if (process.env.ENCRYPTION_KEY && this.isWeakEncryptionKey(process.env.ENCRYPTION_KEY)) {
      issues.push('Encryption key is too weak. Use a 64-character hex string.');
    }

    return { issues, warnings };
  }

  /**
   * Check if a value is a default/placeholder
   */
  isDefaultValue(varName, value) {
    const defaults = {
      'DB_PASSWORD': ['your_mysql_password_here', 'password', ''],
      'JWT_SECRET': ['your-super-secure-jwt-secret-key-here-make-it-long-and-random', 'secret', 'jwt_secret'],
      'ENCRYPTION_KEY': ['your-64-character-hex-encryption-key-here', ''],
      'ADMIN_PASSWORD': ['SecureAdmin123!@#', 'admin', 'password'],
      'OPENAI_API_KEY': ['your_openai_api_key_here', 'sk-'],
      'EMAIL_PASSWORD': ['your_app_specific_password_here', ''],
      'VAPID_PRIVATE_KEY': ['your_vapid_private_key_here', ''],
      'PHILSMS_API_TOKEN': ['your_philsms_api_token_here', '']
    };

    return defaults[varName]?.includes(value) || false;
  }

  /**
   * Check if password is weak
   */
  isWeakPassword(password) {
    if (!password || password.length < 12) return true;
    if (!/[A-Z]/.test(password)) return true; // No uppercase
    if (!/[a-z]/.test(password)) return true; // No lowercase
    if (!/[0-9]/.test(password)) return true; // No numbers
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return true; // No special chars
    return false;
  }

  /**
   * Check if JWT secret is weak
   */
  isWeakJWTSecret(secret) {
    return !secret || secret.length < 32 || secret === 'secret' || secret === 'jwt_secret';
  }

  /**
   * Check if encryption key is weak
   */
  isWeakEncryptionKey(key) {
    return !key || key.length !== 64 || !/^[0-9a-fA-F]+$/.test(key);
  }

  /**
   * Generate secure random values
   */
  generateSecureValues() {
    return {
      jwtSecret: crypto.randomBytes(32).toString('hex'),
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      sessionSecret: crypto.randomBytes(32).toString('hex')
    };
  }

  /**
   * Check for environment variable exposure in frontend
   */
  checkFrontendExposure() {
    const exposed = [];
    
    // Check if any sensitive variables are prefixed with VITE_
    for (const varName of this.sensitiveVars) {
      if (process.env[`VITE_${varName}`]) {
        exposed.push(`Sensitive variable exposed to frontend: VITE_${varName}`);
      }
    }

    // Check for non-VITE_ variables that might be exposed
    const allEnvVars = Object.keys(process.env);
    for (const varName of allEnvVars) {
      if (varName.startsWith('VITE_') && this.sensitiveVars.includes(varName.replace('VITE_', ''))) {
        exposed.push(`Sensitive variable exposed to frontend: ${varName}`);
      }
    }

    return exposed;
  }

  /**
   * Sanitize environment variables for logging
   */
  sanitizeForLogging(envVars) {
    const sanitized = { ...envVars };
    const sensitiveKeys = [...this.sensitiveVars, ...this.requiredVars];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  /**
   * Get security recommendations
   */
  getSecurityRecommendations() {
    return [
      'Use strong, unique passwords for all accounts',
      'Generate random JWT secrets and encryption keys',
      'Never commit .env files to version control',
      'Use environment-specific configuration files',
      'Regularly rotate API keys and secrets',
      'Enable HTTPS in production',
      'Use secure database connections',
      'Implement proper access controls',
      'Monitor for unauthorized access',
      'Keep dependencies updated'
    ];
  }
}

module.exports = EnvironmentSecurity;
