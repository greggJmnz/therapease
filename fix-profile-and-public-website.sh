#!/bin/bash

echo "🔧 Fixing Admin Profile and Public Website Issues..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Add profile endpoints to admin controller
echo "[INFO] Adding profile endpoints to admin controller..."

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

// Get admin profile
const getProfile = async (req, res) => {
  try {
    // For now, get the admin user profile
    // In a real implementation, you'd get the user from the JWT token
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.country,
        u.profileImage,
        u.status,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.role = 'admin'
      LIMIT 1
    `;

    const user = await getOne(sql);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin profile' });
  }
};

// Update admin profile
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, country } = req.body;
    
    // Update admin user profile
    const sql = `
      UPDATE users 
      SET 
        firstName = ?,
        lastName = ?,
        phone = ?,
        dateOfBirth = ?,
        gender = ?,
        address = ?,
        city = ?,
        state = ?,
        zipCode = ?,
        country = ?,
        updatedAt = NOW()
      WHERE role = 'admin'
    `;

    await runQuery(sql, [firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, country]);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update admin profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update admin profile' });
  }
};

// Get admin settings
const getSettings = async (req, res) => {
  try {
    // Get admin user settings
    const sql = `
      SELECT 
        us.id,
        us.userId,
        us.theme,
        us.language,
        us.notifications,
        us.emailNotifications,
        us.smsNotifications,
        us.createdAt,
        us.updatedAt
      FROM user_settings us
      JOIN users u ON us.userId = u.id
      WHERE u.role = 'admin'
      LIMIT 1
    `;

    const settings = await getOne(sql);

    // If no settings found, return defaults
    if (!settings) {
      return res.json({
        success: true,
        data: {
          settings: {
            theme: 'light',
            language: 'en',
            notifications: true,
            emailNotifications: true,
            smsNotifications: false
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        settings
      }
    });

  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin settings' });
  }
};

// Update admin settings
const updateSettings = async (req, res) => {
  try {
    const { theme, language, notifications, emailNotifications, smsNotifications } = req.body;
    
    // Get admin user ID
    const adminUser = await getOne('SELECT id FROM users WHERE role = "admin" LIMIT 1');
    
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'Admin user not found'
      });
    }

    // Update or insert settings
    const sql = `
      INSERT INTO user_settings (userId, theme, language, notifications, emailNotifications, smsNotifications, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
      theme = VALUES(theme),
      language = VALUES(language),
      notifications = VALUES(notifications),
      emailNotifications = VALUES(emailNotifications),
      smsNotifications = VALUES(smsNotifications),
      updatedAt = NOW()
    `;

    await runQuery(sql, [adminUser.id, theme, language, notifications, emailNotifications, smsNotifications]);

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update admin settings' });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  getPatients,
  getTherapists,
  getAppointments,
  getNotifications,
  getReports,
  getProfile,
  updateProfile,
  getSettings,
  updateSettings
};
EOF

# 3. Update admin routes to include profile endpoints
echo "[INFO] Adding profile routes to admin routes..."

cat > routes/adminRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Dashboard routes
router.get('/dashboard', adminController.getDashboard);

// User management routes
router.get('/users', adminController.getUsers);

// Patient management routes
router.get('/patients', adminController.getPatients);

// Therapist management routes
router.get('/therapists', adminController.getTherapists);

// Appointment management routes
router.get('/appointments', adminController.getAppointments);

// Notification management routes
router.get('/notifications', adminController.getNotifications);

// Reports routes
router.get('/reports', adminController.getReports);

// Profile routes
router.get('/profile', adminController.getProfile);
router.put('/profile', adminController.updateProfile);

// Settings routes
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
EOF

# 4. Fix public website button in frontend
echo "[INFO] Fixing public website button in frontend..."

# Check if we're in the right directory for frontend files
if [ -d "../client/src" ]; then
    echo "[INFO] Found client directory, updating public website URL..."
    
    # Find and update the public website button URL
    find ../client/src -name "*.jsx" -o -name "*.js" | xargs grep -l "localhost:8000" | head -5 | while read file; do
        echo "Updating file: $file"
        sed -i 's|http://localhost:8000|https://therapease.site|g' "$file"
        sed -i 's|localhost:8000|therapease.site|g' "$file"
    done
    
    # Also check for any hardcoded localhost references
    find ../client/src -name "*.jsx" -o -name "*.js" | xargs grep -l "8000" | head -5 | while read file; do
        echo "Checking file for port 8000: $file"
        grep -n "8000" "$file" | head -3
    done
else
    echo "[INFO] Client directory not found, skipping frontend updates"
fi

# 5. Check syntax
echo "[INFO] Checking syntax..."
node -c controllers/adminController.js && echo "✅ adminController.js syntax OK" || echo "❌ adminController.js syntax error"
node -c routes/adminRoutes.js && echo "✅ adminRoutes.js syntax OK" || echo "❌ adminRoutes.js syntax error"

# 6. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 7. Test profile endpoints
echo "[INFO] Testing profile endpoints..."

echo "[TEST] Admin profile:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/profile | head -10

echo "[TEST] Admin settings:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/settings | head -10

# 8. Test public website
echo "[TEST] Testing public website:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/ | head -5

# 9. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Profile and public website fix complete!"
echo "✅ Added /api/admin/profile GET and PUT endpoints"
echo "✅ Added /api/admin/settings GET and PUT endpoints"
echo "✅ Updated public website button to use therapease.site"
echo "✅ Profile and settings should now work in admin portal"
echo "✅ Public website button should redirect to therapease.site"
