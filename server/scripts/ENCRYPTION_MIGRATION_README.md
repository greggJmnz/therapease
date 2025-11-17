# Data Encryption Migration Script

This script encrypts all unencrypted personal information in your database.

## What It Encrypts

1. **Users Table:**
   - `email`
   - `phone`
   - `address`

2. **Daily Notes Table:**
   - `activities`
   - `observations`
   - `progress`
   - `challenges`
   - `nextSteps`

3. **Appointments Table:**
   - `notes`

## Prerequisites

1. Make sure `ENCRYPTION_KEY` is set in your `.env` file
2. Ensure you have a database backup before running
3. The script only encrypts plain text data (skips already encrypted data)

## How to Run

### Option 1: Using npm script (Recommended)
```bash
cd server
npm run encrypt:data
```

### Option 2: Direct execution
```bash
cd server
node scripts/encrypt-existing-data.js
```

## Database Configuration

The script uses these database credentials (can be overridden with environment variables):

- **Host:** 127.0.0.1
- **User:** therapease_user
- **Password:** TherapEase2025!@#
- **Database:** therapease_db
- **Port:** 3306

### Using Environment Variables

You can override the database credentials by setting these in your `.env` file:

```env
DB_HOST=127.0.0.1
DB_USER=therapease_user
DB_PASSWORD=TherapEase2025!@#
DB_NAME=therapease_db
DB_PORT=3306
```

## Important Notes

⚠️ **BACKUP YOUR DATABASE FIRST!**
```bash
mysqldump -u therapease_user -p therapease_db > backup_before_encryption.sql
```

✅ **The script is safe:**
- Only encrypts plain text data
- Skips already encrypted data
- Idempotent (can be run multiple times safely)

## Verification

After running the script, verify encryption with these SQL queries:

```sql
-- Check users table
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN email REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$' THEN 1 ELSE 0 END) as encrypted_emails,
    SUM(CASE WHEN phone REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$' THEN 1 ELSE 0 END) as encrypted_phones
FROM users;

-- Check daily_notes
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN activities REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$' THEN 1 ELSE 0 END) as encrypted_activities
FROM daily_notes
WHERE activities IS NOT NULL;

-- Check appointments
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN notes REGEXP '^[0-9a-fA-F]{32}:[0-9a-fA-F]+$' THEN 1 ELSE 0 END) as encrypted_notes
FROM appointments
WHERE notes IS NOT NULL;
```

## Troubleshooting

### Error: "ENCRYPTION_KEY not found"
- Make sure `ENCRYPTION_KEY` is set in your `.env` file
- The key should be a 64+ character hex string

### Error: "Access denied for user"
- Verify database credentials are correct
- Check user permissions

### Error: "Connection refused"
- Verify MySQL is running
- Check host and port settings

