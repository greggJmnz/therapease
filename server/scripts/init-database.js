#!/usr/bin/env node

const mysql = require('mysql2/promise');
require('dotenv').config();

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
      status ENUM('scheduled', 'confirmed', 'completed', 'cancelled') NOT NULL,
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

  console.log('✅ All tables created successfully');
};

// Run the initialization
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
