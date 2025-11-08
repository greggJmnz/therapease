const path = require('path');
// Load environment variables - use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../.env.production')
  : path.join(__dirname, '../../.env');
require('dotenv').config({ path: envFile });

// Database loader - force MySQL for production
const loadDatabase = () => {
  console.log('🚀 Loading MySQL database configuration...');
  return require('./database');
};

module.exports = loadDatabase;
