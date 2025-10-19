const { getConnection, getRow, getAll, runQuery } = require('../config/database');
const { validatePasswordComplexity } = require('../utils/password');
const bcrypt = require('bcrypt');

// Get therapist profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const sql = `
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
        u.createdAt,
        u.updatedAt,
        t.id as therapistId,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        t.maxPatients,
        t.isAcceptingPatients
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.id = ?
    `;

    const profile = await getRow(sql, [userId]);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({
      success: true,
      data: profile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

// Update therapist profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      country,
      licenseNumber,
      specialization,
      yearsOfExperience,
      education,
      certifications,
      availability,
      maxPatients,
      isAcceptingPatients
    } = req.body;

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Check if user data is provided
      const hasUserData = firstName !== undefined || lastName !== undefined || 
                         email !== undefined || phone !== undefined || 
                         dateOfBirth !== undefined || gender !== undefined || 
                         address !== undefined || city !== undefined || 
                         state !== undefined || zipCode !== undefined || 
                         country !== undefined;

      // Update user table only if user data is provided
      if (hasUserData) {
        const userUpdateFields = [];
        const userUpdateParams = [];

        if (firstName !== undefined) {
          userUpdateFields.push('firstName = ?');
          userUpdateParams.push(firstName);
        }
        if (lastName !== undefined) {
          userUpdateFields.push('lastName = ?');
          userUpdateParams.push(lastName);
        }
        if (email !== undefined) {
          userUpdateFields.push('email = ?');
          userUpdateParams.push(email);
        }
        if (phone !== undefined) {
          userUpdateFields.push('phone = ?');
          userUpdateParams.push(phone);
        }
        if (dateOfBirth !== undefined) {
          userUpdateFields.push('dateOfBirth = ?');
          // Convert ISO date string to YYYY-MM-DD format for MySQL
          const dateValue = dateOfBirth instanceof Date 
            ? dateOfBirth.toISOString().split('T')[0]
            : new Date(dateOfBirth).toISOString().split('T')[0];
          userUpdateParams.push(dateValue);
        }
        if (gender !== undefined) {
          userUpdateFields.push('gender = ?');
          userUpdateParams.push(gender);
        }
        if (address !== undefined) {
          userUpdateFields.push('address = ?');
          userUpdateParams.push(address);
        }
        if (city !== undefined) {
          userUpdateFields.push('city = ?');
          userUpdateParams.push(city);
        }
        if (state !== undefined) {
          userUpdateFields.push('state = ?');
          userUpdateParams.push(state);
        }
        if (zipCode !== undefined) {
          userUpdateFields.push('zipCode = ?');
          userUpdateParams.push(zipCode);
        }
        if (country !== undefined) {
          userUpdateFields.push('country = ?');
          userUpdateParams.push(country);
        }

        userUpdateFields.push('updatedAt = NOW()');
        userUpdateParams.push(userId);

        const userSql = `UPDATE users SET ${userUpdateFields.join(', ')} WHERE id = ?`;
        await connection.execute(userSql, userUpdateParams);
      }

      // Check if therapist data is provided
      const hasTherapistData = licenseNumber !== undefined || specialization !== undefined || 
                              yearsOfExperience !== undefined || education !== undefined || 
                              certifications !== undefined || availability !== undefined || 
                              maxPatients !== undefined || isAcceptingPatients !== undefined;

      // Update therapist table only if therapist data is provided
      if (hasTherapistData) {
        const therapistUpdateFields = [];
        const therapistUpdateParams = [];

        if (licenseNumber !== undefined) {
          therapistUpdateFields.push('licenseNumber = ?');
          therapistUpdateParams.push(licenseNumber);
        }
        if (specialization !== undefined) {
          therapistUpdateFields.push('specialization = ?');
          therapistUpdateParams.push(specialization);
        }
        if (yearsOfExperience !== undefined) {
          therapistUpdateFields.push('yearsOfExperience = ?');
          therapistUpdateParams.push(yearsOfExperience);
        }
        if (education !== undefined) {
          therapistUpdateFields.push('education = ?');
          therapistUpdateParams.push(education);
        }
        if (certifications !== undefined) {
          therapistUpdateFields.push('certifications = ?');
          therapistUpdateParams.push(certifications);
        }
        if (availability !== undefined) {
          therapistUpdateFields.push('availability = ?');
          therapistUpdateParams.push(availability);
        }
        // Check if maxPatients column exists before trying to update it
        if (maxPatients !== undefined) {
          try {
            const [columns] = await connection.execute(`
              SELECT COLUMN_NAME 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'therapists' AND COLUMN_NAME = 'maxPatients'
            `);
            if (columns.length > 0) {
              therapistUpdateFields.push('maxPatients = ?');
              therapistUpdateParams.push(maxPatients);
            }
          } catch (error) {
            console.log('maxPatients column does not exist, skipping update');
          }
        }
        
        // Check if isAcceptingPatients column exists before trying to update it
        if (isAcceptingPatients !== undefined) {
          try {
            const [columns] = await connection.execute(`
              SELECT COLUMN_NAME 
              FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'therapists' AND COLUMN_NAME = 'isAcceptingPatients'
            `);
            if (columns.length > 0) {
              therapistUpdateFields.push('isAcceptingPatients = ?');
              therapistUpdateParams.push(isAcceptingPatients);
            }
          } catch (error) {
            console.log('isAcceptingPatients column does not exist, skipping update');
          }
        }

        therapistUpdateFields.push('updatedAt = NOW()');
        therapistUpdateParams.push(userId);

        const therapistSql = `UPDATE therapists SET ${therapistUpdateFields.join(', ')} WHERE userId = ?`;
        await connection.execute(therapistSql, therapistUpdateParams);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Validate new password complexity
    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      });
    }

    // Get current password hash
    const userSql = 'SELECT password FROM users WHERE id = ?';
    const user = await getRow(userSql, [userId]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Verify current password
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
    const updateSql = 'UPDATE users SET password = ?, updatedAt = NOW() WHERE id = ?';
    await runQuery(updateSql, [hashedNewPassword, userId]);

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
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const imagePath = `/uploads/profile-images/${req.file.filename}`;

    // Update user profile image
    const sql = 'UPDATE users SET profileImage = ?, updatedAt = NOW() WHERE id = ?';
    await execute(sql, [imagePath, userId]);

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: { imagePath }
    });

  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload profile image' });
  }
};

// Get onboarding status
const getOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user and therapist data
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
        u.termsAccepted,
        u.hipaaAcknowledged,
        u.acceptedAt,
        u.createdAt,
        u.onboardingCompleted
      FROM users u
      WHERE u.id = ?
    `;

    const therapistSql = `
      SELECT 
        t.id,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        t.maxPatients,
        t.isAcceptingPatients
      FROM therapists t
      WHERE t.userId = ?
    `;

    const user = await getRow(userSql, [userId]);
    const therapist = await getRow(therapistSql, [userId]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate individual step completion for progress tracking
    const requiredPersonalFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 
      'address', 'city', 'state', 'zipCode'
    ];

    const requiredProfessionalFields = [
      'licenseNumber', 'specialization', 'yearsOfExperience', 'education'
    ];

    const personalInfoComplete = requiredPersonalFields.every(field => user[field] !== null && user[field] !== '');
    const professionalInfoComplete = therapist && requiredProfessionalFields.every(field => therapist[field] !== null && therapist[field] !== '');
    const complianceComplete = user.termsAccepted && user.hipaaAcknowledged;
    
    // Check if onboarding is completed from database OR if therapist has meaningful existing data
    // Only consider it complete if they have substantial professional information filled out
    const hasSubstantialTherapistData = !!(therapist && 
      therapist.licenseNumber && 
      therapist.licenseNumber.trim() !== '' &&
      therapist.education && 
      therapist.education.trim() !== '' &&
      therapist.yearsOfExperience !== null &&
      therapist.yearsOfExperience !== undefined
    );
    const isOnboardingComplete = !!(user.onboardingCompleted === 1 || hasSubstantialTherapistData);

    const onboardingStatus = {
      isComplete: isOnboardingComplete,
      steps: {
        personalInfo: {
          completed: personalInfoComplete,
          required: requiredPersonalFields,
          completedFields: requiredPersonalFields.filter(field => user[field] !== null && user[field] !== '')
        },
        professionalInfo: {
          completed: professionalInfoComplete,
          required: requiredProfessionalFields,
          completedFields: therapist ? requiredProfessionalFields.filter(field => therapist[field] !== null && therapist[field] !== '') : []
        },
        compliance: {
          completed: complianceComplete,
          required: ['termsAccepted', 'hipaaAcknowledged'],
          completedFields: [
            ...(user.termsAccepted ? ['termsAccepted'] : []),
            ...(user.hipaaAcknowledged ? ['hipaaAcknowledged'] : [])
          ]
        }
      },
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        termsAccepted: user.termsAccepted,
        hipaaAcknowledged: user.hipaaAcknowledged,
        acceptedAt: user.acceptedAt,
        createdAt: user.createdAt,
        onboardingCompleted: user.onboardingCompleted
      },
      therapist: therapist || {}
    };

    res.json({
      success: true,
      data: onboardingStatus
    });

  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding status' });
  }
};

// Update onboarding data
const updateOnboardingData = async (req, res) => {
  try {
    const userId = req.user.id;
    const onboardingData = req.body;

    console.log('🔍 Update onboarding data - Received data:', JSON.stringify(onboardingData, null, 2));
    console.log('🔍 User ID:', userId);

    // Validate userId
    if (!userId) {
      console.error('Update onboarding data - userId is undefined or null');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Check if personal data is provided
      const hasPersonalData = onboardingData.firstName || onboardingData.lastName || 
                             onboardingData.phone || onboardingData.dateOfBirth || 
                             onboardingData.gender || onboardingData.address || 
                             onboardingData.city || onboardingData.state || 
                             onboardingData.zipCode;

      // Update user table with personal data only if provided
      if (hasPersonalData) {
      const userSql = `
        UPDATE users SET 
          firstName = ?, lastName = ?, phone = ?, dateOfBirth = ?, gender = ?,
          address = ?, city = ?, state = ?, zipCode = ?,
          updatedAt = NOW()
        WHERE id = ?
      `;

      const userParams = [
        onboardingData.firstName || null,
        onboardingData.lastName || null,
        onboardingData.phone || null,
        onboardingData.dateOfBirth || null,
        onboardingData.gender || null,
        onboardingData.address || null,
        onboardingData.city || null,
        onboardingData.state || null,
        onboardingData.zipCode || null,
        userId
      ];

      await connection.execute(userSql, userParams);
      }

      // Check if professional data is provided
      const hasProfessionalData = onboardingData.licenseNumber || onboardingData.specialization || 
                                 onboardingData.yearsOfExperience !== undefined || onboardingData.education || 
                                 onboardingData.certifications || onboardingData.availability || 
                                 onboardingData.maxPatients !== undefined || onboardingData.isAcceptingPatients !== undefined;

      // Update therapist table with professional data only if provided
      if (hasProfessionalData) {
        // Check if therapist record exists
        const [existingTherapist] = await connection.execute(
          'SELECT id FROM therapists WHERE userId = ?', 
          [userId]
        );

        if (existingTherapist.length > 0) {
          // Update existing therapist record
          const therapistUpdateFields = [];
          const therapistUpdateParams = [];

          if (onboardingData.licenseNumber !== undefined) {
            therapistUpdateFields.push('licenseNumber = ?');
            therapistUpdateParams.push(onboardingData.licenseNumber);
          }
          if (onboardingData.specialization !== undefined) {
            therapistUpdateFields.push('specialization = ?');
            therapistUpdateParams.push(onboardingData.specialization);
          }
          if (onboardingData.yearsOfExperience !== undefined) {
            therapistUpdateFields.push('yearsOfExperience = ?');
            therapistUpdateParams.push(onboardingData.yearsOfExperience ? parseInt(onboardingData.yearsOfExperience) : null);
          }
          if (onboardingData.education !== undefined) {
            therapistUpdateFields.push('education = ?');
            therapistUpdateParams.push(onboardingData.education);
          }
          if (onboardingData.certifications !== undefined) {
            therapistUpdateFields.push('certifications = ?');
            therapistUpdateParams.push(onboardingData.certifications);
          }
          if (onboardingData.availability !== undefined) {
            therapistUpdateFields.push('availability = ?');
            therapistUpdateParams.push(onboardingData.availability);
          }
          if (onboardingData.maxPatients !== undefined) {
            therapistUpdateFields.push('maxPatients = ?');
            therapistUpdateParams.push(onboardingData.maxPatients ? parseInt(onboardingData.maxPatients) : 20);
          }
          if (onboardingData.isAcceptingPatients !== undefined) {
            therapistUpdateFields.push('isAcceptingPatients = ?');
            therapistUpdateParams.push(onboardingData.isAcceptingPatients);
          }

          therapistUpdateFields.push('updatedAt = NOW()');
          therapistUpdateParams.push(userId);

          const therapistSql = `UPDATE therapists SET ${therapistUpdateFields.join(', ')} WHERE userId = ?`;
          await connection.execute(therapistSql, therapistUpdateParams);
        } else {
          // Create new therapist record
          const createTherapistSql = `
            INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, maxPatients, isAcceptingPatients, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `;

          const therapistParams = [
            userId,
            onboardingData.licenseNumber || null,
            onboardingData.specialization || null,
            onboardingData.yearsOfExperience ? parseInt(onboardingData.yearsOfExperience) : null,
            onboardingData.education || null,
            onboardingData.certifications || null,
            onboardingData.availability || null,
            onboardingData.maxPatients ? parseInt(onboardingData.maxPatients) : 20,
            onboardingData.isAcceptingPatients !== undefined ? onboardingData.isAcceptingPatients : true
          ];

          await connection.execute(createTherapistSql, therapistParams);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Onboarding data updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Update onboarding data error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update onboarding data',
      details: error.message 
    });
  }
};

// Complete onboarding
const completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const onboardingData = req.body;
    

    // Validate userId
    if (!userId) {
      console.error('Complete onboarding - userId is undefined or null');
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user table with all data
      const userSql = `
        UPDATE users SET 
          firstName = ?, lastName = ?, phone = ?, dateOfBirth = ?, gender = ?,
          address = ?, city = ?, state = ?, zipCode = ?,
          termsAccepted = ?, hipaaAcknowledged = ?, acceptedAt = ?,
          onboardingCompleted = true, onboardingCompletedAt = NOW(),
          updatedAt = NOW()
        WHERE id = ?
      `;

      const userParams = [
        onboardingData.firstName || null,
        onboardingData.lastName || null,
        onboardingData.phone || null,
        onboardingData.dateOfBirth || null,
        onboardingData.gender || null,
        onboardingData.address || null,
        onboardingData.city || null,
        onboardingData.state || null,
        onboardingData.zipCode || null,
        onboardingData.termsAccepted || false,
        onboardingData.hipaaAcknowledged || false,
        onboardingData.acceptedAt ? new Date(onboardingData.acceptedAt).toISOString().slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
        userId
      ];

      await connection.execute(userSql, userParams);

      // Update or create therapist table with professional data
      // Check if therapist record exists
      const [existingTherapist] = await connection.execute(
        'SELECT id FROM therapists WHERE userId = ?', 
        [userId]
      );

      if (existingTherapist.length > 0) {
        // Update existing therapist record
        const therapistSql = `
          UPDATE therapists SET 
            licenseNumber = ?, specialization = ?, yearsOfExperience = ?,
            education = ?, certifications = ?, availability = ?,
            maxPatients = ?, isAcceptingPatients = ?, updatedAt = NOW()
          WHERE userId = ?
        `;

        const therapistParams = [
          onboardingData.licenseNumber || null,
          onboardingData.specialization || null,
          onboardingData.yearsOfExperience ? parseInt(onboardingData.yearsOfExperience) : null,
          onboardingData.education || null,
          onboardingData.certifications || null,
          onboardingData.availability || null,
          onboardingData.maxPatients ? parseInt(onboardingData.maxPatients) : 20,
          onboardingData.isAcceptingPatients !== undefined ? onboardingData.isAcceptingPatients : true,
          userId
        ];

        await connection.execute(therapistSql, therapistParams);
      } else {
        // Create new therapist record
        const createTherapistSql = `
          INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, maxPatients, isAcceptingPatients, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

        const therapistParams = [
          userId,
          onboardingData.licenseNumber || null,
          onboardingData.specialization || null,
          onboardingData.yearsOfExperience ? parseInt(onboardingData.yearsOfExperience) : null,
          onboardingData.education || null,
          onboardingData.certifications || null,
          onboardingData.availability || null,
          onboardingData.maxPatients ? parseInt(onboardingData.maxPatients) : 20,
          onboardingData.isAcceptingPatients !== undefined ? onboardingData.isAcceptingPatients : true
        ];

        await connection.execute(createTherapistSql, therapistParams);
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Onboarding completed successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete onboarding',
      details: error.message 
    });
  }
};

// Get onboarding progress
const getOnboardingProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const userSql = `
      SELECT 
        u.firstName, u.lastName, u.phone, u.dateOfBirth, u.gender,
        u.address, u.city, u.state, u.zipCode,
        u.termsAccepted, u.hipaaAcknowledged,
        u.onboardingCompleted
      FROM users u
      WHERE u.id = ?
    `;

    const therapistSql = `
      SELECT 
        t.licenseNumber, t.specialization, t.yearsOfExperience,
        t.education, t.certifications, t.availability
      FROM therapists t
      WHERE t.userId = ?
    `;

    const user = await getRow(userSql, [userId]);
    const therapist = await getRow(therapistSql, [userId]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate progress
    const personalFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'address', 'city', 'state', 'zipCode'];
    const professionalFields = ['licenseNumber', 'specialization', 'yearsOfExperience', 'education'];
    const complianceFields = ['termsAccepted', 'hipaaAcknowledged'];

    const personalProgress = personalFields.filter(field => user[field] !== null && user[field] !== '').length;
    const professionalProgress = therapist ? professionalFields.filter(field => therapist[field] !== null && therapist[field] !== '').length : 0;
    const complianceProgress = complianceFields.filter(field => user[field] === true).length;

    const totalProgress = personalProgress + professionalProgress + complianceProgress;
    const maxProgress = personalFields.length + professionalFields.length + complianceFields.length;
    const progressPercentage = Math.round((totalProgress / maxProgress) * 100);

    res.json({
      success: true,
      data: {
        progressPercentage,
        steps: {
          personalInfo: {
            completed: personalProgress,
            total: personalFields.length,
            percentage: Math.round((personalProgress / personalFields.length) * 100)
          },
          professionalInfo: {
            completed: professionalProgress,
            total: professionalFields.length,
            percentage: Math.round((professionalProgress / professionalFields.length) * 100)
          },
          compliance: {
            completed: complianceProgress,
            total: complianceFields.length,
            percentage: Math.round((complianceProgress / complianceFields.length) * 100)
          }
        },
        isComplete: user.onboardingCompleted === 1
      }
    });

  } catch (error) {
    console.error('Get onboarding progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding progress' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfileImage,
  getOnboardingStatus,
  updateOnboardingData,
  completeOnboarding,
  getOnboardingProgress
};

