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
      progressUpdates: true,
      assessmentResults: true,
      homeExerciseReminders: true,
      systemUpdates: false,
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
          // Handle parsing error silently
        }
      }
    } else if (userRole === 'patient') {
      const settingsQuery = `
        SELECT notifications
        FROM patient_settings
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
          // Handle parsing error silently
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
          ts.notifications,
          ts.workingHours,
          ts.updatedAt as settingsUpdatedAt
        FROM therapist_settings ts
        WHERE ts.userId = ?
      `;
      const therapistSettings = await getRow(therapistQuery, [userId]);
      
      if (therapistSettings) {
        settings.therapistSettings = {
          notifications: therapistSettings.notifications ? 
            (typeof therapistSettings.notifications === 'string' ? 
              JSON.parse(therapistSettings.notifications) : 
              therapistSettings.notifications) : null,
          workingHours: therapistSettings.workingHours ? 
            (typeof therapistSettings.workingHours === 'string' ? 
              JSON.parse(therapistSettings.workingHours) : 
              therapistSettings.workingHours) : null,
          updatedAt: therapistSettings.settingsUpdatedAt
        };
      }
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Get settings error:', error);
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
      progressUpdates: true,
      assessmentResults: true,
      homeExerciseReminders: true,
      systemUpdates: false,
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
          // Handle parsing error silently
        }
      }
    } else if (userRole === 'patient') {
      const settingsQuery = `
        SELECT notifications
        FROM patient_settings
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
          // Handle parsing error silently
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
          ts.notifications,
          ts.workingHours,
          ts.updatedAt as settingsUpdatedAt
        FROM therapist_settings ts
        WHERE ts.userId = ?
      `;
      const therapistSettings = await getRow(therapistQuery, [userId]);
      
      if (therapistSettings) {
        settings.therapistSettings = {
          notifications: therapistSettings.notifications ? 
            (typeof therapistSettings.notifications === 'string' ? 
              JSON.parse(therapistSettings.notifications) : 
              therapistSettings.notifications) : null,
          workingHours: therapistSettings.workingHours ? 
            (typeof therapistSettings.workingHours === 'string' ? 
              JSON.parse(therapistSettings.workingHours) : 
              therapistSettings.workingHours) : null,
          updatedAt: therapistSettings.settingsUpdatedAt
        };
      }
    }

    return settings;

  } catch (error) {
    console.error('Get settings data error:', error);
    throw error;
  }
};

// Update user settings by role
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const updateData = req.body;

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update basic user information
      if (updateData.firstName || updateData.lastName || updateData.email || 
          updateData.phone || updateData.address || updateData.city || 
          updateData.state || updateData.zipCode) {
        
        const updateFields = [];
        const updateValues = [];

        if (updateData.firstName) {
          updateFields.push('firstName = ?');
          updateValues.push(updateData.firstName);
        }
        if (updateData.lastName) {
          updateFields.push('lastName = ?');
          updateValues.push(updateData.lastName);
        }
        if (updateData.email) {
          updateFields.push('email = ?');
          updateValues.push(updateData.email);
        }
        if (updateData.phone) {
          updateFields.push('phone = ?');
          updateValues.push(updateData.phone);
        }
        if (updateData.address) {
          updateFields.push('address = ?');
          updateValues.push(updateData.address);
        }
        if (updateData.city) {
          updateFields.push('city = ?');
          updateValues.push(updateData.city);
        }
        if (updateData.state) {
          updateFields.push('state = ?');
          updateValues.push(updateData.state);
        }
        if (updateData.zipCode) {
          updateFields.push('zipCode = ?');
          updateValues.push(updateData.zipCode);
        }

        if (updateFields.length > 0) {
          updateFields.push('updatedAt = NOW()');
          updateValues.push(userId);

          await connection.execute(`
            UPDATE users 
            SET ${updateFields.join(', ')}
            WHERE id = ?
          `, updateValues);
        }
      }

      // Update working hours for therapists
      if (userRole === 'therapist' && updateData.workingHours) {
        
        // Delete existing working hours
        await connection.execute(`
          DELETE FROM working_hours WHERE userId = ?
        `, [userId]);

        // Insert new working hours
        const workingHours = updateData.workingHours;
        for (const [day, hours] of Object.entries(workingHours)) {
          
          // Convert undefined values to null for MySQL
          const startTime = hours.start || null;
          const endTime = hours.end || null;
          const isEnabled = hours.enabled !== undefined ? hours.enabled : false;
          
          
          await connection.execute(`
            INSERT INTO working_hours (userId, dayOfWeek, startTime, endTime, isEnabled)
            VALUES (?, ?, ?, ?, ?)
          `, [userId, day, startTime, endTime, isEnabled]);
        }
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

      // Update notification settings for patients
      if (userRole === 'patient' && updateData.notifications) {
        // Check if patient settings exist
        const existingSettings = await connection.execute(`
          SELECT id FROM patient_settings WHERE userId = ?
        `, [userId]);

        if (existingSettings[0].length > 0) {
          // Update existing settings
          await connection.execute(`
            UPDATE patient_settings 
            SET notifications = ?, updatedAt = NOW()
            WHERE userId = ?
          `, [JSON.stringify(updateData.notifications), userId]);
        } else {
          // Insert new settings
          await connection.execute(`
            INSERT INTO patient_settings (userId, notifications)
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
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

module.exports = {
  getSettings,
  getSettingsData,
  updateSettings
};
