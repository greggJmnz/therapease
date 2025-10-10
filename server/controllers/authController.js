const { runQuery, getRow, getAll, getConnection } = require('../config/database');
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
        u.status,
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

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator for assistance.'
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
          id: user.id  // Always use user ID for consistency
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

    // Validate phone format if provided (Philippine mobile format: 09XXXXXXXXX)
    if (phone) {
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      const phonePattern = /^(09\d{9}|\+639\d{9})$/;
      if (!phonePattern.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be in format 09XXXXXXXXX or +639XXXXXXXXX'
        });
      }
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const createUserSql = `
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, termsAccepted, hipaaAcknowledged, acceptedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        hipaaAcknowledged || false,
        acceptedAt ? new Date(acceptedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' ')
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
        user: { 
          ...user, 
          ...roleData,
          id: user.role === 'patient' ? roleData.id : user.id  // Use patient ID for patients, user ID for others
        }
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

// Forgot password - Send reset link via email
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
    const user = await getRow('SELECT id, firstName, lastName FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No account found with this email address'
      });
    }

    // Import email service
    const emailService = require('../services/emailService');
    
    // Generate reset token
    const resetToken = emailService.generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Invalidate any existing reset tokens for this user
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE userId = ? AND used = FALSE',
        [user.id]
      );

      // Store new reset token
      await connection.execute(
        'INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt]
      );

      // Send reset email
      const emailResult = await emailService.sendPasswordResetEmail(
        email, 
        resetToken, 
        user.firstName || 'User'
      );

      if (!emailResult.success) {
        throw new Error(`Failed to send email: ${emailResult.error}`);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Password reset instructions have been sent to your email'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process forgot password request' 
    });
  }
};

// Reset password with token
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    // Validate password complexity
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'New password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Find valid reset token
      const resetTokenRecord = await getRow(
        `SELECT prt.id, prt.userId, prt.expiresAt, prt.used, u.email, u.firstName 
         FROM password_reset_tokens prt 
         JOIN users u ON prt.userId = u.id 
         WHERE prt.token = ? AND prt.used = FALSE AND prt.expiresAt > NOW()`,
        [token]
      );

      if (!resetTokenRecord) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await connection.execute(
        'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, resetTokenRecord.userId]
      );

      // Mark token as used
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE, usedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [resetTokenRecord.id]
      );

      // Invalidate all other reset tokens for this user
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE userId = ? AND id != ? AND used = FALSE',
        [resetTokenRecord.userId, resetTokenRecord.id]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reset password' 
    });
  }
};

// Verify reset token (for frontend validation)
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    // Check if token is valid and not expired
    const resetTokenRecord = await getRow(
      `SELECT prt.id, prt.userId, prt.expiresAt, u.email, u.firstName, u.lastName 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.userId = u.id 
       WHERE prt.token = ? AND prt.used = FALSE AND prt.expiresAt > NOW()`,
      [token]
    );

    if (!resetTokenRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      message: 'Reset token is valid',
      data: {
        email: resetTokenRecord.email,
        firstName: resetTokenRecord.firstName,
        lastName: resetTokenRecord.lastName,
        expiresAt: resetTokenRecord.expiresAt
      }
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify reset token' 
    });
  }
};

module.exports = {
  login,
  register,
  verify,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken
};
