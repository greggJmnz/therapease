const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../.env.production')
  : path.join(__dirname, '../../.env');

dotenv.config({ path: envFile });

const isProduction = process.env.NODE_ENV === 'production';

const requiredVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'ADMIN_PASSWORD',
  'OPENAI_API_KEY'
];

const productionOnlyVars = [
  'FRONTEND_URL',
  'CORS_ORIGIN'
];

const placeholderValues = new Set([
  '',
  'your-secret-key',
  'your-api-key-here',
  'your_mysql_password_here',
  'your-super-secure-jwt-secret-key-here-make-it-long-and-random',
  'your-64-character-hex-encryption-key-here',
  'SecureAdmin123!@#',
  'SecureAdmin2024!@#$%',
  'password',
  'secret',
  'jwt_secret'
]);

const isPlaceholderValue = (value) => {
  if (value === undefined || value === null) {
    return true;
  }

  return placeholderValues.has(String(value).trim());
};

const getEnv = (name, fallback = undefined) => {
  const value = process.env[name];
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return value;
};

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (isPlaceholderValue(value)) {
    throw new Error(`Missing or invalid required environment variable: ${name}`);
  }
  return value;
};

const validateProductionEnv = () => {
  const missing = [];

  for (const variableName of requiredVars) {
    if (isPlaceholderValue(process.env[variableName])) {
      missing.push(variableName);
    }
  }

  for (const variableName of productionOnlyVars) {
    if (isProduction && isPlaceholderValue(process.env[variableName])) {
      missing.push(variableName);
    }
  }

  const jwtSecret = process.env.JWT_SECRET || '';
  const encryptionKey = process.env.ENCRYPTION_KEY || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }

  if (adminPassword.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
  }

  if (isProduction && missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
};

const getFrontendUrl = () => {
  const frontendUrl = getEnv('FRONTEND_URL');
  if (frontendUrl) {
    return frontendUrl;
  }

  if (isProduction) {
    throw new Error('FRONTEND_URL is required in production');
  }

  return 'http://localhost:3000';
};

const getCorsOrigins = () => {
  const corsOrigin = getEnv('CORS_ORIGIN');
  const frontendUrl = getFrontendUrl();

  if (corsOrigin) {
    return corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);
  }

  if (isProduction) {
    throw new Error('CORS_ORIGIN is required in production');
  }

  return [frontendUrl];
};

module.exports = {
  envFile,
  isProduction,
  getEnv,
  getRequiredEnv,
  validateProductionEnv,
  getFrontendUrl,
  getCorsOrigins,
  isPlaceholderValue
};