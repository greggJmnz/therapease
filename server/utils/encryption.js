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
      throw new Error('Invalid encrypted data format - expected iv:encrypted_data');
    }
    
    const ivHex = parts[0];
    const encrypted = parts[1];
    
    // Validate IV length (should be 32 hex characters = 16 bytes)
    if (!ivHex || ivHex.length !== 32) {
      throw new Error(`Invalid IV length: expected 32 hex characters, got ${ivHex ? ivHex.length : 0}`);
    }
    
    // Validate IV is valid hex
    if (!/^[0-9a-fA-F]+$/.test(ivHex)) {
      throw new Error('Invalid IV format - must be hexadecimal');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    
    // Validate IV buffer length
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV buffer length: expected ${IV_LENGTH} bytes, got ${iv.length}`);
    }
    
    // Validate encrypted data exists
    if (!encrypted || encrypted.length === 0) {
      throw new Error('Encrypted data is empty');
    }
    
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
  
  // Check if the value looks like encrypted data
  if (typeof encryptedValue === 'string' && encryptedValue.includes(':')) {
    try {
      // Additional validation: check if it looks like a valid encrypted format
      // Encrypted format: 32 hex characters (IV) : encrypted_data
      const parts = encryptedValue.split(':');
      
      // Check if it matches encrypted format: exactly 2 parts, first part is 32 hex chars, second part is hex
      if (parts.length === 2 && 
          parts[0].length === 32 && 
          /^[0-9a-fA-F]+$/.test(parts[0]) && // First part is hex
          parts[1].length > 0 &&
          /^[0-9a-fA-F]+$/.test(parts[1])) { // Second part is also hex (encrypted data)
        // This looks like encrypted data, try to decrypt
        return decrypt(encryptedValue);
      } else {
        // Doesn't match encrypted format - likely plain text with a colon (e.g., "Cancellation reason: Vacation")
        // Don't log warning for plain text - this is expected behavior
        return encryptedValue; // Return as-is if format is invalid
      }
    } catch (error) {
      // Decryption failed - might be corrupted encrypted data or plain text
      // Only log if it looked like encrypted data (hex format)
      const parts = encryptedValue.split(':');
      if (parts.length === 2 && parts[0].length === 32 && /^[0-9a-fA-F]+$/.test(parts[0])) {
        // Looked like encrypted data but decryption failed
        console.error(`Decryption failed for value: ${encryptedValue ? encryptedValue.substring(0, 50) : 'empty'}, error: ${error.message}`);
      }
      // Return original value - might be plain text or corrupted encrypted data
      return encryptedValue;
    }
  }
  
  // If it doesn't look like encrypted data (no colon), return as-is
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
        // decryptField already handles errors internally and returns the original value
        // or a fallback, so we can safely call it
        decrypted[field] = decryptField(decrypted[field]);
      } catch (error) {
        console.error(`Failed to decrypt field ${field}:`, error.message);
        // For notes field, return empty string if decryption fails
        // For other fields, keep original value (might be unencrypted)
        if (field === 'notes' || field === 'cancellationReason') {
          decrypted[field] = '';
        } else {
          // Keep original value - might be unencrypted data
          decrypted[field] = decrypted[field];
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
