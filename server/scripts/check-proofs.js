const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '../.env.production');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`✅ Loaded environment from: ${envPath}\n`);
} else {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  console.log(`✅ Loaded environment from: ${path.join(__dirname, '../.env')}\n`);
}

const { pool } = require('../config/database');

async function checkProofs() {
  console.log('🔍 Checking Home Exercise Proofs in Database\n');
  console.log('='.repeat(60));
  
  try {
    if (!pool) {
      console.error('❌ Database pool is not initialized!');
      console.error('   Make sure the database connection is established.');
      process.exit(1);
    }
    
    // Get all proofs from database
    const query = `
      SELECT 
        hep.id,
        hep.exerciseId,
        hep.patientId,
        hep.therapistId,
        hep.submissionType,
        hep.filePath,
        hep.fileName,
        hep.fileSize,
        hep.mimeType,
        hep.status,
        hep.submittedAt,
        he.title as exerciseTitle,
        u.firstName as patientFirstName,
        u.lastName as patientLastName
      FROM home_exercise_proofs hep
      LEFT JOIN home_exercises he ON hep.exerciseId = he.id
      LEFT JOIN patients p ON hep.patientId = p.id
      LEFT JOIN users u ON p.userId = u.id
      ORDER BY hep.submittedAt DESC
      LIMIT 50
    `;
    
    const [proofs] = await pool.execute(query);
    
    if (proofs.length === 0) {
      console.log('❌ No proofs found in database.\n');
      console.log('💡 This means either:');
      console.log('   1. No proofs have been submitted yet');
      console.log('   2. The home_exercise_proofs table is empty');
      console.log('   3. There is a database connection issue\n');
      return;
    }
    
    console.log(`✅ Found ${proofs.length} proof(s) in database\n`);
    console.log('='.repeat(60));
    
    // Check each proof
    const uploadsDir = path.join(__dirname, '../uploads');
    const exerciseProofsDir = path.join(__dirname, '../uploads/exercise-proofs');
    
    console.log(`\n📁 Upload directories:`);
    console.log(`   Base uploads: ${uploadsDir}`);
    console.log(`   Exercise proofs: ${exerciseProofsDir}`);
    console.log(`   Base exists: ${fs.existsSync(uploadsDir) ? '✅' : '❌'}`);
    console.log(`   Exercise proofs exists: ${fs.existsSync(exerciseProofsDir) ? '✅' : '❌'}\n`);
    
    let foundCount = 0;
    let missingCount = 0;
    let pathMismatchCount = 0;
    
    for (let i = 0; i < proofs.length; i++) {
      const proof = proofs[i];
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Proof #${i + 1} (ID: ${proof.id})`);
      console.log(`Exercise: ${proof.exerciseTitle || 'N/A'} (ID: ${proof.exerciseId})`);
      console.log(`Patient: ${proof.patientFirstName || 'N/A'} ${proof.patientLastName || 'N/A'} (ID: ${proof.patientId})`);
      console.log(`Type: ${proof.submissionType}`);
      console.log(`Status: ${proof.status}`);
      console.log(`Submitted: ${proof.submittedAt}`);
      
      if (proof.filePath) {
        console.log(`\n📄 File Information:`);
        console.log(`   Stored filePath: ${proof.filePath}`);
        console.log(`   Stored fileName: ${proof.fileName || 'N/A'}`);
        console.log(`   File size: ${proof.fileSize ? `${proof.fileSize} bytes` : 'N/A'}`);
        console.log(`   MIME type: ${proof.mimeType || 'N/A'}`);
        
        // Extract filename from path
        const pathParts = proof.filePath.split(/[/\\]/);
        const fileName = pathParts[pathParts.length - 1];
        console.log(`   Extracted filename: ${fileName}`);
        
        // Check if file exists at stored path
        const storedPathExists = fs.existsSync(proof.filePath);
        console.log(`   Stored path exists: ${storedPathExists ? '✅' : '❌'}`);
        
        // Check if file exists in expected location
        const expectedPath = path.join(exerciseProofsDir, fileName);
        const expectedPathExists = fs.existsSync(expectedPath);
        console.log(`   Expected path: ${expectedPath}`);
        console.log(`   Expected path exists: ${expectedPathExists ? '✅' : '❌'}`);
        
        // Check if file exists anywhere in uploads directory
        let foundPath = null;
        function findFile(dir, targetFile) {
          try {
            if (!fs.existsSync(dir)) return null;
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isDirectory()) {
                const found = findFile(filePath, targetFile);
                if (found) return found;
              } else if (file === targetFile) {
                return filePath;
              }
            }
          } catch (err) {
            // Ignore errors
          }
          return null;
        }
        
        foundPath = findFile(uploadsDir, fileName);
        
        if (foundPath) {
          console.log(`   ✅ File found at: ${foundPath}`);
          foundCount++;
          
          // Check if path matches
          if (foundPath !== proof.filePath && foundPath !== expectedPath) {
            console.log(`   ⚠️  Path mismatch! File is at different location.`);
            pathMismatchCount++;
          }
          
          // Get actual file size
          const actualSize = fs.statSync(foundPath).size;
          console.log(`   Actual file size: ${actualSize} bytes`);
          if (proof.fileSize && actualSize !== proof.fileSize) {
            console.log(`   ⚠️  Size mismatch! Stored: ${proof.fileSize}, Actual: ${actualSize}`);
          }
        } else {
          console.log(`   ❌ File not found anywhere in uploads directory`);
          missingCount++;
        }
        
        // Show URL that would be used
        const url = `/uploads/exercise-proofs/${fileName}`;
        console.log(`   URL: ${url}`);
      } else {
        console.log(`\n📝 Text-only submission (no file)`);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total proofs: ${proofs.length}`);
    console.log(`   With files: ${proofs.filter(p => p.filePath).length}`);
    console.log(`   Files found: ${foundCount} ✅`);
    console.log(`   Files missing: ${missingCount} ❌`);
    console.log(`   Path mismatches: ${pathMismatchCount} ⚠️`);
    
    if (missingCount > 0) {
      console.log(`\n⚠️  Warning: ${missingCount} file(s) are missing from disk!`);
      console.log(`   This could cause 404 errors when trying to access the files.`);
      console.log(`   Possible causes:`);
      console.log(`   1. Files were deleted manually`);
      console.log(`   2. Files were moved to a different location`);
      console.log(`   3. Upload directory was changed`);
      console.log(`   4. File system permissions issue`);
    }
    
    if (pathMismatchCount > 0) {
      console.log(`\n⚠️  Warning: ${pathMismatchCount} file(s) have path mismatches!`);
      console.log(`   The file paths stored in the database don't match the actual file locations.`);
      console.log(`   This could cause 404 errors when trying to access the files.`);
    }
    
    if (foundCount === proofs.filter(p => p.filePath).length && pathMismatchCount === 0) {
      console.log(`\n✅ All files are found and paths match correctly!`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking proofs:', error);
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    process.exit(1);
  } finally {
    // Don't close the pool as it's shared
    process.exit(0);
  }
}

// Run the check
checkProofs();

