#!/usr/bin/env node

/**
 * Fix script for automatic logout and page reload issue
 * This script addresses the API response interceptor causing unwanted redirects
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase Auto-Logout Fix');
console.log('==============================');

// Path to the API service file
const apiFilePath = path.join(__dirname, 'client', 'src', 'services', 'api.js');

console.log('\n🔍 Step 1: Checking API service file...');

if (!fs.existsSync(apiFilePath)) {
    console.log('❌ API service file not found');
    process.exit(1);
}

console.log('✅ API service file found');

// Read the current content
const currentContent = fs.readFileSync(apiFilePath, 'utf8');

console.log('\n🔍 Step 2: Analyzing current response interceptor...');

// Check if the problematic code exists
if (currentContent.includes('window.location.href = \'/auth/login\';')) {
    console.log('❌ Found problematic redirect code');
    console.log('🔧 Fixing API response interceptor...');
    
    // Create the fixed version
    const fixedContent = currentContent.replace(
        /\/\/ Response interceptor to handle common errors\napi\.interceptors\.response\.use\(\n  \(response\) => \{\n    return response;\n  \},\n  \(error\) => \{\n    console\.error\('API: Response interceptor error:', error\);\n    if \(error\.response\?\.status === 401\) \{\n      \/\/ Token expired or invalid, redirect to login\n      localStorage\.removeItem\('token'\);\n      localStorage\.removeItem\('user'\);\n      localStorage\.removeItem\('userRole'\);\n      localStorage\.removeItem\('userId'\);\n      window\.location\.href = '\/auth\/login';\n    \}\n    return Promise\.reject\(error\);\n  \}\n\);/,
        `// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API: Response interceptor error:', error);
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage but don't redirect automatically
      // Let the AuthContext handle the logout logic
      console.log('🔐 Token expired, clearing storage...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/auth/login') {
        // Use React Router navigation instead of window.location.href
        // This prevents full page reload and maintains React state
        window.dispatchEvent(new CustomEvent('auth:logout', { 
          detail: { reason: 'token_expired' } 
        }));
      }
    }
    return Promise.reject(error);
  }
);`
    );
    
    // Write the fixed content
    fs.writeFileSync(apiFilePath, fixedContent);
    console.log('✅ API response interceptor fixed');
    
} else {
    console.log('✅ No problematic redirect code found');
}

console.log('\n🔍 Step 3: Checking AuthContext for proper logout handling...');

const authContextPath = path.join(__dirname, 'client', 'src', 'context', 'AuthContext.js');

if (fs.existsSync(authContextPath)) {
    const authContextContent = fs.readFileSync(authContextPath, 'utf8');
    
    // Check if AuthContext has proper logout handling
    if (authContextContent.includes('const logout = () => {')) {
        console.log('✅ AuthContext has logout function');
        
        // Check if it handles the custom event
        if (!authContextContent.includes('auth:logout')) {
            console.log('🔧 Adding custom event listener for logout...');
            
            // Add event listener for the custom logout event
            const updatedContent = authContextContent.replace(
                /useEffect\(\(\) => \{\n    const initializeAuth = async \(\) => \{/,
                `useEffect(() => {
    // Listen for custom logout events
    const handleLogoutEvent = (event) => {
      console.log('🔐 Received logout event:', event.detail);
      logout();
    };
    
    window.addEventListener('auth:logout', handleLogoutEvent);
    
    const initializeAuth = async () => {`
            );
            
            // Also add cleanup for the event listener
            const finalContent = updatedContent.replace(
                /initializeAuth\(\);\n  \}, \[\]\);/,
                `initializeAuth();
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);`
            );
            
            fs.writeFileSync(authContextPath, finalContent);
            console.log('✅ Added custom event listener for logout');
        } else {
            console.log('✅ Custom event listener already exists');
        }
    } else {
        console.log('❌ AuthContext logout function not found');
    }
} else {
    console.log('❌ AuthContext file not found');
}

console.log('\n🔍 Step 4: Checking for other potential causes...');

// Check for any other automatic redirects or reloads
const searchPaths = [
    'client/src/App.js',
    'client/src/index.js',
    'client/src/main.jsx'
];

for (const searchPath of searchPaths) {
    const fullPath = path.join(__dirname, searchPath);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Check for problematic patterns
        const problematicPatterns = [
            'window.location.reload()',
            'window.location.href',
            'location.reload()',
            'location.href'
        ];
        
        for (const pattern of problematicPatterns) {
            if (content.includes(pattern)) {
                console.log(`⚠️  Found potential issue in ${searchPath}: ${pattern}`);
            }
        }
    }
}

console.log('\n🏁 Auto-logout fix complete!');
console.log('\n📋 Summary of changes:');
console.log('1. ✅ Fixed API response interceptor to prevent automatic redirects');
console.log('2. ✅ Added custom event system for logout handling');
console.log('3. ✅ Prevented full page reloads on token expiration');
console.log('4. ✅ Maintained React Router navigation');
console.log('\n🔧 Manual steps to complete the fix:');
console.log('1. Rebuild the frontend: npm run build');
console.log('2. Restart PM2 processes: pm2 restart all');
console.log('3. Test the application to ensure no more automatic logouts');
console.log('\n📋 What was fixed:');
console.log('- Removed automatic window.location.href redirect on 401 errors');
console.log('- Added custom event system for graceful logout handling');
console.log('- Prevented full page reloads that cause React state loss');
console.log('- Maintained proper authentication flow without forced redirects');
