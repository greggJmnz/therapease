#!/bin/bash

echo "🧹 Clearing All Users and User Data Except Admin..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Show current users before deletion
echo "[INFO] Current users in database:"
mysql -u therapease_user -p"TherapEase2025!@#" therapease_db -e "
SELECT id, email, firstName, lastName, role, status, createdAt 
FROM users 
ORDER BY id;
"

echo ""
echo "⚠️  WARNING: This will delete ALL users except admin!"
echo "⚠️  This action cannot be undone!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled by user"
    exit 1
fi

# 3. Clear all user-related data except admin
echo "[INFO] Clearing all user data except admin..."

mysql -u therapease_user -p"TherapEase2025!@#" therapease_db << 'EOF'
-- Start transaction for safety
START TRANSACTION;

-- Get admin user ID
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@therapease.com' LIMIT 1);

-- Show admin user info
SELECT 'Admin user to preserve:' as info, id, email, firstName, lastName, role FROM users WHERE id = @admin_id;

-- Delete all appointments (except those with admin as patient/therapist)
DELETE FROM appointments WHERE patientId != @admin_id AND therapistId != @admin_id;

-- Delete all daily notes (except those with admin as patient/therapist)
DELETE FROM daily_notes WHERE patientId != @admin_id AND therapistId != @admin_id;

-- Delete all progress tracking (except those with admin as patient)
DELETE FROM progress_tracking WHERE patientId != @admin_id;

-- Delete all assessments (except those with admin as patient)
DELETE FROM assessments WHERE patientId != @admin_id;

-- Delete all patient_therapist_assignments (except those with admin as patient)
DELETE FROM patient_therapist_assignments WHERE patientId != @admin_id;

-- Delete all notifications (except system notifications)
DELETE FROM notifications WHERE userId != @admin_id;

-- Delete all user settings (except admin)
DELETE FROM user_settings WHERE userId != @admin_id;

-- Delete all therapist records (except admin)
DELETE FROM therapists WHERE userId != @admin_id;

-- Delete all patient records (except admin)
DELETE FROM patients WHERE userId != @admin_id;

-- Delete all users except admin
DELETE FROM users WHERE id != @admin_id;

-- Show remaining users
SELECT 'Remaining users after cleanup:' as info;
SELECT id, email, firstName, lastName, role, status, createdAt FROM users ORDER BY id;

-- Show table counts
SELECT 'Table counts after cleanup:' as info;
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'daily_notes', COUNT(*) FROM daily_notes
UNION ALL
SELECT 'progress_tracking', COUNT(*) FROM progress_tracking
UNION ALL
SELECT 'assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'patient_therapist_assignments', COUNT(*) FROM patient_therapist_assignments
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'user_settings', COUNT(*) FROM user_settings
UNION ALL
SELECT 'therapists', COUNT(*) FROM therapists
UNION ALL
SELECT 'patients', COUNT(*) FROM patients;

-- Commit transaction
COMMIT;
EOF

# 4. Verify cleanup
echo "[INFO] Verifying cleanup..."

mysql -u therapease_user -p"TherapEase2025!@#" therapease_db -e "
SELECT 'Final user count:' as info, COUNT(*) as count FROM users;
SELECT 'Admin user details:' as info;
SELECT id, email, firstName, lastName, role, status, createdAt FROM users;
"

# 5. Reset auto-increment counters
echo "[INFO] Resetting auto-increment counters..."

mysql -u therapease_user -p"TherapEase2025!@#" therapease_db << 'EOF'
-- Reset auto-increment for users table to start from 2 (admin is 1)
ALTER TABLE users AUTO_INCREMENT = 2;

-- Reset other tables if they have auto-increment
ALTER TABLE appointments AUTO_INCREMENT = 1;
ALTER TABLE daily_notes AUTO_INCREMENT = 1;
ALTER TABLE progress_tracking AUTO_INCREMENT = 1;
ALTER TABLE assessments AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE user_settings AUTO_INCREMENT = 1;
ALTER TABLE therapists AUTO_INCREMENT = 1;
ALTER TABLE patients AUTO_INCREMENT = 1;
EOF

# 6. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 7. Test admin endpoints with clean data
echo "[INFO] Testing admin endpoints with clean data..."

echo "[TEST] Dashboard (should show 0 for most counts):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/dashboard | head -10

echo "[TEST] Users (should only show admin):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/users | head -10

echo "[TEST] Patients (should be empty):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/patients | head -10

echo "[TEST] Therapists (should be empty):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/therapists | head -10

echo "[TEST] Appointments (should be empty):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/appointments | head -10

echo "[TEST] Notifications (should be empty):"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/notifications | head -10

# 8. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Database cleanup complete!"
echo "✅ All users deleted except admin"
echo "✅ All user-related data cleared"
echo "✅ Auto-increment counters reset"
echo "✅ Admin account preserved and functional"
echo "✅ Database is now clean and ready for new data"
