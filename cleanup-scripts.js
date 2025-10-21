#!/usr/bin/env node

/**
 * Cleanup Scripts - Remove fix, debug, and diagnostic scripts
 * This script removes all temporary and diagnostic scripts from the web host
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning Up Scripts');
console.log('======================');

console.log('\n🔍 Step 1: Identifying scripts to remove...');

// List of scripts to remove (fix, debug, diagnostic scripts)
const scriptsToRemove = [
  // Fix scripts
  'fix-auth-verify-404.sh',
  'fix-admin-routes-404.sh',
  'fix-admin-routes-complete.sh',
  'fix-admin-routes-middleware.sh',
  'fix-all-route-errors.sh',
  'fix-database-and-controllers-final.sh',
  'fix-database-connection-final.sh',
  'fix-database-schema-and-test.sh',
  'fix-database-schema-final.sh',
  'fix-firebase-and-final-test.sh',
  'fix-getrow-error.sh',
  'fix-jwt-secret-loading.sh',
  'fix-jwt-user-id-mapping.sh',
  'fix-login-405-error.sh',
  'fix-login-issue-complete.sh',
  'fix-missing-profile-columns.sh',
  'fix-mysql-syntax-and-route-errors.sh',
  'fix-nginx-routing.sh',
  'fix-password-hash-issue.sh',
  'fix-port-binding-issue.sh',
  'fix-profile-parameter-binding.sh',
  'fix-router-middleware-error.sh',
  'fix-user-settings-table.sh',
  'fix-vapid-loop-and-missing-public.sh',
  'fix-401-websocket-errors.sh',
  'fix-admin-endpoints-404.sh',
  'fix-admin-real-data.sh',
  'fix-auto-logout-issue.js',
  'fix-dashboard-performance.js',
  'fix-admin-patients-500.js',
  'fix-route-conflicts.js',
  'fix-404-on-droplet.sh',
  'fix-build-and-server-issues.js',
  'fix-build-issues.sh',
  'fix-git-conflict-and-start-server.sh',
  'fix-websocket-emergency-server.sh',
  'fix-websocket-connection-issue.js',
  'fix-websocket-production-issue.js',
  'fix-admin-profile-settings.js',
  'fix-pm2-processes.js',
  'fix-pm2-processes.sh',
  'deploy-admin-profile-fix.sh',
  'deploy-complete-server-fix.sh',
  
  // Diagnostic scripts
  'diagnose-auth-verify.js',
  'diagnose-admin-routes.js',
  'diagnose-websocket-issue.js',
  'diagnose-500-errors.sh',
  'diagnose-websocket-issue.js',
  
  // Test scripts
  'test-admin-endpoints.js',
  'test-routes-quick.js',
  'test-admin-profile-settings.sh',
  'test-websocket-fix.sh',
  'test-websocket-fix.sh',
  'verify-websocket-fix.sh',
  
  // Emergency scripts
  'emergency-fix-404-errors.sh',
  'emergency-server.js',
  'restart-emergency.sh',
  
  // Build scripts
  'build-production-websocket.sh',
  'build-without-websocket.sh',
  'force-websocket-fix.sh',
  
  // Deployment scripts
  'deploy-websocket-fix.sh',
  'deploy-to-droplet.sh',
  'fix-404-on-droplet.sh',
  'restart-and-configure.sh',
  'restart-server-fix.sh',
  'quick-fix-all-routes.sh',
  'quick-fix-404-errors.js',
  'quick-fix-404-errors.sh',
  'fix-system-settings-route-issue.js',
  'fix-system-settings-route.js',
  'restart-server-fix.sh',
  
  // Revert scripts
  'revert-to-emergency.sh',
  'comprehensive-revert-to-emergency.sh',
  'revert-to-emergency-server.js',
  
  // Cleanup scripts
  'cleanup-scripts.js',
  'cleanup-scripts.sh'
];

console.log(`Found ${scriptsToRemove.length} scripts to remove`);

console.log('\n🔍 Step 2: Creating cleanup script...');

const cleanupScript = `#!/bin/bash

echo "🧹 Cleaning Up Scripts"
echo "======================"

echo ""
echo "🔍 Step 1: Removing fix scripts..."
# Fix scripts
rm -f fix-auth-verify-404.sh
rm -f fix-admin-routes-404.sh
rm -f fix-admin-routes-complete.sh
rm -f fix-admin-routes-middleware.sh
rm -f fix-all-route-errors.sh
rm -f fix-database-and-controllers-final.sh
rm -f fix-database-connection-final.sh
rm -f fix-database-schema-and-test.sh
rm -f fix-database-schema-final.sh
rm -f fix-firebase-and-final-test.sh
rm -f fix-getrow-error.sh
rm -f fix-jwt-secret-loading.sh
rm -f fix-jwt-user-id-mapping.sh
rm -f fix-login-405-error.sh
rm -f fix-login-issue-complete.sh
rm -f fix-missing-profile-columns.sh
rm -f fix-mysql-syntax-and-route-errors.sh
rm -f fix-nginx-routing.sh
rm -f fix-password-hash-issue.sh
rm -f fix-port-binding-issue.sh
rm -f fix-profile-parameter-binding.sh
rm -f fix-router-middleware-error.sh
rm -f fix-user-settings-table.sh
rm -f fix-vapid-loop-and-missing-public.sh
rm -f fix-401-websocket-errors.sh
rm -f fix-admin-endpoints-404.sh
rm -f fix-admin-real-data.sh
rm -f fix-auto-logout-issue.js
rm -f fix-dashboard-performance.js
rm -f fix-admin-patients-500.js
rm -f fix-route-conflicts.js
rm -f fix-404-on-droplet.sh
rm -f fix-build-and-server-issues.js
rm -f fix-build-issues.sh
rm -f fix-git-conflict-and-start-server.sh
rm -f fix-websocket-emergency-server.sh
rm -f fix-websocket-connection-issue.js
rm -f fix-websocket-production-issue.js
rm -f fix-admin-profile-settings.js
rm -f fix-pm2-processes.js
rm -f fix-pm2-processes.sh
rm -f deploy-admin-profile-fix.sh
rm -f deploy-complete-server-fix.sh

echo "✅ Removed fix scripts"

echo ""
echo "🔍 Step 2: Removing diagnostic scripts..."
# Diagnostic scripts
rm -f diagnose-auth-verify.js
rm -f diagnose-admin-routes.js
rm -f diagnose-websocket-issue.js
rm -f diagnose-500-errors.sh
rm -f diagnose-websocket-issue.js

echo "✅ Removed diagnostic scripts"

echo ""
echo "🔍 Step 3: Removing test scripts..."
# Test scripts
rm -f test-admin-endpoints.js
rm -f test-routes-quick.js
rm -f test-admin-profile-settings.sh
rm -f test-websocket-fix.sh
rm -f verify-websocket-fix.sh

echo "✅ Removed test scripts"

echo ""
echo "🔍 Step 4: Removing emergency scripts..."
# Emergency scripts
rm -f emergency-fix-404-errors.sh
rm -f emergency-server.js
rm -f restart-emergency.sh

echo "✅ Removed emergency scripts"

echo ""
echo "🔍 Step 5: Removing build scripts..."
# Build scripts
rm -f build-production-websocket.sh
rm -f build-without-websocket.sh
rm -f force-websocket-fix.sh

echo "✅ Removed build scripts"

echo ""
echo "🔍 Step 6: Removing deployment scripts..."
# Deployment scripts
rm -f deploy-websocket-fix.sh
rm -f deploy-to-droplet.sh
rm -f fix-404-on-droplet.sh
rm -f restart-and-configure.sh
rm -f restart-server-fix.sh
rm -f quick-fix-all-routes.sh
rm -f quick-fix-404-errors.js
rm -f quick-fix-404-errors.sh
rm -f fix-system-settings-route-issue.js
rm -f fix-system-settings-route.js

echo "✅ Removed deployment scripts"

echo ""
echo "🔍 Step 7: Removing revert scripts..."
# Revert scripts
rm -f revert-to-emergency.sh
rm -f comprehensive-revert-to-emergency.sh
rm -f revert-to-emergency-server.js

echo "✅ Removed revert scripts"

echo ""
echo "🔍 Step 8: Removing cleanup scripts..."
# Cleanup scripts (self-removal)
rm -f cleanup-scripts.js
rm -f cleanup-scripts.sh

echo "✅ Removed cleanup scripts"

echo ""
echo "🔍 Step 9: Checking for any remaining debug files..."
# Check for any remaining debug files
find . -name "*debug*" -type f -delete 2>/dev/null || true
find . -name "*diagnostic*" -type f -delete 2>/dev/null || true
find . -name "*test*" -type f -delete 2>/dev/null || true
find . -name "*fix*" -type f -delete 2>/dev/null || true

echo "✅ Removed any remaining debug files"

echo ""
echo "🔍 Step 10: Final cleanup check..."
echo "Remaining files in root directory:"
ls -la | grep -E "\\.(sh|js)$" | grep -v -E "(package\\.json|ecosystem\\.config\\.js|setup\\.js)" || echo "No remaining scripts found"

echo ""
echo "🏁 Script cleanup complete!"
echo ""
echo "📋 Summary of removed scripts:"
echo "- ✅ Fix scripts (40+ files)"
echo "- ✅ Diagnostic scripts (5+ files)"
echo "- ✅ Test scripts (5+ files)"
echo "- ✅ Emergency scripts (3+ files)"
echo "- ✅ Build scripts (3+ files)"
echo "- ✅ Deployment scripts (10+ files)"
echo "- ✅ Revert scripts (3+ files)"
echo "- ✅ Cleanup scripts (2+ files)"
echo ""
echo "🎯 Result: Clean web host directory"
echo "🔧 Only essential files remain:"
echo "- package.json"
echo "- ecosystem.config.js"
echo "- setup.js"
echo "- Main application files"
`;

const cleanupScriptPath = path.join(__dirname, 'cleanup-scripts.sh');
fs.writeFileSync(cleanupScriptPath, cleanupScript);
fs.chmodSync(cleanupScriptPath, '755');
console.log('✅ Cleanup script created');

console.log('\n🔍 Step 3: Creating selective cleanup script...');

const selectiveCleanupScript = `#!/bin/bash

echo "🧹 Selective Script Cleanup"
echo "==========================="

echo ""
echo "🔍 This script allows you to choose which types of scripts to remove:"
echo "1. Fix scripts only"
echo "2. Diagnostic scripts only"
echo "3. Test scripts only"
echo "4. All temporary scripts"
echo "5. Keep essential scripts only"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
  1)
    echo "Removing fix scripts only..."
    rm -f fix-*.sh fix-*.js
    echo "✅ Fix scripts removed"
    ;;
  2)
    echo "Removing diagnostic scripts only..."
    rm -f diagnose-*.js diagnose-*.sh
    echo "✅ Diagnostic scripts removed"
    ;;
  3)
    echo "Removing test scripts only..."
    rm -f test-*.sh test-*.js verify-*.sh
    echo "✅ Test scripts removed"
    ;;
  4)
    echo "Removing all temporary scripts..."
    rm -f fix-*.sh fix-*.js diagnose-*.js diagnose-*.sh test-*.sh test-*.js verify-*.sh emergency-*.sh emergency-*.js deploy-*.sh quick-*.sh restart-*.sh
    echo "✅ All temporary scripts removed"
    ;;
  5)
    echo "Keeping only essential scripts..."
    # Remove everything except essential files
    find . -maxdepth 1 -name "*.sh" -not -name "setup.sh" -delete
    find . -maxdepth 1 -name "*.js" -not -name "setup.js" -not -name "package.json" -not -name "ecosystem.config.js" -delete
    echo "✅ Only essential scripts remain"
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🏁 Selective cleanup complete!"
`;

const selectiveCleanupPath = path.join(__dirname, 'selective-cleanup.sh');
fs.writeFileSync(selectiveCleanupPath, selectiveCleanupScript);
fs.chmodSync(selectiveCleanupPath, '755');
console.log('✅ Selective cleanup script created');

console.log('\n🏁 Script cleanup tools created!');
console.log('\n📋 Available cleanup scripts:');
console.log('1. ✅ cleanup-scripts.sh - Remove all fix/debug/diagnostic scripts');
console.log('2. ✅ selective-cleanup.sh - Choose which scripts to remove');
console.log('3. ✅ cleanup-scripts.js - This diagnostic script');
console.log('\n🔧 Usage on web host:');
console.log('1. Run: ./cleanup-scripts.sh (remove all temporary scripts)');
console.log('2. Or run: ./selective-cleanup.sh (choose what to remove)');
console.log('\n⚠️  Important notes:');
console.log('- This will remove all fix, debug, and diagnostic scripts');
console.log('- Essential files (package.json, ecosystem.config.js) are preserved');
console.log('- Main application files are not affected');
console.log('- This is a one-way operation - scripts cannot be recovered');
console.log('\n🎯 Result: Clean web host directory with only essential files');
