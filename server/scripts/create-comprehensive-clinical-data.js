const { getConnection } = require('../config/database');

async function createComprehensiveClinicalData() {
  let connection;
  
  try {
    console.log('🔄 Creating comprehensive clinical data for all patients...');
    
    // Get database connection
    connection = await getConnection();
    console.log('✅ Database connection established');
    
    // Start transaction
    await connection.beginTransaction();
    console.log('✅ Transaction started');
    
    // Get all patients with their assigned therapists
    const [patients] = await connection.execute(`
      SELECT 
        p.id as patientId,
        p.userId,
        p.therapistId,
        u.firstName,
        u.lastName,
        p.diagnosis,
        t.firstName as therapistFirstName,
        t.lastName as therapistLastName
      FROM patients p
      JOIN users u ON p.userId = u.id
      JOIN users t ON p.therapistId = t.id
      ORDER BY p.userId
    `);
    
    console.log(`\\nFound ${patients.length} patients to create clinical data for:`);
    patients.forEach(patient => {
      console.log(`  ${patient.firstName} ${patient.lastName} (ID ${patient.userId}) - ${patient.diagnosis} - Therapist: ${patient.therapistFirstName} ${patient.therapistLastName}`);
    });
    
    // Create clinical data for each patient
    for (const patient of patients) {
      console.log(`\\n📋 Creating clinical data for ${patient.firstName} ${patient.lastName}...`);
      
      // 1. Create Treatment Plan
      const treatmentPlan = await createTreatmentPlan(connection, patient);
      console.log(`  ✅ Treatment Plan: ${treatmentPlan.title}`);
      
      // 2. Create Home Exercises
      const homeExercises = await createHomeExercises(connection, patient);
      console.log(`  ✅ Home Exercises: ${homeExercises.length} exercises`);
      
      // 3. Create Daily Notes
      const dailyNotes = await createDailyNotes(connection, patient);
      console.log(`  ✅ Daily Notes: ${dailyNotes.length} sessions`);
      
      // 4. Create Appointments
      const appointments = await createAppointments(connection, patient);
      console.log(`  ✅ Appointments: ${appointments.length} sessions`);
      
      // 5. Create Assessments
      const assessments = await createAssessments(connection, patient);
      console.log(`  ✅ Assessments: ${assessments.length} evaluations`);
    }
    
    // Commit transaction
    await connection.commit();
    console.log('\\n✅ Transaction committed successfully');
    
    // Verify the data
    console.log('\\n📊 Verification:');
    
    const [treatmentPlansCount] = await connection.execute('SELECT COUNT(*) as count FROM treatment_plans');
    const [homeExercisesCount] = await connection.execute('SELECT COUNT(*) as count FROM home_exercises');
    const [dailyNotesCount] = await connection.execute('SELECT COUNT(*) as count FROM daily_notes');
    const [appointmentsCount] = await connection.execute('SELECT COUNT(*) as count FROM appointments');
    const [assessmentsCount] = await connection.execute('SELECT COUNT(*) as count FROM assessments');
    
    console.log(`  Treatment Plans: ${treatmentPlansCount[0].count}`);
    console.log(`  Home Exercises: ${homeExercisesCount[0].count}`);
    console.log(`  Daily Notes: ${dailyNotesCount[0].count}`);
    console.log(`  Appointments: ${appointmentsCount[0].count}`);
    console.log(`  Assessments: ${assessmentsCount[0].count}`);
    
    console.log('\\n🎉 Comprehensive clinical data creation completed successfully!');
    console.log('All patients now have complete clinical records with treatment plans, home exercises, daily notes, appointments, and assessments.');
    
  } catch (error) {
    console.error('❌ Error during clinical data creation:', error);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Error during rollback:', rollbackError);
      }
    }
    
    throw error;
  } finally {
    if (connection) {
      await connection.release();
      console.log('🔌 Database connection released');
    }
  }
}

// Helper function to create treatment plan
async function createTreatmentPlan(connection, patient) {
  const treatmentPlans = {
    'Fine Motor Skills Development': {
      title: 'Fine Motor Skills Enhancement Program',
      description: 'Comprehensive program to improve hand-eye coordination, finger dexterity, and self-care skills through targeted exercises and activities.',
      objectives: [
        'Improve pincer grasp strength and precision',
        'Enhance bilateral coordination',
        'Develop self-care independence',
        'Increase hand-eye coordination accuracy'
      ]
    },
    'Speech Therapy': {
      title: 'Communication Development Program',
      description: 'Structured program to improve articulation, language comprehension, and social communication skills.',
      objectives: [
        'Improve articulation clarity',
        'Enhance language comprehension',
        'Develop social communication skills',
        'Increase vocabulary and expression'
      ]
    },
    'Physical Therapy': {
      title: 'Mobility and Strength Enhancement Program',
      description: 'Comprehensive program to improve gross motor skills, balance, coordination, and physical strength.',
      objectives: [
        'Improve gross motor coordination',
        'Enhance balance and postural control',
        'Increase muscle strength and endurance',
        'Develop movement planning skills'
      ]
    },
    'Occupational Therapy': {
      title: 'Daily Living Skills Development Program',
      description: 'Focused program to improve independence in daily activities, sensory processing, and functional skills.',
      objectives: [
        'Improve self-care independence',
        'Enhance sensory processing',
        'Develop fine motor skills',
        'Increase attention and focus'
      ]
    }
  };
  
  const plan = treatmentPlans[patient.diagnosis] || treatmentPlans['Physical Therapy'];
  
  const [result] = await connection.execute(`
    INSERT INTO treatment_plans (patientId, therapistId, title, description, startDate, endDate, status, overallProgress, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `, [
    patient.patientId,
    patient.therapistId,
    plan.title,
    plan.description,
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // 30 days ago
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '), // 60 days from now
    'active',
    Math.floor(Math.random() * 40) + 30 // 30-70% progress
  ]);
  
  const treatmentPlanId = result.insertId;
  
  // Create treatment plan objectives
  for (const objective of plan.objectives) {
    await connection.execute(`
      INSERT INTO treatment_plan_objectives (treatmentPlanId, objective, targetDate, status, progress, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      treatmentPlanId,
      objective,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
      'in_progress',
      Math.floor(Math.random() * 50) + 25
    ]);
  }
  
  return { id: treatmentPlanId, title: plan.title };
}

// Helper function to create home exercises
async function createHomeExercises(connection, patient) {
  const exerciseTemplates = {
    'Fine Motor Skills Development': [
      {
        title: 'Finger Strengthening Exercises',
        description: 'Daily finger and hand strengthening exercises to improve grip and dexterity',
        instructions: 'Complete 3 sets of 10 repetitions for each exercise. Hold each position for 5 seconds.',
        repetitions: 10,
        sets: 3,
        frequency: 'daily'
      },
      {
        title: 'Hand-Eye Coordination Practice',
        description: 'Activities to improve coordination between hands and eyes',
        instructions: 'Practice catching and throwing a soft ball for 15 minutes daily.',
        repetitions: 15,
        sets: 1,
        frequency: 'daily'
      },
      {
        title: 'Self-Care Skills Practice',
        description: 'Practice daily living activities to improve independence',
        instructions: 'Practice buttoning, zipping, and tying shoelaces for 20 minutes daily.',
        repetitions: 5,
        sets: 4,
        frequency: 'daily'
      }
    ],
    'Speech Therapy': [
      {
        title: 'Articulation Practice',
        description: 'Daily speech exercises to improve clarity and pronunciation',
        instructions: 'Practice tongue twisters and word repetition exercises for 20 minutes daily.',
        repetitions: 20,
        sets: 3,
        frequency: 'daily'
      },
      {
        title: 'Language Comprehension Activities',
        description: 'Reading and listening exercises to improve understanding',
        instructions: 'Read aloud for 15 minutes and answer comprehension questions.',
        repetitions: 1,
        sets: 1,
        frequency: 'daily'
      },
      {
        title: 'Social Communication Practice',
        description: 'Practice conversational skills and social interaction',
        instructions: 'Engage in 10-minute conversations with family members daily.',
        repetitions: 1,
        sets: 1,
        frequency: 'daily'
      }
    ],
    'Physical Therapy': [
      {
        title: 'Balance and Coordination Exercises',
        description: 'Daily exercises to improve balance and gross motor coordination',
        instructions: 'Practice standing on one foot, walking heel-to-toe, and balance board exercises.',
        repetitions: 10,
        sets: 3,
        frequency: 'daily'
      },
      {
        title: 'Strength Building Activities',
        description: 'Exercises to improve muscle strength and endurance',
        instructions: 'Perform squats, lunges, and resistance band exercises for 30 minutes.',
        repetitions: 12,
        sets: 3,
        frequency: 'daily'
      },
      {
        title: 'Movement Planning Practice',
        description: 'Activities to improve motor planning and coordination',
        instructions: 'Practice obstacle courses and movement sequences for 20 minutes.',
        repetitions: 5,
        sets: 4,
        frequency: 'daily'
      }
    ],
    'Occupational Therapy': [
      {
        title: 'Sensory Processing Activities',
        description: 'Daily sensory activities to improve processing and attention',
        instructions: 'Engage in tactile, auditory, and visual sensory activities for 25 minutes.',
        repetitions: 1,
        sets: 1,
        frequency: 'daily'
      },
      {
        title: 'Fine Motor Skills Practice',
        description: 'Activities to improve hand function and dexterity',
        instructions: 'Practice picking up small objects, threading beads, and drawing exercises.',
        repetitions: 15,
        sets: 3,
        frequency: 'daily'
      },
      {
        title: 'Attention and Focus Training',
        description: 'Exercises to improve concentration and task completion',
        instructions: 'Complete puzzles, sorting activities, and attention games for 20 minutes.',
        repetitions: 1,
        sets: 1,
        frequency: 'daily'
      }
    ]
  };
  
  const exercises = exerciseTemplates[patient.diagnosis] || exerciseTemplates['Physical Therapy'];
  const createdExercises = [];
  
  for (const exercise of exercises) {
    const [result] = await connection.execute(`
      INSERT INTO home_exercises (patientId, therapistId, title, description, instructions, duration, frequency, difficulty, status, assignedDate, dueDate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      patient.patientId,
      patient.therapistId,
      exercise.title,
      exercise.description,
      JSON.stringify({ instructions: exercise.instructions, repetitions: exercise.repetitions, sets: exercise.sets }),
      exercise.duration || 20, // 20 minutes default
      exercise.frequency,
      ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
      'assigned',
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 7 days ago
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) // 7 days from now
    ]);
    
    createdExercises.push({ id: result.insertId, title: exercise.title });
  }
  
  return createdExercises;
}

// Helper function to create daily notes
async function createDailyNotes(connection, patient) {
  const noteTemplates = {
    'Fine Motor Skills Development': [
      {
        activities: 'Finger strengthening exercises, hand-eye coordination practice, self-care skills training',
        observations: 'Patient shows improved grip strength and better hand-eye coordination. Still working on fine motor precision.',
        progress: 'Good progress in finger dexterity. Patient can now complete more complex fine motor tasks.',
        challenges: 'Difficulty with very small objects and precise movements. Needs more practice with buttoning.',
        nextSteps: 'Continue strengthening exercises and introduce more complex fine motor activities.'
      },
      {
        activities: 'Bilateral coordination exercises, sensory integration activities, functional skills practice',
        observations: 'Patient demonstrates better coordination between both hands. Improved attention to task.',
        progress: 'Significant improvement in bilateral coordination. Patient is more independent in daily tasks.',
        challenges: 'Some difficulty with complex bilateral tasks. Needs more practice with coordination.',
        nextSteps: 'Increase complexity of bilateral activities and continue functional skills training.'
      }
    ],
    'Speech Therapy': [
      {
        activities: 'Articulation practice, language comprehension exercises, social communication training',
        observations: 'Patient shows improved speech clarity and better language understanding. More confident in conversations.',
        progress: 'Good progress in articulation. Patient is more intelligible and expressive.',
        challenges: 'Some sounds still need work. Patient sometimes struggles with complex sentences.',
        nextSteps: 'Continue articulation practice and work on sentence complexity.'
      },
      {
        activities: 'Vocabulary building, conversation practice, listening comprehension activities',
        observations: 'Patient has expanded vocabulary and improved conversational skills. Better at following directions.',
        progress: 'Excellent progress in vocabulary and social communication. Patient is more engaged.',
        challenges: 'Occasional difficulty with abstract concepts. Needs more practice with complex language.',
        nextSteps: 'Continue vocabulary expansion and introduce more abstract language concepts.'
      }
    ],
    'Physical Therapy': [
      {
        activities: 'Balance exercises, strength training, coordination practice, movement planning activities',
        observations: 'Patient shows improved balance and strength. Better coordination in gross motor activities.',
        progress: 'Good progress in balance and strength. Patient is more stable and coordinated.',
        challenges: 'Some difficulty with complex movement sequences. Needs more practice with coordination.',
        nextSteps: 'Continue strength training and introduce more complex movement patterns.'
      },
      {
        activities: 'Postural control exercises, endurance training, functional movement practice',
        observations: 'Patient demonstrates better posture and increased endurance. More confident in movement.',
        progress: 'Significant improvement in postural control and endurance. Patient is more active.',
        challenges: 'Occasional fatigue during longer activities. Needs to build more endurance.',
        nextSteps: 'Continue endurance training and gradually increase activity duration.'
      }
    ],
    'Occupational Therapy': [
      {
        activities: 'Sensory processing activities, attention training, fine motor skills practice',
        observations: 'Patient shows improved sensory processing and better attention to tasks. More focused during activities.',
        progress: 'Good progress in sensory processing and attention. Patient is more engaged in activities.',
        challenges: 'Some difficulty with sensory overload. Needs more practice with attention tasks.',
        nextSteps: 'Continue sensory activities and gradually increase attention demands.'
      },
      {
        activities: 'Self-care skills training, independence practice, functional activities',
        observations: 'Patient demonstrates improved independence in daily activities. More confident in self-care tasks.',
        progress: 'Excellent progress in independence. Patient is more self-sufficient in daily tasks.',
        challenges: 'Some complex tasks still need assistance. Patient needs more practice with organization.',
        nextSteps: 'Continue independence training and work on organizational skills.'
      }
    ]
  };
  
  const notes = noteTemplates[patient.diagnosis] || noteTemplates['Physical Therapy'];
  const createdNotes = [];
  
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const sessionDate = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000); // Weekly sessions
    
    const [result] = await connection.execute(`
      INSERT INTO daily_notes (patientId, therapistId, sessionDate, sessionDuration, activities, observations, progress, challenges, nextSteps, mood, engagement, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      patient.patientId,
      patient.therapistId,
      sessionDate.toISOString().slice(0, 19).replace('T', ' '),
      60, // 60 minutes
      note.activities,
      note.observations,
      note.progress,
      note.challenges,
      note.nextSteps,
      ['good', 'excellent', 'positive'][Math.floor(Math.random() * 3)],
      ['high', 'medium', 'good'][Math.floor(Math.random() * 3)]
    ]);
    
    createdNotes.push({ id: result.insertId, sessionDate: sessionDate.toISOString().slice(0, 10) });
  }
  
  return createdNotes;
}

// Helper function to create appointments
async function createAppointments(connection, patient) {
  const appointmentTypes = ['initial_assessment', 'follow_up', 'progress_review', 'treatment_session'];
  const statuses = ['completed', 'scheduled', 'confirmed'];
  const createdAppointments = [];
  
  for (let i = 0; i < 4; i++) {
    const appointmentDate = new Date(Date.now() - (i * 14 * 24 * 60 * 60 * 1000)); // Bi-weekly appointments
    const startTime = new Date(appointmentDate);
    startTime.setHours(10 + i, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 1);
    
    const [result] = await connection.execute(`
      INSERT INTO appointments (patientId, therapistId, appointmentDate, startTime, endTime, duration, type, status, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      patient.patientId,
      patient.therapistId,
      appointmentDate.toISOString().slice(0, 19).replace('T', ' '),
      startTime.toISOString().slice(0, 19).replace('T', ' '),
      endTime.toISOString().slice(0, 19).replace('T', ' '),
      60,
      appointmentTypes[i],
      statuses[Math.floor(Math.random() * statuses.length)],
      `Session focused on ${patient.diagnosis.toLowerCase()} treatment goals and progress monitoring.`
    ]);
    
    createdAppointments.push({ id: result.insertId, date: appointmentDate.toISOString().slice(0, 10) });
  }
  
  return createdAppointments;
}

// Helper function to create assessments
async function createAssessments(connection, patient) {
  const assessmentTypes = {
    'Fine Motor Skills Development': ['Fine Motor Assessment', 'Hand Function Test', 'Coordination Evaluation'],
    'Speech Therapy': ['Articulation Assessment', 'Language Comprehension Test', 'Communication Skills Evaluation'],
    'Physical Therapy': ['Balance Assessment', 'Strength Evaluation', 'Motor Coordination Test'],
    'Occupational Therapy': ['Sensory Processing Assessment', 'Attention Evaluation', 'Functional Skills Test']
  };
  
  const assessments = assessmentTypes[patient.diagnosis] || assessmentTypes['Physical Therapy'];
  const createdAssessments = [];
  
  for (let i = 0; i < assessments.length; i++) {
    const assessmentDate = new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)); // Monthly assessments
    const score = Math.floor(Math.random() * 30) + 70; // 70-100 score
    
    const [result] = await connection.execute(`
      INSERT INTO assessments (patientId, therapistId, title, type, category, assessmentDate, status, score, maxScore, summary, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      patient.patientId,
      patient.therapistId,
      assessments[i],
      'standardized',
      patient.diagnosis.toLowerCase().replace(' ', '_'),
      assessmentDate.toISOString().slice(0, 10),
      'completed',
      score,
      100,
      `Assessment shows ${score >= 85 ? 'excellent' : score >= 75 ? 'good' : 'satisfactory'} progress in ${assessments[i].toLowerCase()}. Patient demonstrates ${score >= 85 ? 'strong' : 'adequate'} skills in this area.`
    ]);
    
    createdAssessments.push({ id: result.insertId, type: assessments[i], score: score });
  }
  
  return createdAssessments;
}

// Run the script if executed directly
if (require.main === module) {
  createComprehensiveClinicalData()
    .then(() => {
      console.log('\\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createComprehensiveClinicalData };
