/**
 * Log Rotation Script
 * Rotates server.log file to prevent it from growing too large
 * Can be run manually or via cron job
 * 
 * Usage:
 *   node scripts/rotate-logs.js
 * 
 * Or add to crontab:
 *   0 0 * * * cd /path/to/therapease/server && node scripts/rotate-logs.js
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../server.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_BACKUP_FILES = 5; // Keep 5 backup files

function rotateLogs() {
  try {
    // Check if log file exists
    if (!fs.existsSync(LOG_FILE)) {
      console.log('Log file does not exist, nothing to rotate.');
      return;
    }

    // Get file stats
    const stats = fs.statSync(LOG_FILE);
    const fileSize = stats.size;

    // Only rotate if file is larger than max size
    if (fileSize < MAX_LOG_SIZE) {
      console.log(`Log file size (${(fileSize / 1024 / 1024).toFixed(2)}MB) is below threshold (${MAX_LOG_SIZE / 1024 / 1024}MB), no rotation needed.`);
      return;
    }

    console.log(`Log file size: ${(fileSize / 1024 / 1024).toFixed(2)}MB, starting rotation...`);

    // Rotate existing backup files
    for (let i = MAX_BACKUP_FILES - 1; i >= 1; i--) {
      const oldFile = `${LOG_FILE}.${i}`;
      const newFile = `${LOG_FILE}.${i + 1}`;
      
      if (fs.existsSync(oldFile)) {
        if (i === MAX_BACKUP_FILES - 1) {
          // Delete oldest backup if we're at max
          fs.unlinkSync(oldFile);
          console.log(`Deleted old backup: ${oldFile}`);
        } else {
          // Move to next number
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Move current log to .1
    const backupFile = `${LOG_FILE}.1`;
    fs.renameSync(LOG_FILE, backupFile);
    console.log(`Rotated ${LOG_FILE} to ${backupFile}`);

    // Create new empty log file
    fs.writeFileSync(LOG_FILE, '');
    console.log('Created new log file.');

    // Compress old backups (optional - requires gzip)
    // This can be added if needed for space savings

    console.log('Log rotation completed successfully.');
  } catch (error) {
    console.error('Error rotating logs:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  rotateLogs();
}

module.exports = { rotateLogs };

