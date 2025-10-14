const crypto = require('crypto');

function generateSecureKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

function generateJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}

function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

function generateVAPIDKeys() {
    const webpush = require('web-push');
    const vapidKeys = webpush.generateVAPIDKeys();
    return vapidKeys;
}

console.log('🔐 Generated Environment Variables for DigitalOcean:');
console.log('');
console.log('JWT_SECRET=' + generateJWTSecret());
console.log('ENCRYPTION_KEY=' + generateEncryptionKey());
console.log('SESSION_SECRET=' + generateSecureKey(32));
console.log('');

// Try to generate VAPID keys if web-push is available
try {
    const vapidKeys = generateVAPIDKeys();
    console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
    console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
} catch (error) {
    console.log('⚠️  VAPID keys not generated (web-push not installed)');
    console.log('   To generate VAPID keys, run: npx web-push generate-vapid-keys');
}

console.log('');
console.log('📋 Copy these values to your DigitalOcean App Platform environment variables');
console.log('');
console.log('🔑 Optional: Add your OpenAI API key if you want AI features:');
console.log('OPENAI_API_KEY=your-openai-api-key-here');
console.log('');
console.log('💡 Tips:');
console.log('   - Keep these values secure and never commit them to git');
console.log('   - Use different values for different environments');
console.log('   - The database connection details will be auto-provided by DigitalOcean');
