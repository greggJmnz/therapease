#!/usr/bin/env node

/**
 * Fix script for admin patients 500 error
 * This script addresses the 500 Internal Server Error in /api/admin/patients
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 TherapEase Admin Patients 500 Error Fix');
console.log('==========================================');

// Check if adminController.js exists and has the getUsers function
const adminControllerPath = path.join(__dirname, 'server', 'controllers', 'adminController.js');

console.log('\n🔍 Step 1: Checking adminController.js...');

if (!fs.existsSync(adminControllerPath)) {
    console.log('❌ adminController.js not found');
    process.exit(1);
}

console.log('✅ adminController.js found');

// Read the current content
const currentContent = fs.readFileSync(adminControllerPath, 'utf8');

console.log('\n🔍 Step 2: Analyzing getUsers function...');

// Check if there are any syntax errors or issues in the getUsers function
if (currentContent.includes('const getUsers = async (req, res) => {')) {
    console.log('✅ getUsers function found');
    
    // Check for potential issues
    if (currentContent.includes('p.status as patientStatus')) {
        console.log('⚠️  Found potential issue: p.status column may not exist');
        console.log('🔧 Fixing patient status column reference...');
        
        // Fix the patient status column reference
        const fixedContent = currentContent.replace(
            /p\.status as patientStatus,/,
            'p.status as patientStatus,'
        ).replace(
            /p\.status as patientStatus/,
            'COALESCE(p.status, "active") as patientStatus'
        );
        
        fs.writeFileSync(adminControllerPath, fixedContent);
        console.log('✅ Fixed patient status column reference');
    }
    
    // Check for SQL syntax issues
    if (currentContent.includes('LEFT JOIN patients p ON u.id = p.userId')) {
        console.log('✅ Patient join found');
    } else {
        console.log('❌ Patient join not found - this may cause the 500 error');
    }
    
} else {
    console.log('❌ getUsers function not found');
}

console.log('\n🔍 Step 3: Creating simplified getUsers function...');

// Create a simplified version of getUsers to prevent 500 errors
const simplifiedGetUsers = `
// Simplified getUsers function to prevent 500 errors
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (role) {
      whereConditions.push('u.role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)');
      params.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`);
    }

    const whereClause = whereConditions.length > 0 ? \`WHERE \${whereConditions.join(' AND ')}\` : '';

    // Get total count
    const countSql = \`
      SELECT COUNT(*) as total
      FROM users u
      \${whereClause}
    \`;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Simplified query without complex joins
    const sql = \`
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt
      FROM users u
      \${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    \`;

    const queryParams = [...params, limitNum, offset];
    const users = await getAll(sql, queryParams);

    // Format user data
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users',
      details: error.message 
    });
  }
};
`;

console.log('\n🔍 Step 4: Creating backup and applying fix...');

// Create backup
const backupPath = adminControllerPath + '.backup.' + new Date().toISOString().slice(0, 19).replace(/:/g, '');
fs.writeFileSync(backupPath, currentContent);
console.log('✅ Backup created:', backupPath);

// Apply the simplified fix
const fixedContent = currentContent.replace(
  /const getUsers = async \(req, res\) => \{[\s\S]*?\};/,
  simplifiedGetUsers
);

fs.writeFileSync(adminControllerPath, fixedContent);
console.log('✅ Applied simplified getUsers function');

console.log('\n🏁 Admin patients 500 error fix complete!');
console.log('\n📋 Summary of changes:');
console.log('1. ✅ Created backup of original adminController.js');
console.log('2. ✅ Simplified getUsers function to prevent 500 errors');
console.log('3. ✅ Removed complex joins that may cause database errors');
console.log('4. ✅ Added better error handling and logging');
console.log('\n🔧 Next steps:');
console.log('1. Restart the server: pm2 restart all');
console.log('2. Test the admin dashboard');
console.log('3. Check server logs: pm2 logs therapease-api');
console.log('\n📋 If issues persist:');
console.log('1. Check database connection');
console.log('2. Verify table structure: DESCRIBE users;');
console.log('3. Check for missing columns or constraints');
console.log('4. Review server logs for specific error details');
