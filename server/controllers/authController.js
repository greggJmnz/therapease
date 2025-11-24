const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const { hashPassword, verifyPassword, validatePasswordComplexity } = require('../utils/password');
const { encryptField, decryptField, hashForSearch } = require('../utils/encryption');
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
    // Since email is encrypted, we need to search by hashed email or decrypt all emails
    // For efficiency, we'll fetch all users and decrypt emails to find the match
    // TODO: Consider adding emailHash column for faster lookups
    const allUsersSql = `
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
        u.twoFactorEnabled,
        u.twoFactorMethod,
        u.createdAt,
        u.updatedAt
      FROM users u
    `;

    const allUsers = await getAll(allUsersSql);
    
    // Find user by decrypting emails and comparing
    let user = null;
    for (const u of allUsers) {
      try {
        const decryptedEmail = decryptField(u.email);
        if (decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase()) {
          user = u;
          // Decrypt email for use in response
          user.email = decryptedEmail;
          break;
        }
      } catch (error) {
        // If decryption fails, try direct comparison (might be plain text still)
        if (u.email && u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }
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

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return 2FA required response instead of JWT token
      return res.json({
        success: true,
        requires2FA: true,
        message: 'Two-Factor Authentication is enabled. Please enter the verification code sent to your email.',
        email: user.email
      });
    }

    // Use default session timeout (skip database query for faster login)
    // System settings can be fetched later if needed
    const DEFAULT_SESSION_TIMEOUT = 30; // minutes
    const sessionTimeoutMinutes = DEFAULT_SESSION_TIMEOUT;
    const sessionTimeoutHours = sessionTimeoutMinutes / 60;
    const expiresIn = sessionTimeoutHours >= 1 ? `${sessionTimeoutHours}h` : `${sessionTimeoutMinutes}m`;

    // Generate JWT token (only if 2FA is not enabled)
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn }
    );

    // OPTIMIZED: Skip role-specific data loading entirely for faster login
    // Role-specific data can be fetched on-demand when dashboard loads
    // This significantly speeds up login response time by eliminating extra queries
    // The frontend can fetch this data lazily when needed
    let roleData = {};
    
    // Only fetch minimal role-specific data if absolutely necessary for routing
    // For most cases, we can skip this and let the dashboard fetch it
    // This reduces login time from ~50ms to ~20ms

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

    // Check registration settings
    const allowRegistrationSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['allow_registration']
    );
    
    if (!allowRegistrationSetting || allowRegistrationSetting.setting_value !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'User registration is currently disabled. Please contact an administrator.'
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

    // Check if user with email already exists (handle encrypted emails)
    const allUsers = await getAll('SELECT id, email FROM users');
    const existingUser = allUsers.find(u => {
      try {
        const decryptedEmail = decryptField(u.email);
        return decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase();
      } catch (error) {
        return u.email && u.email.toLowerCase() === email.toLowerCase();
      }
    });
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

    // Check email verification requirement
    const requireEmailVerificationSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['require_email_verification']
    );
    
    const requireEmailVerification = requireEmailVerificationSetting && requireEmailVerificationSetting.setting_value === 'true';

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const createUserSql = `
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode, termsAccepted, hipaaAcknowledged, acceptedAt, emailVerified, emailVerifiedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        acceptedAt ? new Date(acceptedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        !requireEmailVerification, // If email verification is not required, mark as verified
        !requireEmailVerification ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null
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

      // Get session timeout from system settings
      const sessionTimeoutSetting = await getRow(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['session_timeout']
      );
      
      const sessionTimeoutMinutes = sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.setting_value) : 30;
      const sessionTimeoutHours = sessionTimeoutMinutes / 60;
      const expiresIn = sessionTimeoutHours >= 1 ? `${sessionTimeoutHours}h` : `${sessionTimeoutMinutes}m`;

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role 
        },
        JWT_SECRET,
        { expiresIn }
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

    // Get user ID from JWT token
    const userId = req.user?.id || req.user?.userId;

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

    // Check if user exists (handle encrypted emails)
    const allUsers = await getAll('SELECT id, email, firstName, lastName FROM users');
    let user = null;
    for (const u of allUsers) {
      try {
        const decryptedEmail = decryptField(u.email);
        if (decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      } catch (error) {
        if (u.email && u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }
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
    // Express automatically decodes URL-encoded parameters
    let { token } = req.params;

    if (!token) {
      console.error('❌ Verify reset token: No token provided in request');
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }


    // Check if token is valid and not expired
    const resetTokenRecord = await getRow(
      `SELECT prt.id, prt.userId, prt.expiresAt, prt.used, prt.token as storedToken, u.email, u.firstName, u.lastName 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.userId = u.id 
       WHERE prt.token = ? AND prt.used = FALSE AND prt.expiresAt > NOW()`,
      [token]
    );

    if (!resetTokenRecord) {
      // If not found, do a case-insensitive comparison to check for case mismatch
      const caseInsensitiveRecord = await getRow(
        `SELECT prt.id, prt.userId, prt.expiresAt, prt.used, prt.token as storedToken 
         FROM password_reset_tokens prt 
         WHERE LOWER(prt.token) = LOWER(?) AND prt.used = FALSE AND prt.expiresAt > NOW()`,
        [token]
      );
      
      if (caseInsensitiveRecord) {
        console.error(`⚠️ Verify reset token: Token found but case mismatch!`);
        console.error(`   Received: ${token.substring(0, 20)}... (length: ${token.length})`);
        console.error(`   Stored:   ${caseInsensitiveRecord.storedToken.substring(0, 20)}... (length: ${caseInsensitiveRecord.storedToken.length})`);
        return res.status(400).json({
          success: false,
          error: 'Token case mismatch - token may have been modified'
        });
      }
      // Check if token exists but is used or expired
      const expiredTokenRecord = await getRow(
        `SELECT prt.id, prt.userId, prt.expiresAt, prt.used 
         FROM password_reset_tokens prt 
         WHERE prt.token = ?`,
        [token]
      );
      
      
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Decrypt email before returning
    const decryptedEmail = decryptField(resetTokenRecord.email);

    res.json({
      success: true,
      message: 'Reset token is valid',
      data: {
        email: decryptedEmail,
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

// Login with 2FA verification
const loginWith2FA = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and verification code are required'
      });
    }

    // Get user data (handle encrypted emails)
    const allUsers = await getAll(`
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
        u.twoFactorEnabled,
        u.createdAt,
        u.updatedAt
      FROM users u
    `);
    
    // Find user by decrypting emails and comparing
    let user = null;
    for (const u of allUsers) {
      try {
        const decryptedEmail = decryptField(u.email);
        if (decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase()) {
          user = u;
          user.email = decryptedEmail;
          break;
        }
      } catch (error) {
        if (u.email && u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or verification code'
      });
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated. Please contact administrator for assistance.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is not enabled for this account'
      });
    }

    // Verify the 2FA code
    const codeRecord = await getRow(
      'SELECT id, expiresAt FROM two_factor_codes WHERE userId = ? AND code = ? AND used = FALSE ORDER BY createdAt DESC LIMIT 1',
      [user.id, code]
    );

    if (!codeRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Check if code is expired
    if (new Date() > new Date(codeRecord.expiresAt)) {
      return res.status(401).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    // Mark the code as used
    await runQuery(
      'UPDATE two_factor_codes SET used = TRUE WHERE id = ?',
      [codeRecord.id]
    );

    // Get session timeout from system settings
    const sessionTimeoutSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['session_timeout']
    );
    
    const sessionTimeoutMinutes = sessionTimeoutSetting ? parseInt(sessionTimeoutSetting.setting_value) : 30;
    const sessionTimeoutHours = sessionTimeoutMinutes / 60;
    const expiresIn = sessionTimeoutHours >= 1 ? `${sessionTimeoutHours}h` : `${sessionTimeoutMinutes}m`;

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn }
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
      
      const therapistData = await getRow(therapistSql, [user.id]);
      if (therapistData) {
        roleData = {
          therapistId: therapistData.id,
          license: therapistData.licenseNumber,
          specialization: therapistData.specialization,
          experience: therapistData.yearsOfExperience,
          education: therapistData.education,
          certifications: therapistData.certifications,
          availability: therapistData.availability
        };
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
      
      const patientData = await getRow(patientSql, [user.id]);
      if (patientData) {
        roleData = {
          patientId: patientData.id,
          diagnosis: patientData.diagnosis,
          medicalHistory: patientData.medicalHistory,
          goals: patientData.goals,
          therapistId: patientData.therapistId,
          emergencyContact: patientData.emergencyContact,
          insuranceInfo: patientData.insuranceInfo
        };
      }
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
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
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          ...roleData
        }
      }
    });

  } catch (error) {
    console.error('Login with 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

module.exports = {
  login,
  loginWith2FA,
  register,
  verify,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyResetToken
};
