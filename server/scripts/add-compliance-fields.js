const { getConnection } = require('../config/database');

async function addComplianceFields() {
  const connection = await getConnection();
  
  try {
    console.log('Adding compliance fields to users table...');
    
    // Add compliance fields to users table
    await connection.execute(`
      ALTER TABLE users 
      ADD COLUMN termsAccepted BOOLEAN DEFAULT FALSE,
      ADD COLUMN hipaaAcknowledged BOOLEAN DEFAULT FALSE,
      ADD COLUMN acceptedAt TIMESTAMP NULL
    `);
    
    console.log('✅ Compliance fields added successfully');
    
    // Update existing users to have compliance fields set to true
    // (assuming they were created before compliance requirements)
    await connection.execute(`
      UPDATE users 
      SET termsAccepted = TRUE, 
          hipaaAcknowledged = TRUE, 
          acceptedAt = NOW() 
      WHERE termsAccepted IS NULL OR hipaaAcknowledged IS NULL
    `);
    
    console.log('✅ Existing users updated with compliance acknowledgment');
    
    // Add audit log table for compliance tracking
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS compliance_audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        action ENUM('terms_accepted', 'hipaa_acknowledged', 'terms_updated', 'hipaa_updated') NOT NULL,
        previousValue BOOLEAN,
        newValue BOOLEAN,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Compliance audit log table created');
    
    // Add indexes for performance
    try {
      await connection.execute(`CREATE INDEX idx_compliance_audit_user ON compliance_audit_log(userId, timestamp)`);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
    
    try {
      await connection.execute(`CREATE INDEX idx_compliance_audit_action ON compliance_audit_log(action, timestamp)`);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        throw error;
      }
    }
    
    console.log('✅ Compliance audit indexes created');
    
    console.log('🎉 All compliance fields and audit logging setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding compliance fields:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  addComplianceFields()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addComplianceFields };
