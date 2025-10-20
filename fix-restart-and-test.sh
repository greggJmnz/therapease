#!/bin/bash

echo "🎯 TherapEase Final Restart and Test Script"
echo "=========================================="

# 1. Apply the latest changes again (to ensure all code is up to date)
echo "1. ⚙️ Running the final fix script (just in case)..."
node final-websocket-and-admin-fix.js

# 2. Restart PM2 and force environment variable update
echo "2. 🔄 Restarting PM2 and loading new .env variables..."
# The --update-env flag is critical to load the newly created/edited .env file
pm2 reload all --update-env 

# Wait a moment for the server to fully start
sleep 5 

echo "   ✅ PM2 processes reloaded."
pm2 list

# 3. Re-run the comprehensive test
echo "3. 🧪 Re-running the comprehensive endpoint tests..."
node test-all-endpoints.js

echo ""
echo "💡 Fix Script Complete. Check test results above. If it fails, verify DB credentials (Step 1)."
