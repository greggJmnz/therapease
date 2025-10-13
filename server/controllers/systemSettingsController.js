const { runQuery, getRow, getAll, getConnection } = require('../config/database');
const websocketService = require('../services/websocketService');

// Get all system settings
const getSystemSettings = async (req, res) => {
  try {
    const settingsQuery = `
      SELECT 
        setting_key,
        setting_value,
        setting_type,
        category,
        description,
        is_public,
        created_at,
        updated_at
      FROM system_settings
      ORDER BY category, setting_key
    `;

    const settings = await getAll(settingsQuery);

    // Transform settings into organized structure with default values
    const organizedSettings = {
      general: {
        systemName: 'TherapEase',
        maintenanceMode: false,
        sessionTimeout: 30
      },
      registration: {
        allowRegistration: true,
        requireEmailVerification: true
      },
      security: {
        passwordComplexity: 'medium',
        maxLoginAttempts: 5,
        notificationFrequency: 'immediate'
      },
      notifications: {
        systemAlerts: true,
        userActivity: true,
        securityEvents: true,
        maintenanceNotifications: true,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      }
    };

    // Parse settings from database
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Convert value based on type
      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = parseInt(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = setting.setting_value;
          }
          break;
        default:
          // Keep as string
          break;
      }

      // Map to organized structure
      switch (setting.setting_key) {
        case 'system_name':
          organizedSettings.general.systemName = value;
          break;
        case 'maintenance_mode':
          organizedSettings.general.maintenanceMode = value;
          break;
        case 'session_timeout':
          organizedSettings.general.sessionTimeout = value;
          break;
        case 'allow_registration':
          organizedSettings.registration.allowRegistration = value;
          break;
        case 'require_email_verification':
          organizedSettings.registration.requireEmailVerification = value;
          break;
        case 'password_complexity':
          organizedSettings.security.passwordComplexity = value;
          break;
        case 'max_login_attempts':
          organizedSettings.security.maxLoginAttempts = value;
          break;
        case 'email_notifications':
          organizedSettings.notifications.emailNotifications = value;
          break;
        case 'notification_frequency':
          organizedSettings.security.notificationFrequency = value;
          break;
        case 'system_alerts':
          organizedSettings.notifications.systemAlerts = value;
          break;
        case 'user_activity':
          organizedSettings.notifications.userActivity = value;
          break;
        case 'security_events':
          organizedSettings.notifications.securityEvents = value;
          break;
        case 'maintenance_notifications':
          organizedSettings.notifications.maintenanceNotifications = value;
          break;
        case 'sms_notifications':
          organizedSettings.notifications.smsNotifications = value;
          break;
        case 'push_notifications':
          organizedSettings.notifications.pushNotifications = value;
          break;
      }
    });

    res.json({
      success: true,
      data: organizedSettings
    });

  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system settings'
    });
  }
};

// Update system settings
const updateSystemSettings = async (req, res) => {
  try {
    const { general, notifications } = req.body;
    const connection = await getConnection();
    
    await connection.beginTransaction();

    try {
      // Update system settings
      if (general) {
        const systemMappings = [
          { key: 'system_name', value: general.systemName, type: 'string' },
          { key: 'maintenance_mode', value: general.maintenanceMode, type: 'boolean' },
          { key: 'session_timeout', value: general.sessionTimeout, type: 'number' },
          { key: 'allow_registration', value: general.allowRegistration, type: 'boolean' },
          { key: 'require_email_verification', value: general.requireEmailVerification, type: 'boolean' },
          { key: 'password_complexity', value: general.passwordComplexity, type: 'string' },
          { key: 'max_login_attempts', value: general.maxLoginAttempts, type: 'number' },
          { key: 'notification_frequency', value: general.notificationFrequency, type: 'string' }
        ];

        for (const mapping of systemMappings) {
          if (mapping.value !== undefined) {
            await connection.execute(`
              INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
              VALUES (?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                setting_type = VALUES(setting_type),
                updated_at = NOW()
            `, [mapping.key, String(mapping.value), mapping.type]);
          }
        }
      }

      // Update notification settings
      if (notifications) {
        const notificationMappings = [
          { key: 'system_alerts', value: notifications.systemAlerts, type: 'boolean' },
          { key: 'user_activity', value: notifications.userActivity, type: 'boolean' },
          { key: 'security_events', value: notifications.securityEvents, type: 'boolean' },
          { key: 'maintenance_notifications', value: notifications.maintenanceNotifications, type: 'boolean' },
          { key: 'email_notifications', value: notifications.emailNotifications, type: 'boolean' },
          { key: 'sms_notifications', value: notifications.smsNotifications, type: 'boolean' },
          { key: 'push_notifications', value: notifications.pushNotifications, type: 'boolean' }
        ];

        for (const mapping of notificationMappings) {
          if (mapping.value !== undefined) {
            await connection.execute(`
              INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
              VALUES (?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                setting_type = VALUES(setting_type),
                updated_at = NOW()
            `, [mapping.key, String(mapping.value), mapping.type]);
          }
        }
      }

      await connection.commit();

      // Get updated settings without sending response
      const settingsQuery = `
        SELECT 
          setting_key,
          setting_value,
          setting_type,
          category,
          description,
          is_public,
          created_at,
          updated_at
        FROM system_settings
        ORDER BY category, setting_key
      `;

      const settings = await getAll(settingsQuery);

      // Transform settings into organized structure with default values
      const organizedSettings = {
        general: {
          systemName: 'TherapEase',
          maintenanceMode: false,
          sessionTimeout: 30
        },
        registration: {
          allowRegistration: true,
          requireEmailVerification: true
        },
        security: {
          passwordComplexity: 'medium',
          maxLoginAttempts: 5,
          notificationFrequency: 'immediate'
        },
        notifications: {
          systemAlerts: true,
          userActivity: true,
          securityEvents: true,
          maintenanceNotifications: true,
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true
        }
      };

      // Parse settings from database and update organizedSettings
      settings.forEach(setting => {
        let value = setting.setting_value;
        
        // Convert value based on type
        switch (setting.setting_type) {
          case 'boolean':
            value = value === 'true';
            break;
          case 'number':
            value = parseInt(value);
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch (e) {
              value = setting.setting_value;
            }
            break;
          default:
            // Keep as string
            break;
        }

        // Map to organized structure
        switch (setting.setting_key) {
          case 'system_name':
            organizedSettings.general.systemName = value;
            break;
          case 'maintenance_mode':
            organizedSettings.general.maintenanceMode = value;
            break;
          case 'session_timeout':
            organizedSettings.general.sessionTimeout = value;
            break;
          case 'allow_registration':
            organizedSettings.registration.allowRegistration = value;
            break;
          case 'require_email_verification':
            organizedSettings.registration.requireEmailVerification = value;
            break;
          case 'password_complexity':
            organizedSettings.security.passwordComplexity = value;
            break;
          case 'max_login_attempts':
            organizedSettings.security.maxLoginAttempts = value;
            break;
          case 'email_notifications':
            organizedSettings.notifications.emailNotifications = value;
            break;
          case 'notification_frequency':
            organizedSettings.security.notificationFrequency = value;
            break;
          case 'system_alerts':
            organizedSettings.notifications.systemAlerts = value;
            break;
          case 'user_activity':
            organizedSettings.notifications.userActivity = value;
            break;
          case 'security_events':
            organizedSettings.notifications.securityEvents = value;
            break;
          case 'maintenance_notifications':
            organizedSettings.notifications.maintenanceNotifications = value;
            break;
          case 'sms_notifications':
            organizedSettings.notifications.smsNotifications = value;
            break;
          case 'push_notifications':
            organizedSettings.notifications.pushNotifications = value;
            break;
        }
      });
      
      // Broadcast settings change to all connected clients
      websocketService.broadcastSystemSettingsChange(organizedSettings);

      res.json({
        success: true,
        message: 'System settings updated successfully',
        data: organizedSettings
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update system settings'
    });
  }
};

// Get public system settings (for non-admin users)
const getPublicSystemSettings = async (req, res) => {
  try {
    const settingsQuery = `
      SELECT 
        setting_key,
        setting_value,
        setting_type
      FROM system_settings
      WHERE is_public = true
      ORDER BY setting_key
    `;

    const settings = await getAll(settingsQuery);
    const publicSettings = {};

    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Convert value based on type
      switch (setting.setting_type) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = parseInt(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = setting.setting_value;
          }
          break;
        default:
          // Keep as string
          break;
      }

      publicSettings[setting.setting_key] = value;
    });

    res.json({
      success: true,
      data: publicSettings
    });

  } catch (error) {
    console.error('Error fetching public system settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public system settings'
    });
  }
};

// Get maintenance mode status (public endpoint)
const getMaintenanceStatus = async (req, res) => {
  try {
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.setting_value === 'true';

    res.json({
      success: true,
      maintenanceMode: isMaintenanceMode,
      message: isMaintenanceMode 
        ? 'System is currently under maintenance. Please try again later.'
        : 'System is operational'
    });

  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance status'
    });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
  getPublicSystemSettings,
  getMaintenanceStatus
};
