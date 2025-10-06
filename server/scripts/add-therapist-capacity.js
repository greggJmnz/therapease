const { getConnection } = require('../config/database');

const addTherapistCapacity = async () => {
  let connection;
  
  try {
    console.log('🔄 Adding therapist capacity and availability columns...');
    
    connection = await getConnection();
    
    // Check if maxPatients column exists
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'therapists' 
      AND COLUMN_NAME = 'maxPatients'
    `);
    
    if (columns.length === 0) {
      await connection.execute(`
        ALTER TABLE therapists 
        ADD COLUMN maxPatients INT DEFAULT 20
      `);
      console.log('✅ Added maxPatients column');
    } else {
      console.log('ℹ️  maxPatients column already exists');
    }
    
    // Check if isAcceptingPatients column exists
    const [acceptingColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'therapists' 
      AND COLUMN_NAME = 'isAcceptingPatients'
    `);
    
    if (acceptingColumns.length === 0) {
      await connection.execute(`
        ALTER TABLE therapists 
        ADD COLUMN isAcceptingPatients BOOLEAN DEFAULT TRUE
      `);
      console.log('✅ Added isAcceptingPatients column');
    } else {
      console.log('ℹ️  isAcceptingPatients column already exists');
    }
    
    console.log('✅ Successfully added therapist capacity columns');
    
    // Update existing therapists with default values
    await connection.execute(`
      UPDATE therapists 
      SET maxPatients = 20, isAcceptingPatients = TRUE 
      WHERE maxPatients IS NULL OR isAcceptingPatients IS NULL
    `);
    
    console.log('✅ Updated existing therapists with default capacity values');
    
    // Show current therapist capacity status
    const [therapists] = await connection.execute(`
      SELECT 
        u.firstName,
        u.lastName,
        t.maxPatients,
        t.isAcceptingPatients,
        (SELECT COUNT(*) FROM patients p WHERE p.therapistId = t.userId) as currentPatientCount
      FROM therapists t
      JOIN users u ON t.userId = u.id
      ORDER BY u.firstName
    `);
    
    console.log('\n📊 Current therapist capacity status:');
    console.log('=====================================');
    therapists.forEach(therapist => {
      const availableSlots = therapist.maxPatients - therapist.currentPatientCount;
      const status = therapist.isAcceptingPatients ? 'Accepting' : 'Not Accepting';
      console.log(`${therapist.firstName} ${therapist.lastName}: ${therapist.currentPatientCount}/${therapist.maxPatients} patients (${availableSlots} available) - ${status}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding therapist capacity:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Run the migration
addTherapistCapacity()
  .then(() => {
    console.log('\n🎉 Therapist capacity migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
