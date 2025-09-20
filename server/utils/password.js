const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Password configuration
const SALT_ROUNDS = 12; // Increased from 10 for better security
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

// Password complexity requirements
const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  maxLength: MAX_PASSWORD_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    /password/i,
    /123456/i,
    /qwerty/i,
    /admin/i,
    /user/i,
    /login/i
  ]
};

// Hash password with bcrypt
const hashPassword = async (password) => {
  try {
    if (!password) {
      throw new Error('Password is required');
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
    
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters long`);
    }
    
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    return hashedPassword;
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

// Verify password against hash
const verifyPassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      return false;
    }
    
    const isValid = await bcrypt.compare(password, hashedPassword);
    return isValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Validate password complexity
const validatePasswordComplexity = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long`);
  }
  
  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    errors.push(`Password must be no more than ${PASSWORD_REQUIREMENTS.maxLength} characters long`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for forbidden patterns
  PASSWORD_REQUIREMENTS.forbiddenPatterns.forEach((pattern, index) => {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns and is not secure');
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure random password
const generateSecurePassword = (length = 16) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one character from each required category
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Check if password needs to be updated (for password rotation)
const shouldUpdatePassword = (passwordHash, lastUpdated) => {
  const PASSWORD_MAX_AGE_DAYS = 90; // 90 days
  const now = new Date();
  const lastUpdate = new Date(lastUpdated);
  const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
  
  return daysSinceUpdate > PASSWORD_MAX_AGE_DAYS;
};

// Generate password reset token
const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash password reset token for storage
const hashPasswordResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Verify password reset token
const verifyPasswordResetToken = (token, hashedToken) => {
  const tokenHash = hashPasswordResetToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash, 'hex'), Buffer.from(hashedToken, 'hex'));
};

// Password strength calculator
const calculatePasswordStrength = (password) => {
  let score = 0;
  let feedback = [];
  
  if (!password) {
    return { score: 0, strength: 'Very Weak', feedback: ['Password is required'] };
  }
  
  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
  
  // Pattern detection (penalties)
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }
  
  if (/123|abc|qwe/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }
  
  // Determine strength level
  let strength;
  if (score <= 2) strength = 'Very Weak';
  else if (score <= 4) strength = 'Weak';
  else if (score <= 6) strength = 'Fair';
  else if (score <= 8) strength = 'Good';
  else strength = 'Strong';
  
  // Add positive feedback
  if (password.length >= 12) feedback.push('Good length');
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) feedback.push('Good case variety');
  if (/\d/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push('Good character variety');
  }
  
  return { score, strength, feedback };
};

module.exports = {
  // Core password functions
  hashPassword,
  verifyPassword,
  
  // Password validation
  validatePasswordComplexity,
  calculatePasswordStrength,
  
  // Password generation
  generateSecurePassword,
  
  // Password management
  shouldUpdatePassword,
  generatePasswordResetToken,
  hashPasswordResetToken,
  verifyPasswordResetToken,
  
  // Configuration
  SALT_ROUNDS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS
};
