const { getRow } = require('../config/database');

// Middleware to check maintenance mode
const checkMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for admin system settings routes
    if (req.path === '/api/admin/system-settings' && req.method === 'GET') {
      return next();
    }

    // Skip maintenance check for admin system settings update (to allow admins to disable maintenance mode)
    if (req.path === '/api/admin/system-settings' && req.method === 'PUT') {
      return next();
    }

    // Skip maintenance check for maintenance status endpoint (both public and admin)
    if ((req.path === '/api/maintenance-status' || req.path === '/api/admin/maintenance-status') && req.method === 'GET') {
      return next();
    }

    // Skip maintenance check for login endpoint (to allow users to login and see maintenance page)
    if (req.path === '/api/auth/login' && req.method === 'POST') {
      return next();
    }

    // Skip maintenance check for authenticated admin users
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // Check maintenance mode status
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.setting_value === 'true';

    if (isMaintenanceMode) {
      // Allow admin users to access the system during maintenance
      if (req.user && req.user.role === 'admin') {
        return next();
      }

      // Return maintenance mode response for all other users
      return res.status(503).json({
        success: false,
        error: 'System is currently under maintenance. Please try again later.',
        maintenanceMode: true,
        message: 'We are performing scheduled maintenance to improve your experience. Please check back soon.'
      });
    }

    next();
  } catch (error) {
    console.error('Maintenance mode check error:', error);
    // If there's an error checking maintenance mode, allow the request to proceed
    // This ensures the system doesn't break if there are database issues
    next();
  }
};

// Middleware to check maintenance mode for public routes (no authentication required)
const checkPublicMaintenanceMode = async (req, res, next) => {
  try {
    // Skip maintenance check for system settings routes
    if (req.path === '/api/admin/system-settings') {
      return next();
    }

    // Skip maintenance check for maintenance status endpoint (both public and admin)
    if (req.path === '/api/maintenance-status' || req.path === '/api/admin/maintenance-status') {
      return next();
    }

    // Check maintenance mode status
    const maintenanceSetting = await getRow(
      'SELECT setting_value FROM system_settings WHERE setting_key = ?',
      ['maintenance_mode']
    );

    const isMaintenanceMode = maintenanceSetting && maintenanceSetting.setting_value === 'true';

    if (isMaintenanceMode) {
      // Return maintenance mode response
      return res.status(503).json({
        success: false,
        error: 'System is currently under maintenance. Please try again later.',
        maintenanceMode: true,
        message: 'We are performing scheduled maintenance to improve your experience. Please check back soon.'
      });
    }

    next();
  } catch (error) {
    console.error('Public maintenance mode check error:', error);
    // If there's an error checking maintenance mode, allow the request to proceed
    next();
  }
};

module.exports = {
  checkMaintenanceMode,
  checkPublicMaintenanceMode
};
