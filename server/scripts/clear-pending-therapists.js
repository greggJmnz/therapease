#!/usr/bin/env node

/**
 * Script to clear or remove pending therapists
 * 
 * Usage:
 *   node server/scripts/clear-pending-therapists.js [--delete] [--approve] [--dry-run]
 * 
 * Options:
 *   --delete    : Permanently delete pending therapists (default: false)
 *   --approve   : Approve pending therapists instead of deleting (default: false)
 *   --dry-run   : Show what would be done without making changes (default: false)
 */

const path = require('path');

// Load environment variables - use .env.production in production, .env in development
// Check if NODE_ENV is set, otherwise default to production for VPS
const nodeEnv = process.env.NODE_ENV || 'production';
const envFile = nodeEnv === 'production' 
  ? path.join(__dirname, '../.env.production')
  : path.join(__dirname, '../../.env');
require('dotenv').config({ path: envFile });

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = nodeEnv;
}

const { getConnection, getAll, runQuery } = require('../config/database');
const { decryptField } = require('../utils/encryption');

const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');
const shouldApprove = args.includes('--approve');
const isDryRun = args.includes('--dry-run');

async function clearPendingTherapists() {
  let connection;
  
  try {
    console.log('🔍 Connecting to database...');
    connection = await getConnection();
    console.log('✅ Connected to database\n');

    // Get all pending therapists
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.status,
        u.createdAt,
        t.id as therapistId
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist' AND u.status = 'pending'
      ORDER BY u.createdAt DESC
    `;

    const pendingTherapists = await getAll(sql);

    if (pendingTherapists.length === 0) {
      console.log('ℹ️  No pending therapists found.');
      return;
    }

    console.log(`📋 Found ${pendingTherapists.length} pending therapist(s):\n`);
    
    // Display pending therapists
    for (const therapist of pendingTherapists) {
      try {
        const decryptedEmail = decryptField(therapist.email);
        console.log(`  - ID: ${therapist.id}`);
        console.log(`    Name: ${therapist.firstName} ${therapist.lastName}`);
        console.log(`    Email: ${decryptedEmail}`);
        console.log(`    Created: ${new Date(therapist.createdAt).toLocaleString()}`);
        console.log(`    Therapist Record ID: ${therapist.therapistId || 'N/A'}\n`);
      } catch (error) {
        console.log(`  - ID: ${therapist.id}`);
        console.log(`    Name: ${therapist.firstName} ${therapist.lastName}`);
        console.log(`    Email: [Encrypted - decryption failed]`);
        console.log(`    Created: ${new Date(therapist.createdAt).toLocaleString()}\n`);
      }
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      if (shouldDelete) {
        console.log('Would delete:');
        console.log(`  - ${pendingTherapists.length} user record(s)`);
        const therapistRecords = pendingTherapists.filter(t => t.therapistId).length;
        if (therapistRecords > 0) {
          console.log(`  - ${therapistRecords} therapist record(s)`);
        }
      } else if (shouldApprove) {
        console.log(`Would approve: ${pendingTherapists.length} therapist(s)`);
      } else {
        console.log('No action specified. Use --delete or --approve');
      }
      return;
    }

    if (!shouldDelete && !shouldApprove) {
      console.log('⚠️  No action specified. Use one of the following:');
      console.log('   --delete  : Permanently delete pending therapists');
      console.log('   --approve  : Approve pending therapists (set status to active)');
      console.log('\nAdd --dry-run to see what would be done without making changes.');
      return;
    }

    if (shouldApprove && shouldDelete) {
      console.log('⚠️  Cannot both approve and delete. Choose one action.');
      return;
    }

    await connection.beginTransaction();

    try {
      if (shouldApprove) {
        console.log('✅ Approving pending therapists...\n');
        
        for (const therapist of pendingTherapists) {
          await runQuery(
            'UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?',
            ['active', therapist.id]
          );
          console.log(`  ✓ Approved: ${therapist.firstName} ${therapist.lastName} (ID: ${therapist.id})`);
        }
        
        await connection.commit();
        console.log(`\n✅ Successfully approved ${pendingTherapists.length} therapist(s).`);
        
      } else if (shouldDelete) {
        console.log('🗑️  Deleting pending therapists...\n');
        
        let deletedUsers = 0;
        let deletedTherapistRecords = 0;
        
        for (const therapist of pendingTherapists) {
          // Delete therapist record first (if exists) due to foreign key constraint
          if (therapist.therapistId) {
            await runQuery('DELETE FROM therapists WHERE id = ?', [therapist.therapistId]);
            deletedTherapistRecords++;
            console.log(`  ✓ Deleted therapist record (ID: ${therapist.therapistId})`);
          }
          
          // Delete user record (this will cascade to related records)
          await runQuery('DELETE FROM users WHERE id = ?', [therapist.id]);
          deletedUsers++;
          
          try {
            const decryptedEmail = decryptField(therapist.email);
            console.log(`  ✓ Deleted user: ${therapist.firstName} ${therapist.lastName} (${decryptedEmail})`);
          } catch (error) {
            console.log(`  ✓ Deleted user: ${therapist.firstName} ${therapist.lastName} (ID: ${therapist.id})`);
          }
        }
        
        await connection.commit();
        console.log(`\n✅ Successfully deleted:`);
        console.log(`   - ${deletedUsers} user record(s)`);
        if (deletedTherapistRecords > 0) {
          console.log(`   - ${deletedTherapistRecords} therapist record(s)`);
        }
      }
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
clearPendingTherapists()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

