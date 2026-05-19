#!/usr/bin/env node

process.env.SKIP_DB_AUTO_INIT = 'true';

const { initializeDatabase, seedInitialData, closeDatabase } = require('../config/database');

const runSeed = async () => {
  try {
    console.log('🌱 Seeding TherapEase production data...');
    await initializeDatabase({ verifySchema: true });
    await seedInitialData();
    await closeDatabase();
    console.log('✅ Database seeding completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

runSeed();
