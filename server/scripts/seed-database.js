#!/usr/bin/env node

/**
 * TherapEase Database Seeding Script
 * This script populates the database with comprehensive test data
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env' });

const seedDatabase = async () => {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_NAME || 'therapease'
    });

    console.log('🌱 Starting database seeding...');

    // Check if data already exists
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (userCount[0].count > 1) { // More than just admin
      console.log('⚠️  Database already contains data. Skipping seeding.');
      console.log('   To re-seed, clear the database first.');
      return;
    }

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const therapistPassword = await bcrypt.hash('therapist123', 10);
    const patientPassword = await bcrypt.hash('patient123', 10);

    // Insert Admin User
    console.log('👤 Creating admin user...');
    await connection.execute(`
      INSERT INTO users (email, password, role, firstName, lastName, phone, gender, address, city, state, zipCode, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'admin@therapease.com', adminPassword, 'admin', 'Maria', 'Santos', 
      '+639171234567', 'female', '123 Ayala Avenue', 'Makati City', 'Metro Manila', '1226',
      new Date(), new Date()
    ]);

    // Insert Therapist Users
    console.log('👨‍⚕️ Creating therapist users...');
    const therapists = [
      {
        email: 'dr.aleli.ong@therapease.com',
        firstName: 'Aleli',
        lastName: 'Ong',
        phone: '+639151234567',
        gender: 'female',
        address: '456 BGC High Street',
        city: 'Taguig City',
        state: 'Metro Manila',
        zipCode: '1634',
        licenseNumber: 'OT-PH-2015-001234',
        specialization: 'Pediatric OT, Sensory Integration, Fine Motor Development',
        yearsOfExperience: 8,
        education: 'MS in OT - UP Manila (2015), BS in OT - UP Manila (2012)',
        certifications: 'CSIS, POTC, ASDS'
      },
      {
        email: 'dr.juan.cruz@therapease.com',
        firstName: 'Juan',
        lastName: 'Cruz',
        phone: '+639201234567',
        gender: 'male',
        address: '789 Ortigas Center',
        city: 'Pasig City',
        state: 'Metro Manila',
        zipCode: '1605',
        licenseNumber: 'OT-PH-2010-005678',
        specialization: 'Adult OT, Hand Therapy, Work Rehabilitation',
        yearsOfExperience: 13,
        education: 'MS in OT - UST (2010), BS in OT - UST (2007)',
        certifications: 'CHT, CWCE, AOTA'
      },
      {
        email: 'dr.ana.reyes@therapease.com',
        firstName: 'Ana',
        lastName: 'Reyes',
        phone: '+639251234567',
        gender: 'female',
        address: '321 Eastwood City',
        city: 'Quezon City',
        state: 'Metro Manila',
        zipCode: '1110',
        licenseNumber: 'OT-PH-2018-009876',
        specialization: 'Pediatric OT, Developmental Delays, Early Intervention',
        yearsOfExperience: 5,
        education: 'MS in OT - Ateneo (2018), BS in OT - Ateneo (2015)',
        certifications: 'POTC, EIS, NDT'
      },
      {
        email: 'dr.miguel.torres@therapease.com',
        firstName: 'Miguel',
        lastName: 'Torres',
        phone: '+639301234567',
        gender: 'male',
        address: '654 Alabang Town Center',
        city: 'Muntinlupa City',
        state: 'Metro Manila',
        zipCode: '1781',
        licenseNumber: 'OT-PH-2012-003456',
        specialization: 'Geriatric OT, Home Health, Fall Prevention',
        yearsOfExperience: 11,
        education: 'MS in OT - DLSU (2012), BS in OT - DLSU (2009)',
        certifications: 'GCS, HCS, CAPS'
      },
      {
        email: 'dr.carmen.lopez@therapease.com',
        firstName: 'Carmen',
        lastName: 'Lopez',
        phone: '+639351234567',
        gender: 'female',
        address: '987 Rockwell Center',
        city: 'Makati City',
        state: 'Metro Manila',
        zipCode: '1200',
        licenseNumber: 'OT-PH-2016-007890',
        specialization: 'Mental Health OT, Cognitive Rehabilitation, Psychosocial',
        yearsOfExperience: 7,
        education: 'MS in OT - UP Diliman (2016), BS in OT - UP Diliman (2013)',
        certifications: 'CMHT, CBIS, CPRP'
      }
    ];

    for (const therapist of therapists) {
      const [userResult] = await connection.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, address, city, state, zipCode, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        therapist.email, therapistPassword, 'therapist', therapist.firstName, therapist.lastName,
        therapist.phone, therapist.gender, therapist.address, therapist.city, therapist.state, therapist.zipCode,
        new Date(), new Date()
      ]);

      await connection.execute(`
        INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userResult.insertId, therapist.licenseNumber, therapist.specialization, 
        therapist.yearsOfExperience, therapist.education, therapist.certifications,
        'Mon-Fri 8AM-6PM, Sat 9AM-2PM', new Date(), new Date()
      ]);
    }

    // Insert Patient Users
    console.log('👶 Creating patient users...');
    const patients = [
      {
        email: 'alexandra.santos@email.com',
        firstName: 'Alexandra',
        lastName: 'Santos',
        phone: '+639171234568',
        gender: 'female',
        address: '123 Greenhills',
        city: 'San Juan City',
        state: 'Metro Manila',
        zipCode: '1502',
        dateOfBirth: '2016-03-15',
        diagnosis: 'Developmental Coordination Disorder (DCD)',
        medicalHistory: 'No significant medical history. Parents noticed fine motor delays at age 4.',
        goals: 'Improve handwriting, enhance bilateral coordination, develop self-care skills',
        emergencyContact: 'Maria Santos (Mother) - +639171234569',
        insuranceInfo: 'PhilHealth Member, Maxicare Primary'
      },
      {
        email: 'marcus.delacruz@email.com',
        firstName: 'Marcus',
        lastName: 'Dela Cruz',
        phone: '+639181234568',
        gender: 'male',
        address: '456 Marikina Heights',
        city: 'Marikina City',
        state: 'Metro Manila',
        zipCode: '1810',
        dateOfBirth: '2014-07-22',
        diagnosis: 'Autism Spectrum Disorder (ASD) Level 1',
        medicalHistory: 'Diagnosed at age 3. Currently receiving speech therapy and behavioral intervention.',
        goals: 'Improve sensory processing, enhance social interaction, develop daily living skills',
        emergencyContact: 'Roberto Dela Cruz (Father) - +639181234569',
        insuranceInfo: 'PhilHealth Member, Cigna Health'
      },
      {
        email: 'sophia.garcia@email.com',
        firstName: 'Sophia',
        lastName: 'Garcia',
        phone: '+639191234568',
        gender: 'female',
        address: '789 Las Piñas City',
        city: 'Las Piñas',
        state: 'Metro Manila',
        zipCode: '1740',
        dateOfBirth: '2017-11-08',
        diagnosis: 'Cerebral Palsy - Spastic Diplegia',
        medicalHistory: 'Premature birth at 32 weeks. Diagnosed with CP at 6 months.',
        goals: 'Improve mobility, enhance upper body strength, develop independence in ADLs',
        emergencyContact: 'Elena Garcia (Mother) - +639191234569',
        insuranceInfo: 'PhilHealth Member, Medicard'
      },
      {
        email: 'ethan.rodriguez@email.com',
        firstName: 'Ethan',
        lastName: 'Rodriguez',
        phone: '+639211234568',
        gender: 'male',
        address: '321 Parañaque City',
        city: 'Parañaque',
        state: 'Metro Manila',
        zipCode: '1700',
        dateOfBirth: '2015-01-30',
        diagnosis: 'ADHD with Sensory Processing Disorder',
        medicalHistory: 'Diagnosed with ADHD at age 6. Sensory issues identified during school assessment.',
        goals: 'Improve attention and focus, enhance sensory regulation, develop organizational skills',
        emergencyContact: 'Carlos Rodriguez (Father) - +639211234569',
        insuranceInfo: 'PhilHealth Member, Intellicare'
      },
      {
        email: 'isabella.martinez@email.com',
        firstName: 'Isabella',
        lastName: 'Martinez',
        phone: '+639221234568',
        gender: 'female',
        address: '654 Valenzuela City',
        city: 'Valenzuela',
        state: 'Metro Manila',
        zipCode: '1440',
        dateOfBirth: '2017-05-12',
        diagnosis: 'Down Syndrome',
        medicalHistory: 'Prenatal diagnosis. Currently receiving early intervention services.',
        goals: 'Improve fine motor skills, enhance communication, develop self-help skills',
        emergencyContact: 'Patricia Martinez (Mother) - +639221234569',
        insuranceInfo: 'PhilHealth Member, Maxicare'
      },
      {
        email: 'noah.hernandez@email.com',
        firstName: 'Noah',
        lastName: 'Hernandez',
        phone: '+639231234568',
        gender: 'male',
        address: '987 Malabon City',
        city: 'Malabon',
        state: 'Metro Manila',
        zipCode: '1470',
        dateOfBirth: '2013-09-18',
        diagnosis: 'Learning Disability with Motor Coordination',
        medicalHistory: 'Academic difficulties identified in Grade 2. Motor coordination issues noted.',
        goals: 'Improve academic performance, enhance motor planning, develop study skills',
        emergencyContact: 'Jose Hernandez (Father) - +639231234569',
        insuranceInfo: 'PhilHealth Member, Cigna Health'
      },
      {
        email: 'olivia.gonzalez@email.com',
        firstName: 'Olivia',
        lastName: 'Gonzalez',
        phone: '+639241234568',
        gender: 'female',
        address: '147 Navotas City',
        city: 'Navotas',
        state: 'Metro Manila',
        zipCode: '1485',
        dateOfBirth: '2018-02-25',
        diagnosis: 'Sensory Processing Disorder (SPD)',
        medicalHistory: 'Sensory sensitivities identified at age 3. Difficulty with transitions and textures.',
        goals: 'Improve sensory tolerance, enhance self-regulation, develop coping strategies',
        emergencyContact: 'Rosa Gonzalez (Mother) - +639241234569',
        insuranceInfo: 'PhilHealth Member, Medicard'
      },
      {
        email: 'liam.wilson@email.com',
        firstName: 'Liam',
        lastName: 'Wilson',
        phone: '+639251234568',
        gender: 'male',
        address: '258 Caloocan City',
        city: 'Caloocan',
        state: 'Metro Manila',
        zipCode: '1400',
        dateOfBirth: '2013-12-03',
        diagnosis: 'Fetal Alcohol Spectrum Disorder (FASD)',
        medicalHistory: 'Adopted at age 2. FASD diagnosis confirmed through medical evaluation.',
        goals: 'Improve executive functioning, enhance social skills, develop life skills',
        emergencyContact: 'Jennifer Wilson (Adoptive Mother) - +639251234569',
        insuranceInfo: 'PhilHealth Member, Intellicare'
      },
      {
        email: 'ava.anderson@email.com',
        firstName: 'Ava',
        lastName: 'Anderson',
        phone: '+639261234568',
        gender: 'female',
        address: '369 Caloocan City',
        city: 'Caloocan',
        state: 'Metro Manila',
        zipCode: '1400',
        dateOfBirth: '2018-08-14',
        diagnosis: 'Developmental Delay - Global',
        medicalHistory: 'Delayed milestones across all domains. Early intervention started at age 2.',
        goals: 'Improve overall development, enhance communication, develop motor skills',
        emergencyContact: 'Michael Anderson (Father) - +639261234569',
        insuranceInfo: 'PhilHealth Member, Maxicare'
      },
      {
        email: 'william.thomas@email.com',
        firstName: 'William',
        lastName: 'Thomas',
        phone: '+639271234568',
        gender: 'male',
        address: '741 Caloocan City',
        city: 'Caloocan',
        state: 'Metro Manila',
        zipCode: '1400',
        dateOfBirth: '2013-04-07',
        diagnosis: 'Traumatic Brain Injury (TBI) - Mild',
        medicalHistory: 'TBI from bicycle accident at age 8. Cognitive and motor deficits noted.',
        goals: 'Improve cognitive function, enhance motor skills, develop compensatory strategies',
        emergencyContact: 'Sarah Thomas (Mother) - +639271234569',
        insuranceInfo: 'PhilHealth Member, Cigna Health'
      }
    ];

    const therapistIds = [];
    const [therapistUsers] = await connection.execute('SELECT id FROM users WHERE role = "therapist"');
    for (const user of therapistUsers) {
      therapistIds.push(user.id);
    }

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const therapistId = therapistIds[i % therapistIds.length]; // Distribute patients among therapists

      const [userResult] = await connection.execute(`
        INSERT INTO users (email, password, role, firstName, lastName, phone, gender, address, city, state, zipCode, dateOfBirth, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.email, patientPassword, 'patient', patient.firstName, patient.lastName,
        patient.phone, patient.gender, patient.address, patient.city, patient.state, patient.zipCode,
        patient.dateOfBirth, new Date(), new Date()
      ]);

      await connection.execute(`
        INSERT INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userResult.insertId, patient.diagnosis, patient.medicalHistory, patient.goals,
        therapistId, patient.emergencyContact, patient.insuranceInfo, new Date(), new Date()
      ]);
    }

    // Create sample assessments
    console.log('📋 Creating sample assessments...');
    const [patientRecords] = await connection.execute('SELECT p.id as patientId, p.therapistId FROM patients p');
    
    for (let i = 0; i < Math.min(10, patientRecords.length); i++) {
      const patient = patientRecords[i];
      await connection.execute(`
        INSERT INTO assessments (patientId, therapistId, title, type, category, assessmentDate, status, score, maxScore, summary, recommendations, areas, aiInsights, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.patientId, patient.therapistId, 'Initial Assessment', 'initial', 'comprehensive',
        new Date(), 'completed', 75 + Math.floor(Math.random() * 20), 100,
        'Comprehensive initial assessment completed. Patient shows good potential for improvement.',
        JSON.stringify(['Continue current therapy plan', 'Focus on fine motor skills', 'Monitor progress monthly']),
        JSON.stringify(['Fine Motor', 'Gross Motor', 'Sensory Processing', 'Self-Care']),
        'AI analysis suggests patient will benefit from structured therapy sessions with focus on motor planning.',
        new Date(), new Date()
      ]);
    }

    // Create sample daily notes
    console.log('📝 Creating sample daily notes...');
    for (let i = 0; i < Math.min(20, patientRecords.length); i++) {
      const patient = patientRecords[i % patientRecords.length];
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() - Math.floor(Math.random() * 30));
      
      await connection.execute(`
        INSERT INTO daily_notes (patientId, therapistId, sessionDate, sessionDuration, content, activities, observations, progress, challenges, nextSteps, goals, mood, engagement, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.patientId, patient.therapistId, sessionDate, 45,
        'Therapy session focused on fine motor activities and sensory integration.',
        'Fine motor exercises, sensory play, bilateral coordination tasks',
        'Patient showed good engagement and improved focus compared to last session.',
        'Notable improvement in pencil grasp and hand-eye coordination.',
        'Patient had difficulty with transitions between activities.',
        'Continue fine motor activities, introduce more complex bilateral tasks.',
        'Improve handwriting, enhance sensory tolerance',
        'Good', 'High', new Date(), new Date()
      ]);
    }

    // Create sample appointments
    console.log('📅 Creating sample appointments...');
    for (let i = 0; i < Math.min(15, patientRecords.length); i++) {
      const patient = patientRecords[i % patientRecords.length];
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 30));
      
      await connection.execute(`
        INSERT INTO appointments (patientId, therapistId, appointmentDate, startTime, endTime, duration, type, status, reason, notes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.patientId, patient.therapistId, appointmentDate, '09:00:00', '10:00:00', 60,
        'therapy', 'scheduled', 'Regular therapy session', 'Focus on fine motor skills development',
        new Date(), new Date()
      ]);
    }

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const [allUsers] = await connection.execute('SELECT id FROM users');
    
    for (let i = 0; i < Math.min(10, allUsers.length); i++) {
      const user = allUsers[i];
      await connection.execute(`
        INSERT INTO notifications (userId, title, message, type, isRead, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id, 'Welcome to TherapEase', 'Your account has been successfully created. Welcome to the TherapEase platform!',
        'system', false, new Date(), new Date()
      ]);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Seeded Data Summary:');
    console.log('   👤 Users: 1 admin + 5 therapists + 10 patients');
    console.log('   📋 Assessments: 10 comprehensive assessments');
    console.log('   📝 Daily Notes: 20 therapy session notes');
    console.log('   📅 Appointments: 15 scheduled appointments');
    console.log('   🔔 Notifications: 10 system notifications');
    console.log('\n🔑 Test Login Credentials:');
    console.log('   Admin: admin@therapease.com / admin123');
    console.log('   Therapist: dr.aleli.ong@therapease.com / therapist123');
    console.log('   Patient: alexandra.santos@email.com / patient123');
    
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
