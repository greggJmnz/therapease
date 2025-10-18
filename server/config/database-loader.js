const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Database loader - force MySQL for production
const loadDatabase = () => {
  console.log('🚀 Loading MySQL database configuration...');
  return require('./database');
};

module.exports = loadDatabase;
