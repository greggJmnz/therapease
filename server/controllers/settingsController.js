const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const websocketService = require('../services/websocketService');

// Get user settings by role
const getSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user-specific settings
    const settingsQuery = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.id = ?
    `;

    const userSettings = await getRow(settingsQuery, [userId]);

    if (!userSettings) {
      return res.status(404).json({
        success: false,
        error: 'User settings not found'
      });
    }

    // Get working hours from database
    let workingHours = {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    };

    if (userRole === 'therapist') {
      const workingHoursQuery = `
        SELECT dayOfWeek, startTime, endTime, isEnabled
        FROM working_hours
        WHERE userId = ?
      `;
      const workingHoursData = await getAll(workingHoursQuery, [userId]);
      
      if (workingHoursData.length > 0) {
        workingHours = {};
        workingHoursData.forEach(hour => {
          workingHours[hour.dayOfWeek] = {
            start: hour.startTime,
            end: hour.endTime,
            enabled: hour.isEnabled
          };
        });
      }
    }

    // Get notification settings from database
    let notifications = {
      appointmentReminders: true,
      patientUpdates: true,
      systemNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    };

    if (userRole === 'therapist') {
      const settingsQuery = `
        SELECT notifications
        FROM therapist_settings
        WHERE userId = ?
      `;
      const settingsData = await getRow(settingsQuery, [userId]);
      
      if (settingsData && settingsData.notifications) {
        try {
          // Handle case where notifications is already an object
          if (typeof settingsData.notifications === 'string') {
            notifications = JSON.parse(settingsData.notifications);
          } else if (typeof settingsData.notifications === 'object') {
            notifications = settingsData.notifications;
          }
        } catch (error) {
          console.error('Error parsing notification settings:', error);
          console.error('Raw notification data:', settingsData.notifications);
        }
      }
    }

    // Parse JSON fields
    const settings = {
      id: userSettings.id,
      firstName: userSettings.firstName,
      lastName: userSettings.lastName,
      email: userSettings.email,
      phone: userSettings.phone,
      address: userSettings.address,
      city: userSettings.city,
      state: userSettings.state,
      zipCode: userSettings.zipCode,
      timezone: 'America/Los_Angeles',
      notifications: notifications,
      workingHours: workingHours,
      createdAt: userSettings.createdAt,
      updatedAt: userSettings.updatedAt
    };

    // Add role-specific settings
    if (userRole === 'therapist') {
      const therapistQuery = `
        SELECT 
          licenseNumber as license,
          specialization,
          yearsOfExperience as experience,
          education,
          certifications,
          availability
        FROM therapists
        WHERE userId = ?
      `;
      const therapistData = await getRow(therapistQuery, [userId]);
      if (therapistData) {
        settings.license = therapistData.license;
        settings.specialization = therapistData.specialization;
        settings.experience = therapistData.experience;
        settings.education = therapistData.education;
        settings.certifications = therapistData.certifications;
        settings.availability = therapistData.availability;
      } else {
        // If no therapist record exists, create default values
        settings.license = '';
        settings.specialization = '';
        settings.experience = 0;
        settings.education = '';
        settings.certifications = '';
        settings.availability = '';
      }
    } else if (userRole === 'patient') {
      const patientQuery = `
        SELECT 
          dateOfBirth,
          emergencyContact,
          medicalHistory,
          therapistId
        FROM patients
        WHERE userId = ?
      `;
      const patientData = await getRow(patientQuery, [userId]);
      if (patientData) {
        settings.dateOfBirth = patientData.dateOfBirth;
        settings.emergencyContact = patientData.emergencyContact;
        settings.medicalHistory = patientData.medicalHistory;
        settings.therapistId = patientData.therapistId;
      }
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

// Helper function to get settings data without sending response
const getSettingsData = async (userId, userRole) => {
  try {
    // Get user-specific settings
    const settingsQuery = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.createdAt,
        u.updatedAt
      FROM users u
      WHERE u.id = ?
    `;

    const userSettings = await getRow(settingsQuery, [userId]);

    if (!userSettings) {
      throw new Error('User settings not found');
    }

    // Get working hours from database
    let workingHours = {
      monday: { start: '09:00', end: '17:00', enabled: true },
      tuesday: { start: '09:00', end: '17:00', enabled: true },
      wednesday: { start: '09:00', end: '17:00', enabled: true },
      thursday: { start: '09:00', end: '17:00', enabled: true },
      friday: { start: '09:00', end: '17:00', enabled: true },
      saturday: { start: '10:00', end: '14:00', enabled: false },
      sunday: { start: '10:00', end: '14:00', enabled: false }
    };

    if (userRole === 'therapist') {
      const workingHoursQuery = `
        SELECT dayOfWeek, startTime, endTime, isEnabled
        FROM working_hours
        WHERE userId = ?
      `;
      const workingHoursData = await getAll(workingHoursQuery, [userId]);
      
      if (workingHoursData.length > 0) {
        workingHours = {};
        workingHoursData.forEach(hour => {
          workingHours[hour.dayOfWeek] = {
            start: hour.startTime,
            end: hour.endTime,
            enabled: hour.isEnabled
          };
        });
      }
    }

    // Get notification settings from database
    let notifications = {
      appointmentReminders: true,
      patientUpdates: true,
      systemNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true
    };

    if (userRole === 'therapist') {
      const settingsQuery = `
        SELECT notifications
        FROM therapist_settings
        WHERE userId = ?
      `;
      const settingsData = await getRow(settingsQuery, [userId]);
      
      if (settingsData && settingsData.notifications) {
        try {
          // Handle case where notifications is already an object
          if (typeof settingsData.notifications === 'string') {
            notifications = JSON.parse(settingsData.notifications);
          } else if (typeof settingsData.notifications === 'object') {
            notifications = settingsData.notifications;
          }
        } catch (error) {
          console.error('Error parsing notification settings:', error);
          console.error('Raw notification data:', settingsData.notifications);
        }
      }
    }

    // Parse JSON fields
    const settings = {
      id: userSettings.id,
      firstName: userSettings.firstName,
      lastName: userSettings.lastName,
      email: userSettings.email,
      phone: userSettings.phone,
      address: userSettings.address,
      city: userSettings.city,
      state: userSettings.state,
      zipCode: userSettings.zipCode,
      timezone: 'America/Los_Angeles',
      notifications: notifications,
      workingHours: workingHours,
      createdAt: userSettings.createdAt,
      updatedAt: userSettings.updatedAt
    };

    // Add role-specific settings
    if (userRole === 'therapist') {
      const therapistQuery = `
        SELECT 
          licenseNumber as license,
          specialization,
          yearsOfExperience as experience,
          education,
          certifications,
          availability
        FROM therapists
        WHERE userId = ?
      `;
      const therapistData = await getRow(therapistQuery, [userId]);
      if (therapistData) {
        settings.license = therapistData.license;
        settings.specialization = therapistData.specialization;
        settings.experience = therapistData.experience;
        settings.education = therapistData.education;
        settings.certifications = therapistData.certifications;
        settings.availability = therapistData.availability;
      } else {
        // If no therapist record exists, create default values
        settings.license = '';
        settings.specialization = '';
        settings.experience = 0;
        settings.education = '';
        settings.certifications = '';
        settings.availability = '';
      }
    } else if (userRole === 'patient') {
      const patientQuery = `
        SELECT 
          dateOfBirth,
          emergencyContact,
          medicalHistory,
          therapistId
        FROM patients
        WHERE userId = ?
      `;
      const patientData = await getRow(patientQuery, [userId]);
      if (patientData) {
        settings.dateOfBirth = patientData.dateOfBirth;
        settings.emergencyContact = patientData.emergencyContact;
        settings.medicalHistory = patientData.medicalHistory;
        settings.therapistId = patientData.therapistId;
      }
    }

    return settings;

  } catch (error) {
    console.error('Error fetching settings data:', error);
    throw error;
  }
};

// Update user settings by role
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const updateData = req.body;
    
    console.log('Update settings request:', {
      userId,
      userRole,
      updateData: {
        ...updateData,
        password: updateData.password ? '[REDACTED]' : undefined
      }
    });

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      // Update user-specific settings only if provided
      if (updateData.firstName || updateData.lastName || updateData.email || 
          updateData.phone || updateData.address || updateData.city || 
          updateData.state || updateData.zipCode) {
        
        const userUpdateQuery = `
          UPDATE users 
          SET 
            firstName = COALESCE(?, firstName),
            lastName = COALESCE(?, lastName),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            address = COALESCE(?, address),
            city = COALESCE(?, city),
            state = COALESCE(?, state),
            zipCode = COALESCE(?, zipCode),
            updatedAt = NOW()
          WHERE id = ?
        `;

        await connection.execute(userUpdateQuery, [
          updateData.firstName || null,
          updateData.lastName || null,
          updateData.email || null,
          updateData.phone || null,
          updateData.address || null,
          updateData.city || null,
          updateData.state || null,
          updateData.zipCode || null,
          userId
        ]);
      }

      // Update role-specific table
      if (userRole === 'therapist' && updateData.license) {
        const therapistUpdateQuery = `
          UPDATE therapists 
          SET 
            licenseNumber = ?,
            specialization = ?,
            yearsOfExperience = ?,
            education = ?,
            bio = ?,
            updatedAt = NOW()
          WHERE userId = ?
        `;

        await connection.execute(therapistUpdateQuery, [
          updateData.license || null,
          updateData.specialization || null,
          updateData.experience || null,
          updateData.education || null,
          updateData.bio || null,
          userId
        ]);
      } else if (userRole === 'patient' && updateData.dateOfBirth) {
        const patientUpdateQuery = `
          UPDATE patients 
          SET 
            dateOfBirth = ?,
            emergencyContact = ?,
            medicalHistory = ?,
            updatedAt = NOW()
          WHERE userId = ?
        `;

        await connection.execute(patientUpdateQuery, [
          updateData.dateOfBirth || null,
          updateData.emergencyContact || null,
          updateData.medicalHistory || null,
          userId
        ]);
      }

      // Update working hours for therapists
      if (userRole === 'therapist' && updateData.workingHours) {
        console.log('Updating working hours for therapist:', userId, updateData.workingHours);
        
        // Delete existing working hours
        await connection.execute(`
          DELETE FROM working_hours WHERE userId = ?
        `, [userId]);

        // Insert new working hours
        const workingHours = updateData.workingHours;
        for (const [day, hours] of Object.entries(workingHours)) {
          console.log(`Inserting working hours for ${day}:`, hours);
          
          // Convert undefined values to null for MySQL
          const startTime = hours.start || null;
          const endTime = hours.end || null;
          const isEnabled = hours.enabled !== undefined ? hours.enabled : false;
          
          console.log(`SQL parameters for ${day}:`, [userId, day, startTime, endTime, isEnabled]);
          
          await connection.execute(`
            INSERT INTO working_hours (userId, dayOfWeek, startTime, endTime, isEnabled)
            VALUES (?, ?, ?, ?, ?)
          `, [userId, day, startTime, endTime, isEnabled]);
        }
        console.log('Working hours updated successfully');
      }

      // Update notification settings for therapists
      if (userRole === 'therapist' && updateData.notifications) {
        // Check if therapist settings exist
        const existingSettings = await connection.execute(`
          SELECT id FROM therapist_settings WHERE userId = ?
        `, [userId]);

        if (existingSettings[0].length > 0) {
          // Update existing settings
          await connection.execute(`
            UPDATE therapist_settings 
            SET notifications = ?, updatedAt = NOW()
            WHERE userId = ?
          `, [JSON.stringify(updateData.notifications), userId]);
        } else {
          // Insert new settings
          await connection.execute(`
            INSERT INTO therapist_settings (userId, notifications)
            VALUES (?, ?)
          `, [userId, JSON.stringify(updateData.notifications)]);
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Settings updated successfully'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating settings:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      details: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};