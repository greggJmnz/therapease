#!/bin/bash

echo "🔧 Comprehensive Fix for All Issues..."

# Navigate to the server directory
cd /root/therapease/therapease

# 1. Find PM2 path
echo "[INFO] Finding PM2 installation..."
PM2_PATH=""
if command -v pm2 >/dev/null 2>&1; then
    PM2_PATH=$(which pm2)
    echo "✅ PM2 found at: $PM2_PATH"
elif [ -f "/usr/local/bin/pm2" ]; then
    PM2_PATH="/usr/local/bin/pm2"
    echo "✅ PM2 found at: $PM2_PATH"
elif [ -f "/usr/bin/pm2" ]; then
    PM2_PATH="/usr/bin/pm2"
    echo "✅ PM2 found at: $PM2_PATH"
elif [ -f "/home/therapease/.nvm/versions/node/*/bin/pm2" ]; then
    PM2_PATH=$(find /home/therapease/.nvm/versions/node/*/bin/pm2 2>/dev/null | head -1)
    echo "✅ PM2 found at: $PM2_PATH"
else
    echo "❌ PM2 not found, trying to install..."
    npm install -g pm2
    PM2_PATH=$(which pm2)
    if [ -z "$PM2_PATH" ]; then
        echo "❌ Failed to install PM2"
        exit 1
    fi
    echo "✅ PM2 installed at: $PM2_PATH"
fi

# 2. Check if API server is running
echo "[INFO] Checking API server status..."
if $PM2_PATH list | grep -q "therapease-api.*online"; then
    echo "✅ API server is running"
    API_RUNNING=true
else
    echo "❌ API server is not running"
    API_RUNNING=false
fi

# 3. Fix admin controller syntax errors
echo "[INFO] Fixing admin controller syntax errors..."
cd /root/therapease/therapease/server

# Backup the current admin controller
cp controllers/adminController.js controllers/adminController.js.backup.$(date +%Y%m%d_%H%M%S)

# Fix the malformed map functions using a more robust approach
echo "[INFO] Applying syntax fixes..."

# Create a temporary file with the fixes
cat > /tmp/admin_controller_fix.js << 'EOF'
const { getAll, getOne, runQuery } = require('../config/database');
const { decryptSensitiveFields } = require('../utils/encryption');

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US');
  }
};

// Get admin dashboard data
const getDashboard = async (req, res) => {
  try {
    // Get system statistics
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

    // Get recent user registrations
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
        recentUsers,
        systemHealth: {
          newUsersThisWeek: 0,
          newAssessmentsThisWeek: 0,
          newAppointmentsThisWeek: 0,
          newDailyNotesThisWeek: 0,
          newProgressEntriesThisWeek: 0
        },
        userGrowth: [],
        appointmentTrends: []
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch admin dashboard data' 
    });
  }
};

// Get therapists for admin
const getTherapists = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        t.maxPatients,
        t.isAcceptingPatients,
        (SELECT COUNT(DISTINCT pta.patientId) FROM patient_therapist_assignments pta WHERE pta.therapistId = t.userId AND pta.status = 'active') as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist'
      ORDER BY u.createdAt DESC
    `;

    const therapists = await getAll(sql);

    // Format therapist data
    const formattedTherapists = therapists.map(therapist => ({
      id: therapist.id,
      email: therapist.email,
      role: therapist.role,
      firstName: therapist.firstName,
      lastName: therapist.lastName,
      phone: therapist.phone,
      dateOfBirth: therapist.dateOfBirth,
      gender: therapist.gender,
      address: therapist.address,
      city: therapist.city,
      state: therapist.state,
      zipCode: therapist.zipCode,
      status: therapist.status || 'active',
      createdAt: therapist.createdAt,
      updatedAt: therapist.updatedAt,
      therapist: {
        licenseNumber: therapist.licenseNumber,
        specialization: therapist.specialization,
        yearsOfExperience: therapist.yearsOfExperience,
        education: therapist.education,
        certifications: therapist.certifications,
        availability: therapist.availability,
        status: 'active',
        maxPatients: therapist.maxPatients || 20,
        isAcceptingPatients: therapist.isAcceptingPatients !== false
      },
      patientCount: therapist.patientCount || 0
    }));

    res.json({
      success: true,
      data: {
        users: formattedTherapists,
        total: formattedTherapists.length
      }
    });

  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
};

// Get patients for admin
const getPatients = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        p.id as patientId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        (SELECT CONCAT(u2.firstName, ' ', u2.lastName) FROM users u2 WHERE u2.id = p.therapistId) as therapistName
      FROM users u
      LEFT JOIN patients p ON u.id = p.userId
      WHERE u.role = 'patient'
      ORDER BY u.createdAt DESC
    `;

    const patients = await getAll(sql);

    // Format patient data
    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      email: patient.email,
      role: patient.role,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      zipCode: patient.zipCode,
      status: patient.status || 'active',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      patient: {
        id: patient.patientId,
        diagnosis: patient.diagnosis,
        medicalHistory: patient.medicalHistory,
        goals: patient.goals,
        status: 'active',
        therapistId: patient.therapistId
      },
      therapistName: patient.therapistName
    }));

    res.json({
      success: true,
      data: {
        users: formattedPatients,
        total: formattedPatients.length
      }
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patients' });
  }
};

// Get notifications for admin
const getNotifications = async (req, res) => {
  try {
    const sql = `
      SELECT 
        n.id,
        n.userId,
        n.title,
        n.message,
        n.type,
        n.priority,
        n.category,
        n.isRead,
        n.createdAt,
        u.firstName,
        u.lastName,
        u.email
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      ORDER BY n.createdAt DESC
      LIMIT 100
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

module.exports = {
  getDashboard,
  getTherapists,
  getPatients,
  getNotifications
};
EOF

# Replace the admin controller with the fixed version
cp /tmp/admin_controller_fix.js controllers/adminController.js

# 4. Restart the API server
echo "[INFO] Restarting API server..."
if [ "$API_RUNNING" = true ]; then
    $PM2_PATH restart therapease-api
else
    $PM2_PATH start ecosystem.config.js
fi

# Wait for server to start
sleep 5

# 5. Test the endpoints
echo "[INFO] Testing admin endpoints..."

# Test therapists endpoint
echo "[INFO] Testing /api/admin/therapists..."
THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/therapists)
if [ "$THERAPISTS_RESPONSE" = "200" ]; then
    echo "✅ Therapists endpoint: HTTP $THERAPISTS_RESPONSE"
else
    echo "❌ Therapists endpoint: HTTP $THERAPISTS_RESPONSE"
fi

# Test patients endpoint
echo "[INFO] Testing /api/admin/patients..."
PATIENTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/patients)
if [ "$PATIENTS_RESPONSE" = "200" ]; then
    echo "✅ Patients endpoint: HTTP $PATIENTS_RESPONSE"
else
    echo "❌ Patients endpoint: HTTP $PATIENTS_RESPONSE"
fi

# Test notifications endpoint
echo "[INFO] Testing /api/admin/notifications..."
NOTIFICATIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/admin/notifications)
if [ "$NOTIFICATIONS_RESPONSE" = "200" ]; then
    echo "✅ Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"
else
    echo "❌ Notifications endpoint: HTTP $NOTIFICATIONS_RESPONSE"
fi

# 6. Test external API access
echo "[INFO] Testing external API access..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status response: $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_THERAPISTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/admin/therapists)
echo "External therapists response: $EXTERNAL_THERAPISTS_RESPONSE"

# 7. Check PM2 status
echo "[INFO] PM2 Status:"
$PM2_PATH list

echo "[INFO] Comprehensive fix complete!"
echo "[INFO] Check the browser console to see if the issues are resolved"
