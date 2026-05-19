#!/usr/bin/env node

process.env.SKIP_DB_AUTO_INIT = 'true';

const { createDatabase, initializeDatabase, createTables, createPerformanceIndexes, closeDatabase } = require('../config/database');

const runMigrations = async () => {
  try {
    console.log('🚀 Running TherapEase database migrations...');
    await createDatabase();
    await initializeDatabase({ verifySchema: false });
    await createTables();
    await createPerformanceIndexes();
    await closeDatabase();
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigrations();
