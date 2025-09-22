#!/usr/bin/env node

const { 
  isWindows, 
  isMacOS, 
  isLinux,
  getPlatformInfo,
  isCommandAvailable,
  execCommand,
  fileExists,
  joinPaths,
  getOpenSSLCommand,
  isOpenSSLAvailable,
  getNPMCommand,
  getNodeCommand
} = require('../utils/windowsCompatibility');

console.log('🧪 TherapEase Windows Compatibility Test');
console.log('========================================\n');

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper function to add test result
const addTestResult = (name, status, message = '') => {
  testResults.tests.push({ name, status, message });
  if (status === 'passed') testResults.passed++;
  else if (status === 'failed') testResults.failed++;
  else if (status === 'warning') testResults.warnings++;
  
  const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message || status}`);
};

// Test platform detection
const testPlatformDetection = () => {
  console.log('1. Testing platform detection...');
  
  const platformInfo = getPlatformInfo();
  addTestResult('Platform Detection', 'passed', `${platformInfo.platform} ${platformInfo.arch}`);
  addTestResult('Node.js Version', 'passed', platformInfo.nodeVersion);
  addTestResult('NPM Version', 'passed', platformInfo.npmVersion);
  
  if (isWindows) {
    addTestResult('Windows Detection', 'passed', 'Windows platform detected');
  } else if (isMacOS) {
    addTestResult('macOS Detection', 'passed', 'macOS platform detected');
  } else if (isLinux) {
    addTestResult('Linux Detection', 'passed', 'Linux platform detected');
  }
};

// Test command availability
const testCommandAvailability = () => {
  console.log('\n2. Testing command availability...');
  
  // Test Node.js
  if (isCommandAvailable(getNodeCommand())) {
    addTestResult('Node.js Command', 'passed', 'Node.js is available');
  } else {
    addTestResult('Node.js Command', 'failed', 'Node.js is not available');
  }
  
  // Test NPM
  if (isCommandAvailable(getNPMCommand())) {
    addTestResult('NPM Command', 'passed', 'NPM is available');
  } else {
    addTestResult('NPM Command', 'failed', 'NPM is not available');
  }
  
  // Test Git
  if (isCommandAvailable('git')) {
    addTestResult('Git Command', 'passed', 'Git is available');
  } else {
    addTestResult('Git Command', 'warning', 'Git is not available (optional)');
  }
  
  // Test OpenSSL
  if (isOpenSSLAvailable()) {
    try {
      const opensslCommand = getOpenSSLCommand();
      addTestResult('OpenSSL Command', 'passed', `OpenSSL found: ${opensslCommand}`);
    } catch (error) {
      addTestResult('OpenSSL Command', 'warning', 'OpenSSL not found (optional for SSL)');
    }
  } else {
    addTestResult('OpenSSL Command', 'warning', 'OpenSSL not available (optional for SSL)');
  }
  
  // Test curl (Windows-specific)
  if (isCommandAvailable('curl')) {
    addTestResult('cURL Command', 'passed', 'cURL is available');
  } else {
    addTestResult('cURL Command', 'warning', 'cURL not available (optional for testing)');
  }
  
  // Test PowerShell (Windows-specific)
  if (isWindows && isCommandAvailable('powershell')) {
    addTestResult('PowerShell Command', 'passed', 'PowerShell is available');
  } else if (isWindows) {
    addTestResult('PowerShell Command', 'warning', 'PowerShell not available');
  }
};

// Test file operations
const testFileOperations = () => {
  console.log('\n3. Testing file operations...');
  
  const testDir = joinPaths(__dirname, '../test-windows-compat');
  const testFile = joinPaths(testDir, 'test.txt');
  
  try {
    // Test directory creation
    const fs = require('fs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    addTestResult('Directory Creation', 'passed', 'Directory created successfully');
    
    // Test file creation
    fs.writeFileSync(testFile, 'Windows compatibility test');
    addTestResult('File Creation', 'passed', 'File created successfully');
    
    // Test file reading
    const content = fs.readFileSync(testFile, 'utf8');
    if (content === 'Windows compatibility test') {
      addTestResult('File Reading', 'passed', 'File read successfully');
    } else {
      addTestResult('File Reading', 'failed', 'File content mismatch');
    }
    
    // Test file deletion
    fs.unlinkSync(testFile);
    addTestResult('File Deletion', 'passed', 'File deleted successfully');
    
    // Test directory deletion
    fs.rmdirSync(testDir);
    addTestResult('Directory Deletion', 'passed', 'Directory deleted successfully');
    
  } catch (error) {
    addTestResult('File Operations', 'failed', `Error: ${error.message}`);
  }
};

// Test path operations
const testPathOperations = () => {
  console.log('\n4. Testing path operations...');
  
  const testPaths = [
    'server/config',
    'client/src',
    'docs',
    'server/scripts'
  ];
  
  testPaths.forEach(testPath => {
    const fullPath = joinPaths(__dirname, '..', testPath);
    if (fileExists(fullPath)) {
      addTestResult(`Path: ${testPath}`, 'passed', 'Path exists');
    } else {
      addTestResult(`Path: ${testPath}`, 'warning', 'Path does not exist');
    }
  });
};

// Test environment variables
const testEnvironmentVariables = () => {
  console.log('\n5. Testing environment variables...');
  
  const requiredEnvVars = [
    'NODE_ENV',
    'PATH'
  ];
  
  const optionalEnvVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      addTestResult(`Required Env: ${envVar}`, 'passed', 'Variable is set');
    } else {
      addTestResult(`Required Env: ${envVar}`, 'failed', 'Variable is not set');
    }
  });
  
  optionalEnvVars.forEach(envVar => {
    if (process.env[envVar]) {
      addTestResult(`Optional Env: ${envVar}`, 'passed', 'Variable is set');
    } else {
      addTestResult(`Optional Env: ${envVar}`, 'warning', 'Variable is not set (optional)');
    }
  });
};

// Test SSL certificate generation (if OpenSSL is available)
const testSSLCertificateGeneration = () => {
  console.log('\n6. Testing SSL certificate generation...');
  
  if (!isOpenSSLAvailable()) {
    addTestResult('SSL Certificate Generation', 'warning', 'OpenSSL not available, skipping test');
    return;
  }
  
  try {
    const testCertDir = joinPaths(__dirname, '../test-certs');
    const testKeyPath = joinPaths(testCertDir, 'test.key');
    const testCertPath = joinPaths(testCertDir, 'test.crt');
    
    // Create test directory
    const fs = require('fs');
    if (!fs.existsSync(testCertDir)) {
      fs.mkdirSync(testCertDir, { recursive: true });
    }
    
    // Test certificate generation
    const { generateSSLCertificates } = require('../utils/windowsCompatibility');
    const success = generateSSLCertificates(testKeyPath, testCertPath, {
      keySize: 2048,
      days: 1,
      subject: '/C=US/ST=Test/L=Test/O=Test/CN=test.local'
    });
    
    if (success) {
      addTestResult('SSL Certificate Generation', 'passed', 'Certificates generated successfully');
      
      // Clean up test certificates
      if (fs.existsSync(testKeyPath)) fs.unlinkSync(testKeyPath);
      if (fs.existsSync(testCertPath)) fs.unlinkSync(testCertPath);
      fs.rmdirSync(testCertDir);
    } else {
      addTestResult('SSL Certificate Generation', 'failed', 'Failed to generate certificates');
    }
    
  } catch (error) {
    addTestResult('SSL Certificate Generation', 'failed', `Error: ${error.message}`);
  }
};

// Test database connection (if configured)
const testDatabaseConnection = () => {
  console.log('\n7. Testing database connection...');
  
  if (!process.env.DB_HOST || !process.env.DB_USER) {
    addTestResult('Database Connection', 'warning', 'Database not configured, skipping test');
    return;
  }
  
  try {
    const mysql = require('mysql2/promise');
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });
    
    connection.then(conn => {
      conn.end();
      addTestResult('Database Connection', 'passed', 'Database connection successful');
    }).catch(error => {
      addTestResult('Database Connection', 'failed', `Connection failed: ${error.message}`);
    });
    
  } catch (error) {
    addTestResult('Database Connection', 'failed', `Error: ${error.message}`);
  }
};

// Test Windows-specific features
const testWindowsSpecificFeatures = () => {
  console.log('\n8. Testing Windows-specific features...');
  
  if (!isWindows) {
    addTestResult('Windows Features', 'warning', 'Not running on Windows, skipping Windows-specific tests');
    return;
  }
  
  // Test Windows path handling
  const windowsPath = 'C:\\Users\\Test\\Documents\\TherapEase';
  const normalizedPath = require('path').normalize(windowsPath);
  if (normalizedPath.includes('\\')) {
    addTestResult('Windows Path Handling', 'passed', 'Windows paths handled correctly');
  } else {
    addTestResult('Windows Path Handling', 'failed', 'Windows paths not handled correctly');
  }
  
  // Test Windows environment variables
  if (process.env.USERPROFILE || process.env.APPDATA) {
    addTestResult('Windows Environment Variables', 'passed', 'Windows environment variables available');
  } else {
    addTestResult('Windows Environment Variables', 'warning', 'Windows environment variables not found');
  }
  
  // Test Windows command execution
  try {
    execCommand('echo Windows compatibility test', { stdio: 'pipe' });
    addTestResult('Windows Command Execution', 'passed', 'Commands execute successfully');
  } catch (error) {
    addTestResult('Windows Command Execution', 'failed', `Command execution failed: ${error.message}`);
  }
};

// Generate test report
const generateTestReport = () => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📈 Total: ${testResults.tests.length}`);
  
  const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.tests
      .filter(test => test.status === 'failed')
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }
  
  if (testResults.warnings > 0) {
    console.log('\n⚠️  Warnings:');
    testResults.tests
      .filter(test => test.status === 'warning')
      .forEach(test => console.log(`   - ${test.name}: ${test.message}`));
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (testResults.failed === 0) {
    console.log('🎉 All critical tests passed! Windows compatibility is working.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }
  
  console.log('='.repeat(50));
};

// Main test function
const runAllTests = async () => {
  try {
    testPlatformDetection();
    testCommandAvailability();
    testFileOperations();
    testPathOperations();
    testEnvironmentVariables();
    testSSLCertificateGeneration();
    await testDatabaseConnection();
    testWindowsSpecificFeatures();
    generateTestReport();
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

// Run all tests
runAllTests();
