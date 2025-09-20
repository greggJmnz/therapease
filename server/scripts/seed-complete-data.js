#!/usr/bin/env node

/**
 * Complete Data Seeding Script for TherapEase
 * Populates database with comprehensive personal, professional, and medical information
 * Uses Philippine phone numbers and realistic data
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const initCompleteData = async () => {
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
    await clearExistingData(connection);
    
    // Seed users with complete information
    const userIds = await seedUsers(connection);
    
    // Seed therapists with professional information
    await seedTherapists(connection, userIds);
    
    // Seed patients with medical information
    await seedPatients(connection, userIds);
    
    // Seed assessments
    await seedAssessments(connection);
    
    // Seed daily notes
    await seedDailyNotes(connection);
    
    // Seed appointments
    await seedAppointments(connection);
    
    // Seed progress tracking
    await seedProgressTracking(connection);
    
    // Seed notifications
    await seedNotifications(connection);
    
    console.log('🎉 Complete data seeding finished successfully!');
    console.log('\n📊 Data Summary:');
    console.log('   • 1 Admin user');
    console.log('   • 5 Therapist users with complete professional info');
    console.log('   • 15 Patient users with complete medical info');
    console.log('   • 25 Assessments');
    console.log('   • 50 Daily notes');
    console.log('   • 30 Appointments');
    console.log('   • 45 Progress tracking entries');
    console.log('   • 20 Notifications');
    
  } catch (error) {
    console.error('❌ Data seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

const clearExistingData = async (connection) => {
  console.log('🧹 Clearing existing data...');
  
  const tables = [
    'notifications', 'progress_tracking', 'appointments', 'daily_notes', 
    'assessments', 'patients', 'therapists', 'users'
  ];
  
  for (const table of tables) {
    await connection.execute(`DELETE FROM ${table}`);
  }
  
  console.log('✅ Existing data cleared');
};

const seedUsers = async (connection) => {
  console.log('👥 Seeding users with complete information...');
  
  const users = [
    // Admin
    {
      email: 'admin@therapease.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      firstName: 'Maria',
      lastName: 'Santos',
      phone: '+639171234567',
      dateOfBirth: '1985-03-15',
      gender: 'female',
      address: '123 Ayala Avenue, Makati City',
      city: 'Makati City',
      state: 'Metro Manila',
      zipCode: '1226'
    },
    
    // Therapists
    {
      email: 'dr.aleli.ong@therapease.com',
      password: await bcrypt.hash('therapist123', 10),
      role: 'therapist',
      firstName: 'Aleli',
      lastName: 'Ong',
      phone: '+639151234567',
      dateOfBirth: '1988-07-22',
      gender: 'female',
      address: '456 Ortigas Avenue, Pasig City',
      city: 'Pasig City',
      state: 'Metro Manila',
      zipCode: '1600'
    },
    {
      email: 'dr.juan.cruz@therapease.com',
      password: await bcrypt.hash('therapist123', 10),
      role: 'therapist',
      firstName: 'Juan',
      lastName: 'Cruz',
      phone: '+639201234567',
      dateOfBirth: '1982-11-08',
      gender: 'male',
      address: '789 EDSA, Quezon City',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1100'
    },
    {
      email: 'dr.ana.reyes@therapease.com',
      password: await bcrypt.hash('therapist123', 10),
      role: 'therapist',
      firstName: 'Ana',
      lastName: 'Reyes',
      phone: '+639251234567',
      dateOfBirth: '1990-05-14',
      gender: 'female',
      address: '321 Taft Avenue, Manila',
      city: 'Manila',
      state: 'Metro Manila',
      zipCode: '1000'
    },
    {
      email: 'dr.miguel.torres@therapease.com',
      password: await bcrypt.hash('therapist123', 10),
      role: 'therapist',
      firstName: 'Miguel',
      lastName: 'Torres',
      phone: '+639301234567',
      dateOfBirth: '1987-09-30',
      gender: 'male',
      address: '654 Commonwealth Avenue, Quezon City',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1121'
    },
    {
      email: 'dr.carmen.lopez@therapease.com',
      password: await bcrypt.hash('therapist123', 10),
      role: 'therapist',
      firstName: 'Carmen',
      lastName: 'Lopez',
      phone: '+639351234567',
      dateOfBirth: '1984-12-03',
      gender: 'female',
      address: '987 Katipunan Avenue, Quezon City',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1108'
    },
    
    // Patients
    {
      email: 'alexandra.santos@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Alexandra',
      lastName: 'Santos',
      phone: '+639171234568',
      dateOfBirth: '2015-04-12',
      gender: 'female',
      address: '123 BGC High Street, Taguig City',
      city: 'Taguig City',
      state: 'Metro Manila',
      zipCode: '1634'
    },
    {
      email: 'marcus.delacruz@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Marcus',
      lastName: 'Dela Cruz',
      phone: '+639181234568',
      dateOfBirth: '2013-08-25',
      gender: 'male',
      address: '456 Alabang-Zapote Road, Las Piñas City',
      city: 'Las Piñas City',
      state: 'Metro Manila',
      zipCode: '1740'
    },
    {
      email: 'sophia.garcia@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Sophia',
      lastName: 'Garcia',
      phone: '+639191234568',
      dateOfBirth: '2016-01-18',
      gender: 'female',
      address: '789 Shaw Boulevard, Mandaluyong City',
      city: 'Mandaluyong City',
      state: 'Metro Manila',
      zipCode: '1550'
    },
    {
      email: 'ethan.rodriguez@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Ethan',
      lastName: 'Rodriguez',
      phone: '+639211234568',
      dateOfBirth: '2014-06-07',
      gender: 'male',
      address: '321 C5 Road, Parañaque City',
      city: 'Parañaque City',
      state: 'Metro Manila',
      zipCode: '1700'
    },
    {
      email: 'isabella.martinez@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Isabella',
      lastName: 'Martinez',
      phone: '+639221234568',
      dateOfBirth: '2017-03-29',
      gender: 'female',
      address: '654 Marcos Highway, Marikina City',
      city: 'Marikina City',
      state: 'Metro Manila',
      zipCode: '1800'
    },
    {
      email: 'noah.hernandez@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Noah',
      lastName: 'Hernandez',
      phone: '+639231234568',
      dateOfBirth: '2012-11-14',
      gender: 'male',
      address: '987 Rizal Avenue, Caloocan City',
      city: 'Caloocan City',
      state: 'Metro Manila',
      zipCode: '1400'
    },
    {
      email: 'olivia.gonzalez@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Olivia',
      lastName: 'Gonzalez',
      phone: '+639241234568',
      dateOfBirth: '2018-09-05',
      gender: 'female',
      address: '123 Sucat Road, Muntinlupa City',
      city: 'Muntinlupa City',
      state: 'Metro Manila',
      zipCode: '1770'
    },
    {
      email: 'liam.wilson@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Liam',
      lastName: 'Wilson',
      phone: '+639251234568',
      dateOfBirth: '2015-12-22',
      gender: 'male',
      address: '456 Valenzuela City',
      city: 'Valenzuela City',
      state: 'Metro Manila',
      zipCode: '1440'
    },
    {
      email: 'ava.anderson@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Ava',
      lastName: 'Anderson',
      phone: '+639261234568',
      dateOfBirth: '2016-07-11',
      gender: 'female',
      address: '789 Malabon City',
      city: 'Malabon City',
      state: 'Metro Manila',
      zipCode: '1470'
    },
    {
      email: 'william.thomas@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'William',
      lastName: 'Thomas',
      phone: '+639271234568',
      dateOfBirth: '2013-02-28',
      gender: 'male',
      address: '321 Navotas City',
      city: 'Navotas City',
      state: 'Metro Manila',
      zipCode: '1485'
    },
    {
      email: 'mia.taylor@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Mia',
      lastName: 'Taylor',
      phone: '+639281234568',
      dateOfBirth: '2017-10-16',
      gender: 'female',
      address: '654 Pateros',
      city: 'Pateros',
      state: 'Metro Manila',
      zipCode: '1775'
    },
    {
      email: 'james.moore@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'James',
      lastName: 'Moore',
      phone: '+639291234568',
      dateOfBirth: '2014-05-03',
      gender: 'male',
      address: '987 San Juan City',
      city: 'San Juan City',
      state: 'Metro Manila',
      zipCode: '1500'
    },
    {
      email: 'charlotte.jackson@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Charlotte',
      lastName: 'Jackson',
      phone: '+639301234568',
      dateOfBirth: '2016-08-19',
      gender: 'female',
      address: '123 Marikina Heights, Marikina City',
      city: 'Marikina City',
      state: 'Metro Manila',
      zipCode: '1810'
    },
    {
      email: 'benjamin.white@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Benjamin',
      lastName: 'White',
      phone: '+639311234568',
      dateOfBirth: '2015-01-26',
      gender: 'male',
      address: '456 Eastwood City, Quezon City',
      city: 'Quezon City',
      state: 'Metro Manila',
      zipCode: '1110'
    },
    {
      email: 'amelia.harris@email.com',
      password: await bcrypt.hash('patient123', 10),
      role: 'patient',
      firstName: 'Amelia',
      lastName: 'Harris',
      phone: '+639321234568',
      dateOfBirth: '2018-04-13',
      gender: 'female',
      address: '789 Rockwell Center, Makati City',
      city: 'Makati City',
      state: 'Metro Manila',
      zipCode: '1200'
    }
  ];

  const userIds = [];
  for (const user of users) {
    const [result] = await connection.execute(`
      INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.email, user.password, user.role, user.firstName, user.lastName,
      user.phone, user.dateOfBirth, user.gender, user.address, user.city, user.state, user.zipCode
    ]);
    userIds.push(result.insertId);
  }

  console.log(`✅ Seeded ${users.length} users`);
  return userIds;
};

const seedTherapists = async (connection, userIds) => {
  console.log('👩‍⚕️ Seeding therapists with professional information...');
  
  const therapists = [
    {
      userId: userIds[1], // Dr. Aleli Ong (index 1 = second user)
      licenseNumber: 'OT-PH-2015-001234',
      specialization: 'Pediatric Occupational Therapy, Sensory Integration, Fine Motor Development',
      yearsOfExperience: 8,
      education: 'Master of Science in Occupational Therapy - University of the Philippines Manila (2015), Bachelor of Science in Occupational Therapy - University of the Philippines Manila (2012)',
      certifications: 'Certified Sensory Integration Specialist (CSIS), Pediatric Occupational Therapy Certification (POTC), Autism Spectrum Disorder Specialist (ASDS)',
      availability: 'Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 2:00 PM'
    },
    {
      userId: userIds[2], // Dr. Juan Cruz
      licenseNumber: 'OT-PH-2010-005678',
      specialization: 'Adult Occupational Therapy, Hand Therapy, Neurological Rehabilitation',
      yearsOfExperience: 13,
      education: 'Doctor of Philosophy in Occupational Therapy - University of Santo Tomas (2018), Master of Science in Occupational Therapy - University of Santo Tomas (2010), Bachelor of Science in Occupational Therapy - University of Santo Tomas (2008)',
      certifications: 'Certified Hand Therapist (CHT), Neurological Rehabilitation Specialist (NRS), Advanced Practice in Occupational Therapy (APOT)',
      availability: 'Monday-Friday: 7:00 AM - 5:00 PM, Saturday: 8:00 AM - 12:00 PM'
    },
    {
      userId: userIds[3], // Dr. Ana Reyes
      licenseNumber: 'OT-PH-2018-009876',
      specialization: 'Pediatric Occupational Therapy, Developmental Delays, School-Based Therapy',
      yearsOfExperience: 5,
      education: 'Master of Science in Occupational Therapy - Ateneo de Manila University (2018), Bachelor of Science in Occupational Therapy - Ateneo de Manila University (2016)',
      certifications: 'School-Based Occupational Therapy Specialist (SBOTS), Developmental Delay Intervention Specialist (DDIS)',
      availability: 'Monday-Friday: 9:00 AM - 7:00 PM, Sunday: 10:00 AM - 4:00 PM'
    },
    {
      userId: userIds[4], // Dr. Miguel Torres
      licenseNumber: 'OT-PH-2012-003456',
      specialization: 'Geriatric Occupational Therapy, Home Health, Assistive Technology',
      yearsOfExperience: 11,
      education: 'Master of Science in Occupational Therapy - De La Salle University (2012), Bachelor of Science in Occupational Therapy - De La Salle University (2010)',
      certifications: 'Geriatric Occupational Therapy Specialist (GOTS), Assistive Technology Professional (ATP), Home Health Specialist (HHS)',
      availability: 'Monday-Friday: 8:00 AM - 4:00 PM, Saturday: 9:00 AM - 1:00 PM'
    },
    {
      userId: userIds[5], // Dr. Carmen Lopez
      licenseNumber: 'OT-PH-2016-007890',
      specialization: 'Mental Health Occupational Therapy, Cognitive Rehabilitation, Group Therapy',
      yearsOfExperience: 7,
      education: 'Master of Science in Occupational Therapy - University of the Philippines Diliman (2016), Bachelor of Science in Occupational Therapy - University of the Philippines Diliman (2014)',
      certifications: 'Mental Health Occupational Therapy Specialist (MHOTS), Cognitive Rehabilitation Specialist (CRS), Group Therapy Facilitator (GTF)',
      availability: 'Monday-Friday: 10:00 AM - 8:00 PM, Saturday: 9:00 AM - 3:00 PM'
    }
  ];

  for (const therapist of therapists) {
    await connection.execute(`
      INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      therapist.userId, therapist.licenseNumber, therapist.specialization,
      therapist.yearsOfExperience, therapist.education, therapist.certifications, therapist.availability
    ]);
  }

  console.log(`✅ Seeded ${therapists.length} therapists`);
};

const seedPatients = async (connection, userIds) => {
  console.log('👶 Seeding patients with medical information...');
  
  const patients = [
    {
      userId: userIds[6], // Alexandra Santos (index 6 = 7th user)
      diagnosis: 'Developmental Coordination Disorder (DCD)',
      medicalHistory: 'Born at 36 weeks gestation, no significant medical history. Parents report difficulty with fine motor tasks and coordination since age 3.',
      goals: 'Improve fine motor skills, enhance hand-eye coordination, develop self-care independence, improve handwriting legibility',
      therapistId: 2,
      emergencyContact: 'Maria Santos (Mother) - +639171234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-2, Maxicare - Policy: MC-2024-001234'
    },
    {
      userId: 8, // Marcus Dela Cruz
      diagnosis: 'Autism Spectrum Disorder (ASD) - Level 1',
      medicalHistory: 'Diagnosed at age 4. No significant medical history. Parents report sensory sensitivities and social communication challenges.',
      goals: 'Improve sensory processing, enhance social interaction skills, develop communication abilities, increase independence in daily activities',
      therapistId: 2,
      emergencyContact: 'Roberto Dela Cruz (Father) - +639181234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-3, Cigna - Policy: CG-2024-002345'
    },
    {
      userId: 9, // Sophia Garcia
      diagnosis: 'Cerebral Palsy - Spastic Diplegia',
      medicalHistory: 'Born at 32 weeks gestation, diagnosed at 6 months. History of seizures, well-controlled with medication.',
      goals: 'Improve gross motor function, enhance balance and coordination, develop self-care skills, increase mobility independence',
      therapistId: 4,
      emergencyContact: 'Elena Garcia (Mother) - +639191234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-4, Blue Cross - Policy: BC-2024-003456'
    },
    {
      userId: 10, // Ethan Rodriguez
      diagnosis: 'Attention Deficit Hyperactivity Disorder (ADHD) with Sensory Processing Disorder',
      medicalHistory: 'Diagnosed at age 6. No significant medical history. Parents report difficulty with attention, hyperactivity, and sensory sensitivities.',
      goals: 'Improve attention and focus, enhance sensory processing, develop self-regulation skills, improve academic performance',
      therapistId: 2,
      emergencyContact: 'Carlos Rodriguez (Father) - +639211234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-5, Medicard - Policy: MD-2024-004567'
    },
    {
      userId: 11, // Isabella Martinez
      diagnosis: 'Down Syndrome',
      medicalHistory: 'Born at 38 weeks gestation, diagnosed at birth. History of congenital heart defect, repaired at 6 months.',
      goals: 'Improve fine and gross motor skills, enhance cognitive development, develop communication skills, increase independence',
      therapistId: 4,
      emergencyContact: 'Patricia Martinez (Mother) - +639221234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-6, Intellicare - Policy: IC-2024-005678'
    },
    {
      userId: 12, // Noah Hernandez
      diagnosis: 'Learning Disability with Motor Coordination Difficulties',
      medicalHistory: 'No significant medical history. Parents report academic struggles and motor coordination challenges since kindergarten.',
      goals: 'Improve motor coordination, enhance academic performance, develop self-confidence, improve handwriting and fine motor skills',
      therapistId: 3,
      emergencyContact: 'Sofia Hernandez (Mother) - +639231234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-7, Maxicare - Policy: MC-2024-006789'
    },
    {
      userId: 13, // Olivia Gonzalez
      diagnosis: 'Sensory Processing Disorder (SPD)',
      medicalHistory: 'No significant medical history. Parents report sensory sensitivities and behavioral challenges since age 2.',
      goals: 'Improve sensory processing, enhance self-regulation, develop coping strategies, improve social interaction',
      therapistId: 2,
      emergencyContact: 'Miguel Gonzalez (Father) - +639241234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-8, Cigna - Policy: CG-2024-007890'
    },
    {
      userId: 14, // Liam Wilson
      diagnosis: 'Fetal Alcohol Spectrum Disorder (FASD)',
      medicalHistory: 'Adopted at age 3. History of prenatal alcohol exposure. No significant medical history since adoption.',
      goals: 'Improve cognitive function, enhance motor skills, develop social skills, increase independence in daily activities',
      therapistId: 4,
      emergencyContact: 'Jennifer Wilson (Adoptive Mother) - +639251234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-9, Blue Cross - Policy: BC-2024-008901'
    },
    {
      userId: 15, // Ava Anderson
      diagnosis: 'Developmental Delay - Global',
      medicalHistory: 'No significant medical history. Parents report delays in multiple developmental areas since age 18 months.',
      goals: 'Improve overall development, enhance motor skills, develop communication abilities, increase independence',
      therapistId: 2,
      emergencyContact: 'Michael Anderson (Father) - +639261234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-0, Medicard - Policy: MD-2024-009012'
    },
    {
      userId: 16, // William Thomas
      diagnosis: 'Traumatic Brain Injury (TBI) - Mild',
      medicalHistory: 'Sustained TBI from bicycle accident at age 8. No significant medical history prior to accident.',
      goals: 'Improve cognitive function, enhance motor skills, develop compensatory strategies, increase independence',
      therapistId: 3,
      emergencyContact: 'Sarah Thomas (Mother) - +639271234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-1, Intellicare - Policy: IC-2024-010123'
    },
    {
      userId: 17, // Mia Taylor
      diagnosis: 'Premature Birth - 28 weeks gestation',
      medicalHistory: 'Born at 28 weeks gestation, spent 3 months in NICU. History of respiratory issues, resolved by age 2.',
      goals: 'Improve motor development, enhance sensory processing, develop age-appropriate skills, increase independence',
      therapistId: 4,
      emergencyContact: 'David Taylor (Father) - +639281234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-2, Maxicare - Policy: MC-2024-011234'
    },
    {
      userId: 18, // James Moore
      diagnosis: 'Intellectual Disability - Mild',
      medicalHistory: 'No significant medical history. Parents report developmental delays since infancy.',
      goals: 'Improve cognitive function, enhance motor skills, develop life skills, increase independence',
      therapistId: 3,
      emergencyContact: 'Lisa Moore (Mother) - +639291234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-3, Cigna - Policy: CG-2024-012345'
    },
    {
      userId: 19, // Charlotte Jackson
      diagnosis: 'Spina Bifida - Occulta',
      medicalHistory: 'Diagnosed at birth. No significant medical history. Parents report mild motor coordination difficulties.',
      goals: 'Improve motor coordination, enhance balance and posture, develop self-care skills, increase independence',
      therapistId: 4,
      emergencyContact: 'Robert Jackson (Father) - +639301234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-4, Blue Cross - Policy: BC-2024-013456'
    },
    {
      userId: 20, // Benjamin White
      diagnosis: 'Pervasive Developmental Disorder (PDD-NOS)',
      medicalHistory: 'No significant medical history. Parents report social and communication challenges since age 3.',
      goals: 'Improve social interaction, enhance communication skills, develop sensory processing, increase independence',
      therapistId: 2,
      emergencyContact: 'Amanda White (Mother) - +639311234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-5, Medicard - Policy: MD-2024-014567'
    },
    {
      userId: 21, // Amelia Harris
      diagnosis: 'Developmental Coordination Disorder (DCD) with ADHD',
      medicalHistory: 'No significant medical history. Parents report motor coordination difficulties and attention challenges since age 4.',
      goals: 'Improve motor coordination, enhance attention and focus, develop self-regulation skills, increase independence',
      therapistId: 2,
      emergencyContact: 'Christopher Harris (Father) - +639321234569',
      insuranceInfo: 'PhilHealth Member - ID: 12-345678901-6, Intellicare - Policy: IC-2024-015678'
    }
  ];

  for (const patient of patients) {
    await connection.execute(`
      INSERT INTO patients (userId, diagnosis, medicalHistory, goals, therapistId, emergencyContact, insuranceInfo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      patient.userId, patient.diagnosis, patient.medicalHistory, patient.goals,
      patient.therapistId, patient.emergencyContact, patient.insuranceInfo
    ]);
  }

  console.log(`✅ Seeded ${patients.length} patients`);
};

const seedAssessments = async (connection) => {
  console.log('📋 Seeding assessments...');
  
  const assessments = [
    {
      patientId: 1, therapistId: 2, title: 'Initial Comprehensive Assessment',
      type: 'initial', category: 'Comprehensive', assessmentDate: '2024-01-15',
      status: 'completed', score: 75, maxScore: 100,
      summary: 'Patient shows moderate delays in fine motor skills and coordination. Good attention span and social interaction.',
      recommendations: JSON.stringify(['Weekly OT sessions', 'Home exercise program', 'Sensory diet implementation']),
      areas: JSON.stringify(['Fine Motor', 'Coordination', 'Sensory Processing']),
      aiInsights: 'AI analysis suggests focus on bilateral coordination and hand strength development.'
    },
    {
      patientId: 2, therapistId: 2, title: 'Sensory Processing Assessment',
      type: 'initial', category: 'Sensory', assessmentDate: '2024-01-20',
      status: 'completed', score: 60, maxScore: 100,
      summary: 'Patient demonstrates significant sensory sensitivities, particularly to tactile and auditory stimuli.',
      recommendations: JSON.stringify(['Sensory integration therapy', 'Environmental modifications', 'Sensory breaks']),
      areas: JSON.stringify(['Sensory Processing', 'Self-Regulation', 'Attention']),
      aiInsights: 'AI analysis indicates need for comprehensive sensory diet and environmental adaptations.'
    },
    {
      patientId: 3, therapistId: 4, title: 'Motor Function Assessment',
      type: 'initial', category: 'Motor', assessmentDate: '2024-01-25',
      status: 'completed', score: 45, maxScore: 100,
      summary: 'Patient shows significant motor delays consistent with cerebral palsy diagnosis.',
      recommendations: JSON.stringify(['Intensive motor therapy', 'Assistive technology evaluation', 'Family training']),
      areas: JSON.stringify(['Gross Motor', 'Fine Motor', 'Balance']),
      aiInsights: 'AI analysis suggests focus on functional mobility and independence training.'
    }
  ];

  // Generate more assessments
  for (let i = 4; i <= 25; i++) {
    const patientId = Math.floor(Math.random() * 15) + 1;
    const therapistId = Math.floor(Math.random() * 5) + 2;
    const types = ['initial', 'progress', 'final'];
    const categories = ['Comprehensive', 'Motor', 'Sensory', 'Cognitive', 'Social'];
    const statuses = ['scheduled', 'in-progress', 'completed'];
    
    assessments.push({
      patientId,
      therapistId,
      title: `${categories[Math.floor(Math.random() * categories.length)]} Assessment ${i}`,
      type: types[Math.floor(Math.random() * types.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      assessmentDate: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      score: Math.floor(Math.random() * 40) + 60,
      maxScore: 100,
      summary: `Assessment summary for patient ${patientId}. Shows progress in various areas.`,
      recommendations: JSON.stringify(['Continue current therapy', 'Adjust goals', 'Home program updates']),
      areas: JSON.stringify(['Fine Motor', 'Gross Motor', 'Sensory Processing']),
      aiInsights: 'AI analysis provides insights into patient progress and recommendations.'
    });
  }

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

  console.log(`✅ Seeded ${assessments.length} assessments`);
};

const seedDailyNotes = async (connection) => {
  console.log('📝 Seeding daily notes...');
  
  const dailyNotes = [];
  
  // Generate daily notes for the past 30 days
  for (let i = 0; i < 50; i++) {
    const patientId = Math.floor(Math.random() * 15) + 1;
    const therapistId = Math.floor(Math.random() * 5) + 2;
    const sessionDate = new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0];
    const duration = [30, 45, 60][Math.floor(Math.random() * 3)];
    
    dailyNotes.push({
      patientId,
      therapistId,
      sessionDate,
      sessionDuration: duration,
      activities: 'Fine motor activities, sensory play, coordination exercises',
      observations: 'Patient showed good engagement and made progress in targeted areas.',
      progress: 'Continued improvement in fine motor skills and attention span.',
      challenges: 'Some difficulty with transitions and new activities.',
      nextSteps: 'Continue current activities, introduce new challenges gradually.',
      mood: ['Good', 'Excellent', 'Fair', 'Challenging'][Math.floor(Math.random() * 4)],
      engagement: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)]
    });
  }

  for (const note of dailyNotes) {
    await connection.execute(`
      INSERT INTO daily_notes (patientId, therapistId, sessionDate, sessionDuration, activities, observations, progress, challenges, nextSteps, mood, engagement)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      note.patientId, note.therapistId, note.sessionDate, note.sessionDuration,
      note.activities, note.observations, note.progress, note.challenges,
      note.nextSteps, note.mood, note.engagement
    ]);
  }

  console.log(`✅ Seeded ${dailyNotes.length} daily notes`);
};

const seedAppointments = async (connection) => {
  console.log('📅 Seeding appointments...');
  
  const appointments = [];
  
  // Generate appointments for the next 30 days
  for (let i = 0; i < 30; i++) {
    const patientId = Math.floor(Math.random() * 15) + 1;
    const therapistId = Math.floor(Math.random() * 5) + 2;
    const appointmentDate = new Date(2024, 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
    const startTime = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'][Math.floor(Math.random() * 6)];
    const duration = [30, 45, 60][Math.floor(Math.random() * 3)];
    const endTime = new Date(`2000-01-01T${startTime}:00`);
    endTime.setMinutes(endTime.getMinutes() + duration);
    const endTimeStr = endTime.toTimeString().substring(0, 5);
    
    appointments.push({
      patientId,
      therapistId,
      appointmentDate,
      startTime,
      endTime: endTimeStr,
      duration,
      type: ['Regular Session', 'Assessment', 'Follow-up', 'Initial Consultation'][Math.floor(Math.random() * 4)],
      status: ['scheduled', 'confirmed', 'completed'][Math.floor(Math.random() * 3)],
      notes: 'Regular therapy session focused on patient goals.'
    });
  }

  for (const appointment of appointments) {
    await connection.execute(`
      INSERT INTO appointments (patientId, therapistId, appointmentDate, startTime, endTime, duration, type, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appointment.patientId, appointment.therapistId, appointment.appointmentDate,
      appointment.startTime, appointment.endTime, appointment.duration,
      appointment.type, appointment.status, appointment.notes
    ]);
  }

  console.log(`✅ Seeded ${appointments.length} appointments`);
};

const seedProgressTracking = async (connection) => {
  console.log('📊 Seeding progress tracking...');
  
  const progressEntries = [];
  
  for (let i = 0; i < 45; i++) {
    const patientId = Math.floor(Math.random() * 15) + 1;
    const areas = ['Fine Motor', 'Gross Motor', 'Sensory Processing', 'Cognitive', 'Social Skills', 'Self-Care'];
    const area = areas[Math.floor(Math.random() * areas.length)];
    
    progressEntries.push({
      patientId,
      assessmentId: Math.floor(Math.random() * 25) + 1,
      area,
      baselineScore: Math.floor(Math.random() * 30) + 20,
      currentScore: Math.floor(Math.random() * 40) + 40,
      targetScore: Math.floor(Math.random() * 20) + 80,
      progressNotes: `Progress in ${area} area shows improvement.`,
      measurementDate: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString().split('T')[0],
      nextReviewDate: new Date(2024, 1, Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0]
    });
  }

  for (const entry of progressEntries) {
    await connection.execute(`
      INSERT INTO progress_tracking (patientId, assessmentId, area, baselineScore, currentScore, targetScore, progressNotes, measurementDate, nextReviewDate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.patientId, entry.assessmentId, entry.area, entry.baselineScore,
      entry.currentScore, entry.targetScore, entry.progressNotes,
      entry.measurementDate, entry.nextReviewDate
    ]);
  }

  console.log(`✅ Seeded ${progressEntries.length} progress tracking entries`);
};

const seedNotifications = async (connection) => {
  console.log('🔔 Seeding notifications...');
  
  const notifications = [
    {
      userId: 2, type: 'appointment', title: 'Appointment Reminder',
      message: 'You have an appointment with Alexandra Santos tomorrow at 10:00 AM.',
      isRead: false
    },
    {
      userId: 2, type: 'assessment', title: 'Assessment Due',
      message: 'Progress assessment for Marcus Dela Cruz is due next week.',
      isRead: false
    },
    {
      userId: 7, type: 'progress', title: 'Progress Update',
      message: 'Your therapy progress has been updated. Check your dashboard for details.',
      isRead: true
    },
    {
      userId: 8, type: 'appointment', title: 'Appointment Confirmed',
      message: 'Your appointment with Dr. Aleli Ong has been confirmed for next Tuesday.',
      isRead: false
    }
  ];

  // Generate more notifications
  for (let i = 4; i < 20; i++) {
    const userId = Math.floor(Math.random() * 21) + 1;
    const types = ['appointment', 'assessment', 'progress', 'system'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    notifications.push({
      userId,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Notification`,
      message: `This is a ${type} notification for user ${userId}.`,
      isRead: Math.random() > 0.5
    });
  }

  for (const notification of notifications) {
    await connection.execute(`
      INSERT INTO notifications (userId, type, title, message, isRead)
      VALUES (?, ?, ?, ?, ?)
    `, [
      notification.userId, notification.type, notification.title,
      notification.message, notification.isRead ? 1 : 0
    ]);
  }

  console.log(`✅ Seeded ${notifications.length} notifications`);
};

// Run the seeding
if (require.main === module) {
  initCompleteData().catch(console.error);
}

module.exports = initCompleteData;
