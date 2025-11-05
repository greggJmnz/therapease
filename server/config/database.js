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
// Use .env.production in production, .env in development
const envFile = process.env.NODE_ENV === 'production' 
  ? joinPaths(__dirname, '../.env.production')
  : joinPaths(__dirname, '../../.env');
require('dotenv').config({ path: envFile });

// Database configuration with Windows compatibility - Optimized for production
const dbConfig = {
  host: getEnvVar('DB_HOST', '127.0.0.1'),
  user: getEnvVar('DB_USER', 'root'),
  password: getEnvVar('DB_PASSWORD', ''),
  database: getEnvVar('DB_NAME', 'therapease'),
  port: parseInt(getEnvVar('DB_PORT', '3306')),
  waitForConnections: true,
  connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 10, // More connections in production
  queueLimit: 0,
  connectTimeout: 10000, // Reduced from 60000 for faster connection establishment
  // Windows-specific MySQL configuration
  charset: 'utf8mb4',
  timezone: 'Z',
  // Handle Windows path separators in connection strings
  ssl: false,
  // Performance optimizations
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Pool settings for better throughput
  maxIdle: 10,
  idleTimeout: 300000 // 5 minutes
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
    
    // Create performance indexes
    await createPerformanceIndexes();
    
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

    // Add missing columns to users table if they don't exist
    try {
      // Add each column individually to handle "already exists" errors
      const columnsToAdd = [
        { name: 'twoFactorEnabled', sql: 'ALTER TABLE users ADD COLUMN twoFactorEnabled BOOLEAN DEFAULT FALSE' },
        { name: 'twoFactorMethod', sql: "ALTER TABLE users ADD COLUMN twoFactorMethod ENUM('email', 'sms', 'push') DEFAULT 'email'" },
        { name: 'twoFactorEnabledAt', sql: 'ALTER TABLE users ADD COLUMN twoFactorEnabledAt TIMESTAMP NULL' },
        { name: 'emailVerified', sql: 'ALTER TABLE users ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE' },
        { name: 'emailVerifiedAt', sql: 'ALTER TABLE users ADD COLUMN emailVerifiedAt TIMESTAMP NULL' },
        { name: 'status', sql: "ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'" },
        { name: 'country', sql: 'ALTER TABLE users ADD COLUMN country VARCHAR(100)' },
        { name: 'profileImage', sql: 'ALTER TABLE users ADD COLUMN profileImage VARCHAR(500)' },
        { name: 'termsAccepted', sql: 'ALTER TABLE users ADD COLUMN termsAccepted BOOLEAN DEFAULT FALSE' },
        { name: 'hipaaAcknowledged', sql: 'ALTER TABLE users ADD COLUMN hipaaAcknowledged BOOLEAN DEFAULT FALSE' },
        { name: 'acceptedAt', sql: 'ALTER TABLE users ADD COLUMN acceptedAt TIMESTAMP NULL' },
        { name: 'onboardingCompleted', sql: 'ALTER TABLE users ADD COLUMN onboardingCompleted BOOLEAN DEFAULT FALSE' },
        { name: 'onboardingCompletedAt', sql: 'ALTER TABLE users ADD COLUMN onboardingCompletedAt TIMESTAMP NULL' }
      ];
      
      for (const column of columnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        // Column already exists, skip it
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
        status ENUM('active', 'inactive', 'discharged') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns to patients table if they don't exist
    try {
      const patientColumnsToAdd = [
        { name: 'status', sql: "ALTER TABLE patients ADD COLUMN status ENUM('active', 'inactive', 'discharged') DEFAULT 'active'" },
        { name: 'emergencyContact', sql: 'ALTER TABLE patients ADD COLUMN emergencyContact TEXT' },
        { name: 'insuranceInfo', sql: 'ALTER TABLE patients ADD COLUMN insuranceInfo TEXT' }
      ];
      
      for (const column of patientColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
      }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        // Column already exists, skip it
      }
    }

    // Add missing columns to notifications table if they don't exist
    try {
      await pool.execute(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium'
      `);
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        // Column already exists, skip it
      }
    }

    // AI Assessments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_assessments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        interviewQuestions JSON,
        observations TEXT,
        insights JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_patient_therapist (patientId, therapistId),
        INDEX idx_patient (patientId),
        INDEX idx_therapist (therapistId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // AI PDF Records table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ai_pdf_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        type VARCHAR(100) DEFAULT 'AI Insights',
        insights JSON,
        assessmentData JSON,
        model VARCHAR(50) DEFAULT 'gpt-4.1',
        score INT DEFAULT 0,
        \`usage\` JSON,
        generatedAt TIMESTAMP NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_patient (patientId),
        INDEX idx_therapist (therapistId),
        INDEX idx_generated (generatedAt)
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
        status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns to therapists table if they don't exist
    try {
      const therapistColumnsToAdd = [
        { name: 'maxPatients', sql: 'ALTER TABLE therapists ADD COLUMN maxPatients INT DEFAULT 20' },
        { name: 'isAcceptingPatients', sql: 'ALTER TABLE therapists ADD COLUMN isAcceptingPatients BOOLEAN DEFAULT TRUE' },
        { name: 'status', sql: "ALTER TABLE therapists ADD COLUMN status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'" }
      ];
      
      for (const column of therapistColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        // Column already exists, skip it
      }
    }

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
      }
    } catch (error) {
      console.error('Error checking/adding columns:', error.message);
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
      // Check if constraint already exists
      const [constraints] = await pool.execute(`
        SELECT CONSTRAINT_NAME 
        FROM information_schema.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'appointments' 
        AND CONSTRAINT_NAME = 'fk_appointments_approved_by'
      `);
      
      if (constraints.length === 0) {
        await pool.execute(`
          ALTER TABLE appointments 
          ADD CONSTRAINT fk_appointments_approved_by 
          FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
        `);
      }
    } catch (error) {
      // Ignore duplicate constraint errors
      if (error.code === 'ER_DUP_KEYNAME' || error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate')) {
        // Constraint already exists, ignore
      } else {
        console.error('Error adding foreign key for approvedBy:', error.message);
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
        // Add foreign key constraint (only if it doesn't exist)
        try {
          // Check if constraint already exists
          const [fkConstraints] = await pool.execute(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.TABLE_CONSTRAINTS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'appointments' 
            AND CONSTRAINT_NAME = 'fk_appointments_created_by'
          `);
          
          if (fkConstraints.length === 0) {
            await pool.execute(`
              ALTER TABLE appointments 
              ADD CONSTRAINT fk_appointments_created_by 
              FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
            `);
          }
        } catch (fkError) {
          // Ignore duplicate constraint errors
          if (fkError.code === 'ER_DUP_KEYNAME' || fkError.code === 'ER_DUP_FIELDNAME' || fkError.message.includes('Duplicate')) {
            // Constraint already exists, ignore
          } else {
            console.error('Error adding createdBy foreign key:', fkError.message);
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
        } catch (updateError) {
          console.error('Error populating createdBy field:', updateError.message);
        }
      } else {
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
        } catch (updateError) {
          console.error('Error updating NULL createdBy values:', updateError.message);
        }
      }
    } catch (error) {
      console.error('Error checking/adding createdBy column:', error.message);
    }

    // Progress Tracking table (for outcome measurement and goal tracking)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        assessmentId INT NULL,
        area VARCHAR(255) NOT NULL,
        baselineScore DECIMAL(5,2) NULL,
        currentScore DECIMAL(5,2) NULL,
        targetScore DECIMAL(5,2) NULL,
        progressNotes TEXT NULL,
        measurementDate DATE NOT NULL,
        nextReviewDate DATE NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (assessmentId) REFERENCES assessments(id) ON DELETE SET NULL,
        INDEX idx_patient (patientId),
        INDEX idx_area (area),
        INDEX idx_measurement_date (measurementDate),
        INDEX idx_next_review (nextReviewDate)
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
        priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
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

    // Treatment Plans table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS treatment_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
        startDate DATE,
        endDate DATE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_patient (patientId),
        INDEX idx_therapist (therapistId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Main Objectives table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS main_objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        treatmentPlanId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        targetDate DATE,
        progress INT DEFAULT 0,
        category VARCHAR(100),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (treatmentPlanId) REFERENCES treatment_plans(id) ON DELETE CASCADE,
        INDEX idx_treatment_plan (treatmentPlanId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Specific Objectives table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS specific_objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mainObjectiveId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
        targetDate DATE,
        completedDate DATE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mainObjectiveId) REFERENCES main_objectives(id) ON DELETE CASCADE,
        INDEX idx_main_objective (mainObjectiveId),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Progress Reports table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS progress_reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        reportDate DATE NOT NULL,
        reportType ENUM('weekly', 'monthly', 'quarterly', 'annual', 'custom') DEFAULT 'monthly',
        summary TEXT,
        achievements TEXT,
        challenges TEXT,
        nextSteps TEXT,
        recommendations TEXT,
        status ENUM('draft', 'finalized', 'archived') DEFAULT 'draft',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_patient (patientId),
        INDEX idx_therapist (therapistId),
        INDEX idx_report_date (reportDate),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Compliance Audit Log table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS compliance_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        action VARCHAR(255) NOT NULL,
        tableName VARCHAR(100),
        recordId INT,
        oldValues JSON,
        newValues JSON,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (userId),
        INDEX idx_action (action),
        INDEX idx_table (tableName),
        INDEX idx_timestamp (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add missing columns to main_objectives table if they don't exist
    try {
      const objectivesColumnsToAdd = [
        { name: 'progress', sql: 'ALTER TABLE main_objectives ADD COLUMN progress INT DEFAULT 0' },
        { name: 'category', sql: 'ALTER TABLE main_objectives ADD COLUMN category VARCHAR(100)' }
      ];
      
      for (const column of objectivesColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: Main objectives columns may already exist');
      }
    }

    // Add missing columns to progress_reports table if they don't exist
    try {
      const progressReportsColumnsToAdd = [
        { name: 'title', sql: 'ALTER TABLE progress_reports ADD COLUMN title VARCHAR(255)' },
        { name: 'description', sql: 'ALTER TABLE progress_reports ADD COLUMN description TEXT' },
        { name: 'originalFileName', sql: 'ALTER TABLE progress_reports ADD COLUMN originalFileName VARCHAR(255)' },
        { name: 'fileSize', sql: 'ALTER TABLE progress_reports ADD COLUMN fileSize INT' },
        { name: 'mimeType', sql: 'ALTER TABLE progress_reports ADD COLUMN mimeType VARCHAR(100)' },
        { name: 'uploadedAt', sql: 'ALTER TABLE progress_reports ADD COLUMN uploadedAt TIMESTAMP NULL' }
      ];
      
      for (const column of progressReportsColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: Progress reports columns may already exist');
      }
    }

    // Add missing columns to treatment_plans table if they don't exist
    try {
      const treatmentPlansColumnsToAdd = [
        { name: 'overallProgress', sql: 'ALTER TABLE treatment_plans ADD COLUMN overallProgress INT DEFAULT 0' }
      ];
      
      for (const column of treatmentPlansColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: Treatment plans columns may already exist');
      }
    }

    // Add missing columns to specific_objectives table if they don't exist
    try {
      const specificObjectivesColumnsToAdd = [
        { name: 'isCompleted', sql: 'ALTER TABLE specific_objectives ADD COLUMN isCompleted BOOLEAN DEFAULT FALSE' },
        { name: 'remarks', sql: 'ALTER TABLE specific_objectives ADD COLUMN remarks TEXT' },
        { name: 'patientComments', sql: 'ALTER TABLE specific_objectives ADD COLUMN patientComments TEXT' }
      ];
      
      for (const column of specificObjectivesColumnsToAdd) {
        try {
          await pool.execute(column.sql);
        } catch (err) {
          if (!err.message.includes('Duplicate column name')) {
            throw err;
          }
          // Column already exists, skip it
        }
      }
      
    } catch (error) {
      // Ignore error if columns already exist
      if (!error.message.includes('Duplicate column name')) {
        console.log('Note: Specific objectives columns may already exist');
      }
    }

    // Add missing columns to notifications table if they don't exist
    try {
      // Check if priority column exists
      const [priorityColumns] = await pool.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'notifications' 
        AND COLUMN_NAME = 'priority'
      `);
      
      if (priorityColumns.length === 0) {
        console.log('📊 Adding priority column to notifications table...');
        await pool.execute(`ALTER TABLE notifications ADD COLUMN priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal'`);
        console.log('✅ Added priority column to notifications table');
      } else {
        console.log('ℹ️  Priority column already exists in notifications table');
      }
    } catch (error) {
      // Log error but don't fail - query will handle missing column gracefully
      if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('Duplicate column name')) {
        console.log('ℹ️  Priority column already exists in notifications table');
      } else {
        console.error('⚠️  Error adding priority column to notifications table:', error.message);
        console.error('   The application will handle missing priority column gracefully');
      }
    }

    console.log('Database tables created successfully');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Create performance indexes for common query patterns
const createPerformanceIndexes = async () => {
  try {
    console.log('📊 Creating performance indexes...');
    
    const indexes = [
      // Login performance - email already has UNIQUE index, but add role index
      { name: 'idx_users_role', sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)' },
      { name: 'idx_users_status', sql: 'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)' },
      
      // Dashboard queries - therapistId indexes
      { name: 'idx_appointments_therapist', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapistId)' },
      { name: 'idx_appointments_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patientId)' },
      { name: 'idx_appointments_date_status', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_date_status ON appointments(appointmentDate, status)' },
      { name: 'idx_appointments_therapist_date', sql: 'CREATE INDEX IF NOT EXISTS idx_appointments_therapist_date ON appointments(therapistId, appointmentDate, status)' },
      
      // Assessments indexes
      { name: 'idx_assessments_therapist', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_therapist ON assessments(therapistId)' },
      { name: 'idx_assessments_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_patient ON assessments(patientId)' },
      { name: 'idx_assessments_date', sql: 'CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(assessmentDate)' },
      
      // Daily notes indexes
      { name: 'idx_daily_notes_therapist', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_notes_therapist ON daily_notes(therapistId)' },
      { name: 'idx_daily_notes_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_notes_patient ON daily_notes(patientId)' },
      { name: 'idx_daily_notes_date', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(sessionDate)' },
      { name: 'idx_daily_notes_therapist_date', sql: 'CREATE INDEX IF NOT EXISTS idx_daily_notes_therapist_date ON daily_notes(therapistId, sessionDate)' },
      
      // Patient therapist assignments
      { name: 'idx_pta_therapist', sql: 'CREATE INDEX IF NOT EXISTS idx_pta_therapist ON patient_therapist_assignments(therapistId, status)' },
      { name: 'idx_pta_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_pta_patient ON patient_therapist_assignments(patientId, status)' },
      
      // Treatment plans
      { name: 'idx_treatment_plans_patient', sql: 'CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans(patientId, status)' },
      
      // Main objectives
      { name: 'idx_main_objectives_treatment_plan', sql: 'CREATE INDEX IF NOT EXISTS idx_main_objectives_treatment_plan ON main_objectives(treatmentPlanId)' },
      
      // Notifications
      { name: 'idx_notifications_user', sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId, isRead)' },
      { name: 'idx_notifications_created', sql: 'CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt)' },
      
      // Patients
      { name: 'idx_patients_therapist', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_therapist ON patients(therapistId)' },
      { name: 'idx_patients_user', sql: 'CREATE INDEX IF NOT EXISTS idx_patients_user ON patients(userId)' },
    ];
    
    for (const index of indexes) {
      try {
        // MySQL doesn't support IF NOT EXISTS for CREATE INDEX, so we need to check first
        const tableName = index.sql.match(/ON\s+(\w+)/)?.[1] || '';
        const indexName = index.name;
        const [existing] = await pool.execute(`
          SELECT COUNT(*) as count 
          FROM information_schema.statistics 
          WHERE table_schema = DATABASE() 
          AND table_name = ? 
          AND index_name = ?
        `, [tableName, indexName]);
        
        if (existing[0]?.count === 0) {
          // Remove IF NOT EXISTS since MySQL doesn't support it
          const sql = index.sql.replace(' IF NOT EXISTS', '');
          await pool.execute(sql);
          console.log(`✅ Created index: ${index.name}`);
        } else {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        }
      } catch (error) {
        // Ignore duplicate index errors
        if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          console.log(`ℹ️  Index already exists: ${index.name}`);
        } else {
          console.error(`❌ Error creating index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ Performance indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating performance indexes:', error);
    // Don't throw - indexes are optional optimizations
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
DB_HOST=127.0.0.1
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
CORS_ORIGIN=https://therapease.site

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
API_BASE_URL=https://api.therapease.site
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
    subject: '/C=US/ST=State/L=City/O=TherapEase/OU=IT/CN=therapease.site'
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
      host: getEnvVar('DB_HOST', '127.0.0.1'),
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
