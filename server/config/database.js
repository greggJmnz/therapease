const mysql = require('mysql2/promise');
const path = require('path');
const { hashPassword } = require('../utils/password');
const { joinPaths, getEnvVar } = require('../utils/windowsCompatibility');

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
  acquireTimeoutMillis: 60000,
  timeout: 60000,
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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
        status ENUM('scheduled', 'confirmed', 'completed', 'cancelled') NOT NULL,
        notes TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

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

    console.log('Database tables created successfully');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

// Seed initial data
const seedInitialData = async () => {
  try {
    // Check if data already exists
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users');
    
    if (rows[0].count === 0) {
      console.log('Seeding initial data...');
      
      // Hash passwords for initial users
      const adminPassword = await hashPassword('Admin123!@#');
      const therapistPassword = await hashPassword('Therapist123!@#');
      const patientPassword = await hashPassword('Patient123!@#');

      // Insert admin user
      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['admin@therapease.com', adminPassword, 'admin', 'Admin', 'User', '555-0001', 'other']);

      // Insert therapist user
      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['therapist@therapease.com', therapistPassword, 'therapist', 'Sarah', 'Wilson', '555-0002', 'female']);

      // Insert patient users
      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, dateOfBirth)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['emma@example.com', patientPassword, 'patient', 'Emma', 'Smith', '555-0003', 'female', '2015-03-15']);

      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, dateOfBirth)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['james@example.com', patientPassword, 'patient', 'James', 'Johnson', '555-0004', 'male', '2014-07-22']);

      await pool.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, dateOfBirth)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['sophia@example.com', patientPassword, 'patient', 'Sophia', 'Brown', '555-0005', 'female', '2016-11-08']);

      // Get the inserted therapist ID
      const [therapistRows] = await pool.execute('SELECT id FROM users WHERE email = ?', ['therapist@therapease.com']);
      
      if (therapistRows.length > 0) {
        const therapistId = therapistRows[0].id;
        
        // Insert therapist record
        await pool.execute(`
          INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education)
          VALUES (?, ?, ?, ?, ?)
        `, [therapistId, 'OT12345', 'Pediatric Occupational Therapy', 8, 'Masters in Occupational Therapy']);

        // Get patient IDs
        const [patientRows] = await pool.execute('SELECT id FROM users WHERE role = ?', ['patient']);
        
        for (const patient of patientRows) {
          // Insert patient records
          await pool.execute(`
            INSERT INTO patients (userId, diagnosis, medicalHistory, therapistId)
            VALUES (?, ?, ?, ?)
          `, [patient.id, 'Developmental Delay', 'No significant medical history', therapistId]);
        }
      }

      console.log('Initial data seeded successfully');
    } else {
      console.log('Database already contains data, skipping seed');
    }
    
  } catch (error) {
    console.error('Error seeding data:', error);
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

// Initialize database when module is loaded
initializeDatabase();

module.exports = {
  pool,
  runQuery,
  getRow,
  getAll,
  getConnection,
  closeDatabase
};
