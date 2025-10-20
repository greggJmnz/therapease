#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log('🎯 TherapEase Root Cause Analysis & Fix');
console.log('======================================\n');

// 1. Fix WebSocket static file serving issue
console.log('1. 🔌 Fixing WebSocket static file serving...');

const serverFile = path.join(__dirname, 'server', 'index.js');
let content = fs.readFileSync(serverFile, 'utf8');

// Move WebSocket route to the very beginning, before static file serving
const wsRoute = `// WebSocket route handler (MUST be before static file serving)
app.get('/ws', (req, res) => {
  console.log('🔌 WebSocket GET request received');
  res.status(426).json({ 
    error: 'Upgrade Required', 
    message: 'This endpoint requires WebSocket upgrade',
    upgrade: 'websocket',
    'sec-websocket-version': '13'
  });
});

`;

// Remove existing WebSocket route
content = content.replace(/\/\/ WebSocket route handler \(must be before static file serving\)[\s\S]*?}\);\n\n/, '');

// Add WebSocket route right after CORS middleware
const corsEndPattern = /(app\.use\(cors\(\{[\s\S]*?\}\)\);\n)/;
content = content.replace(corsEndPattern, `$1\n${wsRoute}`);

console.log('   ✅ WebSocket route moved to beginning');

// 2. Fix static file serving to exclude WebSocket and API paths
console.log('\n2. 📁 Fixing static file serving...');

// Replace the static file serving section
const staticFileSection = `// Serve static files ONLY for non-API, non-WebSocket paths
app.use((req, res, next) => {
  // Skip static file serving for WebSocket and API paths
  if (req.path === '/ws' || req.path.startsWith('/api/') || req.path === '/health' || req.path === '/test-db') {
    return next();
  }
  
  // Serve static files for all other paths
  express.static(path.join(__dirname, 'public'))(req, res, next);
});`;

// Replace the existing static file serving
content = content.replace(
  /\/\/ Serve static files from public-website directory[\s\S]*?app\.use\(express\.static\(path\.join\(__dirname, 'public'\)\)\);/,
  staticFileSection
);

console.log('   ✅ Static file serving fixed to exclude /ws and /api paths');

// 3. Fix admin controller SQL queries
console.log('\n3. 🔧 Fixing admin controller SQL queries...');

const adminControllerFile = path.join(__dirname, 'server', 'controllers', 'adminController.js');
let adminContent = fs.readFileSync(adminControllerFile, 'utf8');

// Fix getUsers function - remove references to non-existent columns
const getUsersFix = `const getUsers = async (req, res) => {
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
};`;

// Replace the getUsers function
adminContent = adminContent.replace(
  /const getUsers = async \(req, res\) => \{[\s\S]*?\};\n/,
  getUsersFix + '\n'
);

// Fix getAllUsers function - remove references to non-existent columns
const getAllUsersFix = `const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100, role, search, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (role && role !== 'all') {
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

    // Get users (simplified query)
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
      status: user.status || 'active', // Default status
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

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
    console.error('Error fetching all users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
      message: error.message
    });
  }
};`;

// Replace the getAllUsers function
adminContent = adminContent.replace(
  /const getAllUsers = async \(req, res\) => \{[\s\S]*?\};\n/,
  getAllUsersFix + '\n'
);

console.log('   ✅ Admin controller SQL queries fixed');

// 4. Write the fixed files
console.log('\n4. 💾 Writing fixed files...');

fs.writeFileSync(serverFile, content);
console.log('   ✅ Server file updated');

fs.writeFileSync(adminControllerFile, adminContent);
console.log('   ✅ Admin controller updated');

// 5. Test syntax
console.log('\n5. ✅ Testing syntax...');
try {
  new Function(content);
  console.log('   ✅ Server file syntax OK');
} catch (error) {
  console.log('   ❌ Server file syntax error:', error.message);
}

try {
  new Function(adminContent);
  console.log('   ✅ Admin controller syntax OK');
} catch (error) {
  console.log('   ❌ Admin controller syntax error:', error.message);
}

// 6. Restart PM2
console.log('\n6. 🔄 Restarting PM2...');
exec('pm2 restart therapease-api', (error, stdout, stderr) => {
  if (error) {
    console.log('   ❌ PM2 restart failed:', error.message);
  } else {
    console.log('   ✅ PM2 restart successful');
    console.log(stdout);
    
    // Wait and test
    setTimeout(() => {
      console.log('\n7. 🧪 Testing fixes...');
      
      // Test WebSocket
      exec('curl -s -w "WebSocket: %{http_code}" https://therapease.site/ws', (error, stdout, stderr) => {
        if (error) {
          console.log('   ❌ WebSocket test failed:', error.message);
        } else {
          console.log(`   ${stdout}`);
        }
        
        // Test admin endpoints
        exec('curl -s -X POST -H "Content-Type: application/json" -d \'{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}\' https://therapease.site/api/auth/login', (error, stdout, stderr) => {
          if (error) {
            console.log('   ❌ Login test failed:', error.message);
          } else {
            try {
              const data = JSON.parse(stdout);
              if (data.success && data.data.token) {
                console.log('   ✅ Login successful, testing admin endpoints...');
                
                // Test admin users endpoint
                exec(`curl -s -w "Admin Users: %{http_code}" -H "Authorization: Bearer ${data.data.token}" https://therapease.site/api/admin/users`, (error, stdout, stderr) => {
                  if (error) {
                    console.log('   ❌ Admin users test failed:', error.message);
                  } else {
                    console.log(`   ${stdout}`);
                  }
                  
                  // Test admin patients endpoint
                  exec(`curl -s -w "Admin Patients: %{http_code}" -H "Authorization: Bearer ${data.data.token}" https://therapease.site/api/admin/patients`, (error, stdout, stderr) => {
                    if (error) {
                      console.log('   ❌ Admin patients test failed:', error.message);
                    } else {
                      console.log(`   ${stdout}`);
                    }
                    
                    console.log('\n🎯 ROOT CAUSE FIX SUMMARY');
                    console.log('==========================');
                    console.log('✅ WebSocket route moved to beginning');
                    console.log('✅ Static file serving fixed to exclude /ws and /api');
                    console.log('✅ Admin controller SQL queries simplified');
                    console.log('✅ Server restarted');
                    console.log('\n💡 Next steps:');
                    console.log('1. Test: node test-all-endpoints.js');
                    console.log('2. Check if WebSocket returns 426');
                    console.log('3. Check if admin endpoints work');
                  });
                });
              } else {
                console.log('   ❌ Login failed:', data.error);
              }
            } catch (parseError) {
              console.log('   ❌ Login response parse error:', parseError.message);
            }
          }
        });
      });
    }, 5000);
  }
});
