#!/bin/bash

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
