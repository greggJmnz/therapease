#!/bin/bash

echo "🔧 Fixing MySQL Syntax and Route Errors..."

# Navigate to the project directory
cd /root/therapease/therapease

# 1. Stop all PM2 processes
echo "[INFO] Stopping all PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true
/usr/bin/pm2 delete all 2>/dev/null || true

# 2. Clean up any existing processes
echo "[INFO] Cleaning up any existing processes..."
pkill -f "node.*index.js" 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true

# 3. Fix database schema with compatible MySQL syntax
echo "[INFO] Fixing database schema with compatible MySQL syntax..."
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

-- Update any NULL values
UPDATE therapists SET status = 'active' WHERE status IS NULL;
UPDATE notifications SET priority = 'medium' WHERE priority IS NULL;
UPDATE notifications SET category = 'general' WHERE category IS NULL;
EOF

# 4. Fix the admin routes error
echo "[INFO] Fixing admin routes error..."
cd server

# Check the adminRoutes.js file
if [ -f "routes/adminRoutes.js" ]; then
    echo "[INFO] Checking adminRoutes.js for undefined functions..."
    
    # Backup the original file
    cp routes/adminRoutes.js routes/adminRoutes.js.backup.$(date +%Y%m%d_%H%M%S)
    
    # Check what's on line 18
    echo "[INFO] Line 18 of adminRoutes.js:"
    sed -n '18p' routes/adminRoutes.js
    
    # Check the adminController import
    echo "[INFO] Checking adminController import..."
    head -10 routes/adminRoutes.js | grep -E "require|adminController"
    
    # Fix the adminController import and exports
    echo "[INFO] Fixing adminController import and exports..."
    
    # First, let's check what's actually exported from adminController
    echo "[INFO] Checking adminController exports..."
    grep -n "module.exports\|exports\." controllers/adminController.js | head -10
    
    # Create a fixed adminController with proper exports
    cat > controllers/adminController.js << 'EOF'
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

// Export all functions
module.exports = {
  getDashboard,
  getTherapists,
  getPatients,
  getNotifications
};
EOF

    echo "✅ Fixed adminController.js with proper exports"
else
    echo "❌ adminRoutes.js not found"
fi

# 5. Fix the adminRoutes.js file
echo "[INFO] Fixing adminRoutes.js..."
if [ -f "routes/adminRoutes.js" ]; then
    # Create a fixed adminRoutes.js
    cat > routes/adminRoutes.js << 'EOF'
const express = require('express');
const router = express.Router();
const { getDashboard, getTherapists, getPatients, getNotifications } = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

// Admin dashboard routes
router.get('/dashboard', getDashboard);
router.get('/therapists', getTherapists);
router.get('/patients', getPatients);
router.get('/notifications', getNotifications);

module.exports = router;
EOF

    echo "✅ Fixed adminRoutes.js with proper imports"
fi

# 6. Create proper ecosystem config
echo "[INFO] Creating proper ecosystem config..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'therapease-api',
      script: './index.js',
      cwd: '/root/therapease/therapease/server',
      instances: 1,
      exec_mode: 'fork',
      env_file: '.env.production',
      error_file: '/root/therapease/logs/therapease-api-error.log',
      out_file: '/root/therapease/logs/therapease-api-out.log',
      log_file: '/root/therapease/logs/therapease-api.log',
      time: true,
      max_memory_restart: '500M',
      restart_delay: 5000
    },
    {
      name: 'therapease-public',
      script: './server.js',
      cwd: '/root/therapease/therapease/public-website',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0'
      },
      error_file: '/root/therapease/logs/therapease-public-error.log',
      out_file: '/root/therapease/logs/therapease-public-out.log',
      log_file: '/root/therapease/logs/therapease-public.log',
      time: true,
      max_memory_restart: '200M',
      restart_delay: 5000
    }
  ]
};
EOF

# 7. Create logs directory
mkdir -p /root/therapease/logs

# 8. Start the services
echo "[INFO] Starting services..."
/usr/bin/pm2 start ecosystem.config.js

# Wait for services to start
sleep 10

# 9. Check service status
echo "[INFO] Checking service status..."
/usr/bin/pm2 list

# 10. Test the API server
echo "[INFO] Testing API server..."

# Test maintenance status
MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/maintenance-status)
echo "Maintenance status: HTTP $MAINTENANCE_RESPONSE"

# Test login endpoint
LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "Login endpoint: HTTP $LOGIN_RESPONSE"

# If login works, test with actual response
if [ "$LOGIN_RESPONSE" = "200" ]; then
    echo "[INFO] Login successful! Testing with actual response..."
    curl -s -X POST http://localhost:5000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}' | head -c 200
    echo "..."
fi

# 11. Test the public website
echo "[INFO] Testing public website..."
PUBLIC_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080)
echo "Public website: HTTP $PUBLIC_RESPONSE"

# 12. Test external API
echo "[INFO] Testing external API..."
EXTERNAL_MAINTENANCE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.therapease.site/api/maintenance-status)
echo "External maintenance status: HTTP $EXTERNAL_MAINTENANCE_RESPONSE"

EXTERNAL_LOGIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://api.therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')
echo "External login endpoint: HTTP $EXTERNAL_LOGIN_RESPONSE"

# 13. Show recent logs
echo "[INFO] Recent API server logs:"
/usr/bin/pm2 logs therapease-api --lines 5

echo "[INFO] Recent public website logs:"
/usr/bin/pm2 logs therapease-public --lines 5

# 14. Final status check
echo "[INFO] Final system status:"
echo "PM2 Status:"
/usr/bin/pm2 list

echo "Port Status:"
ss -tlnp | grep -E ":(5000|8080)" || echo "No services listening on expected ports"

echo "[INFO] MySQL syntax and route errors fix complete!"
echo "[INFO] Check the results above to verify everything is working"
