const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function redistributePatients() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'therapease',
      port: process.env.DB_PORT || 3306
    });

    console.log('Connected to MySQL database');
    console.log('Redistributing patients...');

    // Move Ava Anderson (User ID: 75) to Juan Cruz (ID: 63)
    await connection.execute('UPDATE patients SET therapistId = ? WHERE userId = ?', [63, 75]);
    console.log('✅ Moved Ava Anderson to Juan Cruz');

    // Move Olivia Gonzalez (User ID: 73) to Ana Reyes (ID: 64)
    await connection.execute('UPDATE patients SET therapistId = ? WHERE userId = ?', [64, 73]);
    console.log('✅ Moved Olivia Gonzalez to Ana Reyes');

    // Verify the new distribution
    const [patients] = await connection.execute(`
      SELECT p.id, p.userId, p.therapistId, u.firstName, u.lastName 
      FROM patients p 
      JOIN users u ON p.userId = u.id 
      ORDER BY p.therapistId, u.firstName
    `);

    console.log('\nNew patient distribution:');
    const therapistGroups = {};
    patients.forEach(p => {
      if (!therapistGroups[p.therapistId]) therapistGroups[p.therapistId] = [];
      therapistGroups[p.therapistId].push(p);
    });

    Object.keys(therapistGroups).forEach(therapistId => {
      const therapistPatients = therapistGroups[therapistId];
      const therapistName = therapistId === '62' ? 'Dr. Ong' : 
                           therapistId === '63' ? 'Juan Cruz' : 
                           therapistId === '64' ? 'Ana Reyes' : 
                           therapistId === '65' ? 'Miguel Torres' : 
                           therapistId === '66' ? 'Carmen Lopez' : 'Unknown';
      console.log(`\n${therapistName} (ID: ${therapistId}) - ${therapistPatients.length} patients:`);
      therapistPatients.forEach(p => console.log(`  - ${p.firstName} ${p.lastName}`));
    });

  } catch (error) {
    console.error('Error redistributing patients:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

redistributePatients();
