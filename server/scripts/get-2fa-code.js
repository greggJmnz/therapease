#!/usr/bin/env node

/**
 * Script to retrieve 2FA verification code from database
 * Use this if email sending fails but code was saved
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
const envFile = path.join(__dirname, '../.env.production');
if (fs.existsSync(envFile)) {
  require('dotenv').config({ path: envFile });
} else {
  require('dotenv').config();
}

const { getRow, getAll } = require('../config/database');

async function get2FACode() {
  try {
    const userEmail = process.argv[2];
    
    if (!userEmail) {
      console.log('Usage: node get-2fa-code.js <email>');
      console.log('Example: node get-2fa-code.js user@example.com');
      process.exit(1);
    }

    console.log(`🔍 Looking for 2FA codes for: ${userEmail}\n`);

    // Get user first
    const user = await getRow('SELECT id, email, firstName FROM users WHERE email = ?', [userEmail]);
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName || user.email} (ID: ${user.id})\n`);

    // Get active 2FA codes
    const codes = await getAll(
      `SELECT code, expiresAt, used, createdAt 
       FROM two_factor_codes 
       WHERE userId = ? 
       ORDER BY createdAt DESC 
       LIMIT 5`,
      [user.id]
    );

    if (codes.length === 0) {
      console.log('❌ No 2FA codes found for this user');
      process.exit(1);
    }

    console.log(`📋 Found ${codes.length} code(s):\n`);
    
    codes.forEach((codeRecord, index) => {
      const expiresAt = new Date(codeRecord.expiresAt);
      const isExpired = expiresAt < new Date();
      const isUsed = codeRecord.used === 1 || codeRecord.used === true;
      
      console.log(`${index + 1}. Code: ${codeRecord.code}`);
      console.log(`   Created: ${new Date(codeRecord.createdAt).toLocaleString()}`);
      console.log(`   Expires: ${expiresAt.toLocaleString()}`);
      console.log(`   Status: ${isUsed ? '❌ Used' : isExpired ? '⏰ Expired' : '✅ Valid'}`);
      console.log('');
    });

    // Show the most recent valid code
    const validCode = codes.find(c => {
      const expiresAt = new Date(c.expiresAt);
      return !c.used && expiresAt > new Date();
    });

    if (validCode) {
      console.log('✅ Latest valid code:');
      console.log(`   ${validCode.code}`);
      console.log(`   Expires in: ${Math.round((new Date(validCode.expiresAt) - new Date()) / 1000 / 60)} minutes`);
    } else {
      console.log('⚠️ No valid codes found. All codes are either used or expired.');
      console.log('💡 Request a new code from the application.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

get2FACode();

