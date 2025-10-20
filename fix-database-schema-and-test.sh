#!/bin/bash

echo "🔧 Fixing Database Schema and Testing Endpoints..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Fix the database schema issues
echo "[INFO] Fixing database schema issues..."

# Connect to MySQL and fix the missing columns
mysql -u therapease_user -p'TherapEase2025!@#' therapease_db << 'EOF'
-- Add missing status column to therapists table
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add missing columns to notifications table if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Add missing country column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'US';

-- Update any NULL status values
UPDATE therapists SET status = 'active' WHERE status IS NULL;
UPDATE notifications SET priority = 'medium' WHERE priority IS NULL;
UPDATE notifications SET category = 'general' WHERE category IS NULL;

-- Show the updated table structures
DESCRIBE therapists;
DESCRIBE notifications;
DESCRIBE users;
EOF

# 2. Test the API server connection
echo "[INFO] Testing API server connection..."

# Test maintenance status (should work without auth)
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"

if [ "$MAINTENANCE_RESPONSE" = "200" ]; then
    echo "✅ API server is running and accessible"
else
    echo "❌ API server is not accessible"
    exit 1
fi

# 3. Test admin endpoints with authentication
echo "[INFO] Testing admin endpoints with authentication..."

# First, get an authentication token by logging in
echo "[INFO] Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@therapease.com",
    "password": "SecureAdmin2024!@#$"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    echo "Login response: $LOGIN_RESPONSE"
    exit 1
else
    echo "✅ Authentication token obtained"
fi

# 4. Test admin endpoints with token
echo "[INFO] Testing admin endpoints with authentication token..."

# Test therapists endpoint
THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/therapists)
echo "Therapists endpoint: HTTP $THERAPISTS_RESPONSE"

if [ "$THERAPISTS_RESPONSE" = "200" ]; then
    echo "✅ Therapists endpoint working"
    # Get actual response to see data
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/therapists | head -c 200
    echo "..."
else
    echo "❌ Therapists endpoint failed"
fi

# Test patients endpoint
PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/patients)
echo "Patients endpoint: HTTP $PATIENTS_RESPONSE"

if [ "$PATIENTS_RESPONSE" = "200" ]; then
    echo "✅ Patients endpoint working"
    # Get actual response to see data
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/patients | head -c 200
    echo "..."
else
    echo "❌ Patients endpoint failed"
fi

# Test notifications endpoint
NOTIFICATIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/admin/notifications)
echo "Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"

if [ "$NOTIFICATIONS_RESPONSE" = "200" ]; then
    echo "✅ Notifications endpoint working"
    # Get actual response to see data
    curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/admin/notifications | head -c 200
    echo "..."
else
    echo "❌ Notifications endpoint failed"
fi

# 5. Test external API endpoints
echo "[INFO] Testing external API endpoints..."

# Test external maintenance status
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

# Test external admin endpoints (should also require auth)
EXTERNAL_THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.therapease.site/api/admin/therapists)
echo "External therapists: HTTP $EXTERNAL_THERAPISTS_RESPONSE"

# 6. Check PM2 status
echo "[INFO] Final PM2 status:"
/usr/bin/pm2 list

# 7. Show recent logs
echo "[INFO] Recent API server logs:"
/usr/bin/pm2 logs therapease-api --lines 10

echo "[INFO] Database schema fix and endpoint testing complete!"
echo "[INFO] The admin dashboard should now work properly in the browser"
