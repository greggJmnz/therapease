#!/usr/bin/env node
/**
 * Query Optimization Script
 * Analyzes slow queries using EXPLAIN and provides optimization recommendations
 */

const path = require('path');
const fs = require('fs');

// Load environment variables before requiring database config
// Try multiple possible locations for .env.production
const possibleEnvFiles = [
  path.join(__dirname, '../.env.production'),
  path.join(__dirname, '../../.env.production'),
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../../.env')
];

let envFile = null;
for (const file of possibleEnvFiles) {
  if (fs.existsSync(file)) {
    envFile = file;
    console.log(`📄 Loading environment from: ${file}`);
    break;
  }
}

if (envFile) {
  require('dotenv').config({ path: envFile });
} else {
  console.warn('⚠️  No .env file found, using environment variables or defaults');
}

// Verify database credentials are loaded
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD ? '***' : 'NOT SET';
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbName = process.env.DB_NAME || 'therapease';

console.log(`🔐 Database Config:`);
console.log(`   Host: ${dbHost}`);
console.log(`   User: ${dbUser}`);
console.log(`   Password: ${dbPassword}`);
console.log(`   Database: ${dbName}`);
console.log('');

if (!process.env.DB_PASSWORD) {
  console.error('❌ ERROR: DB_PASSWORD is not set!');
  console.error('   Please set DB_PASSWORD in your .env.production file');
  process.exit(1);
}

const queryOptimizer = require('../utils/queryOptimizer');
const { getAll } = require('../config/database');

// Common slow queries to analyze
const commonQueries = [
  {
    name: 'Get all patients with assignments',
    sql: `
      SELECT 
        p.id,
        p.userId,
        u.firstName,
        u.lastName,
        u.email,
        JSON_ARRAYAGG(
          IF(
            pta.id IS NOT NULL,
            JSON_OBJECT(
              'id', pta.id,
              'therapistId', tu.id,
              'therapistName', CONCAT(tu.firstName, ' ', tu.lastName)
            ),
            NULL
          )
        ) AS therapistAssignments
      FROM patients p
      JOIN users u ON p.userId = u.id
      LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId AND pta.status = 'active'
      LEFT JOIN users tu ON pta.therapistId = tu.id
      WHERE u.role = 'patient'
      GROUP BY p.id, u.id
      ORDER BY u.firstName, u.lastName
    `,
    params: []
  },
  {
    name: 'Get therapist dashboard stats',
    sql: `
      SELECT
        (SELECT COUNT(DISTINCT pta.patientId) 
         FROM patient_therapist_assignments pta
         WHERE pta.therapistId = ? AND pta.status = 'active') as totalPatients,
        (SELECT COUNT(*) FROM assessments a WHERE a.therapistId = ?) as totalAssessments,
        (SELECT COUNT(*) FROM appointments a WHERE a.therapistId = ?) as totalAppointments
    `,
    params: [1, 1, 1] // Example therapist ID
  },
  {
    name: 'Get notifications for user',
    sql: `
      SELECT id, title, message, type, isRead, priority, createdAt
      FROM notifications
      WHERE userId = ?
      ORDER BY createdAt DESC
    `,
    params: [1] // Example user ID
  }
];

async function analyzeQueries() {
  console.log('🔍 Query Optimization Analysis');
  console.log('================================\n');

  for (const query of commonQueries) {
    console.log(`\n📊 Analyzing: ${query.name}`);
    console.log('─'.repeat(50));
    
    // Get query metrics
    const metrics = await queryOptimizer.getQueryMetrics(query.sql, query.params);
    console.log(`⏱️  Execution Time: ${metrics.executionTime}ms`);
    console.log(`📦 Rows Returned: ${metrics.rowsReturned || 'N/A'}`);
    if (metrics.slow) {
      console.log('⚠️  SLOW QUERY DETECTED (>1s)');
    }

    // Explain query
    const explain = await queryOptimizer.explain(query.sql, query.params);
    
    if (explain.success) {
      console.log('\n📋 EXPLAIN Analysis:');
      console.log(JSON.stringify(explain.analysis, null, 2));
      
      console.log('\n💡 Recommendations:');
      explain.recommendations.forEach((rec, index) => {
        const emoji = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${emoji} ${index + 1}. ${rec.issue}`);
        console.log(`   → ${rec.suggestion}`);
      });
    } else {
      console.log(`❌ Error: ${explain.error}`);
    }
  }

  console.log('\n✅ Analysis complete!');
  console.log('\n💡 Tips:');
  console.log('   - Add indexes on frequently queried columns');
  console.log('   - Use EXPLAIN to analyze query execution plans');
  console.log('   - Monitor slow query log in MySQL');
  console.log('   - Consider caching frequently accessed data');
}

// Run analysis
analyzeQueries().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});

