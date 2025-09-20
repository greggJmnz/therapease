#!/usr/bin/env node

/**
 * Simple Data Seeding Script for TherapEase
 * Populates database with complete personal, professional, and medical information
 * Uses Philippine phone numbers and realistic data
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedData = async () => {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'grntjmnz2522!',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'therapease_dev'
    });

    console.log('✅ Connected to database successfully');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await connection.execute('DELETE FROM notifications');
    await connection.execute('DELETE FROM progress_tracking');
    await connection.execute('DELETE FROM appointments');
    await connection.execute('DELETE FROM daily_notes');
    await connection.execute('DELETE FROM assessments');
    await connection.execute('DELETE FROM patients');
    await connection.execute('DELETE FROM therapists');
    await connection.execute('DELETE FROM users');
    console.log('✅ Existing data cleared');

    // Insert users
    console.log('👥 Seeding users...');
    
    // Admin user
    const [adminResult] = await connection.execute(`
      INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'admin@therapease.com',
      await bcrypt.hash('admin123', 10),
      'admin',
      'Maria',
      'Santos',
      '+639171234567',
      '1985-03-15',
      'female',
      '123 Ayala Avenue, Makati City',
      'Makati City',
      'Metro Manila',
      '1226'
    ]);
    const adminId = adminResult.insertId;

    // Therapist users
    const therapistData = [
      ['dr.aleli.ong@therapease.com', 'Aleli', 'Ong', '+639151234567', '1988-07-22', 'female', '456 Ortigas Avenue, Pasig City', 'Pasig City'],
      ['dr.juan.cruz@therapease.com', 'Juan', 'Cruz', '+639201234567', '1982-11-08', 'male', '789 EDSA, Quezon City', 'Quezon City'],
      ['dr.ana.reyes@therapease.com', 'Ana', 'Reyes', '+639251234567', '1990-05-14', 'female', '321 Taft Avenue, Manila', 'Manila'],
      ['dr.miguel.torres@therapease.com', 'Miguel', 'Torres', '+639301234567', '1987-09-30', 'male', '654 Commonwealth Avenue, Quezon City', 'Quezon City'],
      ['dr.carmen.lopez@therapease.com', 'Carmen', 'Lopez', '+639351234567', '1984-12-03', 'female', '987 Katipunan Avenue, Quezon City', 'Quezon City']
    ];

    const therapistIds = [];
    for (const [email, firstName, lastName, phone, dateOfBirth, gender, address, city] of therapistData) {
      const [result] = await connection.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        email, await bcrypt.hash('therapist123', 10), 'therapist', firstName, lastName,
        phone, dateOfBirth, gender, address, city, 'Metro Manila', '1000'
      ]);
      therapistIds.push(result.insertId);
    }

    // Patient users
    const patientData = [
      ['alexandra.santos@email.com', 'Alexandra', 'Santos', '+639171234568', '2015-04-12', 'female', '123 BGC High Street, Taguig City', 'Taguig City'],
      ['marcus.delacruz@email.com', 'Marcus', 'Dela Cruz', '+639181234568', '2013-08-25', 'male', '456 Alabang-Zapote Road, Las Piñas City', 'Las Piñas City'],
      ['sophia.garcia@email.com', 'Sophia', 'Garcia', '+639191234568', '2016-01-18', 'female', '789 Shaw Boulevard, Mandaluyong City', 'Mandaluyong City'],
      ['ethan.rodriguez@email.com', 'Ethan', 'Rodriguez', '+639211234568', '2014-06-07', 'male', '321 C5 Road, Parañaque City', 'Parañaque City'],
      ['isabella.martinez@email.com', 'Isabella', 'Martinez', '+639221234568', '2017-03-29', 'female', '654 Marcos Highway, Marikina City', 'Marikina City'],
      ['noah.hernandez@email.com', 'Noah', 'Hernandez', '+639231234568', '2012-11-14', 'male', '987 Rizal Avenue, Caloocan City', 'Caloocan City'],
      ['olivia.gonzalez@email.com', 'Olivia', 'Gonzalez', '+639241234568', '2018-09-05', 'female', '123 Sucat Road, Muntinlupa City', 'Muntinlupa City'],
      ['liam.wilson@email.com', 'Liam', 'Wilson', '+639251234568', '2015-12-22', 'male', '456 Valenzuela City', 'Valenzuela City'],
      ['ava.anderson@email.com', 'Ava', 'Anderson', '+639261234568', '2016-07-11', 'female', '789 Malabon City', 'Malabon City'],
      ['william.thomas@email.com', 'William', 'Thomas', '+639271234568', '2013-02-28', 'male', '321 Navotas City', 'Navotas City']
    ];

    const patientIds = [];
    for (const [email, firstName, lastName, phone, dateOfBirth, gender, address, city] of patientData) {
      const [result] = await connection.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        email, await bcrypt.hash('patient123', 10), 'patient', firstName, lastName,
        phone, dateOfBirth, gender, address, city, 'Metro Manila', '1000'
      ]);
      patientIds.push(result.insertId);
    }

    console.log(`✅ Seeded ${1 + therapistIds.length + patientIds.length} users`);

    // Insert therapists
    console.log('👩‍⚕️ Seeding therapists...');
    const therapistProfiles = [
      [therapistIds[0], 'OT-PH-2015-001234', 'Pediatric Occupational Therapy, Sensory Integration, Fine Motor Development', 8, 'Master of Science in Occupational Therapy - University of the Philippines Manila (2015)', 'Certified Sensory Integration Specialist (CSIS), Pediatric Occupational Therapy Certification (POTC)', 'Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 2:00 PM'],
      [therapistIds[1], 'OT-PH-2010-005678', 'Adult Occupational Therapy, Hand Therapy, Neurological Rehabilitation', 13, 'Doctor of Philosophy in Occupational Therapy - University of Santo Tomas (2018)', 'Certified Hand Therapist (CHT), Neurological Rehabilitation Specialist (NRS)', 'Monday-Friday: 7:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM'],
      [therapistIds[2], 'OT-PH-2018-009876', 'Pediatric Occupational Therapy, Developmental Delays, School-Based Therapy', 5, 'Master of Science in Occupational Therapy - Ateneo de Manila University (2018)', 'School-Based Occupational Therapy Specialist (SBOTS), Developmental Delay Intervention Specialist (DDIS)', 'Monday-Friday: 9:00 AM - 7:00 PM, Sunday: 10:00 AM - 4:00 PM'],
      [therapistIds[3], 'OT-PH-2012-003456', 'Geriatric Occupational Therapy, Home Health, Assistive Technology', 11, 'Master of Science in Occupational Therapy - De La Salle University (2012)', 'Geriatric Occupational Therapy Specialist (GOTS), Assistive Technology Professional (ATP)', 'Monday-Friday: 8:00 AM - 4:00 PM, Saturday: 9:00 AM - 1:00 PM'],
      [therapistIds[4], 'OT-PH-2016-007890', 'Mental Health Occupational Therapy, Cognitive Rehabilitation, Group Therapy', 7, 'Master of Science in Occupational Therapy - University of the Philippines Diliman (2016)', 'Mental Health Occupational Therapy Specialist (MHOTS), Cognitive Rehabilitation Specialist (CRS)', 'Monday-Friday: 10:00 AM - 8:00 PM, Saturday: 9:00 AM - 3:00 PM']
    ];

    for (const [userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability] of therapistProfiles) {
      await connection.execute(`
        INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability]);
    }

    console.log(`✅ Seeded ${therapistProfiles.length} therapists`);

    // Insert patients
    console.log('👶 Seeding patients...');
    const patientProfiles = [
      [patientIds[0], 'Developmental Coordination Disorder (DCD)', 'Born at 36 weeks gestation, no significant medical history. Parents report difficulty with fine motor tasks and coordination since age 3.', 'Improve fine motor skills, enhance hand-eye coordination, develop self-care independence, improve handwriting legibility', therapistIds[0], 'Maria Santos (Mother) - +639171234569', 'PhilHealth Member - ID: 12-345678901-2, Maxicare - Policy: MC-2024-001234'],
      [patientIds[1], 'Autism Spectrum Disorder (ASD) - Level 1', 'Diagnosed at age 4. No significant medical history. Parents report sensory sensitivities and social communication challenges.', 'Improve sensory processing, enhance social interaction skills, develop communication abilities, increase independence in daily activities', therapistIds[0], 'Roberto Dela Cruz (Father) - +639181234569', 'PhilHealth Member - ID: 12-345678901-3, Cigna - Policy: CG-2024-002345'],
      [patientIds[2], 'Cerebral Palsy - Spastic Diplegia', 'Born at 32 weeks gestation, diagnosed at 6 months. History of seizures, well-controlled with medication.', 'Improve gross motor function, enhance balance and coordination, develop self-care skills, increase mobility independence', therapistIds[2], 'Elena Garcia (Mother) - +639191234569', 'PhilHealth Member - ID: 12-345678901-4, Blue Cross - Policy: BC-2024-003456'],
      [patientIds[3], 'Attention Deficit Hyperactivity Disorder (ADHD) with Sensory Processing Disorder', 'Diagnosed at age 6. No significant medical history. Parents report difficulty with attention, hyperactivity, and sensory sensitivities.', 'Improve attention and focus, enhance sensory processing, develop self-regulation skills, improve academic performance', therapistIds[0], 'Carlos Rodriguez (Father) - +639211234569', 'PhilHealth Member - ID: 12-345678901-5, Medicard - Policy: MD-2024-004567'],
      [patientIds[4], 'Down Syndrome', 'Born at 38 weeks gestation, diagnosed at birth. History of congenital heart defect, repaired at 6 months.', 'Improve fine and gross motor skills, enhance cognitive development, develop communication skills, increase independence', therapistIds[2], 'Patricia Martinez (Mother) - +639221234569', 'PhilHealth Member - ID: 12-345678901-6, Intellicare - Policy: IC-2024-005678'],
      [patientIds[5], 'Learning Disability with Motor Coordination Difficulties', 'No significant medical history. Parents report academic struggles and motor coordination challenges since kindergarten.', 'Improve motor coordination, enhance academic performance, develop self-confidence, improve handwriting and fine motor skills', therapistIds[1], 'Sofia Hernandez (Mother) - +639231234569', 'PhilHealth Member - ID: 12-345678901-7, Maxicare - Policy: MC-2024-006789'],
      [patientIds[6], 'Sensory Processing Disorder (SPD)', 'No significant medical history. Parents report sensory sensitivities and behavioral challenges since age 2.', 'Improve sensory processing, enhance self-regulation, develop coping strategies, improve social interaction', therapistIds[0], 'Miguel Gonzalez (Father) - +639241234569', 'PhilHealth Member - ID: 12-345678901-8, Cigna - Policy: CG-2024-007890'],
      [patientIds[7], 'Fetal Alcohol Spectrum Disorder (FASD)', 'Adopted at age 3. History of prenatal alcohol exposure. No significant medical history since adoption.', 'Improve cognitive function, enhance motor skills, develop social skills, increase independence in daily activities', therapistIds[2], 'Jennifer Wilson (Adoptive Mother) - +639251234569', 'PhilHealth Member - ID: 12-345678901-9, Blue Cross - Policy: BC-2024-008901'],
      [patientIds[8], 'Developmental Delay - Global', 'No significant medical history. Parents report delays in multiple developmental areas since age 18 months.', 'Improve overall development, enhance motor skills, develop communication abilities, increase independence', therapistIds[0], 'Michael Anderson (Father) - +639261234569', 'PhilHealth Member - ID: 12-345678901-0, Medicard - Policy: MD-2024-009012'],
      [patientIds[9], 'Traumatic Brain Injury (TBI) - Mild', 'Sustained TBI from bicycle accident at age 8. No significant medical history prior to accident.', 'Improve cognitive function, enhance motor skills, develop compensatory strategies, increase independence', therapistIds[1], 'Sarah Thomas (Mother) - +639271234569', 'PhilHealth Member - ID: 12-345678901-1, Intellicare - Policy: IC-2024-010123']
    ];

    const actualPatientIds = [];
    for (const [userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo] of patientProfiles) {
      const [result] = await connection.execute(`
        INSERT INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo]);
      actualPatientIds.push(result.insertId);
    }

    console.log(`✅ Seeded ${patientProfiles.length} patients`);

    // Insert sample assessments
    console.log('📋 Seeding assessments...');
    for (let i = 0; i < 10; i++) {
      const patientId = actualPatientIds[Math.floor(Math.random() * actualPatientIds.length)];
      const therapistId = therapistIds[Math.floor(Math.random() * therapistIds.length)];
      const assessmentDate = new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0];
      
      await connection.execute(`
        INSERT INTO assessments (patientId, therapistId, title, type, category, assessmentDate, status, score, maxScore, summary, recommendations, areas, aiInsights)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patientId, therapistId, `Assessment ${i + 1}`, 'initial', 'Comprehensive', assessmentDate, 'completed',
        75, 100, 'Patient shows good progress in targeted areas.', 
        JSON.stringify(['Continue current therapy', 'Adjust goals as needed']),
        JSON.stringify(['Fine Motor', 'Gross Motor', 'Sensory Processing']),
        'AI analysis suggests continued focus on bilateral coordination.'
      ]);
    }

    console.log('✅ Seeded 10 assessments');

    // Insert sample daily notes
    console.log('📝 Seeding daily notes...');
    for (let i = 0; i < 20; i++) {
      const patientId = actualPatientIds[Math.floor(Math.random() * actualPatientIds.length)];
      const therapistId = therapistIds[Math.floor(Math.random() * therapistIds.length)];
      const sessionDate = new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0];
      
      await connection.execute(`
        INSERT INTO daily_notes (patientId, therapistId, sessionDate, sessionDuration, activities, observations, progress, challenges, nextSteps, mood, engagement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patientId, therapistId, sessionDate, 45, 'Fine motor activities, sensory play, coordination exercises',
        'Patient showed good engagement and made progress in targeted areas.',
        'Continued improvement in fine motor skills and attention span.',
        'Some difficulty with transitions and new activities.',
        'Continue current activities, introduce new challenges gradually.',
        'Good', 'High'
      ]);
    }

    console.log('✅ Seeded 20 daily notes');

    // Insert sample appointments
    console.log('📅 Seeding appointments...');
    for (let i = 0; i < 15; i++) {
      const patientId = actualPatientIds[Math.floor(Math.random() * actualPatientIds.length)];
      const therapistId = therapistIds[Math.floor(Math.random() * therapistIds.length)];
      const appointmentDate = new Date(2024, 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
      const startTime = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'][Math.floor(Math.random() * 6)];
      const duration = [30, 45, 60][Math.floor(Math.random() * 3)];
      const endTime = new Date(`2000-01-01T${startTime}:00`);
      endTime.setMinutes(endTime.getMinutes() + duration);
      const endTimeStr = endTime.toTimeString().substring(0, 5);
      
      await connection.execute(`
        INSERT INTO appointments (patientId, therapistId, appointmentDate, startTime, endTime, duration, type, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patientId, therapistId, appointmentDate, startTime, endTimeStr, duration,
        'Regular Session', 'scheduled', 'Regular therapy session focused on patient goals.'
      ]);
    }

    console.log('✅ Seeded 15 appointments');

    // Insert sample notifications
    console.log('🔔 Seeding notifications...');
    const notificationData = [
      [adminId, 'appointment', 'Appointment Reminder', 'You have an appointment with Alexandra Santos tomorrow at 10:00 AM.', false],
      [therapistIds[0], 'assessment', 'Assessment Due', 'Progress assessment for Marcus Dela Cruz is due next week.', false],
      [patientIds[0], 'progress', 'Progress Update', 'Your therapy progress has been updated. Check your dashboard for details.', true],
      [patientIds[1], 'appointment', 'Appointment Confirmed', 'Your appointment with Dr. Aleli Ong has been confirmed for next Tuesday.', false]
    ];

    for (const [userId, type, title, message, isRead] of notificationData) {
      await connection.execute(`
        INSERT INTO notifications (userId, type, title, message, isRead)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, type, title, message, isRead ? 1 : 0]);
    }

    console.log('✅ Seeded 4 notifications');

    console.log('\n🎉 Complete data seeding finished successfully!');
    console.log('\n📊 Data Summary:');
    console.log('   • 1 Admin user (admin@therapease.com / admin123)');
    console.log('   • 5 Therapist users with complete professional info');
    console.log('   • 10 Patient users with complete medical info');
    console.log('   • 10 Assessments');
    console.log('   • 20 Daily notes');
    console.log('   • 15 Appointments');
    console.log('   • 4 Notifications');
    console.log('\n📱 All phone numbers are in Philippine format (+639XXXXXXXXX)');
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin: admin@therapease.com / admin123');
    console.log('   Therapist: dr.aleli.ong@therapease.com / therapist123');
    console.log('   Patient: alexandra.santos@email.com / patient123');
    
  } catch (error) {
    console.error('❌ Data seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run the seeding
if (require.main === module) {
  seedData().catch(console.error);
}

module.exports = seedData;
