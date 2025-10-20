#!/usr/bin/env node

const crypto = require('crypto');

console.log('🔐 TherapEase Encryption Key Generator');
console.log('=====================================\n');

// Generate a 32-byte (256-bit) encryption key
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('Generated 64-character hex encryption key:');
console.log(encryptionKey);
console.log('\nKey length:', encryptionKey.length, 'characters');
console.log('Key strength: 256 bits (AES-256)');

console.log('\n📝 Add this to your .env file:');
console.log(`ENCRYPTION_KEY=${encryptionKey}`);

console.log('\n🔧 To fix the server:');
console.log('1. Add the ENCRYPTION_KEY to your .env file');
console.log('2. Restart the PM2 processes');
console.log('3. Test the API endpoints');

// Test the key
try {
  const keyBuffer = Buffer.from(encryptionKey, 'hex');
  console.log('\n✅ Key validation: PASSED');
  console.log('Buffer length:', keyBuffer.length, 'bytes');
} catch (error) {
  console.log('\n❌ Key validation: FAILED');
  console.log('Error:', error.message);
}

console.log('\n🚀 Quick fix command for server:');
console.log(`echo "ENCRYPTION_KEY=${encryptionKey}" >> .env`);
