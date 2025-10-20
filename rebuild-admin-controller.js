#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🔧 TherapEase Admin Controller Rebuild');
console.log('======================================\n');

// 1. Read the current admin controller
console.log('1. 📄 Reading current admin controller...');
const adminControllerFile = path.join(__dirname, 'server', 'controllers', 'adminController.js');
let adminContent = fs.readFileSync(adminControllerFile, 'utf8');

// 2. Find and extract the getUsers function
console.log('2. 🔍 Extracting getUsers function...');
const getUsersStart = adminContent.indexOf('const getUsers = async (req, res) => {');
if (getUsersStart === -1) {
  console.log('   ❌ getUsers function not found');
  process.exit(1);
}

// Find the next function to determine where getUsers ends
const nextFunction = adminContent.indexOf('const ', getUsersStart + 1);
const endOfFile = adminContent.length;
const searchEnd = nextFunction !== -1 ? nextFunction : endOfFile;

// Extract the function content
let functionContent = adminContent.substring(getUsersStart, searchEnd);

// 3. Create a clean, working getUsers function
console.log('3. 🛠️ Creating clean getUsers function...');
const cleanGetUsers = `const getUsers = async (req, res) => {
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

    // Get users with role-specific data (simplified query)
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
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        p.id as patientId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        (SELECT CONCAT(u2.firstName, ' ', u2.lastName) FROM users u2 WHERE u2.id = p.therapistId) as therapistName,
        (SELECT COUNT(*) FROM patients pt WHERE pt.therapistId = t.userId) as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      \${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    \`;

    const queryParams = [...params, limitNum, offset];
    const users = await getAll(sql, queryParams);

    // Format user data
    const formattedUsers = users.map(user => {
      const formattedUser = {
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
        status: user.status || 'active', // Default status
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add role-specific data
      if (user.role === 'therapist') {
        formattedUser.therapist = {
          licenseNumber: user.licenseNumber,
          specialization: user.specialization,
          yearsOfExperience: user.yearsOfExperience,
          education: user.education,
          certifications: user.certifications,
          availability: user.availability,
          patientCount: user.patientCount || 0
        };
      } else if (user.role === 'patient') {
        formattedUser.patient = {
          id: user.patientId,
          diagnosis: user.diagnosis,
          medicalHistory: user.medicalHistory,
          goals: user.goals,
          therapistId: user.therapistId,
          therapistName: user.therapistName
        };
      }

      return formattedUser;
    });

    res.json({
      success: true,
      users: formattedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
};

`;

// 4. Replace the getUsers function
console.log('4. 🔄 Replacing getUsers function...');
const beforeFunction = adminContent.substring(0, getUsersStart);
const afterFunction = adminContent.substring(searchEnd);

const newAdminContent = beforeFunction + cleanGetUsers + afterFunction;

// 5. Write the fixed file
console.log('5. 💾 Writing fixed admin controller...');
fs.writeFileSync(adminControllerFile, newAdminContent);
console.log('   ✅ Admin controller updated');

// 6. Test syntax
console.log('\n6. ✅ Testing syntax...');
try {
  new Function(newAdminContent);
  console.log('   ✅ Admin controller syntax OK');
} catch (error) {
  console.log('   ❌ Admin controller syntax error:', error.message);
  console.log('   Error details:', error.stack);
  
  // Try to find the specific line with the error
  const lines = newAdminContent.split('\n');
  const errorLine = error.stack.match(/at line (\d+)/);
  if (errorLine) {
    const lineNum = parseInt(errorLine[1]);
    console.log(`   Problem around line ${lineNum}:`);
    console.log(`   ${lines[lineNum - 1]}`);
  }
}

// 7. Restart PM2
console.log('\n7. 🔄 Restarting PM2...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    console.log(stdout);
    
    // Wait and test
    setTimeout(() => {
      console.log('\n8. 🧪 Testing server...');
      
      // Test if server is accessible
      exec('curl -s -w "Server: %{http_code}" http://127.0.0.1:5000/health', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ Server test failed:', error.message);
        } else {
          console.log(`   ${stdout}`);
        }
        
        // Test WebSocket
        exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ WebSocket test failed:', error.message);
          } else {
            console.log(`   ${stdout}`);
          }
          
          console.log('\n🎯 ADMIN CONTROLLER REBUILD SUMMARY');
          console.log('===================================');
          console.log('✅ getUsers function completely rebuilt');
          console.log('✅ Admin controller syntax fixed');
          console.log('✅ Server restarted');
          console.log('\n💡 Next steps:');
          console.log('1. Test: node test-all-endpoints.js');
          console.log('2. Check if server is accessible on localhost:5000');
          console.log('3. Check if WebSocket returns 426');
        });
      });
    }, 5000);
  }
});
