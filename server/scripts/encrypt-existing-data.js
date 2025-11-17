const mysql = require('mysql2/promise');
const { encryptField } = require('../utils/encryption');
const path = require('path');
const fs = require('fs');

// Load environment variables
// Try .env.production first (for production), then .env (for development)
const envProductionPath = path.join(__dirname, '..', '.env.production');
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envProductionPath)) {
  require('dotenv').config({ path: envProductionPath });
  console.log('📁 Loading .env.production file');
} else if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('📁 Loading .env file');
} else {
  require('dotenv').config();
  console.log('⚠️  No .env file found, using defaults and environment variables');
}

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'therapease_user',
  password: process.env.DB_PASSWORD || 'TherapEase2025!@#',
  database: process.env.DB_NAME || 'therapease_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

async function encryptExistingData() {
  let connection;
  
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to database');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🔐 Host: ${dbConfig.host}:${dbConfig.port}\n`);
    
    let totalEncrypted = 0;
    
    // 1. Encrypt users table (email, phone, address)
    console.log('📧 Encrypting users table...');
    console.log('   Checking for unencrypted email, phone, and address fields...\n');
    
    const [users] = await connection.execute(
      `SELECT id, email, phone, address FROM users 
       WHERE (email IS NOT NULL AND email != '' AND email NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (phone IS NOT NULL AND phone != '' AND phone NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (address IS NOT NULL AND address != '' AND address NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')`
    );
    
    console.log(`   Found ${users.length} users with unencrypted data\n`);
    
    for (const user of users) {
      const updates = [];
      const values = [];
      let fieldsUpdated = [];
      
      if (user.email && !user.email.match(/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/)) {
        const encryptedEmail = encryptField(user.email);
        updates.push('email = ?');
        values.push(encryptedEmail);
        fieldsUpdated.push('email');
      }
      
      if (user.phone && !user.phone.match(/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/)) {
        const encryptedPhone = encryptField(user.phone);
        updates.push('phone = ?');
        values.push(encryptedPhone);
        fieldsUpdated.push('phone');
      }
      
      if (user.address && !user.address.match(/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/)) {
        const encryptedAddress = encryptField(user.address);
        updates.push('address = ?');
        values.push(encryptedAddress);
        fieldsUpdated.push('address');
      }
      
      if (updates.length > 0) {
        values.push(user.id);
        await connection.execute(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        console.log(`   ✅ User ID ${user.id}: Encrypted ${fieldsUpdated.join(', ')}`);
        totalEncrypted += fieldsUpdated.length;
      }
    }
    
    console.log(`\n   ✅ Encrypted ${users.length} users (${totalEncrypted} fields total)\n`);
    
    // 2. Encrypt daily_notes table
    console.log('📝 Encrypting daily_notes table...');
    console.log('   Checking for unencrypted activities, observations, progress, challenges, nextSteps...\n');
    
    const [notes] = await connection.execute(
      `SELECT id, activities, observations, progress, challenges, nextSteps 
       FROM daily_notes 
       WHERE (activities IS NOT NULL AND activities != '' AND activities NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (observations IS NOT NULL AND observations != '' AND observations NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (progress IS NOT NULL AND progress != '' AND progress NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (challenges IS NOT NULL AND challenges != '' AND challenges NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')
          OR (nextSteps IS NOT NULL AND nextSteps != '' AND nextSteps NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$')`
    );
    
    console.log(`   Found ${notes.length} daily notes with unencrypted data\n`);
    
    let notesFieldsEncrypted = 0;
    for (const note of notes) {
      const updates = [];
      const values = [];
      let fieldsUpdated = [];
      
      const fields = ['activities', 'observations', 'progress', 'challenges', 'nextSteps'];
      for (const field of fields) {
        if (note[field] && !note[field].match(/^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/)) {
          const encrypted = encryptField(note[field]);
          updates.push(`${field} = ?`);
          values.push(encrypted);
          fieldsUpdated.push(field);
        }
      }
      
      if (updates.length > 0) {
        values.push(note.id);
        await connection.execute(
          `UPDATE daily_notes SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        console.log(`   ✅ Note ID ${note.id}: Encrypted ${fieldsUpdated.join(', ')}`);
        notesFieldsEncrypted += fieldsUpdated.length;
      }
    }
    
    console.log(`\n   ✅ Encrypted ${notes.length} daily notes (${notesFieldsEncrypted} fields total)\n`);
    totalEncrypted += notesFieldsEncrypted;
    
    // 3. Encrypt appointments table (notes field)
    console.log('📅 Encrypting appointments table...');
    console.log('   Checking for unencrypted notes field...\n');
    
    const [appointments] = await connection.execute(
      `SELECT id, notes FROM appointments 
       WHERE notes IS NOT NULL 
         AND notes != '' 
         AND notes NOT REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$'`
    );
    
    console.log(`   Found ${appointments.length} appointments with unencrypted notes\n`);
    
    for (const appointment of appointments) {
      const encryptedNotes = encryptField(appointment.notes);
      await connection.execute(
        'UPDATE appointments SET notes = ? WHERE id = ?',
        [encryptedNotes, appointment.id]
      );
      console.log(`   ✅ Appointment ID ${appointment.id}: Encrypted notes`);
      totalEncrypted += 1;
    }
    
    console.log(`\n   ✅ Encrypted ${appointments.length} appointments\n`);
    
    // Summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');
    console.log(`📊 Total fields encrypted: ${totalEncrypted}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Migration error:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
    await pool.end();
  }
}

// Run migration
console.log('🔐 Starting encryption migration...\n');
encryptExistingData()
  .then(() => {
    console.log('✅ All done! Your data is now encrypted.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });

