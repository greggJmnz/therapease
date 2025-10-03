const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Database loader - supports both MySQL and SQLite
const loadDatabase = () => {
  const dbType = process.env.DB_TYPE || 'sqlite';
  
  if (dbType === 'mysql') {
    console.log('🚀 Loading MySQL database configuration...');
    return require('./database');
  } else {
    console.log('🚀 Loading SQLite database configuration...');
    return require('./database-sqlite');
  }
};

module.exports = loadDatabase;
