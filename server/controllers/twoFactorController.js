const { runQuery, getRow, getConnection } = require('../config/database');
const { verifyPassword } = require('../utils/password');
const emailService = require('../services/emailService');
const { decryptField } = require('../utils/encryption');

// Enable 2FA - Send setup verification code
const enable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to enable 2FA'
      });
    }

    // Get user data
    const user = await getRow('SELECT id, email, password, firstName, twoFactorEnabled FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Decrypt email before using
    const decryptedEmail = decryptField(user.email);
    user.email = decryptedEmail;

    // Check if 2FA is already enabled
    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is already enabled'
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Generate 6-digit verification code
    const code = emailService.generate2FACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Invalidate any existing 2FA codes for this user
      await connection.execute(
        'UPDATE two_factor_codes SET used = TRUE WHERE userId = ? AND used = FALSE',
        [userId]
      );

      // Store the new 2FA setup code
      await connection.execute(
        'INSERT INTO two_factor_codes (userId, code, expiresAt) VALUES (?, ?, ?)',
        [userId, code, expiresAt]
      );

      await connection.commit();

      // Send setup verification email (non-blocking - fire and forget)
      // Don't wait for email to send to avoid API timeout
      console.log(`📧 Attempting to send 2FA setup code to ${decryptedEmail}...`);
      console.log(`   Email service config: useSendGridAPI=${emailService.useSendGridAPI}, hasTransporter=${!!emailService.transporter}`);
      console.log(`   Generated code: ${code} (valid for 10 minutes)`);
      
      emailService.send2FASetupCodeEmail(
        decryptedEmail,
        code,
        user.firstName || 'User'
      ).then(emailResult => {
        if (emailResult.success) {
          console.log(`✅ 2FA setup code email sent successfully to ${decryptedEmail}`);
          console.log(`   Message ID: ${emailResult.messageId || 'N/A'}`);
        } else {
          console.warn(`⚠️ Failed to send 2FA setup code email to ${decryptedEmail}`);
          console.warn(`   Error: ${emailResult.error}`);
          console.warn(`   Code was saved to database: ${code}`);
          console.warn(`   Code expires at: ${expiresAt.toISOString()}`);
          console.warn(`   User can still verify with this code for 10 minutes`);
          console.warn(`   💡 Check PM2 logs or email service configuration`);
        }
      }).catch(error => {
        console.error(`❌ Error sending 2FA setup code email to ${decryptedEmail}:`);
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
        console.error(`   Code was saved to database: ${code}`);
        console.error(`   Code expires at: ${expiresAt.toISOString()}`);
        console.error(`   User can still verify with this code for 10 minutes`);
        console.error(`   💡 To retrieve code manually, query: SELECT code FROM two_factor_codes WHERE userId=${userId} AND used=FALSE ORDER BY createdAt DESC LIMIT 1`);
      });

      // Return success immediately - email is sent in background
      res.json({
        success: true,
        message: '2FA setup code sent to your email. Please check your inbox and enter the code to complete setup.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable 2FA'
    });
  }
};

// Verify 2FA setup code and enable 2FA
const verify2FASetup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    if (!code || code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit code'
      });
    }

    // Get user data
    const user = await getRow('SELECT id, email, firstName, twoFactorEnabled FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Decrypt email (for logging/display purposes, though not used in this function)
    user.email = decryptField(user.email);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is already enabled'
      });
    }

    // Verify the code
    const codeRecord = await getRow(
      'SELECT id, expiresAt FROM two_factor_codes WHERE userId = ? AND code = ? AND used = FALSE ORDER BY createdAt DESC LIMIT 1',
      [userId, code]
    );

    if (!codeRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Check if code is expired
    if (new Date() > new Date(codeRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Mark the code as used
      await connection.execute(
        'UPDATE two_factor_codes SET used = TRUE WHERE id = ?',
        [codeRecord.id]
      );

      // Enable 2FA for the user
      await connection.execute(
        'UPDATE users SET twoFactorEnabled = TRUE, twoFactorMethod = ?, twoFactorEnabledAt = NOW() WHERE id = ?',
        ['email', userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Two-Factor Authentication has been enabled successfully!'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA setup'
    });
  }
};

// Disable 2FA
const disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to disable 2FA'
      });
    }

    // Get user data
    const user = await getRow('SELECT id, email, password, firstName, twoFactorEnabled FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Decrypt email (for logging/display purposes, though not used in this function)
    user.email = decryptField(user.email);

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is not enabled'
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Disable 2FA for the user
      await connection.execute(
        'UPDATE users SET twoFactorEnabled = FALSE, twoFactorMethod = NULL, twoFactorEnabledAt = NULL WHERE id = ?',
        [userId]
      );

      // Invalidate all existing 2FA codes for this user
      await connection.execute(
        'UPDATE two_factor_codes SET used = TRUE WHERE userId = ? AND used = FALSE',
        [userId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Two-Factor Authentication has been disabled successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable 2FA'
    });
  }
};

// Get 2FA status
const get2FAStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await getRow(
      'SELECT twoFactorEnabled, twoFactorMethod, twoFactorEnabledAt FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        enabled: Boolean(user.twoFactorEnabled), // Ensure boolean conversion
        method: user.twoFactorMethod,
        enabledAt: user.twoFactorEnabledAt
      }
    });

  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status'
    });
  }
};

// Send 2FA login code (for login process)
const send2FALoginCode = async (req, res) => {
  try {
    const { email } = req.body;

    // Handle both string and object formats
    let emailToUse;
    if (typeof email === 'string') {
      emailToUse = email;
    } else if (typeof email === 'object' && email.email) {
      emailToUse = email.email;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Get user data (handle encrypted emails)
    const allUsers = await getAll(`
      SELECT id, email, firstName, twoFactorEnabled, twoFactorMethod FROM users
    `);
    
    // Find user by decrypting emails and comparing
    let user = null;
    for (const u of allUsers) {
      try {
        const decryptedEmail = decryptField(u.email);
        if (decryptedEmail && decryptedEmail.toLowerCase() === emailToUse.toLowerCase()) {
          user = u;
          user.email = decryptedEmail;
          break;
        }
      } catch (error) {
        // If decryption fails, try direct comparison (might be plain text still)
        if (u.email && u.email.toLowerCase() === emailToUse.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is not enabled for this account'
      });
    }

    // Generate 6-digit verification code
    const code = emailService.generate2FACode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Invalidate any existing 2FA codes for this user
      await connection.execute(
        'UPDATE two_factor_codes SET used = TRUE WHERE userId = ? AND used = FALSE',
        [user.id]
      );

      // Store the new 2FA login code
      await connection.execute(
        'INSERT INTO two_factor_codes (userId, code, expiresAt) VALUES (?, ?, ?)',
        [user.id, code, expiresAt]
      );

      await connection.commit();

      // Send login verification email (non-blocking - fire and forget)
      // Don't wait for email to send to avoid API timeout
      console.log(`📧 Attempting to send 2FA code to ${user.email}...`);
      console.log(`   Email service config: useSendGridAPI=${emailService.useSendGridAPI}, hasTransporter=${!!emailService.transporter}`);
      console.log(`   Generated code: ${code} (valid for 10 minutes)`);
      
      emailService.send2FACodeEmail(
        user.email,
        code,
        user.firstName || 'User'
      ).then(emailResult => {
        if (emailResult.success) {
          console.log(`✅ 2FA code email sent successfully to ${user.email}`);
          console.log(`   Message ID: ${emailResult.messageId || 'N/A'}`);
        } else {
          console.warn(`⚠️ Failed to send 2FA code email to ${user.email}`);
          console.warn(`   Error: ${emailResult.error}`);
          console.warn(`   Code was saved to database: ${code}`);
          console.warn(`   Code expires at: ${expiresAt.toISOString()}`);
          console.warn(`   User can still verify with this code for 10 minutes`);
          console.warn(`   💡 Check PM2 logs or email service configuration`);
        }
      }).catch(error => {
        console.error(`❌ Error sending 2FA code email to ${user.email}:`);
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
        console.error(`   Code was saved to database: ${code}`);
        console.error(`   Code expires at: ${expiresAt.toISOString()}`);
        console.error(`   User can still verify with this code for 10 minutes`);
        console.error(`   💡 To retrieve code manually, query: SELECT code FROM two_factor_codes WHERE userId=${user.id} AND used=FALSE ORDER BY createdAt DESC LIMIT 1`);
      });

      // Return success immediately - email is sent in background
      res.json({
        success: true,
        message: '2FA verification code sent to your email. Please check your inbox.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Send 2FA login code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send 2FA code'
    });
  }
};

// Verify 2FA login code
const verify2FALoginCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and code are required'
      });
    }

    if (code.length !== 6) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid 6-digit code'
      });
    }

    // Get user data (handle encrypted emails)
    const allUsers = await getAll(`
      SELECT id, email, firstName, twoFactorEnabled FROM users
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
        // If decryption fails, try direct comparison (might be plain text still)
        if (u.email && u.email.toLowerCase() === email.toLowerCase()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Two-Factor Authentication is not enabled for this account'
      });
    }

    // Verify the code
    const codeRecord = await getRow(
      'SELECT id, expiresAt FROM two_factor_codes WHERE userId = ? AND code = ? AND used = FALSE ORDER BY createdAt DESC LIMIT 1',
      [user.id, code]
    );

    if (!codeRecord) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code'
      });
    }

    // Check if code is expired
    if (new Date() > new Date(codeRecord.expiresAt)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.'
      });
    }

    // Mark the code as used
    await runQuery(
      'UPDATE two_factor_codes SET used = TRUE WHERE id = ?',
      [codeRecord.id]
    );

    res.json({
      success: true,
      message: '2FA verification successful',
      userId: user.id,
      email: user.email,
      firstName: user.firstName
    });

  } catch (error) {
    console.error('Verify 2FA login code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify 2FA code'
    });
  }
};

module.exports = {
  enable2FA,
  verify2FASetup,
  disable2FA,
  get2FAStatus,
  send2FALoginCode,
  verify2FALoginCode
};
