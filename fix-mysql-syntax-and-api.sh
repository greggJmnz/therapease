#!/bin/bash

echo "🔧 Fixing MySQL Syntax and API Issues..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Fix the database schema with compatible MySQL syntax
echo "[INFO] Fixing database schema with compatible MySQL syntax..."

# Connect to MySQL and fix the missing columns with proper syntax
mysql -u therapease_user -p'TherapEase2025!@#' therapease_db << 'EOF'
-- Add missing status column to therapists table (check if it exists first)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'therapease_db' 
AND table_name = 'therapists' 
AND column_name = 'status';

SET @sql = IF(@col_exists = 0, 'ALTER TABLE therapists ADD COLUMN status VARCHAR(20) DEFAULT "active"', 'SELECT "Column status already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing priority column to notifications table
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'therapease_db' 
AND table_name = 'notifications' 
AND column_name = 'priority';

SET @sql = IF(@col_exists = 0, 'ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT "medium"', 'SELECT "Column priority already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing category column to notifications table
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'therapease_db' 
AND table_name = 'notifications' 
AND column_name = 'category';

SET @sql = IF(@col_exists = 0, 'ALTER TABLE notifications ADD COLUMN category VARCHAR(50) DEFAULT "general"', 'SELECT "Column category already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing country column to users table
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.columns 
WHERE table_schema = 'therapease_db' 
AND table_name = 'users' 
AND column_name = 'country';

SET @sql = IF(@col_exists = 0, 'ALTER TABLE users ADD COLUMN country VARCHAR(100) DEFAULT "US"', 'SELECT "Column country already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update any NULL status values
UPDATE therapists SET status = 'active' WHERE status IS NULL;
UPDATE notifications SET priority = 'medium' WHERE priority IS NULL;
UPDATE notifications SET category = 'general' WHERE category IS NULL;

-- Show the updated table structures
DESCRIBE therapists;
DESCRIBE notifications;
DESCRIBE users;
EOF

# 2. Check what's causing the HTTP 301 redirect
echo "[INFO] Checking what's causing HTTP 301 redirect..."

# Test with verbose curl to see the redirect
echo "[INFO] Testing with verbose curl to see redirect details..."
curl -v http://localhost:5000/api/maintenance-status 2>&1 | head -20

# Check if there's a redirect in the server configuration
echo "[INFO] Checking server configuration for redirects..."
grep -r "redirect\|301" /root/therapease/therapease/server/ || echo "No redirects found in server code"

# 3. Test the API server on different ports
echo "[INFO] Testing API server on different ports..."

# Check what's running on various ports
echo "[INFO] Checking what's running on ports 5000, 3000, 8000..."
netstat -tlnp | grep -E ":(5000|3000|8000)" || echo "No services found on these ports"

# 4. Check PM2 logs for any errors
echo "[INFO] Checking PM2 logs for errors..."
/usr/bin/pm2 logs therapease-api --lines 20

# 5. Try to access the API directly
echo "[INFO] Trying to access API directly..."

# Test with different approaches
echo "[INFO] Testing localhost:5000..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status

echo "[INFO] Testing 127.0.0.1:5000..."
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/api/maintenance-status

echo "[INFO] Testing 0.0.0.0:5000..."
curl -s -o /dev/null -w "%{http_code}" http://0.0.0.0:5000/api/maintenance-status

# 6. Check if the server is actually listening
echo "[INFO] Checking if server is listening on port 5000..."
lsof -i :5000 || echo "Nothing listening on port 5000"

# 7. Check the server index.js for any redirect logic
echo "[INFO] Checking server index.js for redirect logic..."
grep -n -A 5 -B 5 "redirect\|301\|302" /root/therapease/therapease/server/index.js || echo "No redirect logic found"

# 8. Test the external API to see if it works
echo "[INFO] Testing external API..."
EXTERNAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External API response: HTTP $EXTERNAL_RESPONSE"

# 9. If external API works, test admin endpoints with auth
if [ "$EXTERNAL_RESPONSE" = "200" ]; then
    echo "[INFO] External API works, testing admin endpoints with authentication..."
    
    # Get authentication token
    LOGIN_RESPONSE=$(curl -s -X POST https://api.therapease.site/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "admin@therapease.com",
        "password": "SecureAdmin2024!@#$"
      }')
    
    echo "Login response: $LOGIN_RESPONSE"
    
    # Extract token
    TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ ! -z "$TOKEN" ]; then
        echo "✅ Authentication token obtained"
        
        # Test admin endpoints
        THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer $TOKEN" \
          https://api.therapease.site/api/admin/therapists)
        echo "External therapists endpoint: HTTP $THERAPISTS_RESPONSE"
        
        PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer $TOKEN" \
          https://api.therapease.site/api/admin/patients)
        echo "External patients endpoint: HTTP $PATIENTS_RESPONSE"
        
        NOTIFICATIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
          -H "Authorization: Bearer $TOKEN" \
          https://api.therapease.site/api/admin/notifications)
        echo "External notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"
    else
        echo "❌ Failed to get authentication token"
    fi
fi

# 10. Show final PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

echo "[INFO] MySQL syntax fix and API testing complete!"
