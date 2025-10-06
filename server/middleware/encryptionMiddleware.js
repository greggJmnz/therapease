const { 
  encryptSensitiveFields, 
  decryptSensitiveFields, 
  encryptDatabaseField, 
  decryptDatabaseField 
} = require('../utils/encryption');

// Define sensitive fields that need encryption
const SENSITIVE_FIELDS = {
  users: ['email', 'phone', 'address'],
  patients: ['emergencyContact', 'insuranceInfo'], // Removed diagnosis and medicalHistory - these should be readable
  therapists: ['licenseNumber', 'education', 'certifications'],
  assessments: ['summary', 'recommendations', 'aiInsights'],
  daily_notes: ['activities', 'observations', 'progress', 'challenges', 'nextSteps'],
  appointments: ['notes']
};

// Middleware to encrypt sensitive data before saving to database
const encryptRequestData = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      const tableName = getTableNameFromRoute(req.route?.path || req.path);
      
      if (tableName && SENSITIVE_FIELDS[tableName]) {
        req.body = encryptSensitiveFields(req.body, SENSITIVE_FIELDS[tableName]);
      }
    }
    
    next();
  } catch (error) {
    console.error('Encryption middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Data encryption failed' 
    });
  }
};

// Middleware to decrypt sensitive data after retrieving from database
const decryptResponseData = (req, res, next) => {
  try {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to decrypt data before sending
    res.json = function(data) {
      if (data && typeof data === 'object') {
        const tableName = getTableNameFromRoute(req.route?.path || req.path);
        
        if (tableName && SENSITIVE_FIELDS[tableName]) {
          if (Array.isArray(data)) {
            // Handle array of objects
            data = data.map(item => 
              decryptSensitiveFields(item, SENSITIVE_FIELDS[tableName])
            );
          } else if (data.data && Array.isArray(data.data)) {
            // Handle paginated data
            data.data = data.data.map(item => 
              decryptSensitiveFields(item, SENSITIVE_FIELDS[tableName])
            );
          } else {
            // Handle single object
            data = decryptSensitiveFields(data, SENSITIVE_FIELDS[tableName]);
          }
          
        }
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  } catch (error) {
    console.error('Decryption middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Data decryption failed' 
    });
  }
};

// Helper function to determine table name from route
const getTableNameFromRoute = (path) => {
    const routeMap = {
      '/api/auth/register': 'users',
      '/api/auth/login': 'users',
      '/api/admin/patients': 'patients',
      '/api/admin/therapists': 'therapists',
      '/api/therapist/patients': 'patients',
      '/api/therapist/assessments': 'assessments',
      '/api/therapist/daily-notes': 'daily_notes',
      '/api/therapist/appointments': 'appointments',
      '/api/patient/assessments': 'assessments',
      '/api/patient/daily-notes': 'daily_notes',
      '/api/patient/appointments': 'appointments',
      '/api/patient/onboarding/status': null, // Don't decrypt onboarding status
      '/api/patient/onboarding/progress': null, // Don't decrypt onboarding progress
      '/api/patient/dashboard': null, // Don't decrypt dashboard
      '/api/patient/profile': 'patients' // Decrypt patient profile
    };
  
  // Find matching route
  for (const [route, table] of Object.entries(routeMap)) {
    if (path.includes(route.split('/').slice(2).join('/'))) {
      return table;
    }
  }
  
  return null;
};

// Database field encryption for specific operations
const encryptDatabaseFields = (data, tableName) => {
  if (!data || !tableName || !SENSITIVE_FIELDS[tableName]) {
    return data;
  }
  
  const encrypted = { ...data };
  
  SENSITIVE_FIELDS[tableName].forEach(field => {
    if (encrypted[field] !== undefined && encrypted[field] !== null) {
      encrypted[field] = encryptDatabaseField(encrypted[field], field);
    }
  });
  
  return encrypted;
};

// Database field decryption for specific operations
const decryptDatabaseFields = (data, tableName) => {
  if (!data || !tableName || !SENSITIVE_FIELDS[tableName]) {
    return data;
  }
  
  const decrypted = { ...data };
  
  SENSITIVE_FIELDS[tableName].forEach(field => {
    if (decrypted[field] !== undefined && decrypted[field] !== null) {
      decrypted[field] = decryptDatabaseField(decrypted[field], field);
    }
  });
  
  return decrypted;
};

// Audit logging for encryption operations
const logEncryptionOperation = (operation, tableName, fieldName, success) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    operation,
    table: tableName,
    field: fieldName,
    success,
    userAgent: 'TherapEase-System'
  };
  
  
  // In production, you might want to send this to a logging service
  // or store it in a secure audit log database
};

// Middleware to add encryption headers
const addEncryptionHeaders = (req, res, next) => {
  res.setHeader('X-Content-Encryption', 'AES-256-GCM');
  res.setHeader('X-Data-Protection', 'Enabled');
  next();
};

// Validate encrypted data format
const validateEncryptedData = (data) => {
  if (!data) return true;
  
  // Check if data looks like encrypted format (contains colons for IV:Tag:Data)
  if (typeof data === 'string' && data.includes(':')) {
    const parts = data.split(':');
    if (parts.length === 3) {
      // Validate hex format
      const hexRegex = /^[0-9a-fA-F]+$/;
      return parts.every(part => hexRegex.test(part));
    }
  }
  
  return true; // Non-encrypted data is also valid
};

// Error handling for encryption failures
const handleEncryptionError = (error, req, res, next) => {
  if (error.message.includes('encrypt') || error.message.includes('decrypt')) {
    console.error('Encryption error:', error);
    res.status(500).json({
      success: false,
      error: 'Data security processing failed',
      message: 'Please try again or contact support if the problem persists'
    });
  } else {
    next(error);
  }
};

module.exports = {
  encryptRequestData,
  decryptResponseData,
  encryptDatabaseFields,
  decryptDatabaseFields,
  logEncryptionOperation,
  addEncryptionHeaders,
  validateEncryptedData,
  handleEncryptionError,
  SENSITIVE_FIELDS
};
