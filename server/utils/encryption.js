const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits

// Get encryption key from environment or generate one
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not found in environment variables. Using default key for development only!');
    return crypto.scryptSync('therapease-default-key-2024', 'salt', KEY_LENGTH);
  }
  return Buffer.from(key, 'hex');
};

// Generate a random encryption key (for initial setup)
const generateEncryptionKey = () => {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
};

// AES-256-CBC Encryption (more compatible)
const encrypt = (text) => {
  try {
    if (!text || text === null || text === undefined) {
      return null;
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV + Encrypted data
    const result = iv.toString('hex') + ':' + encrypted;
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

// AES-256-CBC Decryption
const decrypt = (encryptedData) => {
  try {
    if (!encryptedData || encryptedData === null || encryptedData === undefined || encryptedData === '') {
      return null;
    }

    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// Field-level encryption for sensitive data
const encryptField = (value) => {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  return encrypt(String(value));
};

// Field-level decryption for sensitive data
const decryptField = (encryptedValue) => {
  if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
    return encryptedValue;
  }
  
  // Check if the value looks like encrypted data (contains colon separator)
  if (typeof encryptedValue === 'string' && encryptedValue.includes(':')) {
    try {
      return decrypt(encryptedValue);
    } catch (error) {
      console.error(`Decryption failed for value: ${encryptedValue}, error: ${error.message}`);
      // If decryption fails, return empty string for notes or original value for other fields
      return '';
    }
  }
  
  // If it doesn't look like encrypted data, return as-is
  return encryptedValue;
};

// Encrypt sensitive fields in an object
const encryptSensitiveFields = (obj, sensitiveFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const encrypted = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      encrypted[field] = encryptField(encrypted[field]);
    }
  });
  
  return encrypted;
};

// Decrypt sensitive fields in an object
const decryptSensitiveFields = (obj, sensitiveFields = []) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const decrypted = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (decrypted[field] !== undefined && decrypted[field] !== null && decrypted[field] !== '') {
      try {
        decrypted[field] = decryptField(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error.message);
        // For notes field, return empty string if decryption fails
        // For other fields, keep original value
        if (field === 'notes') {
          decrypted[field] = '';
        }
      }
    }
  });
  
  return decrypted;
};

// Hash sensitive data for searching (one-way hash)
const hashForSearch = (text) => {
  if (!text) return null;
  return crypto.createHash('sha256').update(text).digest('hex');
};

// Generate secure random string
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate encryption key strength
const validateEncryptionKey = (key) => {
  if (!key || key.length < 64) {
    return false;
  }
  return true;
};

// Database field encryption utilities
const encryptDatabaseField = (value, fieldName) => {
  // Add field-specific salt for additional security
  const fieldSalt = crypto.createHash('sha256').update(fieldName).digest('hex').substring(0, 16);
  const saltedValue = fieldSalt + String(value);
  return encrypt(saltedValue);
};

const decryptDatabaseField = (encryptedValue, fieldName) => {
  if (!encryptedValue) return encryptedValue;
  
  try {
    const decrypted = decrypt(encryptedValue);
    const fieldSalt = crypto.createHash('sha256').update(fieldName).digest('hex').substring(0, 16);
    
    if (decrypted.startsWith(fieldSalt)) {
      return decrypted.substring(fieldSalt.length);
    }
    
    return decrypted;
  } catch (error) {
    console.error(`Database field decryption error for ${fieldName}:`, error);
    return encryptedValue;
  }
};

module.exports = {
  // Core encryption functions
  encrypt,
  decrypt,
  encryptField,
  decryptField,
  
  // Object encryption
  encryptSensitiveFields,
  decryptSensitiveFields,
  
  // Database utilities
  encryptDatabaseField,
  decryptDatabaseField,
  
  // Utility functions
  generateEncryptionKey,
  hashForSearch,
  generateSecureRandom,
  validateEncryptionKey,
  
  // Configuration
  ENCRYPTION_ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  TAG_LENGTH
};
