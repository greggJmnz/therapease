#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' });

const initDatabase = async () => {
  let connection;
  
  try {
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to MySQL server successfully');

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'therapease_dev';
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Database '${dbName}' created/verified successfully`);

    // Close connection and reconnect to the specific database
    await connection.end();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: dbName
    });
    
    console.log(`✅ Connected to database '${dbName}'`);

    // Create tables
    await createTables(connection);
    
    console.log('🎉 Database initialization completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. The system will automatically seed initial data');
    console.log('3. Access the application at http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure MySQL is running');
    console.log('2. Check your database credentials in .env file');
    console.log('3. Ensure MySQL user has CREATE privileges');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const createTables = async (connection) => {
  console.log('📊 Creating database tables...');
  
  // Users table
  await connection.execute(`
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
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Patients table
  await connection.execute(`
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
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS therapists (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT UNIQUE,
      licenseNumber VARCHAR(100),
      specialization TEXT,
      yearsOfExperience INT,
      education TEXT,
      certifications TEXT,
      availability TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Assessments table
  await connection.execute(`
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
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS daily_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patientId INT NOT NULL,
      therapistId INT NOT NULL,
      sessionDate DATE NOT NULL,
      sessionDuration INT,
      activities TEXT,
      observations TEXT,
      progress TEXT,
      challenges TEXT,
      nextSteps TEXT,
      mood VARCHAR(50),
      engagement VARCHAR(50),
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Appointments table
  await connection.execute(`
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
      reason TEXT,
      notes TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Progress Tracking table
  await connection.execute(`
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

  // Home Exercises table
  await connection.execute(`
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
  await connection.execute(`
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
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      type VARCHAR(50) NOT NULL,
      isRead BOOLEAN DEFAULT FALSE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Password Reset Tokens table
  await connection.execute(`
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
  await connection.execute(`
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

  // Therapist settings table
  await connection.execute(`
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
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS patient_settings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      notifications JSON,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // AI Assessments table
  await connection.execute(`
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
  await connection.execute(`
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

  // Sessions table
  await connection.execute(`
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

  // Push Subscriptions table
  await connection.execute(`
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

  // Two-Factor Authentication codes table
  await connection.execute(`
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
  await connection.execute(`
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
  await connection.execute(`
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

  // Add missing columns to users table
  try {
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS twoFactorEnabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS twoFactorMethod ENUM('email', 'sms', 'push') DEFAULT 'email',
      ADD COLUMN IF NOT EXISTS twoFactorEnabledAt TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS emailVerified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS emailVerifiedAt TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS profileImage VARCHAR(500)
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: User columns may already exist');
    }
  }

  // Add missing columns to daily_notes table
  try {
    await connection.execute(`
      ALTER TABLE daily_notes 
      ADD COLUMN IF NOT EXISTS content TEXT,
      ADD COLUMN IF NOT EXISTS goals TEXT,
      ADD COLUMN IF NOT EXISTS comments TEXT
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: Daily notes columns may already exist');
    }
  }

  // Add missing columns to patients table
  try {
    await connection.execute(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'discharged') DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS emergencyContact TEXT,
      ADD COLUMN IF NOT EXISTS insuranceInfo TEXT
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: Patient columns may already exist');
    }
  }

  // Add missing columns to appointments table
  try {
    await connection.execute(`
      ALTER TABLE appointments 
      ADD COLUMN IF NOT EXISTS approvalStatus ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS approvedBy INT NULL,
      ADD COLUMN IF NOT EXISTS approvedAt TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS createdBy INT NULL
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: Appointment columns may already exist');
    }
  }

  // Add foreign key constraints for appointments table
  try {
    await connection.execute(`
      ALTER TABLE appointments 
      ADD CONSTRAINT IF NOT EXISTS fk_appointments_approved_by 
      FOREIGN KEY (approvedBy) REFERENCES users(id) ON DELETE SET NULL
    `);
  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('Foreign key for approvedBy already exists');
    } else {
      console.log('Note: Foreign key for approvedBy may already exist');
    }
  }

  try {
    await connection.execute(`
      ALTER TABLE appointments 
      ADD CONSTRAINT IF NOT EXISTS fk_appointments_created_by 
      FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
    `);
  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('Foreign key for createdBy already exists');
    } else {
      console.log('Note: Foreign key for createdBy may already exist');
    }
  }

  // Add missing columns to notifications table
  try {
    await connection.execute(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS relatedId INT,
      ADD COLUMN IF NOT EXISTS smsMessageId VARCHAR(255),
      ADD COLUMN IF NOT EXISTS smsStatus ENUM('pending', 'sent', 'delivered', 'failed', 'error') DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS smsSentAt TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: Notification columns may already exist');
    }
  }

  // Add missing columns to therapists table
  try {
    await connection.execute(`
      ALTER TABLE therapists 
      ADD COLUMN IF NOT EXISTS maxPatients INT DEFAULT 20,
      ADD COLUMN IF NOT EXISTS isAcceptingPatients BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
    `);
  } catch (error) {
    // Ignore error if columns already exist
    if (!error.message.includes('Duplicate column name')) {
      console.log('Note: Therapist columns may already exist');
    }
  }

  // Treatment Plans table
  await connection.execute(`
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
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS main_objectives (
      id INT AUTO_INCREMENT PRIMARY KEY,
      treatmentPlanId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
      status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
      targetDate DATE,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (treatmentPlanId) REFERENCES treatment_plans(id) ON DELETE CASCADE,
      INDEX idx_treatment_plan (treatmentPlanId),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Specific Objectives table
  await connection.execute(`
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
  await connection.execute(`
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
  await connection.execute(`
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

  console.log('✅ All tables created successfully');
};

// Run the initialization
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
