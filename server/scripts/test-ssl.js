#!/usr/bin/env node

const https = require('https');
const { 
  isWindows, 
  execCommand, 
  getPlatformInfo,
  isCommandAvailable
} = require('../utils/windowsCompatibility');

console.log('🔒 TherapEase SSL Test');
console.log('=====================\n');

// Display platform information
const platformInfo = getPlatformInfo();
console.log(`🖥️  Platform: ${platformInfo.platform} ${platformInfo.arch}`);
console.log(`📦 Node.js: ${platformInfo.nodeVersion}\n`);

// Test SSL endpoint
const testSSLEndpoint = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5443,
      path: '/health/ssl',
      method: 'GET',
      rejectUnauthorized: false // Allow self-signed certificates
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ SSL endpoint is working');
          console.log(`   Status: ${response.status}`);
          console.log(`   TLS Version: ${response.ssl?.tlsVersion || 'Unknown'}`);
          if (response.ssl?.certificate) {
            console.log(`   Certificate Subject: ${response.ssl.certificate.subject}`);
            console.log(`   Valid From: ${response.ssl.certificate.validFrom}`);
            console.log(`   Valid To: ${response.ssl.certificate.validTo}`);
          }
          resolve(response);
        } catch (error) {
          console.log('⚠️  SSL endpoint responded but with invalid JSON');
          console.log(`   Response: ${data}`);
          resolve({ status: 'partial', data });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ SSL endpoint test failed');
      console.log(`   Error: ${error.message}`);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.log('❌ SSL endpoint test timed out');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

// Test with curl if available
const testWithCurl = async () => {
  if (!isCommandAvailable('curl')) {
    console.log('⚠️  curl is not available on this system');
    return false;
  }

  try {
    console.log('🔍 Testing with curl...');
    const curlCommand = isWindows 
      ? 'curl -k https://localhost:5443/health/ssl'
      : 'curl -k https://localhost:5443/health/ssl';
    
    execCommand(curlCommand, { stdio: 'inherit' });
    console.log('✅ curl test completed');
    return true;
  } catch (error) {
    console.log('❌ curl test failed:', error.message);
    return false;
  }
};

// Test with PowerShell on Windows
const testWithPowerShell = async () => {
  if (!isWindows) {
    return false;
  }

  try {
    console.log('🔍 Testing with PowerShell...');
    const psCommand = 'powershell -Command "try { $response = Invoke-WebRequest -Uri https://localhost:5443/health/ssl -SkipCertificateCheck -TimeoutSec 5; Write-Host \'Status:\' $response.StatusCode; Write-Host \'Content:\' $response.Content } catch { Write-Host \'Error:\' $_.Exception.Message }"';
    
    execCommand(psCommand, { stdio: 'inherit' });
    console.log('✅ PowerShell test completed');
    return true;
  } catch (error) {
    console.log('❌ PowerShell test failed:', error.message);
    return false;
  }
};

// Main test function
const runTests = async () => {
  try {
    console.log('1. Testing SSL endpoint with Node.js...');
    await testSSLEndpoint();
    
    console.log('\n2. Testing with curl...');
    await testWithCurl();
    
    if (isWindows) {
      console.log('\n3. Testing with PowerShell...');
      await testWithPowerShell();
    }
    
    console.log('\n🎉 SSL tests completed!');
    console.log('\n📋 If tests failed, make sure:');
    console.log('   1. The server is running (npm run dev)');
    console.log('   2. SSL certificates are generated (npm run security:setup)');
    console.log('   3. The server is listening on port 5443');
    
  } catch (error) {
    console.error('\n❌ SSL tests failed:', error.message);
    process.exit(1);
  }
};

// Run tests
runTests();
