const { getConnection } = require('../config/database');

async function createTreatmentPlanTables() {
  const connection = await getConnection();
  
  try {
    console.log('🏗️ Creating treatment plan tables...');

    // Create treatment_plans table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS treatment_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patientId INT NOT NULL,
        therapistId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        status ENUM('active', 'completed', 'paused', 'cancelled') DEFAULT 'active',
        overallProgress DECIMAL(5,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create main_objectives table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS main_objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        treatmentPlanId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        status ENUM('active', 'completed', 'paused') DEFAULT 'active',
        progress DECIMAL(5,2) DEFAULT 0.00,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (treatmentPlanId) REFERENCES treatment_plans(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create specific_objectives table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS specific_objectives (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mainObjectiveId INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        targetDate DATE,
        isCompleted BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        patientComments TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (mainObjectiveId) REFERENCES main_objectives(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ Treatment plan tables created successfully!');
    
    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('treatment_plans', 'main_objectives', 'specific_objectives')
    `);
    
    console.log('📋 Created tables:', tables.map(t => t.TABLE_NAME));
    
  } catch (error) {
    console.error('❌ Error creating treatment plan tables:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the script
if (require.main === module) {
  createTreatmentPlanTables()
    .then(() => {
      console.log('🎉 Treatment plan tables setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createTreatmentPlanTables };
