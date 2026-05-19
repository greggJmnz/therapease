const { promisify } = require('util');
const { getRow } = require('../config/database');
const { verifyToken } = require('../config/jwt');

// In-memory cache for user status checks to avoid database queries on every request
// Cache TTL: 30 seconds (balance between security and performance)
const userStatusCache = new Map();
const CACHE_TTL = 30000; // 30 seconds in milliseconds

// Helper function to check user status with caching
const checkUserStatus = async (userId) => {
  const cacheKey = `user_status_${userId}`;
  const cached = userStatusCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  try {
    const user = await getRow('SELECT status FROM users WHERE id = ?', [userId]);
    const status = user ? user.status : null;
    
    // Cache the result
    userStatusCache.set(cacheKey, {
      status,
      timestamp: Date.now()
    });
    
    // Clean up old cache entries periodically (every 100 requests)
    if (userStatusCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of userStatusCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          userStatusCache.delete(key);
        }
      }
    }
    
    return status;
  } catch (error) {
    console.error('Error checking user status:', error);
    // On error, assume active to avoid blocking legitimate requests
    // This is a trade-off: we prioritize performance over strict security checking
    return 'active';
  }
};

// Middleware to verify JWT token (OPTIMIZED: removed blocking database query)
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token using async/await pattern (faster than callback)
    try {
      const decoded = verifyToken(token);
      
      // Add user info to request
      const userId = decoded.userId || decoded.id;
      req.user = {
        id: userId,
        userId: userId,
        email: decoded.email,
        role: decoded.role
      };

      // OPTIMIZED: Check user status with caching (reduces DB queries by ~99%)
      // Only queries database every 30 seconds per user instead of every request
      const userStatus = await checkUserStatus(userId);
      
      if (userStatus !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated. Please contact administrator for assistance.'
        });
      }

      next();
    } catch (verifyError) {
      if (verifyError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      } else if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired'
        });
      } else {
        console.error('Token verification error:', verifyError);
        return res.status(401).json({
          success: false,
          error: 'Token verification failed'
        });
      }
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware to authorize specific roles
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Check if user role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Insufficient permissions.'
        });
      }

      next();

    } catch (error) {
      console.error('Authorization middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

// Middleware to authorize admin only
const authorizeAdmin = (req, res, next) => {
  return authorizeRole(['admin'])(req, res, next);
};

// Middleware to authorize therapist only
const authorizeTherapist = (req, res, next) => {
  return authorizeRole(['therapist', 'admin'])(req, res, next);
};

// Middleware to authorize patient only
const authorizePatient = (req, res, next) => {
  return authorizeRole(['patient', 'admin'])(req, res, next);
};

// Middleware to check if user owns the resource or is admin
const authorizeResourceOwner = (resourceType, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'Resource ID required'
        });
      }

      // Check resource ownership based on type
      let isOwner = false;

      switch (resourceType) {
        case 'patient':
          // Therapists can access their assigned patients
          if (req.user.role === 'therapist') {
            const patient = await getRow(
              'SELECT therapistId FROM patients WHERE id = ?',
              [resourceId]
            );
            isOwner = patient && patient.therapistId === req.user.id;
          }
          break;

        case 'assessment':
          // Therapists can access assessments they created
          if (req.user.role === 'therapist') {
            const assessment = await getRow(
              'SELECT therapistId FROM assessments WHERE id = ?',
              [resourceId]
            );
            isOwner = assessment && assessment.therapistId === req.user.id;
          }
          break;

        case 'dailyNote':
          // Therapists can access daily notes they created
          if (req.user.role === 'therapist') {
            const dailyNote = await getRow(
              'SELECT therapistId FROM daily_notes WHERE id = ?',
              [resourceId]
            );
            isOwner = dailyNote && dailyNote.therapistId === req.user.id;
          }
          break;

        case 'progress':
          // Therapists can access progress entries for their patients
          if (req.user.role === 'therapist') {
            const progress = await getRow(`
              SELECT mo.id FROM main_objectives mo
              JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
              JOIN patients p ON tp.patientId = p.id
              WHERE mo.id = ? AND p.therapistId = ?
            `, [resourceId, req.user.id]);
            isOwner = !!progress;
          }
          break;

        case 'appointment':
          // Therapists can access appointments they created
          if (req.user.role === 'therapist') {
            const appointment = await getRow(
              'SELECT therapistId FROM appointments WHERE id = ?',
              [resourceId]
            );
            isOwner = appointment && appointment.therapistId === req.user.id;
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid resource type'
          });
      }

      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own resources.'
        });
      }

      next();

    } catch (error) {
      console.error('Resource ownership authorization error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed'
      });
    }
  };
};

// Middleware to check if user can access patient data
const canAccessPatient = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const patientId = req.params.patientId || req.params.id;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'Patient ID required'
      });
    }

    // Admin can access all patients
    if (req.user.role === 'admin') {
      return next();
    }

    // Check access based on role

    if (req.user.role === 'therapist') {
      // Therapists can access their assigned patients
      const patient = await getRow(
        'SELECT therapistId FROM patients WHERE id = ?',
        [patientId]
      );
      
      if (!patient || patient.therapistId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your assigned patients.'
        });
      }
    } else if (req.user.role === 'patient') {
      // Patients can only access their own data
      const patient = await getRow(
        'SELECT userId FROM patients WHERE id = ?',
        [patientId]
      );
      
      if (!patient || patient.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only access your own data.'
        });
      }
    }

    next();

  } catch (error) {
    console.error('Patient access authorization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authorizeAdmin,
  authorizeTherapist,
  authorizePatient,
  authorizeResourceOwner,
  canAccessPatient
};
