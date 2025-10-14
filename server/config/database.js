const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const webpush = require('web-push');
const { hashPassword } = require('../utils/password');
const { 
  joinPaths, 
  getEnvVar, 
  isWindows, 
  execCommand, 
  createDirectory, 
  fileExists, 
  copyFile,
  generateSSLCertificates,
  getOpenSSLCommand,
  isOpenSSLAvailable,
  getPlatformInfo
} = require('../utils/windowsCompatibility');

// Load environment variables with Windows compatibility
require('dotenv').config({ path: joinPaths(__dirname, '../../.env') });

// Database configuration with Windows compatibility
const dbConfig = {
  host: getEnvVar('DB_HOST', 'localhost'),
  user: getEnvVar('DB_USER', 'root'),
  password: getEnvVar('DB_PASSWORD', ''),
  database: getEnvVar('DB_NAME', 'therapease'),
  port: parseInt(getEnvVar('DB_PORT', '3306')),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  connectTimeout: 60000,
  // Windows-specific MySQL configuration
  charset: 'utf8mb4',
  timezone: 'Z',
  // Handle Windows path separators in connection strings
  ssl: false
};

// Create connection pool
let pool;

// Initialize database connection
const initializeDatabase = async () => {
  try {
    // Create pool
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    connection.release();
    
    // Initialize tables
    await createTables();
    
    // Seed initial data
    await seedInitialData();
    
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Create database tables
const createTables = async () => {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'therapist', 'patient') NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        dateOfBirth DATE,
        gender ENUM('male', 'female', 'other'),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zipCode VARCHAR(20),
        twoFactorEnabled BOOLEAN DEFAULT FALSE,
        twoFactorMethod ENUM('email', 'sms', 'push') DEFAULT 'email',
        twoFactorEnabledAt TIMESTAMP NULL,
        emailVerified BOOLEAN DEFAULT FALSE,
        emailVerifiedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add email verification fields to users table if they don't exist
    try {
      await pool.execute(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS emailVerifiedAt TIMESTAMP NULL
      `);
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: Email verification columns may already exist');
      }
    }

    // Patients table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT UNIQUE,
        diagnosis TEXT,
        medicalHistory TEXT,
        goals TEXT,
        therapistId INT,
        emergencyContact TEXT,
        insuranceInfo TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Therapists table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS therapists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT UNIQUE,
        licenseNumber VARCHAR(100),
        specialization TEXT,
        yearsOfExperience INT,
        education TEXT,
        certifications TEXT,
        availability TEXT,
        maxPatients INT DEFAULT 20,
        isAcceptingPatients BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Assessments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        assessmentDate DATE NOT NULL,
        status ENUM('scheduled', 'in-progress', 'completed') NOT NULL,
        score INT,
        maxScore INT DEFAULT 100,
        summary TEXT,
        recommendations JSON,
        areas JSON,
        aiInsights TEXT,
        scheduledDate DATE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Daily Notes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS daily_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        sessionDate DATE NOT NULL,
        sessionDuration INT,
        content TEXT,
        activities TEXT,
        observations TEXT,
        progress TEXT,
        challenges TEXT,
        nextSteps TEXT,
        goals TEXT,
        mood VARCHAR(50),
        engagement VARCHAR(50),
        comments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns to existing daily_notes table if they don't exist
    try {
      // Check for content column
      const [contentColumns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'daily_notes' 
        AND COLUMN_NAME = 'content'
      `);
      
      if (contentColumns.length === 0) {
        await pool.execute(`ALTER TABLE daily_notes ADD COLUMN content TEXT`);
        console.log('Content column added to daily_notes table');
      } else {
        console.log('Content column already exists');
      }

      // Check for goals column
      const [goalsColumns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'daily_notes' 
        AND COLUMN_NAME = 'goals'
      `);
      
      if (goalsColumns.length === 0) {
        await pool.execute(`ALTER TABLE daily_notes ADD COLUMN goals TEXT`);
        console.log('Goals column added to daily_notes table');
      } else {
        console.log('Goals column already exists');
      }

      // Check for comments column
      const [commentsColumns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'daily_notes' 
        AND COLUMN_NAME = 'comments'
      `);
      
      if (commentsColumns.length === 0) {
        await pool.execute(`ALTER TABLE daily_notes ADD COLUMN comments TEXT`);
        console.log('Comments column added to daily_notes table');
      } else {
        console.log('Comments column already exists');
      }
    } catch (error) {
      console.log('Error checking/adding columns:', error.message);
    }

    // Appointments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        appointmentDate DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        duration INT NOT NULL,
        type VARCHAR(100) NOT NULL,
        status ENUM('scheduled', 'completed', 'cancelled') NOT NULL,
        approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approvedBy INT NULL,
        approvedAt TIMESTAMP NULL,
        createdBy INT NULL,
        reason TEXT,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foreign key for approvedBy if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE appointments 
        ADD CONSTRAINT fk_appointments_approved_by 
        FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('Foreign key for approvedBy added to appointments table');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('Foreign key for approvedBy already exists');
      } else {
        console.log('Error adding foreign key for approvedBy:', error.message);
      }
    }

    // Add createdBy column if it doesn't exist
    try {
      // First, check if the column exists
      const columnCheck = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'appointments' 
        AND COLUMN_NAME = 'createdBy'
      `);
      
      if (columnCheck[0].length === 0) {
        // Column doesn't exist, add it
        await pool.execute(`
          ALTER TABLE appointments 
          ADD COLUMN createdBy INT NULL
        `);
        console.log('createdBy column added to appointments table');
        
        // Add foreign key constraint
        try {
          await pool.execute(`
            ALTER TABLE appointments 
            ADD CONSTRAINT fk_appointments_created_by 
            FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
          `);
          console.log('createdBy foreign key added to appointments table');
        } catch (fkError) {
          if (fkError.code === 'ER_DUP_KEYNAME') {
            console.log('createdBy foreign key already exists');
          } else {
            console.log('Error adding createdBy foreign key:', fkError.message);
          }
        }
        
        // Populate existing appointments with default createdBy values
        try {
          // For existing appointments, set createdBy based on approvedBy
          // If approvedBy is the same as therapistId, it was likely created by the therapist
          // If approvedBy is different from therapistId, it was likely created by admin
          await pool.execute(`
            UPDATE appointments 
            SET createdBy = CASE 
              WHEN approvedBy = therapistId THEN therapistId
              WHEN approvedBy IS NOT NULL AND approvedBy != therapistId THEN approvedBy
              ELSE therapistId
            END
            WHERE createdBy IS NULL
          `);
          console.log('Populated createdBy field for existing appointments');
        } catch (updateError) {
          console.log('Error populating createdBy field:', updateError.message);
        }
      } else {
        console.log('createdBy column already exists');
        
        // Still try to populate any NULL values
        try {
          await pool.execute(`
            UPDATE appointments 
            SET createdBy = CASE 
              WHEN approvedBy = therapistId THEN therapistId
              WHEN approvedBy IS NOT NULL AND approvedBy != therapistId THEN approvedBy
              ELSE therapistId
            END
            WHERE createdBy IS NULL
          `);
          console.log('Updated NULL createdBy values for existing appointments');
        } catch (updateError) {
          console.log('Error updating NULL createdBy values:', updateError.message);
        }
      }
    } catch (error) {
      console.log('Error checking/adding createdBy column:', error.message);
    }

    // Progress Tracking table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        assessmentId INT,
        area VARCHAR(100) NOT NULL,
        baselineScore INT,
        currentScore INT,
        targetScore INT,
        progressNotes TEXT,
        measurementDate DATE NOT NULL,
        nextReviewDate DATE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Sessions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        sessionDate DATE NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        duration INT NOT NULL,
        sessionType VARCHAR(100) NOT NULL,
        status ENUM('scheduled', 'in-progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
        objectives TEXT,
        activities TEXT,
        observations TEXT,
        progress TEXT,
        challenges TEXT,
        nextSteps TEXT,
        goals TEXT,
        mood VARCHAR(50),
        engagement VARCHAR(50),
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Home Exercises table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS home_exercises (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        instructions JSON NOT NULL,
        duration INT NOT NULL,
        frequency VARCHAR(50) NOT NULL,
        difficulty ENUM('Beginner', 'Intermediate', 'Advanced') NOT NULL,
        equipment JSON,
        progressScore INT DEFAULT 0,
        lastCompleted DATE,
        streak INT DEFAULT 0,
        isCompleted BOOLEAN DEFAULT FALSE,
        assignedDate DATE NOT NULL,
        dueDate DATE,
        status ENUM('assigned', 'in_progress', 'completed', 'overdue') DEFAULT 'assigned',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Home Exercise Proof Submissions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS home_exercise_proofs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        exerciseId INT NOT NULL,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        submissionType ENUM('text', 'image', 'video', 'file') NOT NULL,
        content TEXT,
        filePath VARCHAR(500),
        fileName VARCHAR(255),
        fileSize INT,
        mimeType VARCHAR(100),
        status ENUM('submitted', 'reviewed', 'approved', 'needs_revision') DEFAULT 'submitted',
        therapistFeedback TEXT,
        submittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (exerciseId) REFERENCES home_exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notifications table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        isRead BOOLEAN DEFAULT FALSE,
        relatedId INT,
        smsMessageId VARCHAR(255),
        smsStatus ENUM('pending', 'sent', 'delivered', 'failed', 'error') DEFAULT NULL,
        smsSentAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Push Subscriptions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        endpoint TEXT NOT NULL,
        p256dh VARCHAR(255),
        auth VARCHAR(255),
        userAgent TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_endpoint (userId, endpoint(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Password Reset Tokens table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        usedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_expires (userId, expiresAt),
        INDEX idx_expires (expiresAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Patient-Therapist Assignments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS patient_therapist_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        assignmentType ENUM('primary', 'secondary', 'collaborative') NOT NULL DEFAULT 'primary',
        assignedBy INT NOT NULL,
        notes TEXT,
        status ENUM('active', 'inactive', 'terminated') DEFAULT 'active',
        assignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        terminatedAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_active_assignment (patientId, therapistId, status),
        INDEX idx_patient (patientId),
        INDEX idx_therapist (therapistId),
        INDEX idx_assignment_type (assignmentType),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Two-Factor Authentication codes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS two_factor_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        code VARCHAR(6) NOT NULL,
        expiresAt TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_expires (userId, expiresAt),
        INDEX idx_code_expires (code, expiresAt, used)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // System settings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        description TEXT,
        category VARCHAR(50) DEFAULT 'general',
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_public (is_public)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Working hours table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS working_hours (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        dayOfWeek ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
        startTime TIME NOT NULL,
        endTime TIME NOT NULL,
        isEnabled BOOLEAN DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_day (userId, dayOfWeek),
        INDEX idx_user (userId),
        INDEX idx_day (dayOfWeek)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Therapist settings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS therapist_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL UNIQUE,
        notifications JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Patient settings table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS patient_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL UNIQUE,
        notifications JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('Database tables created successfully');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Seed initial data - SECURE ADMIN ONLY
const seedInitialData = async () => {
  try {
    // Check if admin user already exists
    const [adminRows] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', ['admin']);
    
    if (adminRows[0].count === 0) {
      console.log('🔐 Creating secure admin account...');
      
      // Generate secure admin credentials
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@therapease.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdmin2024!@#$%';
      const hashedPassword = await hashPassword(adminPassword);

      // Insert secure admin user
      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, address, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        adminEmail, 
        hashedPassword, 
        'admin', 
        'System', 
        'Administrator', 
        '+1-555-0000', 
        'other',
        'System Administration Office',
        new Date(),
        new Date()
      ]);

      console.log('✅ Secure admin account created successfully');
      console.log('🔑 Admin credentials:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('⚠️  IMPORTANT: Change these credentials immediately after first login!');
    } else {
      console.log('✅ Admin account already exists, skipping creation');
    }

    // Seed default system settings
    await seedSystemSettings();
    
    // Seed default working hours and settings for therapists
    await seedTherapistDefaults();
    
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    throw error;
  }
};

// Seed default system settings
const seedSystemSettings = async () => {
  try {
    console.log('🔧 Seeding system settings...');
    
    const defaultSettings = [
      // General Settings
      { key: 'system_name', value: 'TherapEase', type: 'string', category: 'general', description: 'System name displayed throughout the application' },
      { key: 'maintenance_mode', value: 'false', type: 'boolean', category: 'general', description: 'Enable maintenance mode to disable system access' },
      { key: 'session_timeout', value: '30', type: 'number', category: 'general', description: 'Session timeout in minutes' },
      
      // Registration Settings
      { key: 'allow_registration', value: 'true', type: 'boolean', category: 'registration', description: 'Allow new user registrations' },
      { key: 'require_email_verification', value: 'true', type: 'boolean', category: 'registration', description: 'Require email verification for new users' },
      
      // Security Settings
      { key: 'password_complexity', value: 'medium', type: 'string', category: 'security', description: 'Password complexity requirement (low, medium, high)' },
      { key: 'max_login_attempts', value: '5', type: 'number', category: 'security', description: 'Maximum login attempts before lockout' },
      { key: 'email_notifications', value: 'true', type: 'boolean', category: 'security', description: 'Enable email notifications' },
      { key: 'notification_frequency', value: 'immediate', type: 'string', category: 'security', description: 'Notification frequency (immediate, daily, weekly)' },
      
      // Notification Settings
      { key: 'system_alerts', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable system alerts' },
      { key: 'user_activity', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable user activity notifications' },
      { key: 'security_events', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable security event notifications' },
      { key: 'maintenance_notifications', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable maintenance notifications' },
      { key: 'sms_notifications', value: 'false', type: 'boolean', category: 'notifications', description: 'Enable SMS notifications' },
      { key: 'push_notifications', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable push notifications' }
    ];

    for (const setting of defaultSettings) {
      // Check if setting already exists
      const [existing] = await pool.execute(
        'SELECT id FROM system_settings WHERE setting_key = ?',
        [setting.key]
      );

      if (existing.length === 0) {
        await pool.execute(`
          INSERT INTO system_settings (setting_key, setting_value, setting_type, category, description, is_public)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [
          setting.key,
          setting.value,
          setting.type,
          setting.category,
          setting.description,
          false
        ]);
      }
    }

    console.log('✅ System settings seeded successfully');
    
  } catch (error) {
    console.error('❌ Error seeding system settings:', error);
    throw error;
  }
};

// Seed default working hours and settings for therapists
const seedTherapistDefaults = async () => {
  try {
    console.log('🔧 Seeding therapist defaults...');
    
    // Get all therapists
    const therapists = await pool.execute(`
      SELECT id FROM users WHERE role = 'therapist'
    `);

    if (therapists[0].length > 0) {
      console.log(`📝 Adding default working hours and settings for ${therapists[0].length} therapists...`);
      
      for (const therapist of therapists[0]) {
        // Check if working hours already exist for this therapist
        const existingHours = await pool.execute(`
          SELECT COUNT(*) as count FROM working_hours WHERE userId = ?
        `, [therapist.id]);

        if (existingHours[0][0].count === 0) {
          // Add default working hours
          const defaultWorkingHours = [
            { day: 'monday', start: '09:00', end: '17:00', enabled: true },
            { day: 'tuesday', start: '09:00', end: '17:00', enabled: true },
            { day: 'wednesday', start: '09:00', end: '17:00', enabled: true },
            { day: 'thursday', start: '09:00', end: '17:00', enabled: true },
            { day: 'friday', start: '09:00', end: '17:00', enabled: true },
            { day: 'saturday', start: '10:00', end: '14:00', enabled: false },
            { day: 'sunday', start: '10:00', end: '14:00', enabled: false }
          ];

          for (const hours of defaultWorkingHours) {
            await pool.execute(`
              INSERT INTO working_hours (userId, dayOfWeek, startTime, endTime, isEnabled)
              VALUES (?, ?, ?, ?, ?)
            `, [therapist.id, hours.day, hours.start, hours.end, hours.enabled]);
          }
        }

        // Check if therapist settings already exist
        const existingSettings = await pool.execute(`
          SELECT COUNT(*) as count FROM therapist_settings WHERE userId = ?
        `, [therapist.id]);

        if (existingSettings[0][0].count === 0) {
          // Add default notification settings
          const defaultNotifications = {
            appointmentReminders: true,
            patientUpdates: true,
            systemNotifications: true,
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true
          };

          await pool.execute(`
            INSERT INTO therapist_settings (userId, notifications)
            VALUES (?, ?)
          `, [therapist.id, JSON.stringify(defaultNotifications)]);
        }
      }
      
      console.log('✅ Default working hours and settings added for all therapists');
    } else {
      console.log('ℹ️  No therapists found, skipping default seeding');
    }
    
  } catch (error) {
    console.error('❌ Error seeding therapist defaults:', error);
    throw error;
  }
};

// Helper function to run queries
const runQuery = async (sql, params = []) => {
  try {
    const [result] = await pool.execute(sql, params);
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to get single row
const getRow = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to get multiple rows
const getAll = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Get connection from pool
const getConnection = async () => {
  return await pool.getConnection();
};

// Close database connection
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  }
};

// Security setup functions
const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

const generateSessionSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create or update .env file with security configuration
const setupEnvironmentConfig = () => {
  const envPath = joinPaths(__dirname, '../../.env');
  const envExamplePath = joinPaths(__dirname, '../../.env.example');
  
  if (fileExists(envPath)) {
    console.log('⚠️  .env file already exists. Backing up to .env.backup');
    copyFile(envPath, envPath + '.backup');
  }
  
  let envContent = '';
  
  if (fileExists(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  } else {
    // Create basic .env template if no example exists
    envContent = `# TherapEase Environment Configuration
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=therapease
DB_PORT=3306

# Server Configuration
NODE_ENV=development
PORT=5000
HTTPS_PORT=5443

# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here-make-it-long-and-random
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here
SESSION_SECRET=your-session-secret-key-here

# Admin Configuration
ADMIN_EMAIL=admin@therapease.com
ADMIN_PASSWORD=SecureAdmin2024!@#$

# SSL Configuration
SSL_ENABLED=true
SSL_KEY_PATH=./server/certs/server.key
SSL_CERT_PATH=./server/certs/server.crt

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Email Configuration
EMAIL_ENABLED=false
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=noreply@therapease.com

# SMS Configuration
SMS_ENABLED=false
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_BASE_URL=https://api.nexmo.com
VONAGE_FROM_NUMBER=TherapEase

# Push Notifications
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@therapease.com

# OpenAI Configuration
OPENAI_API_KEY=

# API Base URL
API_BASE_URL=http://localhost:5000
`;
  }
  
  // Replace placeholder values with generated ones
  envContent = envContent.replace('your-super-secure-jwt-secret-key-here-make-it-long-and-random', generateJWTSecret());
  envContent = envContent.replace('your-64-character-hex-encryption-key-here', generateEncryptionKey());
  envContent = envContent.replace('your-session-secret-key-here', generateSessionSecret());
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created/updated .env file with secure configuration');
  
  // Reload environment variables
  require('dotenv').config({ path: envPath });
};

// Generate SSL certificates
const setupSSLCertificates = () => {
  const certsDir = joinPaths(__dirname, '../certs');
  
  createDirectory(certsDir);
  console.log('📁 Created certs directory');
  
  const keyPath = joinPaths(certsDir, 'server.key');
  const certPath = joinPaths(certsDir, 'server.crt');
  
  if (fileExists(keyPath) && fileExists(certPath)) {
    console.log('✅ SSL certificates already exist');
    return;
  }
  
  console.log('🔐 Generating SSL certificates...');
  
  const success = generateSSLCertificates(keyPath, certPath, {
    keySize: 4096,
    days: 365,
    subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=localhost'
  });
  
  if (!success) {
    console.log('❌ Failed to generate SSL certificates');
    if (isWindows) {
      console.log('💡 For Windows, you can:');
      console.log('   1. Install OpenSSL from https://slproweb.com/products/Win32OpenSSL.html');
      console.log('   2. Add OpenSSL to your PATH environment variable');
      console.log('   3. Or use Windows Subsystem for Linux (WSL)');
    } else {
      console.log('💡 Make sure OpenSSL is installed on your system');
    }
  } else {
    console.log('✅ SSL certificates generated successfully');
  }
};

// Setup VAPID keys for push notifications (check existing first)
const setupVAPIDKeys = () => {
  try {
    const envPath = joinPaths(__dirname, '../../.env');
    
    if (fileExists(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check if VAPID keys already exist and have values
      const publicKeyMatch = envContent.match(/^VAPID_PUBLIC_KEY=(.+)$/m);
      const privateKeyMatch = envContent.match(/^VAPID_PRIVATE_KEY=(.+)$/m);
      
      const hasPublicKey = publicKeyMatch && publicKeyMatch[1].trim() !== '';
      const hasPrivateKey = privateKeyMatch && privateKeyMatch[1].trim() !== '';
      
      if (hasPublicKey && hasPrivateKey) {
        console.log('✅ VAPID keys already configured in .env file');
        return { publicKey: 'existing', privateKey: 'existing' };
      }
    }
    
    console.log('🔑 Generating VAPID keys for push notifications...');
    
    const vapidKeys = webpush.generateVAPIDKeys();
    
    // Update .env file with VAPID keys
    if (fileExists(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update or add VAPID keys
      const vapidConfig = {
        VAPID_PUBLIC_KEY: vapidKeys.publicKey,
        VAPID_PRIVATE_KEY: vapidKeys.privateKey,
        VAPID_SUBJECT: 'mailto:admin@therapease.com'
      };
      
      Object.entries(vapidConfig).forEach(([key, value]) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        const newLine = `${key}=${value}`;
        
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, newLine);
        } else {
          envContent += `\n${newLine}`;
        }
      });
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ VAPID keys generated and added to .env file');
    }
    
    return vapidKeys;
    
  } catch (error) {
    console.error('❌ Failed to setup VAPID keys:', error.message);
    return null;
  }
};

// Create database if it doesn't exist
const createDatabase = async () => {
  let connection;
  
  try {
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: getEnvVar('DB_HOST', 'localhost'),
      user: getEnvVar('DB_USER', 'root'),
      password: getEnvVar('DB_PASSWORD', ''),
      port: parseInt(getEnvVar('DB_PORT', '3306'))
    });

    console.log('✅ Connected to MySQL server successfully');

    // Create database if it doesn't exist
    const dbName = getEnvVar('DB_NAME', 'therapease');
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified successfully`);

    // Close connection
    await connection.end();
    
  } catch (error) {
    console.error('❌ Database creation failed:', error.message);
    if (connection) {
      await connection.end();
    }
    throw error;
  }
};

// Comprehensive setup function
const performCompleteSetup = async () => {
  try {
    console.log('🚀 TherapEase Complete Setup');
    console.log('============================\n');
    
    // Display platform information
    const platformInfo = getPlatformInfo();
    console.log(`🖥️  Platform: ${platformInfo.platform} ${platformInfo.arch}`);
    console.log(`📦 Node.js: ${platformInfo.nodeVersion}`);
    console.log(`🔧 NPM: ${platformInfo.npmVersion}\n`);
    
    console.log('1. Setting up environment configuration...');
    setupEnvironmentConfig();
    
    console.log('\n2. Creating database...');
    await createDatabase();
    
    console.log('\n3. Generating SSL certificates...');
    setupSSLCertificates();
    
    console.log('\n4. Setting up VAPID keys...');
    setupVAPIDKeys();
    
    console.log('\n5. Initializing database tables and data...');
    // The initializeDatabase function will be called automatically
    
    console.log('\n🎉 Complete setup finished successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review and update .env file with your specific configuration');
    console.log('   2. For production, obtain SSL certificates from a trusted CA');
    console.log('   3. Update CORS_ORIGIN in .env with your domain');
    console.log('   4. Configure email and SMS services if needed');
    console.log('   5. Start the server: npm run dev');
    console.log('\n🔗 Useful commands:');
    console.log('   npm run dev          # Start development server');
    console.log('   npm run build        # Build for production');
    console.log('   npm run setup        # Re-run complete setup');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
};

// Initialize database when module is loaded
initializeDatabase();

module.exports = {
  pool,
  runQuery,
  getRow,
  getAll,
  getConnection,
  closeDatabase,
  performCompleteSetup,
  setupEnvironmentConfig,
  setupSSLCertificates,
  setupVAPIDKeys,
  createDatabase
};
