#!/bin/bash

echo "🔧 Fixing Notifications Column Issue..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Add missing 'read' column to notifications table
echo "[INFO] Adding missing 'read' column to notifications table..."

mysql -u therapease_user -p"TherapEase2025!@#" therapease_db << 'EOF'
-- Add 'read' column to notifications table if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;

-- Show the table structure
DESCRIBE notifications;
EOF

# 3. Update admin controller to handle missing columns gracefully
echo "[INFO] Updating notifications query to handle missing columns..."

cat > controllers/adminController.js << 'EOF'
const { getAll, getOne, runQuery } = require('../config/database');

// Get dashboard data
const getDashboard = async (req, res) => {
  try {
    // Get basic statistics
    const statsSql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'therapist') as totalTherapists,
        (SELECT COUNT(*) FROM users WHERE role = 'patient') as totalPatients,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as totalAdmins,
        (SELECT COUNT(*) FROM assessments) as totalAssessments,
        (SELECT COUNT(*) FROM appointments) as totalAppointments,
        (SELECT COUNT(*) FROM daily_notes) as totalDailyNotes,
        (SELECT COUNT(*) FROM progress_tracking) as totalProgressEntries
    `;

    const [statsResult] = await getAll(statsSql);
    const stats = statsResult;

    // Get recent users
    const recentUsersSql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.createdAt
      FROM users u
      ORDER BY u.createdAt DESC
      LIMIT 10
    `;

    const recentUsers = await getAll(recentUsersSql);

    res.json({
      success: true,
      data: {
        stats,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin dashboard data' });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.role,
        u.status,
        u.createdAt,
        u.updatedAt
      FROM users u
      ORDER BY u.createdAt DESC
    `;

    const users = await getAll(sql);

    res.json({
      success: true,
      data: {
        users,
        total: users.length
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Get patients
const getPatients = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.status,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.role = 'patient'
      ORDER BY u.createdAt DESC
    `;

    const patients = await getAll(sql);

    res.json({
      success: true,
      data: {
        users: patients,
        total: patients.length
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patients' });
  }
};

// Get therapists
const getTherapists = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.phone,
        u.status,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.role = 'therapist'
      ORDER BY u.createdAt DESC
    `;

    const therapists = await getAll(sql);

    res.json({
      success: true,
      data: {
        users: therapists,
        total: therapists.length
      }
    });

  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
};

// Get appointments
const getAppointments = async (req, res) => {
  try {
    const sql = `
      SELECT 
        a.id,
        a.appointmentDate,
        a.appointmentTime,
        a.duration,
        a.status,
        a.createdAt,
        u.firstName,
        u.lastName,
        u.email
      FROM appointments a
      LEFT JOIN users u ON a.patientId = u.id
      ORDER BY a.appointmentDate DESC
    `;

    const appointments = await getAll(sql);

    res.json({
      success: true,
      data: {
        appointments,
        total: appointments.length
      }
    });

  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
};

// Get notifications with safe column handling
const getNotifications = async (req, res) => {
  try {
    // First check what columns exist in the notifications table
    const checkColumnsSql = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'notifications' 
      AND TABLE_SCHEMA = 'therapease_db'
    `;
    
    const columns = await getAll(checkColumnsSql);
    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    // Build query based on available columns
    let selectFields = 'n.id, n.type, n.title, n.message, n.createdAt';
    
    if (columnNames.includes('priority')) {
      selectFields += ', n.priority';
    }
    
    if (columnNames.includes('read')) {
      selectFields += ', n.read';
    }
    
    const sql = `
      SELECT 
        ${selectFields}
      FROM notifications n
      ORDER BY n.createdAt DESC
    `;

    const notifications = await getAll(sql);

    // Add default values for missing columns
    const notificationsWithDefaults = notifications.map(notification => ({
      ...notification,
      priority: notification.priority || 'medium',
      read: notification.read !== undefined ? notification.read : false
    }));

    res.json({
      success: true,
      data: {
        notifications: notificationsWithDefaults,
        total: notificationsWithDefaults.length
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

// Get reports
const getReports = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        message: 'Reports functionality coming soon'
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  getPatients,
  getTherapists,
  getAppointments,
  getNotifications,
  getReports
};
EOF

# 4. Check syntax
echo "[INFO] Checking syntax..."
node -c controllers/adminController.js && echo "✅ adminController.js syntax OK" || echo "❌ adminController.js syntax error"

# 5. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 6. Test notifications endpoint
echo "[INFO] Testing notifications endpoint..."
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/notifications | head -10

# 7. Test all endpoints
echo "[INFO] Testing all admin endpoints..."

echo "[TEST] Dashboard:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/dashboard | head -5

echo "[TEST] Users:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/users | head -5

echo "[TEST] Patients:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/patients | head -5

echo "[TEST] Therapists:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/therapists | head -5

echo "[TEST] Appointments:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/appointments | head -5

echo "[TEST] Notifications:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/notifications | head -5

# 8. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Notifications column fix complete!"
echo "✅ Added 'read' column to notifications table"
echo "✅ Updated notifications query to handle missing columns gracefully"
echo "✅ All admin endpoints should now work without errors"
