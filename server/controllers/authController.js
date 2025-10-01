const { runQuery, getRow, getAll } = require('../config/database');
const { hashPassword, verifyPassword, validatePasswordComplexity } = require('../utils/password');
const { encryptField, decryptField } = require('../utils/encryption');
const jwt = require('jsonwebtoken');

// JWT secret (in real app, this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Get user by email
    const userSql = `
      SELECT 
        u.id,
        u.email,
        u.password,
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
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.email = ?
    `;

    const user = await getRow(userSql, [email]);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get additional role-specific data
    let roleData = {};
    
    if (user.role === 'therapist') {
      const therapistSql = `
        SELECT 
          t.id,
          t.licenseNumber,
          t.specialization,
          t.yearsOfExperience,
          t.education,
          t.certifications,
          t.availability
        FROM therapists t
        WHERE t.userId = ?
      `;
      
      const therapist = await getRow(therapistSql, [user.id]);
      if (therapist) {
        roleData = therapist;
      }
    } else if (user.role === 'patient') {
      const patientSql = `
        SELECT 
          p.id,
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.therapistId,
          p.emergencyContact,
          p.insuranceInfo
        FROM patients p
        WHERE p.userId = ?
      `;
      
      const patient = await getRow(patientSql, [user.id]);
      if (patient) {
        roleData = patient;
      }
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { 
          ...userWithoutPassword, 
          ...roleData,
          id: user.id  // Ensure user ID is preserved, not overwritten by role data
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// User registration
const register = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      // Compliance fields
      termsAccepted,
      hipaaAcknowledged,
      acceptedAt,
      // Role-specific fields
      licenseNumber,
      specialization,
      yearsOfExperience,
      education,
      certifications,
      availability,
      diagnosis,
      medicalHistory,
      goals,
      emergencyContact,
      insuranceInfo
    } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, firstName, lastName, role'
      });
    }

    // Validate compliance requirements
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Terms and conditions acceptance is required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'therapist', 'patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: admin, therapist, patient'
      });
    }

    // Check if user with email already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Validate password complexity
    const passwordValidation = validatePasswordComplexity(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const createUserSql = `
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, termsAccepted, acceptedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const userParams = [
        email,
        hashedPassword,
        role,
        firstName,
        lastName,
        phone || null,
        dateOfBirth || null,
        gender || null,
        address || null,
        city || null,
        state || null,
        zipCode || null,
        termsAccepted,
        acceptedAt || new Date().toISOString()
      ];

      const userResult = await connection.execute(createUserSql, userParams);
      const userId = userResult[0].insertId;

      let roleData = {};

      // Create role-specific record
      if (role === 'therapist') {
        const createTherapistSql = `
          INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const therapistParams = [
          userId,
          licenseNumber || null,
          specialization || null,
          yearsOfExperience ? parseInt(yearsOfExperience) : null,
          education || null,
          certifications || null,
          availability || null
        ];

        const therapistResult = await connection.execute(createTherapistSql, therapistParams);
        const therapistId = therapistResult[0].insertId;

        // Get created therapist data
        const getTherapistSql = `
          SELECT 
            t.id,
            t.licenseNumber,
            t.specialization,
            t.yearsOfExperience,
            t.education,
            t.certifications,
            t.availability
          FROM therapists t
          WHERE t.id = ?
        `;

        roleData = await getRow(getTherapistSql, [therapistId]);

      } else if (role === 'patient') {
        const createPatientSql = `
          INSERT INTO patients (userId, diagnosis, medicalHistory, goals, emergencyContact, insuranceInfo)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const patientParams = [
          userId,
          diagnosis || null,
          medicalHistory || null,
          goals || null,
          emergencyContact || null,
          insuranceInfo || null
        ];

        const patientResult = await connection.execute(createPatientSql, patientParams);
        const patientId = patientResult[0].insertId;

        // Get created patient data
        const getPatientSql = `
          SELECT 
            p.id,
            p.diagnosis,
            p.medicalHistory,
            p.goals,
            p.emergencyContact,
            p.insuranceInfo
          FROM patients p
          WHERE p.id = ?
        `;

        roleData = await getRow(getPatientSql, [patientId]);
      }

      // Commit transaction
      await connection.commit();

      // Get created user
      const getUserSql = `
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
          u.createdAt,
          u.updatedAt
        FROM users u
        WHERE u.id = ?
      `;

      const newUser = await getRow(getUserSql, [userId]);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: { ...newUser, ...roleData },
          token
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

// Verify JWT token
const verify = async (req, res) => {
  try {
    let token = req.body.token;
    
    // If no token in body, try to get from Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user data
    const userSql = `
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
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.id = ?
    `;

    const user = await getRow(userSql, [decoded.userId]);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get additional role-specific data
    let roleData = {};
    
    if (user.role === 'therapist') {
      const therapistSql = `
        SELECT 
          t.id,
          t.licenseNumber,
          t.specialization,
          t.yearsOfExperience,
          t.education,
          t.certifications,
          t.availability
        FROM therapists t
        WHERE t.userId = ?
      `;
      
      const therapist = await getRow(therapistSql, [user.id]);
      if (therapist) {
        roleData = therapist;
      }
    } else if (user.role === 'patient') {
      const patientSql = `
        SELECT 
          p.id,
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.therapistId,
          p.emergencyContact,
          p.insuranceInfo
        FROM patients p
        WHERE p.userId = ?
      `;
      
      const patient = await getRow(patientSql, [user.id]);
      if (patient) {
        roleData = patient;
      }
    }

    res.json({
      success: true,
      data: {
        user: { ...user, ...roleData }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired'
      });
    }

    console.error('Token verification error:', error);
    res.status(500).json({ success: false, error: 'Token verification failed' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // Get user ID from request (in real app, get from JWT token)
    const userId = 2; // Hardcoded for now, should come from JWT token

    // Get current user
    const user = await getRow('SELECT id, password FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Validate new password complexity
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Hash the new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await runQuery('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [
      hashedNewPassword,
      userId
    ]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

// Forgot password (placeholder)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if user exists
    const user = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // In a real app, you would:
    // 1. Generate a reset token
    // 2. Send reset email
    // 3. Store reset token with expiration

    res.json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Failed to process forgot password request' });
  }
};

// Reset password (placeholder)
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long'
      });
    }

    // In a real app, you would:
    // 1. Verify the reset token
    // 2. Check if token is expired
    // 3. Update the password
    // 4. Invalidate the token

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

module.exports = {
  login,
  register,
  verify,
  changePassword,
  forgotPassword,
  resetPassword
};
