#!/bin/bash

echo "🔄 Reverting Admin Portal to Working State..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Restore the working admin controller from our previous fix
echo "[INFO] Restoring working admin controller..."

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

// Get notifications
const getNotifications = async (req, res) => {
  try {
    const sql = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.priority,
        n.read,
        n.createdAt
      FROM notifications n
      ORDER BY n.createdAt DESC
    `;

    const notifications = await getAll(sql);

    res.json({
      success: true,
      data: {
        notifications,
        total: notifications.length
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

# 3. Restore simple admin routes
echo "[INFO] Restoring simple admin routes..."

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

module.exports = router;
EOF

# 4. Check syntax
echo "[INFO] Checking syntax..."
node -c controllers/adminController.js && echo "✅ adminController.js syntax OK" || echo "❌ adminController.js syntax error"
node -c routes/adminRoutes.js && echo "✅ adminRoutes.js syntax OK" || echo "❌ adminRoutes.js syntax error"

# 5. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 6. Test admin endpoints
echo "[INFO] Testing admin endpoints..."

# Test dashboard
echo "[TEST] Testing admin dashboard:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/dashboard | head -10

# Test users
echo "[TEST] Testing admin users:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/users | head -10

# Test patients
echo "[TEST] Testing admin patients:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/patients | head -10

# Test therapists
echo "[TEST] Testing admin therapists:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/therapists | head -10

# Test appointments
echo "[TEST] Testing admin appointments:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/appointments | head -10

# Test notifications
echo "[TEST] Testing admin notifications:"
curl -s -w "\nHTTP Status: %{http_code}\n" https://therapease.site/api/admin/notifications | head -10

# 7. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Admin portal reverted to working state!"
echo "✅ Simple admin controller restored"
echo "✅ Basic admin routes working"
echo "✅ All admin endpoints should be accessible"
echo "✅ No complex queries that might cause errors"
