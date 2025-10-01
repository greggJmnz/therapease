const { getConnection } = require('../config/database');

async function createComprehensiveTestData() {
  const connection = await getConnection();
  
  try {
    console.log('Creating comprehensive test data for all patients...');

    // Get all patients and therapists
    const [patients] = await connection.execute(`
      SELECT p.id, u.firstName, u.lastName, u.email 
      FROM patients p 
      JOIN users u ON p.userId = u.id 
      ORDER BY p.id
    `);
    
    const [therapists] = await connection.execute(`
      SELECT id, firstName, lastName, email 
      FROM users 
      WHERE role = 'therapist' 
      ORDER BY id
    `);

    console.log(`Found ${patients.length} patients and ${therapists.length} therapists`);

    if (patients.length === 0 || therapists.length === 0) {
      console.log('No patients or therapists found, skipping test data creation');
      return;
    }

    const therapistId = therapists[0].id;
    console.log(`Using therapist: ${therapists[0].firstName} ${therapists[0].lastName} (ID: ${therapistId})`);

    // Treatment plan templates
    const treatmentPlanTemplates = [
      {
        title: 'Fine Motor Skills Development',
        description: 'Comprehensive plan to improve fine motor skills, hand-eye coordination, and dexterity',
        mainObjectives: [
          {
            title: 'Improve Pencil Grip and Control',
            description: 'Develop proper pencil grip and improve writing control',
            category: 'Fine Motor Skills',
            priority: 'high',
            specificObjectives: [
              {
                title: 'Hold pencil with tripod grip for 5 minutes',
                description: 'Practice holding pencil with proper tripod grip without fatigue',
                targetDate: '2024-02-15'
              },
              {
                title: 'Write letters A-Z with proper form',
                description: 'Practice writing all letters with correct formation and spacing',
                targetDate: '2024-03-15'
              },
              {
                title: 'Complete tracing exercises accurately',
                description: 'Trace shapes, letters, and numbers with increasing precision',
                targetDate: '2024-02-28'
              }
            ]
          },
          {
            title: 'Enhance Hand-Eye Coordination',
            description: 'Improve coordination between visual input and hand movements',
            category: 'Fine Motor Skills',
            priority: 'medium',
            specificObjectives: [
              {
                title: 'Catch and throw ball accurately',
                description: 'Practice ball catching and throwing with both hands',
                targetDate: '2024-03-30'
              },
              {
                title: 'Complete puzzle activities',
                description: 'Work on age-appropriate puzzles to improve coordination',
                targetDate: '2024-04-15'
              },
              {
                title: 'Use tweezers to pick up small objects',
                description: 'Practice fine motor control with tweezers and small objects',
                targetDate: '2024-03-10'
              }
            ]
          },
          {
            title: 'Strengthen Finger Muscles',
            description: 'Build strength in small finger muscles for better dexterity',
            category: 'Fine Motor Skills',
            priority: 'medium',
            specificObjectives: [
              {
                title: 'Squeeze stress ball 20 times daily',
                description: 'Daily exercise to strengthen finger muscles',
                targetDate: '2024-02-20'
              },
              {
                title: 'Use clothespins to pick up objects',
                description: 'Practice using clothespins to develop finger strength',
                targetDate: '2024-03-05'
              }
            ]
          }
        ]
      },
      {
        title: 'Sensory Processing Development',
        description: 'Plan to improve sensory processing and self-regulation skills',
        mainObjectives: [
          {
            title: 'Improve Tactile Processing',
            description: 'Develop appropriate responses to tactile stimuli',
            category: 'Sensory Processing',
            priority: 'high',
            specificObjectives: [
              {
                title: 'Tolerate different textures for 5 minutes',
                description: 'Practice touching various textures without negative reactions',
                targetDate: '2024-02-25'
              },
              {
                title: 'Use sensory tools appropriately',
                description: 'Learn to use fidget toys and sensory tools for self-regulation',
                targetDate: '2024-03-20'
              }
            ]
          },
          {
            title: 'Develop Self-Regulation Skills',
            description: 'Learn strategies to manage emotions and behavior',
            category: 'Sensory Processing',
            priority: 'high',
            specificObjectives: [
              {
                title: 'Use deep breathing techniques',
                description: 'Practice deep breathing when feeling overwhelmed',
                targetDate: '2024-03-01'
              },
              {
                title: 'Identify emotional states',
                description: 'Learn to recognize and communicate emotional states',
                targetDate: '2024-03-25'
              }
            ]
          }
        ]
      },
      {
        title: 'Gross Motor Skills Enhancement',
        description: 'Develop large muscle groups and coordination for physical activities',
        mainObjectives: [
          {
            title: 'Improve Balance and Coordination',
            description: 'Develop better balance and body coordination',
            category: 'Gross Motor Skills',
            priority: 'medium',
            specificObjectives: [
              {
                title: 'Walk on balance beam for 10 steps',
                description: 'Practice walking on a balance beam without falling',
                targetDate: '2024-03-10'
              },
              {
                title: 'Hop on one foot 5 times',
                description: 'Develop single-leg balance and coordination',
                targetDate: '2024-03-15'
              }
            ]
          },
          {
            title: 'Strengthen Core Muscles',
            description: 'Build core strength for better posture and stability',
            category: 'Gross Motor Skills',
            priority: 'medium',
            specificObjectives: [
              {
                title: 'Hold plank position for 10 seconds',
                description: 'Practice core strengthening exercises',
                targetDate: '2024-03-20'
              },
              {
                title: 'Sit upright without support for 5 minutes',
                description: 'Improve posture and core stability',
                targetDate: '2024-03-25'
              }
            ]
          }
        ]
      }
    ];

    // Create treatment plans for each patient
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const template = treatmentPlanTemplates[i % treatmentPlanTemplates.length];
      
      console.log(`\\nCreating treatment plan for ${patient.firstName} ${patient.lastName}...`);

      // Create treatment plan
      const [planResult] = await connection.execute(`
        INSERT INTO treatment_plans (patientId, therapistId, title, description, startDate, endDate, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        patient.id,
        therapistId,
        `${template.title} - ${patient.firstName}`,
        template.description,
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
        'active'
      ]);

      const treatmentPlanId = planResult.insertId;
      console.log(`  Created treatment plan ID: ${treatmentPlanId}`);

      // Create main objectives
      for (const mainObj of template.mainObjectives) {
        const [mainResult] = await connection.execute(`
          INSERT INTO main_objectives (treatmentPlanId, title, description, category, priority)
          VALUES (?, ?, ?, ?, ?)
        `, [treatmentPlanId, mainObj.title, mainObj.description, mainObj.category, mainObj.priority]);
        
        const mainObjectiveId = mainResult.insertId;
        console.log(`    Created main objective: ${mainObj.title}`);

        // Create specific objectives
        for (const specificObj of mainObj.specificObjectives) {
          await connection.execute(`
            INSERT INTO specific_objectives (mainObjectiveId, title, description, targetDate)
            VALUES (?, ?, ?, ?)
          `, [mainObjectiveId, specificObj.title, specificObj.description, specificObj.targetDate]);
        }
        console.log(`      Created ${mainObj.specificObjectives.length} specific objectives`);
      }

      // Mark some objectives as completed for demonstration
      const [specificObjectives] = await connection.execute(`
        SELECT so.id FROM specific_objectives so
        JOIN main_objectives mo ON so.mainObjectiveId = mo.id
        WHERE mo.treatmentPlanId = ?
        ORDER BY so.id
        LIMIT 2
      `, [treatmentPlanId]);

      if (specificObjectives.length > 0) {
        await connection.execute(`
          UPDATE specific_objectives 
          SET isCompleted = TRUE, remarks = 'Great progress! Child shows improvement in this area.'
          WHERE id IN (?, ?)
        `, [specificObjectives[0].id, specificObjectives[1]?.id || specificObjectives[0].id]);
        console.log(`    Marked 2 objectives as completed`);
      }

      // Update progress calculations
      await updateProgressCalculations(connection, treatmentPlanId);
    }

    console.log('\\n✅ Comprehensive test data created successfully!');
    
    // Display summary
    const [summary] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT tp.id) as totalPlans,
        COUNT(DISTINCT mo.id) as totalMainObjectives,
        COUNT(DISTINCT so.id) as totalSpecificObjectives,
        COUNT(DISTINCT CASE WHEN so.isCompleted = 1 THEN so.id END) as completedObjectives
      FROM treatment_plans tp
      LEFT JOIN main_objectives mo ON tp.id = mo.treatmentPlanId
      LEFT JOIN specific_objectives so ON mo.id = so.mainObjectiveId
      WHERE tp.therapistId = ?
    `, [therapistId]);

    console.log('\\n📊 Data Summary:');
    console.log(`  - Treatment Plans: ${summary[0].totalPlans}`);
    console.log(`  - Main Objectives: ${summary[0].totalMainObjectives}`);
    console.log(`  - Specific Objectives: ${summary[0].totalSpecificObjectives}`);
    console.log(`  - Completed Objectives: ${summary[0].completedObjectives}`);

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function updateProgressCalculations(connection, treatmentPlanId) {
  try {
    // Calculate specific objectives progress for each main objective
    const [mainObjectives] = await connection.execute(`
      SELECT id FROM main_objectives WHERE treatmentPlanId = ?
    `, [treatmentPlanId]);

    for (const mainObj of mainObjectives) {
      const [specificProgress] = await connection.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN isCompleted = 1 THEN 1 ELSE 0 END) as completed
        FROM specific_objectives
        WHERE mainObjectiveId = ?
      `, [mainObj.id]);

      const specificProgressPercent = specificProgress[0].total > 0 
        ? (specificProgress[0].completed / specificProgress[0].total) * 100 
        : 0;

      await connection.execute(`
        UPDATE main_objectives 
        SET progress = ?
        WHERE id = ?
      `, [specificProgressPercent, mainObj.id]);
    }

    // Calculate overall treatment plan progress
    const [overallProgress] = await connection.execute(`
      SELECT 
        COUNT(DISTINCT mo.id) as totalMainObjectives,
        COUNT(DISTINCT CASE WHEN mo.status = 'completed' THEN mo.id END) as completedMainObjectives,
        COUNT(DISTINCT so.id) as totalSpecificObjectives,
        COUNT(DISTINCT CASE WHEN so.isCompleted = 1 THEN so.id END) as completedSpecificObjectives
      FROM main_objectives mo
      LEFT JOIN specific_objectives so ON mo.id = so.mainObjectiveId
      WHERE mo.treatmentPlanId = ?
    `, [treatmentPlanId]);

    const mainProgressPercent = overallProgress[0].totalMainObjectives > 0 
      ? (overallProgress[0].completedMainObjectives / overallProgress[0].totalMainObjectives) * 100 
      : 0;

    const specificProgressPercentOverall = overallProgress[0].totalSpecificObjectives > 0 
      ? (overallProgress[0].completedSpecificObjectives / overallProgress[0].totalSpecificObjectives) * 100 
      : 0;

    const overallProgressPercent = (mainProgressPercent + specificProgressPercentOverall) / 2;

    await connection.execute(`
      UPDATE treatment_plans 
      SET overallProgress = ?
      WHERE id = ?
    `, [overallProgressPercent, treatmentPlanId]);

  } catch (error) {
    console.error('Error updating progress calculations:', error);
  }
}

// Run the script
if (require.main === module) {
  createComprehensiveTestData()
    .then(() => {
      console.log('\\n🎉 Comprehensive test data creation completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test data creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createComprehensiveTestData };

