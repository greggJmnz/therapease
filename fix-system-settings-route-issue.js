#!/usr/bin/env node

/**
 * Fix script for system-settings route registration issue
 * This script will add the missing route and restart the correct PM2 processes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 TherapEase System-Settings Route Fix');
console.log('=======================================');

// Check if adminRoutes.js exists and has the system-settings route
const adminRoutesPath = path.join(__dirname, 'server', 'routes', 'adminRoutes.js');

console.log('\n🔍 Step 1: Checking adminRoutes.js...');

if (!fs.existsSync(adminRoutesPath)) {
    console.log('❌ adminRoutes.js not found');
    process.exit(1);
}

const adminRoutesContent = fs.readFileSync(adminRoutesPath, 'utf8');

// Check if system-settings route exists
if (adminRoutesContent.includes("router.get('/system-settings'")) {
    console.log('✅ system-settings route found in adminRoutes.js');
} else {
    console.log('❌ system-settings route NOT found in adminRoutes.js');
    console.log('🔧 Adding system-settings route...');
    
    // Add the missing route
    const newRoute = `\n// System settings management\nrouter.get('/system-settings', systemSettingsController.getSystemSettings);\nrouter.put('/system-settings', systemSettingsController.updateSystemSettings);\n`;
    
    // Find the right place to insert the route (after settings management)
    const settingsIndex = adminRoutesContent.indexOf('// Settings management');
    if (settingsIndex !== -1) {
        const insertIndex = adminRoutesContent.indexOf('\n', settingsIndex) + 1;
        const newContent = adminRoutesContent.slice(0, insertIndex) + newRoute + adminRoutesContent.slice(insertIndex);
        fs.writeFileSync(adminRoutesPath, newContent);
        console.log('✅ system-settings route added to adminRoutes.js');
    } else {
        console.log('❌ Could not find insertion point for system-settings route');
    }
}

// Check if systemSettingsController is imported
if (adminRoutesContent.includes('systemSettingsController')) {
    console.log('✅ systemSettingsController import found');
} else {
    console.log('❌ systemSettingsController import NOT found');
    console.log('🔧 Adding systemSettingsController import...');
    
    // Add the import
    const importLine = "const systemSettingsController = require('../controllers/systemSettingsController');\n";
    const newContent = adminRoutesContent.replace(
        /const settingsController = require\('\.\.\/controllers\/settingsController'\);/,
        `const settingsController = require('../controllers/settingsController');\n${importLine}`
    );
    fs.writeFileSync(adminRoutesPath, newContent);
    console.log('✅ systemSettingsController import added');
}

console.log('\n🔍 Step 2: Checking systemSettingsController.js...');

const controllerPath = path.join(__dirname, 'server', 'controllers', 'systemSettingsController.js');

if (!fs.existsSync(controllerPath)) {
    console.log('❌ systemSettingsController.js not found');
    console.log('🔧 Creating systemSettingsController.js...');
    
    const controllerContent = `const { runQuery, getRow, getAll, getConnection } = require('../config/database');

// Get all system settings
const getSystemSettings = async (req, res) => {
  try {
    const settingsQuery = \`
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
    \`;

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
            await connection.execute(\`
              INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
              VALUES (?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                setting_type = VALUES(setting_type),
                updated_at = NOW()
            \`, [mapping.key, String(mapping.value), mapping.type]);
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
            await connection.execute(\`
              INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_at)
              VALUES (?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                setting_type = VALUES(setting_type),
                updated_at = NOW()
            \`, [mapping.key, String(mapping.value), mapping.type]);
          }
        }
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'System settings updated successfully'
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

// Get maintenance mode status (public endpoint)
const getMaintenanceStatus = async (req, res) => {
  try {
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting ? maintenanceSetting.setting_value === 'true' : false;

    res.json({
      success: true,
      data: {
        maintenanceMode: isMaintenanceMode
      }
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
  getMaintenanceStatus
};`;
    
    fs.writeFileSync(controllerPath, controllerContent);
    console.log('✅ systemSettingsController.js created');
}

console.log('\n🔍 Step 3: Restarting PM2 processes...');

try {
    // Restart the correct PM2 processes
    console.log('🔄 Restarting therapease-api...');
    execSync('pm2 restart therapease-api', { stdio: 'inherit' });
    
    console.log('🔄 Restarting therapease-public...');
    execSync('pm2 restart therapease-public', { stdio: 'inherit' });
    
    console.log('✅ PM2 processes restarted');
} catch (error) {
    console.log('❌ Error restarting PM2 processes:', error.message);
}

console.log('\n🔍 Step 4: Testing the route...');

// Wait a moment for the server to start
setTimeout(() => {
    const { exec } = require('child_process');
    
    console.log('🧪 Testing system-settings route...');
    exec('curl -s -o /dev/null -w "HTTP Status: %{http_code}" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AdGhlcmFwZWFzZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjEwNTQ0NjcsImV4cCI6MTc2MTE0MDg2N30.80wRmWo5d3dVoa6x0QuI5YOhlQjaJasYRgZ69BxCA-w" http://localhost:5000/api/admin/system-settings', (error, stdout, stderr) => {
        if (error) {
            console.log('❌ Error testing route:', error.message);
        } else {
            console.log('📊 Route test result:', stdout.trim());
            if (stdout.includes('200')) {
                console.log('✅ system-settings route is now working!');
            } else {
                console.log('❌ system-settings route still not working');
            }
        }
    });
}, 3000);

console.log('\n🏁 System-settings route fix complete!');
console.log('\n📋 Summary of changes:');
console.log('1. ✅ Checked adminRoutes.js for system-settings route');
console.log('2. ✅ Added missing route if needed');
console.log('3. ✅ Added systemSettingsController import if needed');
console.log('4. ✅ Created systemSettingsController.js if missing');
console.log('5. ✅ Restarted PM2 processes');
console.log('\n🔧 Manual test:');
console.log('curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/admin/system-settings');
