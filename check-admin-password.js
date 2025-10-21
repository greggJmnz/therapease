#!/usr/bin/env node

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function checkAdminPassword() {
  console.log('🔍 Checking admin password in database...\n');
  
  try {
    // Connect to database
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'therapease_user',
      password: 'grntjmnz2522!',
      database: 'therapease_db'
    });

    console.log('✅ Connected to database');

    // Get admin user
    const [rows] = await connection.execute(
      'SELECT id, email, password FROM users WHERE email = ? AND role = ?',
      ['admin@therapease.com', 'admin']
    );

    if (rows.length === 0) {
      console.log('❌ Admin user not found');
      return;
    }

    const admin = rows[0];
    console.log('👤 Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password Hash: ${admin.password.substring(0, 20)}...`);

    // Test different passwords
    const passwords = [
      'SecureAdmin2024!@#$',
      'admin123',
      'password',
      'Admin123!',
      'therapease2024'
    ];

    console.log('\n🔐 Testing passwords:');
    for (const password of passwords) {
      const isValid = await bcrypt.compare(password, admin.password);
      console.log(`   ${password}: ${isValid ? '✅ VALID' : '❌ Invalid'}`);
    }

    // Generate correct hash for SecureAdmin2024!@#$
    console.log('\n🔧 Generating correct hash for SecureAdmin2024!@#$:');
    const correctHash = await bcrypt.hash('SecureAdmin2024!@#$', 10);
    console.log(`   Hash: ${correctHash}`);

    // Update password
    console.log('\n🔄 Updating admin password...');
    await connection.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [correctHash, admin.id]
    );
    console.log('✅ Admin password updated');

    // Verify the update
    const [verifyRows] = await connection.execute(
      'SELECT password FROM users WHERE id = ?',
      [admin.id]
    );
    
    const newPassword = verifyRows[0].password;
    const isNowValid = await bcrypt.compare('SecureAdmin2024!@#$', newPassword);
    console.log(`✅ Password verification: ${isNowValid ? 'SUCCESS' : 'FAILED'}`);

    await connection.end();
    console.log('\n🎯 Admin password check complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminPassword();


