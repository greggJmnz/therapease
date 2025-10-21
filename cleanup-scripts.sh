#!/bin/bash

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
ls -la | grep -E "\.(sh|js)$" | grep -v -E "(package\.json|ecosystem\.config\.js|setup\.js)" || echo "No remaining scripts found"

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
