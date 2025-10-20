#!/bin/bash

echo "🎯 TherapEase Database & PM2 Fix Script"
echo "========================================"

# --- FIX 1: DATABASE ACCESS DENIED (ER_ACCESS_DENIED_NO_PASSWORD_ERROR) ---
# This section assumes your actual database user is NOT 'root' or requires a password
# and that the configuration is stored in a '.env' file in the 'server' directory.

ENV_FILE="server/.env"
DB_USER_KEY="DB_USER"
DB_PASS_KEY="DB_PASSWORD"
DEFAULT_DB_USER="therapease_user" # A common non-root user for applications
DEFAULT_DB_PASS="your_secure_password" # REPLACE THIS with the ACTUAL password

echo "1. 💾 Checking/Fixing Database Credentials in $ENV_FILE..."

# Check if the .env file exists
if [ -f "$ENV_FILE" ]; then
    echo "   - Found $ENV_FILE. Backing up and updating credentials..."
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"

    # Use sed to update DB_USER and DB_PASSWORD.
    # We escape '/' characters in paths for sed.
    sed -i "/^${DB_USER_KEY}=/c\\${DB_USER_KEY}=${DEFAULT_DB_USER}" "$ENV_FILE"
    sed -i "/^${DB_PASS_KEY}=/c\\${DB_PASS_KEY}=${DEFAULT_DB_PASS}" "$ENV_FILE"
    
    # If the keys don't exist, append them.
    grep -q "^${DB_USER_KEY}=" "$ENV_FILE" || echo "${DB_USER_KEY}=${DEFAULT_DB_USER}" >> "$ENV_FILE"
    grep -q "^${DB_PASS_KEY}=" "$ENV_FILE" || echo "${DB_PASS_KEY}=${DEFAULT_DB_PASS}" >> "$ENV_FILE"

    echo "   ✅ Updated $DB_USER_KEY and $DB_PASS_KEY in $ENV_FILE."
    echo "      *NOTE: Ensure 'your_secure_password' is replaced with the correct value."
else
    echo "   ⚠️ Warning: $ENV_FILE not found. Please manually check database configuration."
fi

# --- FIX 2: PM2 PROCESS NOT FOUND ---
# The logs show 'Process 0 not found' and PM2 list shows only 'therapease-public' running.
# The 'therapease-api' was killed by the EADDRINUSE script, so we need to ensure it's running again.

echo "2. 🔄 Ensuring PM2 is managing 'therapease-api'..."

# Attempt to start the 'therapease-api' using a typical entry point (e.g., server/index.js)
# If PM2 is configured via an ecosystem file, you'd use 'pm2 start ecosystem.config.js'
# Assuming a standard setup where 'therapease-api' is the name of the server process.
pm2 start server/index.js --name therapease-api --update-env 

# Use a generic restart/reload to catch the public app too and apply the new .env (if applicable)
pm2 reload all --update-env
echo "   ✅ PM2 processes started/reloaded."
pm2 list

# --- FIX 3: RE-TESTING ---
echo "3. 🧪 Re-running the comprehensive endpoint tests..."
node test-all-endpoints.js

echo ""
echo "💡 Database & PM2 Fix Script Complete. Check test results above."
