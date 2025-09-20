require('dotenv').config({ path: '../.env' });
const mysql = require('mysql2/promise');

const seedSampleData = async () => {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'grntjmnz2522!',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'therapease_dev'
    });
    console.log('Connected to MySQL database successfully');

    console.log('\n1️⃣ Checking existing users and patients...');
    
    // Get existing users and patients
    const [users] = await connection.execute('SELECT id, role FROM users');
    const [patients] = await connection.execute('SELECT id, userId FROM patients');
    const [therapists] = await connection.execute('SELECT id, userId FROM therapists');

    if (users.length === 0 || patients.length === 0) {
      console.log('No users or patients found. Please run the main seeding script first.');
      return;
    }

    console.log(`📊 Found ${users.length} users, ${patients.length} patients, ${therapists.length} therapists`);

    // Get a patient and therapist for sample data
    const patient = patients[0];
    const therapist = therapists[0];

    console.log('\n2️⃣ Seeding sample assessments...');
    
    // Seed sample assessments
    const assessments = [
      {
        patientId: patient.id,
        therapistId: therapist.userId,
        title: 'Fine Motor Skills Assessment',
        type: 'Comprehensive',
        category: 'Fine Motor',
        assessmentDate: '2024-01-15',
        status: 'completed',
        score: 85,
        maxScore: 100,
        summary: 'Good progress in hand-eye coordination and pencil grip. Areas for improvement in complex fine motor tasks.',
        recommendations: JSON.stringify([
          'Continue bead threading exercises',
          'Practice writing with different sized pencils',
          'Work on buttoning and zipping activities'
        ]),
        areas: JSON.stringify([
          { name: 'Hand-Eye Coordination', score: 90, maxScore: 100 },
          { name: 'Pencil Grip', score: 85, maxScore: 100 },
          { name: 'Finger Dexterity', score: 80, maxScore: 100 },
          { name: 'Complex Tasks', score: 75, maxScore: 100 }
        ]),
        aiInsights: 'Patient shows strong improvement in basic fine motor skills. Focus on complex tasks and bilateral coordination.'
      },
      {
        patientId: patient.id,
        therapistId: therapist.userId,
        title: 'Balance & Coordination Evaluation',
        type: 'Screening',
        category: 'Gross Motor',
        assessmentDate: '2024-01-10',
        status: 'completed',
        score: 78,
        maxScore: 100,
        summary: 'Shows improvement in static balance. Dynamic balance and coordination need continued work.',
        recommendations: JSON.stringify([
          'Continue balance beam exercises',
          'Practice hopping on one foot',
          'Work on obstacle course navigation'
        ]),
        areas: JSON.stringify([
          { name: 'Static Balance', score: 85, maxScore: 100 },
          { name: 'Dynamic Balance', score: 75, maxScore: 100 },
          { name: 'Coordination', score: 70, maxScore: 100 },
          { name: 'Postural Control', score: 80, maxScore: 100 }
        ]),
        aiInsights: 'Good static balance foundation. Focus on dynamic movements and coordination exercises.'
      }
    ];

    for (const assessment of assessments) {
      await connection.execute(`
        INSERT INTO assessments (patientId, therapistId, title, type, category, assessmentDate, status, score, maxScore, summary, recommendations, areas, aiInsights)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assessment.patientId, assessment.therapistId, assessment.title, assessment.type,
        assessment.category, assessment.assessmentDate, assessment.status, assessment.score,
        assessment.maxScore, assessment.summary, assessment.recommendations, assessment.areas, assessment.aiInsights
      ]);
    }

    console.log('✅ Created sample assessments');

    console.log('\n3️⃣ Seeding sample progress tracking data...');
    
    // Seed sample progress tracking data
    const progressEntries = [
      {
        patientId: patient.id,
        area: 'Fine Motor',
        baselineScore: 70,
        currentScore: 85,
        targetScore: 90,
        progressNotes: 'Significant improvement in pencil grip and hand-eye coordination',
        measurementDate: '2024-01-15',
        nextReviewDate: '2024-02-15'
      },
      {
        patientId: patient.id,
        area: 'Balance',
        baselineScore: 60,
        currentScore: 72,
        targetScore: 80,
        progressNotes: 'Good progress in static balance, working on dynamic balance',
        measurementDate: '2024-01-10',
        nextReviewDate: '2024-02-10'
      },
      {
        patientId: patient.id,
        area: 'Sensory',
        baselineScore: 55,
        currentScore: 68,
        targetScore: 75,
        progressNotes: 'Improved tolerance to different textures and sounds',
        measurementDate: '2024-01-08',
        nextReviewDate: '2024-02-08'
      }
    ];

    for (const entry of progressEntries) {
      await connection.execute(`
        INSERT INTO progress_tracking (patientId, area, baselineScore, currentScore, targetScore, progressNotes, measurementDate, nextReviewDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entry.patientId, entry.area, entry.baselineScore, entry.currentScore,
        entry.targetScore, entry.progressNotes, entry.measurementDate, entry.nextReviewDate
      ]);
    }

    console.log('✅ Created sample progress tracking entries');

    console.log('\n4️⃣ Seeding sample home exercises...');
    
    // Seed sample home exercises
    const exercises = [
      {
        patientId: patient.id,
        therapistId: therapist.userId,
        title: 'Bead Threading',
        description: 'Thread beads onto a string to improve hand-eye coordination and finger dexterity.',
        category: 'Fine Motor',
        instructions: JSON.stringify([
          'Hold the string with your non-dominant hand',
          'Pick up beads one at a time with your dominant hand',
          'Thread each bead onto the string',
          'Continue until all beads are threaded',
          'Practice for 10-15 minutes daily'
        ]),
        duration: 15,
        frequency: 'Daily',
        difficulty: 'Beginner',
        equipment: JSON.stringify(['String', 'Beads']),
        progressScore: 85,
        lastCompleted: '2024-01-19',
        streak: 5,
        isCompleted: false,
        assignedDate: '2024-01-01',
        dueDate: '2024-02-01'
      },
      {
        patientId: patient.id,
        therapistId: therapist.userId,
        title: 'Pencil Grip Practice',
        description: 'Practice proper pencil grip and writing exercises to improve handwriting skills.',
        category: 'Fine Motor',
        instructions: JSON.stringify([
          'Hold pencil with thumb, index, and middle finger',
          'Practice writing letters and numbers',
          'Focus on proper grip pressure',
          'Use lined paper for guidance',
          'Practice for 20 minutes daily'
        ]),
        duration: 20,
        frequency: 'Daily',
        difficulty: 'Beginner',
        equipment: JSON.stringify(['Pencil', 'Paper', 'Eraser']),
        progressScore: 70,
        lastCompleted: '2024-01-18',
        streak: 3,
        isCompleted: false,
        assignedDate: '2024-01-01',
        dueDate: '2024-02-01'
      },
      {
        patientId: patient.id,
        therapistId: therapist.userId,
        title: 'Balance Beam Walking',
        description: 'Walk along a balance beam to improve balance, coordination, and core strength.',
        category: 'Gross Motor',
        instructions: JSON.stringify([
          'Place a straight line on the floor (tape or chalk)',
          'Walk heel-to-toe along the line',
          'Keep arms out for balance',
          'Look straight ahead, not down',
          'Practice for 10 minutes daily'
        ]),
        duration: 10,
        frequency: 'Daily',
        difficulty: 'Intermediate',
        equipment: JSON.stringify(['Tape or chalk line']),
        progressScore: 60,
        lastCompleted: '2024-01-17',
        streak: 2,
        isCompleted: false,
        assignedDate: '2024-01-01',
        dueDate: '2024-02-01'
      }
    ];

    for (const exercise of exercises) {
      await connection.execute(`
        INSERT INTO home_exercises (patientId, therapistId, title, description, category, instructions, duration, frequency, difficulty, equipment, progressScore, lastCompleted, streak, isCompleted, assignedDate, dueDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        exercise.patientId, exercise.therapistId, exercise.title, exercise.description,
        exercise.category, exercise.instructions, exercise.duration, exercise.frequency,
        exercise.difficulty, exercise.equipment, exercise.progressScore, exercise.lastCompleted,
        exercise.streak, exercise.isCompleted, exercise.assignedDate, exercise.dueDate
      ]);
    }

    console.log('✅ Created sample home exercises');

    console.log('\n5️⃣ Verifying seeded data...');
    
    // Verify data
    const [assessmentCount] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
    const [progressCount] = await connection.execute('SELECT COUNT(*) as count FROM progress_tracking');
    const [exerciseCount] = await connection.execute('SELECT COUNT(*) as count FROM home_exercises');
    
    console.log(`✅ Assessments: ${assessmentCount[0].count}`);
    console.log(`✅ Progress entries: ${progressCount[0].count}`);
    console.log(`✅ Home exercises: ${exerciseCount[0].count}`);

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n🔍 Next Steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Start the client: cd ../client && npm start');
    console.log('3. Login with test accounts');
    console.log('4. Check patient portals for real data');

  } catch (error) {
    console.error('❌ Error during sample data seeding:', error);
  } finally {
    if (connection) await connection.end();
  }
};

seedSampleData();
