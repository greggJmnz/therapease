const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const { hashPassword } = require('../utils/password');
const websocketService = require('../services/websocketService');

// Helper function to get updated profile data without sending response
const getUpdatedProfileData = async (userId, userRole) => {
  try {
    // Get user data
    const userQuery = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.country,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.id = ?
    `;

    const user = await getRow(userQuery, [userId]);

    if (!user) {
      return null;
    }

    let profileData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      country: user.country,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Add role-specific data
    if (userRole === 'therapist') {
      const therapistQuery = `
        SELECT 
          licenseNumber,
          specialization,
          yearsOfExperience,
          education,
          certifications,
          availability
        FROM therapists
        WHERE userId = ?
      `;
      const therapist = await getRow(therapistQuery, [userId]);
      if (therapist) {
        profileData.licenseNumber = therapist.licenseNumber;
        profileData.specialization = therapist.specialization;
        profileData.yearsOfExperience = therapist.yearsOfExperience;
        profileData.education = therapist.education;
        profileData.certifications = therapist.certifications;
        profileData.availability = therapist.availability;
      }
    } else if (userRole === 'patient') {
      const patientQuery = `
        SELECT 
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.emergencyContact,
          p.insuranceInfo,
          p.therapistId,
          u.firstName as therapistFirstName,
          u.lastName as therapistLastName,
          t.specialization as therapistSpecialization
        FROM patients p
        LEFT JOIN users u ON p.therapistId = u.id
        LEFT JOIN therapists t ON u.id = t.userId
        WHERE p.userId = ?
      `;
      const patient = await getRow(patientQuery, [userId]);
      if (patient) {
        // Import decryption utility
        const { decryptField } = require('../utils/encryption');
        
        profileData.diagnosis = patient.diagnosis;
        profileData.medicalHistory = patient.medicalHistory;
        profileData.goals = patient.goals;
        profileData.emergencyContact = decryptField(patient.emergencyContact);
        profileData.insuranceInfo = decryptField(patient.insuranceInfo);
        profileData.therapistId = patient.therapistId;
        if (patient.therapistFirstName && patient.therapistLastName) {
          profileData.therapistName = `${patient.therapistFirstName} ${patient.therapistLastName}`;
          profileData.therapistSpecialization = patient.therapistSpecialization;
        }
      }
    }

    return profileData;
  } catch (error) {
    console.error('Error getting updated profile data:', error);
    return null;
  }
};

// Get user profile by role
const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let profileData = {};

    // Get basic user information
    const userSql = `
      SELECT 
        u.id,
        u.email,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.country,
        u.profileImage,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.id = ?
    `;

    const user = await getRow(userSql, [userId]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Decrypt sensitive user fields
    profileData = {
      ...user,
      email: decryptField(user.email),
      phone: decryptField(user.phone),
      address: decryptField(user.address)
    };

    // Get role-specific information
    if (userRole === 'therapist') {
      const therapistSql = `
        SELECT 
          t.id,
          t.licenseNumber,
          t.specialization,
          t.yearsOfExperience,
          t.education,
          t.certifications,
          t.availability,
          t.createdAt,
          t.updatedAt
        FROM therapists t
        WHERE t.userId = ?
      `;
      const therapist = await getRow(therapistSql, [userId]);
      if (therapist) {
        profileData = { ...profileData, ...therapist };
      }
    } else if (userRole === 'patient') {
      const patientSql = `
        SELECT 
          p.id,
          p.diagnosis,
          p.medicalHistory,
          p.goals,
          p.therapistId,
          p.emergencyContact,
          p.insuranceInfo,
          p.status,
          p.createdAt,
          p.updatedAt,
          u.firstName as therapistFirstName,
          u.lastName as therapistLastName,
          t.specialization as therapistSpecialization
        FROM patients p
        LEFT JOIN users u ON p.therapistId = u.id
        LEFT JOIN therapists t ON u.id = t.userId
        WHERE p.userId = ?
      `;
      const patient = await getRow(patientSql, [userId]);
      if (patient) {
        // Import decryption utility
        const { decryptField } = require('../utils/encryption');
        
        profileData = { ...profileData, ...patient };
        // Decrypt sensitive fields
        profileData.emergencyContact = decryptField(patient.emergencyContact);
        profileData.insuranceInfo = decryptField(patient.insuranceInfo);
        
        if (patient.therapistFirstName && patient.therapistLastName) {
          profileData.therapistName = `${patient.therapistFirstName} ${patient.therapistLastName}`;
          profileData.therapistSpecialization = patient.therapistSpecialization;
        }
      }
    }

    res.json({
      success: true,
      data: profileData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const updateData = req.body;
    
    console.log('Profile update data:', updateData);
    console.log('User ID:', userId);
    console.log('User Role:', userRole);
    

    // Validate required fields
    if (!updateData.firstName || !updateData.lastName || !updateData.email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updateData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate phone format if provided (Philippine mobile format: 09XXXXXXXXX)
    if (updateData.phone) {
      const cleanPhone = updateData.phone.replace(/[\s\-\(\)]/g, '');
      const phonePattern = /^(09\d{9}|\+639\d{9})$/;
      if (!phonePattern.test(cleanPhone)) {
        return res.status(400).json({
          success: false,
          error: 'Phone number must be in format 09XXXXXXXXX or +639XXXXXXXXX'
        });
      }
    }

    // Check if email is already taken by another user
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [updateData.email, userId]
    );
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email is already taken by another user'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user fields
      const userUpdateFields = [];
      const userUpdateParams = [];

      if (updateData.firstName !== undefined) {
        userUpdateFields.push('firstName = ?');
        userUpdateParams.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        userUpdateFields.push('lastName = ?');
        userUpdateParams.push(updateData.lastName);
      }

      if (updateData.email !== undefined) {
        userUpdateFields.push('email = ?');
        userUpdateParams.push(updateData.email);
      }

      if (updateData.phone !== undefined) {
        userUpdateFields.push('phone = ?');
        userUpdateParams.push(updateData.phone);
      }

      if (updateData.dateOfBirth !== undefined) {
        userUpdateFields.push('dateOfBirth = ?');
        // Convert ISO date string to YYYY-MM-DD format for MySQL
        const dateValue = updateData.dateOfBirth instanceof Date 
          ? updateData.dateOfBirth.toISOString().split('T')[0]
          : new Date(updateData.dateOfBirth).toISOString().split('T')[0];
        userUpdateParams.push(dateValue);
      }

      if (updateData.gender !== undefined) {
        userUpdateFields.push('gender = ?');
        userUpdateParams.push(updateData.gender);
      }

      if (updateData.address !== undefined) {
        userUpdateFields.push('address = ?');
        userUpdateParams.push(updateData.address);
      }

      if (updateData.city !== undefined) {
        userUpdateFields.push('city = ?');
        userUpdateParams.push(updateData.city);
      }

      if (updateData.state !== undefined) {
        userUpdateFields.push('state = ?');
        userUpdateParams.push(updateData.state);
      }

      if (updateData.zipCode !== undefined) {
        userUpdateFields.push('zipCode = ?');
        userUpdateParams.push(updateData.zipCode);
      }

      if (updateData.country !== undefined) {
        userUpdateFields.push('country = ?');
        userUpdateParams.push(updateData.country);
      }

      // Update user if there are user fields to update
      if (userUpdateFields.length > 0) {
        userUpdateFields.push('updatedAt = CURRENT_TIMESTAMP');
        userUpdateParams.push(userId);

        const userUpdateSql = `UPDATE users SET ${userUpdateFields.join(', ')} WHERE id = ?`;
        await connection.execute(userUpdateSql, userUpdateParams);
      }

      // Update role-specific fields
      if (userRole === 'therapist') {
        const therapistUpdateFields = [];
        const therapistUpdateParams = [];

        if (updateData.licenseNumber !== undefined) {
          therapistUpdateFields.push('licenseNumber = ?');
          therapistUpdateParams.push(updateData.licenseNumber);
        }

        if (updateData.specialization !== undefined) {
          therapistUpdateFields.push('specialization = ?');
          therapistUpdateParams.push(updateData.specialization);
        }

        if (updateData.yearsOfExperience !== undefined) {
          therapistUpdateFields.push('yearsOfExperience = ?');
          therapistUpdateParams.push(updateData.yearsOfExperience);
        }

        if (updateData.education !== undefined) {
          therapistUpdateFields.push('education = ?');
          therapistUpdateParams.push(updateData.education);
        }

        if (updateData.certifications !== undefined) {
          therapistUpdateFields.push('certifications = ?');
          therapistUpdateParams.push(updateData.certifications);
        }

        if (updateData.availability !== undefined) {
          therapistUpdateFields.push('availability = ?');
          therapistUpdateParams.push(updateData.availability);
        }

        if (therapistUpdateFields.length > 0) {
          therapistUpdateFields.push('updatedAt = CURRENT_TIMESTAMP');
          therapistUpdateParams.push(userId);

          const therapistUpdateSql = `UPDATE therapists SET ${therapistUpdateFields.join(', ')} WHERE userId = ?`;
          await connection.execute(therapistUpdateSql, therapistUpdateParams);
        }
      } else if (userRole === 'patient') {
        const patientUpdateFields = [];
        const patientUpdateParams = [];

        if (updateData.diagnosis !== undefined) {
          patientUpdateFields.push('diagnosis = ?');
          patientUpdateParams.push(updateData.diagnosis);
        }

        if (updateData.medicalHistory !== undefined) {
          patientUpdateFields.push('medicalHistory = ?');
          patientUpdateParams.push(updateData.medicalHistory);
        }

        if (updateData.goals !== undefined) {
          patientUpdateFields.push('goals = ?');
          patientUpdateParams.push(updateData.goals);
        }

        if (updateData.emergencyContact !== undefined) {
          patientUpdateFields.push('emergencyContact = ?');
          patientUpdateParams.push(updateData.emergencyContact);
        }

        if (updateData.insuranceInfo !== undefined) {
          patientUpdateFields.push('insuranceInfo = ?');
          patientUpdateParams.push(updateData.insuranceInfo);
        }

        if (patientUpdateFields.length > 0) {
          patientUpdateFields.push('updatedAt = CURRENT_TIMESTAMP');
          patientUpdateParams.push(userId);

          const patientUpdateSql = `UPDATE patients SET ${patientUpdateFields.join(', ')} WHERE userId = ?`;
          await connection.execute(patientUpdateSql, patientUpdateParams);
        }
      }

      // Commit transaction
      await connection.commit();

      // Get updated profile data for broadcasting
      const updatedProfileData = await getUpdatedProfileData(userId, userRole);
      
      // Broadcast profile change
      websocketService.broadcastProfileChange(userId, userRole, updatedProfileData, 'updated');

      // Send success response
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfileData
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    
    // Handle specific database errors
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        error: 'Email address is already in use by another account' 
      });
    }
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid reference data provided' 
      });
    }
    
    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ 
        success: false, 
        error: 'One or more fields exceed maximum length' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile. Please try again.' 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    console.log('Password change attempt for user:', userId);
    console.log('Current password provided:', !!currentPassword);
    console.log('New password length:', newPassword?.length);

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

    // Get current user
    const user = await getRow('SELECT password FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await runQuery(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
};

// Upload profile image
const uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Get the uploaded file info
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    
    // Update user's profile image in database
    const updateSql = 'UPDATE users SET profileImage = ? WHERE id = ?';
    await runQuery(updateSql, [imageUrl, userId]);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        imageUrl: imageUrl
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
