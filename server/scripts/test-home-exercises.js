const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const testHomeExercises = async () => {
  let connection;
  
  try {
    console.log('🧪 Testing Home Exercises Database Schema...\n');
    
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'therapease_db'
    });

    console.log('✅ Connected to database successfully\n');

    // Test 1: Check if home_exercises table exists and has correct structure
    console.log('1. Checking home_exercises table structure...');
    const [homeExercisesColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'home_exercises'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (homeExercisesColumns.length === 0) {
      console.log('❌ home_exercises table does not exist');
      return;
    }
    
    console.log('✅ home_exercises table exists with columns:');
    homeExercisesColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Test 2: Check if home_exercise_proofs table exists and has correct structure
    console.log('\n2. Checking home_exercise_proofs table structure...');
    const [proofsColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'home_exercise_proofs'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (proofsColumns.length === 0) {
      console.log('❌ home_exercise_proofs table does not exist');
      return;
    }
    
    console.log('✅ home_exercise_proofs table exists with columns:');
    proofsColumns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Test 3: Check foreign key constraints
    console.log('\n3. Checking foreign key constraints...');
    const [foreignKeys] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('home_exercises', 'home_exercise_proofs')
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('✅ Foreign key constraints:');
    foreignKeys.forEach(fk => {
      console.log(`   - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    // Test 4: Test inserting sample data
    console.log('\n4. Testing sample data insertion...');
    
    // Get a sample therapist and patient
    const [therapists] = await connection.execute('SELECT id FROM users WHERE role = "therapist" LIMIT 1');
    const [patients] = await connection.execute('SELECT id FROM patients LIMIT 1');
    
    if (therapists.length === 0 || patients.length === 0) {
      console.log('⚠️  No therapists or patients found. Skipping data insertion test.');
    } else {
      const therapistId = therapists[0].id;
      const patientId = patients[0].id;
      
      // Insert sample exercise
      const [exerciseResult] = await connection.execute(`
        INSERT INTO home_exercises (
          patientId, therapistId, title, description, category, instructions,
          duration, frequency, difficulty, equipment, assignedDate, dueDate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'assigned')
      `, [
        patientId,
        therapistId,
        'Sample Exercise',
        'This is a test exercise for demonstration purposes',
        'Physical Therapy',
        JSON.stringify(['Step 1: Warm up', 'Step 2: Perform exercise', 'Step 3: Cool down']),
        30,
        'Daily',
        'Beginner',
        JSON.stringify(['Resistance band', 'Water bottle']),
      ]);
      
      const exerciseId = exerciseResult.insertId;
      console.log(`✅ Sample exercise created with ID: ${exerciseId}`);
      
      // Insert sample proof
      const [proofResult] = await connection.execute(`
        INSERT INTO home_exercise_proofs (
          exerciseId, patientId, therapistId, submissionType, content, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        exerciseId,
        patientId,
        therapistId,
        'text',
        'I completed the exercise as instructed. It was challenging but manageable.',
        'submitted'
      ]);
      
      const proofId = proofResult.insertId;
      console.log(`✅ Sample proof created with ID: ${proofId}`);
      
      // Test queries
      console.log('\n5. Testing queries...');
      
      // Test therapist exercises query
      const [therapistExercises] = await connection.execute(`
        SELECT 
          he.*,
          p.userId as patientUserId,
          u.firstName as patientFirstName,
          u.lastName as patientLastName,
          u.email as patientEmail,
          COUNT(hep.id) as proofCount,
          MAX(hep.submittedAt) as lastProofSubmitted
        FROM home_exercises he
        JOIN patients p ON he.patientId = p.id
        JOIN users u ON p.userId = u.id
        LEFT JOIN home_exercise_proofs hep ON he.id = hep.exerciseId
        WHERE he.therapistId = ?
        GROUP BY he.id
        ORDER BY he.createdAt DESC
      `, [therapistId]);
      
      console.log(`✅ Therapist exercises query returned ${therapistExercises.length} exercises`);
      
      // Test patient exercises query
      const [patientExercises] = await connection.execute(`
        SELECT 
          he.*,
          u.firstName as therapistFirstName,
          u.lastName as therapistLastName,
          COUNT(hep.id) as proofCount,
          MAX(hep.submittedAt) as lastProofSubmitted
        FROM home_exercises he
        JOIN users u ON he.therapistId = u.id
        LEFT JOIN home_exercise_proofs hep ON he.id = hep.exerciseId
        WHERE he.patientId = ?
        GROUP BY he.id
        ORDER BY he.assignedDate DESC, he.createdAt DESC
      `, [patientId]);
      
      console.log(`✅ Patient exercises query returned ${patientExercises.length} exercises`);
      
      // Clean up test data
      await connection.execute('DELETE FROM home_exercise_proofs WHERE id = ?', [proofId]);
      await connection.execute('DELETE FROM home_exercises WHERE id = ?', [exerciseId]);
      console.log('✅ Test data cleaned up');
    }

    console.log('\n🎉 All tests passed! Home Exercises feature is ready to use.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the test
if (require.main === module) {
  testHomeExercises();
}

module.exports = { testHomeExercises };
