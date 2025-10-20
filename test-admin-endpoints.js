const { getAll } = require('./server/config/database');

async function testTherapists() {
  try {
    console.log('Testing therapists query...');
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.status,
        t.licenseNumber,
        t.specialization
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist'
      ORDER BY u.createdAt DESC
    `;
    
    const therapists = await getAll(sql);
    console.log('Therapists query successful:', therapists.length, 'results');
    return therapists;
  } catch (error) {
    console.error('Therapists query error:', error);
    throw error;
  }
}

async function testPatients() {
  try {
    console.log('Testing patients query...');
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.status,
        p.id as patientId,
        p.diagnosis
      FROM users u
      LEFT JOIN patients p ON u.id = p.userId
      WHERE u.role = 'patient'
      ORDER BY u.createdAt DESC
    `;
    
    const patients = await getAll(sql);
    console.log('Patients query successful:', patients.length, 'results');
    return patients;
  } catch (error) {
    console.error('Patients query error:', error);
    throw error;
  }
}

async function runTests() {
  try {
    await testTherapists();
    await testPatients();
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTests();
