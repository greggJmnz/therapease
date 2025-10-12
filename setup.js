#!/usr/bin/env node

/**
 * TherapEase Comprehensive Setup Script
 * This script handles all initialization tasks for the TherapEase application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🚀 TherapEase Comprehensive Setup');
console.log('================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the project root directory.');
  process.exit(1);
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
  console.error(`❌ Error: Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if running on Windows
const isWindows = os.platform() === 'win32';
if (isWindows) {
  console.log('🪟 Windows detected - using Windows-compatible setup');
}

// Function to run commands with error handling
const runCommand = (command, description) => {
  try {
    console.log(`\n📦 ${description}...`);
    const options = { 
      stdio: 'inherit', 
      cwd: __dirname,
      shell: isWindows // Use shell on Windows for better compatibility
    };
    execSync(command, options);
    console.log(`✅ ${description} completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (isWindows) {
      console.log('💡 Windows troubleshooting tips:');
      console.log('   - Run Command Prompt as Administrator');
      console.log('   - Check if antivirus is blocking the operation');
      console.log('   - Ensure MySQL service is running');
      console.log('   - Try running: npm run reset');
    }
    throw error;
  }
};

// Main setup function
const performSetup = async () => {
  try {
    console.log('🔧 Starting comprehensive setup...\n');
    
    // Step 1: Install all dependencies
    runCommand('npm run install:all', 'Installing all dependencies');
    
    // Step 2: Run server setup (includes database, SSL, VAPID keys, etc.)
    runCommand('cd server && npm run setup', 'Running server setup');
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review the .env file in the project root');
    console.log('   2. Update database credentials if needed');
    console.log('   3. Configure email and SMS services if required');
    console.log('   4. Start the development server: npm run dev');
    console.log('\n🔗 Useful commands:');
    console.log('   npm run dev          # Start development server');
    console.log('   npm run build        # Build for production');
    console.log('   npm run start        # Start production server');
    console.log('   npm run setup        # Re-run setup');
    console.log('   npm run reset        # Clean install and setup');
    console.log('\n🌐 Access URLs:');
    console.log('   Client: http://localhost:3000');
    console.log('   Server: http://localhost:5000');
    console.log('   HTTPS:  https://localhost:5443');
    console.log('\n🔐 Default Admin Credentials:');
    console.log('   Email: admin@therapease.com');
    console.log('   Password: SecureAdmin2024!@#$');
    console.log('   ⚠️  IMPORTANT: Change these credentials after first login!');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure MySQL is running and accessible');
    console.log('   2. Check your database credentials');
    console.log('   3. Ensure you have sufficient disk space');
    console.log('   4. Try running: npm run reset');
    process.exit(1);
  }
};

// Run setup if called directly
if (require.main === module) {
  performSetup();
}

module.exports = { performSetup };
