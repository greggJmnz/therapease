const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const websocketService = require('../services/websocketService');

// Get user settings by role
const getSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
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
      notifications: {
        appointmentReminders: true,
        patientUpdates: true,
        systemNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      },
      workingHours: {
        monday: { start: '09:00', end: '17:00', enabled: true },
        tuesday: { start: '09:00', end: '17:00', enabled: true },
        wednesday: { start: '09:00', end: '17:00', enabled: true },
        thursday: { start: '09:00', end: '17:00', enabled: true },
        friday: { start: '09:00', end: '17:00', enabled: true },
        saturday: { start: '10:00', end: '14:00', enabled: false },
        sunday: { start: '10:00', end: '14:00', enabled: false }
      },
      sessionPreferences: {
        defaultDuration: 45,
        bufferTime: 15,
        maxSessionsPerDay: 8,
        allowWeekendSessions: false,
        allowEveningSessions: true
      },
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

// Update user settings by role
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const updateData = req.body;

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user table
      const userUpdateQuery = `
        UPDATE users 
        SET 
          firstName = ?,
          lastName = ?,
          email = ?,
          phone = ?,
          address = ?,
          city = ?,
          state = ?,
          zipCode = ?,
          updatedAt = NOW()
        WHERE id = ?
      `;

      await connection.execute(userUpdateQuery, [
        updateData.firstName,
        updateData.lastName,
        updateData.email,
        updateData.phone,
        updateData.address,
        updateData.city,
        updateData.state,
        updateData.zipCode,
        userId
      ]);

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
          updateData.license,
          updateData.specialization,
          updateData.experience,
          updateData.education,
          updateData.bio,
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
          updateData.dateOfBirth,
          updateData.emergencyContact,
          updateData.medicalHistory,
          userId
        ]);
      }

      await connection.commit();

      // Get updated settings
      const updatedSettings = await getSettings(req, res);
      
      // Broadcast settings change
      websocketService.broadcastSettingsChange(userId, userRole, updatedSettings.data, 'updated');

      res.json({
        success: true,
        message: 'Settings updated successfully',
        data: updatedSettings.data
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};