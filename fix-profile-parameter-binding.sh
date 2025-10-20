#!/bin/bash

echo "🔧 Fixing Profile Parameter Binding Issue..."

cd /root/therapease/therapease/server

# 1. Stop PM2 processes
echo "[INFO] Stopping PM2 processes..."
/usr/bin/pm2 stop all 2>/dev/null || true

# 2. Fix profileController.js to handle undefined user ID
echo "[INFO] Fixing profileController.js parameter binding..."

cat > controllers/profileController.js << 'EOF'
const { getAll, getOne, runQuery } = require('../config/database');

// Get user profile
const getProfile = async (req, res) => {
  try {
    // Check if user ID exists and is valid
    const userId = req.user?.id;
    
    if (!userId) {
      console.error('No user ID found in request:', req.user);
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    console.log('Getting profile for user ID:', userId);
    
    // First check what columns exist in users table
    const columns = await getAll(`
      SELECT COLUMN_NAME 
      FROM information_schema.columns 
      WHERE table_schema = 'therapease_db' 
      AND table_name = 'users'
    `);
    
    const columnNames = columns.map(col => col.COLUMN_NAME);
    console.log('Available columns in users:', columnNames);
    
    // Build query based on available columns
    let selectFields = 'u.id, u.email, u.firstName, u.lastName, u.role, u.status, u.createdAt, u.updatedAt';
    
    if (columnNames.includes('phone')) {
      selectFields += ', u.phone';
    }
    if (columnNames.includes('dateOfBirth')) {
      selectFields += ', u.dateOfBirth';
    }
    if (columnNames.includes('gender')) {
      selectFields += ', u.gender';
    }
    if (columnNames.includes('address')) {
      selectFields += ', u.address';
    }
    if (columnNames.includes('city')) {
      selectFields += ', u.city';
    }
    if (columnNames.includes('state')) {
      selectFields += ', u.state';
    }
    if (columnNames.includes('zipCode')) {
      selectFields += ', u.zipCode';
    }
    if (columnNames.includes('country')) {
      selectFields += ', u.country';
    }
    if (columnNames.includes('profileImage')) {
      selectFields += ', u.profileImage';
    }
    
    console.log('Select fields:', selectFields);
    console.log('User ID type:', typeof userId, 'Value:', userId);
    
    const user = await getOne(`
      SELECT ${selectFields}
      FROM users u
      WHERE u.id = ?
    `, [parseInt(userId)]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        user: user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const { firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, country } = req.body;
    
    // Build update query based on provided fields
    const updates = [];
    const values = [];
    
    if (firstName !== undefined) {
      updates.push('firstName = ?');
      values.push(firstName);
    }
    if (lastName !== undefined) {
      updates.push('lastName = ?');
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (dateOfBirth !== undefined) {
      updates.push('dateOfBirth = ?');
      values.push(dateOfBirth);
    }
    if (gender !== undefined) {
      updates.push('gender = ?');
      values.push(gender);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      values.push(address);
    }
    if (city !== undefined) {
      updates.push('city = ?');
      values.push(city);
    }
    if (state !== undefined) {
      updates.push('state = ?');
      values.push(state);
    }
    if (zipCode !== undefined) {
      updates.push('zipCode = ?');
      values.push(zipCode);
    }
    if (country !== undefined) {
      updates.push('country = ?');
      values.push(country);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    updates.push('updatedAt = NOW()');
    values.push(parseInt(userId));
    
    await runQuery(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);
    
    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get current user
    const user = await getOne(`
      SELECT id, password FROM users WHERE id = ?
    `, [parseInt(userId)]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const bcrypt = require('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    await runQuery(`
      UPDATE users 
      SET password = ?, updatedAt = NOW()
      WHERE id = ?
    `, [hashedNewPassword, parseInt(userId)]);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }
    
    const imagePath = req.file.path;
    
    // Update user profile image path
    await runQuery(`
      UPDATE users 
      SET profileImage = ?, updatedAt = NOW()
      WHERE id = ?
    `, [imagePath, parseInt(userId)]);
    
    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imagePath: imagePath
      }
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile image'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage
};
EOF

# 3. Check authentication middleware
echo "[INFO] Checking authentication middleware..."

# Check if authMiddleware.js exists and has proper user ID extraction
if [ -f "middleware/authMiddleware.js" ]; then
    echo "[INFO] Checking authMiddleware.js for user ID extraction..."
    grep -n "req.user" middleware/authMiddleware.js | head -5
else
    echo "❌ authMiddleware.js not found"
fi

# 4. Check syntax
echo "[INFO] Checking syntax..."
node -c controllers/profileController.js && echo "✅ profileController.js syntax OK" || echo "❌ profileController.js syntax error"

# 5. Start PM2 processes
echo "[INFO] Starting PM2 processes..."
/usr/bin/pm2 start ecosystem.config.js

sleep 10

# 6. Test profile endpoint with debugging
echo "[INFO] Testing profile endpoint with debugging..."

# Get login token
echo "[TEST] Getting login token..."
LOGIN_RESPONSE=$(curl -s -X POST https://therapease.site/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"SecureAdmin2024!@#$"}')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "[TEST] Testing admin profile with token: ${TOKEN:0:20}..."
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/profile

    echo "[TEST] Testing admin settings:"
    curl -s -w "\nHTTP Status: %{http_code}\n" -H "Authorization: Bearer $TOKEN" \
      https://therapease.site/api/admin/settings
else
    echo "❌ Could not get login token"
fi

# 7. Show final status
echo "[INFO] PM2 Status:"
/usr/bin/pm2 list

echo "[INFO] Recent logs:"
/usr/bin/pm2 logs therapease-api --lines 10

echo "[INFO] Profile parameter binding fix complete!"
