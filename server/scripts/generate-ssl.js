#!/usr/bin/env node

const { 
  isWindows, 
  execCommand, 
  createDirectory, 
  fileExists, 
  joinPaths,
  generateSSLCertificates,
  getOpenSSLCommand,
  isOpenSSLAvailable,
  getPlatformInfo
} = require('../utils/windowsCompatibility');

console.log('🔐 TherapEase SSL Certificate Generator');
console.log('======================================\n');

// Display platform information
const platformInfo = getPlatformInfo();
console.log(`🖥️  Platform: ${platformInfo.platform} ${platformInfo.arch}`);
console.log(`📦 Node.js: ${platformInfo.nodeVersion}\n`);

// Generate SSL certificates
const generateCertificates = () => {
  const certsDir = joinPaths(__dirname, '../certs');
  
  console.log('1. Creating certificates directory...');
  createDirectory(certsDir);
  console.log('✅ Certificates directory created');
  
  const keyPath = joinPaths(certsDir, 'server.key');
  const certPath = joinPaths(certsDir, 'server.crt');
  
  console.log('\n2. Checking for existing certificates...');
  if (fileExists(keyPath) && fileExists(certPath)) {
    console.log('⚠️  SSL certificates already exist');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Cert: ${certPath}`);
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Do you want to regenerate them? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n3. Regenerating SSL certificates...');
        const success = generateSSLCertificates(keyPath, certPath, {
          keySize: 4096,
          days: 365,
          subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost'
        });
        
        if (success) {
          console.log('✅ SSL certificates regenerated successfully');
          console.log(`   Key: ${keyPath}`);
          console.log(`   Cert: ${certPath}`);
        } else {
          console.log('❌ Failed to regenerate SSL certificates');
        }
      } else {
        console.log('✅ Using existing SSL certificates');
      }
      
      rl.close();
      process.exit(0);
    });
    
    return;
  }
  
  console.log('\n3. Generating SSL certificates...');
  const success = generateSSLCertificates(keyPath, certPath, {
    keySize: 4096,
    days: 365,
    subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost'
  });
  
  if (success) {
    console.log('✅ SSL certificates generated successfully');
    console.log(`   Key: ${keyPath}`);
    console.log(`   Cert: ${certPath}`);
    
    console.log('\n📋 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Test SSL: npm run security:test');
    console.log('   3. Access the application at https://localhost:5443');
  } else {
    console.log('❌ Failed to generate SSL certificates');
    process.exit(1);
  }
};

// Check OpenSSL availability
const checkOpenSSL = () => {
  console.log('🔍 Checking OpenSSL availability...');
  
  if (!isOpenSSLAvailable()) {
    console.log('❌ OpenSSL is not available on this system');
    
    if (isWindows) {
      console.log('\n💡 For Windows, you can:');
      console.log('   1. Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html');
      console.log('   2. Add OpenSSL to your PATH environment variable');
      console.log('   3. Or use Windows Subsystem for Linux (WSL)');
      console.log('   4. Or use Git Bash which includes OpenSSL');
    } else {
      console.log('\n💡 Make sure OpenSSL is installed on your system');
      console.log('   - Ubuntu/Debian: sudo apt-get install openssl');
      console.log('   - CentOS/RHEL: sudo yum install openssl');
      console.log('   - macOS: brew install openssl');
    }
    
    process.exit(1);
  }
  
  try {
    const opensslCommand = getOpenSSLCommand();
    console.log(`✅ OpenSSL found: ${opensslCommand}`);
    
    // Get OpenSSL version
    const versionOutput = execCommand(`${opensslCommand} version`, { stdio: 'pipe' });
    console.log(`   Version: ${versionOutput.toString().trim()}`);
  } catch (error) {
    console.log('❌ Failed to get OpenSSL version:', error.message);
  }
};

// Main function
const main = () => {
  try {
    checkOpenSSL();
    console.log('');
    generateCertificates();
  } catch (error) {
    console.error('❌ SSL generation failed:', error.message);
    process.exit(1);
  }
};

// Run main function
main();
