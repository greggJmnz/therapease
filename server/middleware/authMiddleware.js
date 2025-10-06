const jwt = require('jsonwebtoken');
const { getRow } = require('../config/database');

// JWT secret (in real app, this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: 'Invalid token'
          });
        } else if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired'
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Token verification failed'
          });
        }
      }

      // Add user info to request
      // JWT token contains 'userId' field, so use that consistently
      const userId = decoded.userId || decoded.id;
      req.user = {
        id: userId,
        userId: userId,
        email: decoded.email,
        role: decoded.role
      };


      next();
    });

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
              SELECT pt.id FROM progress_tracking pt
              JOIN patients p ON pt.patientId = p.id
              WHERE pt.id = ? AND p.therapistId = ?
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
