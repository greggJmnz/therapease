const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'grntjmnz2522!',
  database: process.env.DB_NAME || 'therapease_dev',
  port: process.env.DB_PORT || 3306
};

async function createTestAppointments() {
  let connection;
  
  try {
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // First, get existing patients and therapists
    console.log('📋 Fetching existing patients and therapists...');
    
    const [patients] = await connection.execute(`
      SELECT p.id as patientId, u.id as userId, u.firstName, u.lastName, u.email, p.therapistId 
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE u.role = 'patient' 
      ORDER BY p.id 
      LIMIT 10
    `);
    
    const [therapists] = await connection.execute(`
      SELECT t.id as therapistId, u.id as userId, u.firstName, u.lastName, u.email, t.specialization 
      FROM therapists t
      JOIN users u ON t.userId = u.id
      WHERE u.role = 'therapist' 
      ORDER BY t.id 
      LIMIT 5
    `);

    console.log(`👥 Found ${patients.length} patients and ${therapists.length} therapists`);

    if (patients.length === 0) {
      console.log('❌ No patients found. Please create some patients first.');
      return;
    }

    if (therapists.length === 0) {
      console.log('❌ No therapists found. Please create some therapists first.');
      return;
    }

    // Create test appointments
    const testAppointments = [
      {
        patientId: patients[0].patientId,
        therapistId: therapists[0].userId,
        appointmentDate: new Date().toISOString().split('T')[0], // Today
        appointmentTime: '09:00:00',
        duration: 60,
        type: 'session',
        status: 'scheduled',
        reason: 'Regular therapy session',
        notes: 'Focus on fine motor skills development',
        room: 'Room A'
      },
      {
        patientId: patients[1] ? patients[1].patientId : patients[0].patientId,
        therapistId: therapists[1] ? therapists[1].userId : therapists[0].userId,
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        appointmentTime: '10:30:00',
        duration: 45,
        type: 'consultation',
        status: 'confirmed',
        reason: 'Initial consultation',
        notes: 'Assessment and evaluation needed',
        room: 'Room B'
      },
      {
        patientId: patients[2] ? patients[2].patientId : patients[0].patientId,
        therapistId: therapists[0].userId,
        appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
        appointmentTime: '14:00:00',
        duration: 90,
        type: 'assessment',
        status: 'scheduled',
        reason: 'Comprehensive assessment',
        notes: 'Full evaluation and testing required',
        room: 'Room C'
      },
      {
        patientId: patients[3] ? patients[3].patientId : patients[0].patientId,
        therapistId: therapists[1] ? therapists[1].userId : therapists[0].userId,
        appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days from now
        appointmentTime: '11:15:00',
        duration: 60,
        type: 'follow-up',
        status: 'scheduled',
        reason: 'Follow-up session',
        notes: 'Progress review and next steps',
        room: 'Room A'
      },
      {
        patientId: patients[4] ? patients[4].patientId : patients[0].patientId,
        therapistId: therapists[0].userId,
        appointmentDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 days from now
        appointmentTime: '15:30:00',
        duration: 30,
        type: 'emergency',
        status: 'confirmed',
        reason: 'Urgent consultation',
        notes: 'Emergency assessment needed',
        room: 'Room B'
      },
      {
        patientId: patients[0].patientId,
        therapistId: therapists[0].userId,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
        appointmentTime: '09:30:00',
        duration: 60,
        type: 'therapy',
        status: 'scheduled',
        reason: 'Regular therapy session',
        notes: 'Continue with current treatment plan',
        room: 'Room A'
      },
      {
        patientId: patients[1] ? patients[1].patientId : patients[0].patientId,
        therapistId: therapists[1] ? therapists[1].userId : therapists[0].userId,
        appointmentDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days from now
        appointmentTime: '13:00:00',
        duration: 45,
        type: 'evaluation',
        status: 'scheduled',
        reason: 'Progress evaluation',
        notes: 'Assess improvement and adjust treatment',
        room: 'Room C'
      },
      {
        patientId: patients[2] ? patients[2].patientId : patients[0].patientId,
        therapistId: therapists[0].userId,
        appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks from now
        appointmentTime: '16:00:00',
        duration: 60,
        type: 'checkup',
        status: 'scheduled',
        reason: 'Regular checkup',
        notes: 'Routine checkup and assessment',
        room: 'Room B'
      }
    ];

    console.log('📅 Creating test appointments...');
    
    // Clear existing test appointments (optional - comment out if you want to keep existing ones)
    // await connection.execute('DELETE FROM appointments WHERE reason LIKE "%test%" OR notes LIKE "%test%"');
    
    let createdCount = 0;
    
    for (const appointment of testAppointments) {
      try {
        const [result] = await connection.execute(`
          INSERT INTO appointments (
            patientId, therapistId, appointmentDate, startTime, endTime, 
            duration, type, status, notes, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          appointment.patientId,
          appointment.therapistId,
          appointment.appointmentDate,
          appointment.appointmentTime,
          new Date(new Date(`2000-01-01T${appointment.appointmentTime}`).getTime() + appointment.duration * 60000).toTimeString().slice(0, 8),
          appointment.duration,
          appointment.type,
          appointment.status,
          `${appointment.reason} - ${appointment.notes} (Room: ${appointment.room})`
        ]);
        
        createdCount++;
        console.log(`✅ Created appointment ${createdCount}: ${appointment.type} for patient ${appointment.patientId} on ${appointment.appointmentDate}`);
        
      } catch (error) {
        console.log(`❌ Failed to create appointment: ${error.message}`);
      }
    }

    console.log(`\n🎉 Successfully created ${createdCount} test appointments!`);
    console.log('\n📊 Appointment Summary:');
    console.log('- Today: 1 appointment (session)');
    console.log('- Tomorrow: 1 appointment (consultation)');
    console.log('- Day after tomorrow: 1 appointment (assessment)');
    console.log('- 3 days: 1 appointment (follow-up)');
    console.log('- 4 days: 1 appointment (emergency)');
    console.log('- 1 week: 1 appointment (therapy)');
    console.log('- 10 days: 1 appointment (evaluation)');
    console.log('- 2 weeks: 1 appointment (checkup)');
    
    console.log('\n🎨 Color Coding Expected:');
    console.log('- Pink: session, therapy');
    console.log('- Orange: consultation');
    console.log('- Green: assessment, evaluation');
    console.log('- Yellow: follow-up, checkup, emergency');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  createTestAppointments()
    .then(() => {
      console.log('\n✨ Test appointments creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestAppointments };
