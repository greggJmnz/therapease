const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🚀 Setting up TherapEase for DigitalOcean Production Deployment...\n');

// Check if required files exist
const requiredFiles = [
    '.do/app.yaml',
    'deploy-digitalocean.sh',
    'generate-env-vars.js'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - Missing!`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.log('\n❌ Some required files are missing. Please run the setup again.');
    process.exit(1);
}

// Make deployment script executable
try {
    fs.chmodSync('deploy-digitalocean.sh', '755');
    console.log('✅ Made deploy-digitalocean.sh executable');
} catch (error) {
    console.log('⚠️  Could not make deploy-digitalocean.sh executable:', error.message);
}

// Check if git is initialized
if (!fs.existsSync('.git')) {
    console.log('\n📦 Git repository not initialized. Initializing...');
    console.log('   Run: git init');
    console.log('   Then: git remote add origin https://github.com/your-username/therapease.git');
} else {
    console.log('✅ Git repository initialized');
}

// Check package.json files
console.log('\n📦 Checking package.json files...');

const clientPackagePath = 'client/package.json';
if (fs.existsSync(clientPackagePath)) {
    const clientPackage = JSON.parse(fs.readFileSync(clientPackagePath, 'utf8'));
    if (clientPackage.scripts && clientPackage.scripts.preview) {
        console.log('✅ Client package.json has preview script');
    } else {
        console.log('❌ Client package.json missing preview script');
    }
    
    if (clientPackage.devDependencies && clientPackage.devDependencies.serve) {
        console.log('✅ Client package.json has serve dependency');
    } else {
        console.log('❌ Client package.json missing serve dependency');
    }
} else {
    console.log('❌ Client package.json not found');
}

// Generate environment variables
console.log('\n🔐 Generating environment variables...');
try {
    const { execSync } = require('child_process');
    execSync('node generate-env-vars.js', { stdio: 'inherit' });
    console.log('✅ Environment variables generated');
} catch (error) {
    console.log('⚠️  Could not generate environment variables:', error.message);
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Update the GitHub repository URL in .do/app.yaml');
console.log('2. Push your code to GitHub: git add . && git commit -m "Setup for DigitalOcean" && git push origin main');
console.log('3. Go to https://cloud.digitalocean.com/apps');
console.log('4. Create a new app and connect your GitHub repository');
console.log('5. Set the environment variables from env-vars-generated.txt');
console.log('6. Deploy!');
console.log('\n🔗 Your app will be available at:');
console.log('   - Frontend: https://therapease-frontend.ondigitalocean.app');
console.log('   - API: https://therapease-api.ondigitalocean.app');
console.log('   - Public Website: https://therapease-public.ondigitalocean.app');
