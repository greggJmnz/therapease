const { getConnection } = require('../config/database');

async function checkDatabaseStructure() {
  const connection = await getConnection();
  
  try {
    console.log('Checking database structure...');
    
    // Check users table structure
    const [usersColumns] = await connection.execute('DESCRIBE users');
    console.log('\nUsers table columns:');
    usersColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // Check if compliance_audit_log table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'compliance_audit_log'");
    if (tables.length > 0) {
      console.log('\nCompliance audit log table exists');
      const [auditColumns] = await connection.execute('DESCRIBE compliance_audit_log');
      console.log('\nCompliance audit log columns:');
      auditColumns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    } else {
      console.log('\nCompliance audit log table does not exist');
    }
    
  } catch (error) {
    console.error('Error checking database structure:', error);
  } finally {
    connection.release();
  }
}

checkDatabaseStructure()
  .then(() => {
    console.log('\nDatabase structure check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database structure check failed:', error);
    process.exit(1);
  });
