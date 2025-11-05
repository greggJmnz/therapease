const { runQuery, getRow, getAll } = require('../config/database');

// Get therapist dashboard data - OPTIMIZED: Combined queries for better performance
const getDashboard = async (req, res) => {
  try {
    // Get therapist ID from authenticated user (therapistId in patients table refers to userId)
    const therapistId = req.user.id;

    // OPTIMIZED: Combine all overview stats into a single query using subqueries
    // This reduces 6 database queries to 1, dramatically improving performance
    const overviewStatsSql = `
      SELECT
        (SELECT COUNT(DISTINCT pta.patientId) 
         FROM patient_therapist_assignments pta
         WHERE pta.therapistId = ? AND pta.status = 'active') as totalPatients,
        
        (SELECT COUNT(*) FROM assessments a WHERE a.therapistId = ?) as totalAssessments,
        (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsCompleted,
        (SELECT COUNT(CASE WHEN status = 'in-progress' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsInProgress,
        (SELECT COUNT(CASE WHEN status = 'scheduled' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsScheduled,
        
        (SELECT COUNT(*) FROM appointments a WHERE a.therapistId = ?) as totalAppointments,
        (SELECT COUNT(CASE WHEN status = 'scheduled' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsScheduled,
        (SELECT COUNT(CASE WHEN status = 'confirmed' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsConfirmed,
        (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsCompleted,
        (SELECT COUNT(CASE WHEN status = 'cancelled' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsCancelled,
        
        (SELECT COUNT(*) FROM appointments a 
         WHERE a.therapistId = ? AND a.appointmentDate >= CURDATE() AND a.status = 'scheduled') as upcomingAppointments,
        
        (SELECT COUNT(*) FROM daily_notes dn 
         WHERE dn.therapistId = ? AND dn.sessionDate = CURDATE()) as todayNotes,
        
        (SELECT COUNT(DISTINCT mo.id) 
         FROM main_objectives mo
         JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
         JOIN patients p ON tp.patientId = p.id
         LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId
         WHERE p.therapistId = ? OR (pta.therapistId = ? AND pta.status = 'active')) as totalProgressEntries
    `;

    // Execute single combined query (pass therapistId multiple times for subqueries)
    const overviewResult = await getRow(overviewStatsSql, [
      therapistId, // totalPatients
      therapistId, // totalAssessments
      therapistId, // assessmentsCompleted
      therapistId, // assessmentsInProgress
      therapistId, // assessmentsScheduled
      therapistId, // totalAppointments
      therapistId, // appointmentsScheduled
      therapistId, // appointmentsConfirmed
      therapistId, // appointmentsCompleted
      therapistId, // appointmentsCancelled
      therapistId, // upcomingAppointments
      therapistId, // todayNotes
      therapistId, therapistId // totalProgressEntries
    ]);

    const overview = overviewResult || {};
    const totalPatients = overview.totalPatients || 0;
    const assessmentStats = {
      total: overview.totalAssessments || 0,
      completed: overview.assessmentsCompleted || 0,
      inProgress: overview.assessmentsInProgress || 0,
      scheduled: overview.assessmentsScheduled || 0
    };
    const appointmentStats = {
      total: overview.totalAppointments || 0,
      scheduled: overview.appointmentsScheduled || 0,
      confirmed: overview.appointmentsConfirmed || 0,
      completed: overview.appointmentsCompleted || 0,
      cancelled: overview.appointmentsCancelled || 0
    };
    const upcomingAppointmentsCount = overview.upcomingAppointments || 0;
    const todayNotes = overview.todayNotes || 0;
    const totalProgressEntries = overview.totalProgressEntries || 0;

    // Get recent assessments
    const recentAssessmentsSql = `
      SELECT 
        a.id,
        a.title,
        a.status,
        a.assessmentDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.therapistId = ?
      ORDER BY a.assessmentDate DESC, a.createdAt DESC
      LIMIT 5
    `;

    const recentAssessments = await getAll(recentAssessmentsSql, [therapistId]);

    // Get upcoming appointments
    const upcomingAppointmentsSql = `
      SELECT 
        a.id,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.type,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.therapistId = ? 
      AND a.appointmentDate >= CURDATE()
      AND a.status = 'scheduled'
      ORDER BY a.appointmentDate ASC, a.startTime ASC
      LIMIT 5
    `;

    const upcomingAppointments = await getAll(upcomingAppointmentsSql, [therapistId]);

    // Get recent patients with their most recent session
    const recentDailyNotesSql = `
      SELECT DISTINCT
        p.id as patientId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        COALESCE(MAX(dn.sessionDate), p.createdAt) as lastSession,
        MAX(dn.sessionDuration) as sessionDuration,
        MAX(dn.activities) as activities
      FROM patients p
      JOIN users u ON p.userId = u.id
      LEFT JOIN daily_notes dn ON p.id = dn.patientId AND dn.therapistId = ?
      WHERE p.therapistId = ?
      GROUP BY p.id, u.firstName, u.lastName, p.createdAt
      ORDER BY lastSession DESC
      LIMIT 5
    `;

    const recentDailyNotes = await getAll(recentDailyNotesSql, [therapistId, therapistId]);

    // Get progress summary by area (using treatment plans)
    const progressByAreaSql = `
      SELECT 
        mo.title as area,
        COUNT(*) as entryCount,
        AVG(mo.progress) as avgProgress
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      WHERE p.therapistId = ?
      GROUP BY mo.title
      ORDER BY entryCount DESC
      LIMIT 5
    `;

    const progressByArea = await getAll(progressByAreaSql, [therapistId]);

    // Format progress data
    const progressWithPercentages = progressByArea.map(area => ({
        ...area,
      avgProgress: area.avgProgress ? Math.round(area.avgProgress) : 0
    }));

    // Get monthly statistics for the current year
    const currentYear = new Date().getFullYear();
    const monthlyStatsSql = `
      SELECT 
        MONTH(a.appointmentDate) as month,
        COUNT(*) as appointmentCount
      FROM appointments a
      WHERE a.therapistId = ? AND YEAR(a.appointmentDate) = ?
      GROUP BY MONTH(a.appointmentDate)
      ORDER BY month
    `;

    const monthlyStats = await getAll(monthlyStatsSql, [therapistId, currentYear]);

    // Get patient growth over time
    const patientGrowthSql = `
      SELECT 
        DATE_FORMAT(p.createdAt, '%Y-%m') as month,
        COUNT(*) as newPatients
      FROM patients p
      WHERE p.therapistId = ? AND YEAR(p.createdAt) = ?
      GROUP BY DATE_FORMAT(p.createdAt, '%Y-%m')
      ORDER BY month
    `;

    const patientGrowth = await getAll(patientGrowthSql, [therapistId, currentYear]);

    // OPTIMIZED: Combine completion rate and avg session duration into single query
    const additionalStatsSql = `
      SELECT
        (SELECT ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) FROM assessments a WHERE a.therapistId = ?) as completionRate,
        
        (SELECT ROUND(AVG(sessionDuration), 2) 
         FROM daily_notes dn 
         WHERE dn.therapistId = ? AND dn.sessionDuration IS NOT NULL) as avgSessionDuration
    `;

    const additionalStatsResult = await getRow(additionalStatsSql, [therapistId, therapistId]);
    const completionRate = additionalStatsResult?.completionRate || 0;
    const avgSessionDuration = additionalStatsResult?.avgDuration || 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalPatients,
          totalAssessments: assessmentStats.total,
          totalAppointments: appointmentStats.total,
          upcomingAppointments: upcomingAppointmentsCount,
          todayNotes,
          totalProgressEntries
        },
        assessments: {
          total: assessmentStats.total,
          completed: assessmentStats.completed,
          inProgress: assessmentStats.inProgress,
          scheduled: assessmentStats.scheduled,
          completionRate
        },
        appointments: {
          total: appointmentStats.total,
          scheduled: appointmentStats.scheduled,
          confirmed: appointmentStats.confirmed,
          completed: appointmentStats.completed,
          cancelled: appointmentStats.cancelled
        },
        recent: {
          assessments: recentAssessments,
          appointments: upcomingAppointments,
          dailyNotes: recentDailyNotes
        },
        progress: {
          byArea: progressWithPercentages,
          avgSessionDuration
        },
        trends: {
          monthlyAppointments: monthlyStats,
          patientGrowth: patientGrowth
        }
      }
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};

// Get dashboard quick actions
const getQuickActions = async (req, res) => {
  try {
    // Get therapist ID from authenticated user (therapistId in patients table refers to userId)
    const therapistId = req.user.id;

    // Get patients needing follow-up
    const followUpPatientsSql = `
      SELECT 
        p.id,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        p.diagnosis,
        MAX(dn.sessionDate) as lastSession
      FROM patients p
      JOIN users u ON p.userId = u.id
      LEFT JOIN daily_notes dn ON p.id = dn.patientId
      WHERE p.therapistId = ?
      GROUP BY p.id
      HAVING lastSession IS NULL OR lastSession < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY lastSession ASC
      LIMIT 5
    `;

    const followUpPatients = await getAll(followUpPatientsSql, [therapistId]);

    // Get assessments due soon
    const assessmentsDueSql = `
      SELECT 
        a.id,
        a.title,
        a.scheduledDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.therapistId = ? 
      AND a.status = 'scheduled'
      AND a.scheduledDate BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY a.scheduledDate ASC
      LIMIT 5
    `;

    const assessmentsDue = await getAll(assessmentsDueSql, [therapistId]);

    // Get progress areas needing review (using treatment plans)
    const progressReviewSql = `
      SELECT 
        mo.id,
        mo.title as area,
        mo.targetDate as nextReviewDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE p.therapistId = ? 
      AND mo.targetDate IS NOT NULL
      AND mo.targetDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      AND mo.status != 'completed'
      ORDER BY mo.targetDate ASC
      LIMIT 5
    `;

    const progressReview = await getAll(progressReviewSql, [therapistId]);

    res.json({
      success: true,
      data: {
        followUpPatients,
        assessmentsDue,
        progressReview
      }
    });

  } catch (error) {
    console.error('Get quick actions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch quick actions' });
  }
};

// Get dashboard charts data
const getDashboardCharts = async (req, res) => {
  try {
    // Get therapist ID from authenticated user (therapistId in patients table refers to userId)
    const therapistId = req.user.id;
    const { period = 'month' } = req.query;

    let dateFormat, dateRange;
    switch (period) {
      case 'week':
        dateFormat = '%Y-%u';
        dateRange = 'DATE_SUB(CURDATE(), INTERVAL 4 WEEK)';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        dateRange = 'DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
        break;
      case 'year':
        dateFormat = '%Y';
        dateRange = 'DATE_SUB(CURDATE(), INTERVAL 2 YEAR)';
        break;
      default:
        dateFormat = '%Y-%m';
        dateRange = 'DATE_SUB(CURDATE(), INTERVAL 6 MONTH)';
    }

    // Get appointment trends
    const appointmentTrendsSql = `
      SELECT 
        DATE_FORMAT(appointmentDate, '${dateFormat}') as period,
        COUNT(*) as count
      FROM appointments a
      WHERE a.therapistId = ? AND a.appointmentDate >= ${dateRange}
      GROUP BY DATE_FORMAT(appointmentDate, '${dateFormat}')
      ORDER BY period
    `;

    const appointmentTrends = await getAll(appointmentTrendsSql, [therapistId]);

    // Get assessment trends
    const assessmentTrendsSql = `
      SELECT 
        DATE_FORMAT(assessmentDate, '${dateFormat}') as period,
        COUNT(*) as count
      FROM assessments a
      WHERE a.therapistId = ? AND a.assessmentDate >= ${dateRange}
      GROUP BY DATE_FORMAT(assessmentDate, '${dateFormat}')
      ORDER BY period
    `;

    const assessmentTrends = await getAll(assessmentTrendsSql, [therapistId]);

    // Get patient activity trends
    const patientActivitySql = `
      SELECT 
        DATE_FORMAT(dn.sessionDate, '${dateFormat}') as period,
        COUNT(DISTINCT dn.patientId) as activePatients
      FROM daily_notes dn
      WHERE dn.therapistId = ? AND dn.sessionDate >= ${dateRange}
      GROUP BY DATE_FORMAT(dn.sessionDate, '${dateFormat}')
      ORDER BY period
    `;

    const patientActivity = await getAll(patientActivitySql, [therapistId]);

    // Get progress trends by area (using treatment plans)
    const progressTrendsSql = `
      SELECT 
        mo.title as area,
        DATE_FORMAT(mo.updatedAt, '${dateFormat}') as period,
        AVG(mo.progress) as avgScore
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      WHERE p.therapistId = ? AND mo.updatedAt >= ${dateRange}
      GROUP BY mo.title, DATE_FORMAT(mo.updatedAt, '${dateFormat}')
      ORDER BY mo.title, period
    `;

    const progressTrends = await getAll(progressTrendsSql, [therapistId]);

    res.json({
      success: true,
      data: {
        appointmentTrends,
        assessmentTrends,
        patientActivity,
        progressTrends
      }
    });

  } catch (error) {
    console.error('Get dashboard charts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard charts data' });
  }
};

// Get dashboard overview stats only (fast loading)
const getDashboardStats = async (req, res) => {
  try {
    const therapistId = req.user.id;

    // Combined overview stats query (optimized)
    const overviewStatsSql = `
      SELECT
        (SELECT COUNT(DISTINCT pta.patientId) 
         FROM patient_therapist_assignments pta
         WHERE pta.therapistId = ? AND pta.status = 'active') as totalPatients,
        
        (SELECT COUNT(*) FROM assessments a WHERE a.therapistId = ?) as totalAssessments,
        (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsCompleted,
        (SELECT COUNT(CASE WHEN status = 'in-progress' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsInProgress,
        (SELECT COUNT(CASE WHEN status = 'scheduled' THEN 1 END) FROM assessments a WHERE a.therapistId = ?) as assessmentsScheduled,
        
        (SELECT COUNT(*) FROM appointments a WHERE a.therapistId = ?) as totalAppointments,
        (SELECT COUNT(CASE WHEN status = 'scheduled' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsScheduled,
        (SELECT COUNT(CASE WHEN status = 'confirmed' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsConfirmed,
        (SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsCompleted,
        (SELECT COUNT(CASE WHEN status = 'cancelled' THEN 1 END) FROM appointments a WHERE a.therapistId = ?) as appointmentsCancelled,
        
        (SELECT COUNT(*) FROM appointments a 
         WHERE a.therapistId = ? AND a.appointmentDate >= CURDATE() AND a.status = 'scheduled') as upcomingAppointments,
        
        (SELECT COUNT(*) FROM daily_notes dn 
         WHERE dn.therapistId = ? AND dn.sessionDate = CURDATE()) as todayNotes,
        
        (SELECT COUNT(DISTINCT mo.id) 
         FROM main_objectives mo
         JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
         JOIN patients p ON tp.patientId = p.id
         LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId
         WHERE p.therapistId = ? OR (pta.therapistId = ? AND pta.status = 'active')) as totalProgressEntries,
        
        (SELECT ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ) FROM assessments a WHERE a.therapistId = ?) as completionRate,
        
        (SELECT ROUND(AVG(sessionDuration), 2) 
         FROM daily_notes dn 
         WHERE dn.therapistId = ? AND dn.sessionDuration IS NOT NULL) as avgSessionDuration
    `;

    const overviewResult = await getRow(overviewStatsSql, [
      therapistId, therapistId, therapistId, therapistId, therapistId,
      therapistId, therapistId, therapistId, therapistId, therapistId,
      therapistId, therapistId, therapistId, therapistId,
      therapistId, therapistId
    ]);

    const overview = overviewResult || {};
    
    res.json({
      success: true,
      data: {
        overview: {
          totalPatients: overview.totalPatients || 0,
          totalAssessments: overview.totalAssessments || 0,
          totalAppointments: overview.totalAppointments || 0,
          upcomingAppointments: overview.upcomingAppointments || 0,
          todayNotes: overview.todayNotes || 0,
          totalProgressEntries: overview.totalProgressEntries || 0
        },
        assessments: {
          total: overview.totalAssessments || 0,
          completed: overview.assessmentsCompleted || 0,
          inProgress: overview.assessmentsInProgress || 0,
          scheduled: overview.assessmentsScheduled || 0,
          completionRate: overview.completionRate || 0
        },
        appointments: {
          total: overview.totalAppointments || 0,
          scheduled: overview.appointmentsScheduled || 0,
          confirmed: overview.appointmentsConfirmed || 0,
          completed: overview.appointmentsCompleted || 0,
          cancelled: overview.appointmentsCancelled || 0
        },
        progress: {
          avgSessionDuration: overview.avgSessionDuration || 0
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
};

// Get recent items (lists) - can be loaded separately
const getRecentItems = async (req, res) => {
  try {
    const therapistId = req.user.id;

    // Get recent assessments
    const recentAssessments = await getAll(`
      SELECT 
        a.id,
        a.title,
        a.status,
        a.assessmentDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM assessments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.therapistId = ?
      ORDER BY a.assessmentDate DESC, a.createdAt DESC
      LIMIT 5
    `, [therapistId]);

    // Get upcoming appointments
    const upcomingAppointments = await getAll(`
      SELECT 
        a.id,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.type,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.therapistId = ? 
      AND a.appointmentDate >= CURDATE()
      AND a.status = 'scheduled'
      ORDER BY a.appointmentDate ASC, a.startTime ASC
      LIMIT 5
    `, [therapistId]);

    // Get recent daily notes
    const recentDailyNotes = await getAll(`
      SELECT DISTINCT
        p.id as patientId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        COALESCE(MAX(dn.sessionDate), p.createdAt) as lastSession,
        MAX(dn.sessionDuration) as sessionDuration,
        MAX(dn.activities) as activities
      FROM patients p
      JOIN users u ON p.userId = u.id
      LEFT JOIN daily_notes dn ON p.id = dn.patientId AND dn.therapistId = ?
      WHERE p.therapistId = ?
      GROUP BY p.id, u.firstName, u.lastName, p.createdAt
      ORDER BY lastSession DESC
      LIMIT 5
    `, [therapistId, therapistId]);

    res.json({
      success: true,
      data: {
        assessments: recentAssessments,
        appointments: upcomingAppointments,
        dailyNotes: recentDailyNotes
      }
    });
  } catch (error) {
    console.error('Get recent items error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent items' });
  }
};

// Get progress and trends (can be loaded separately)
const getProgressAndTrends = async (req, res) => {
  try {
    const therapistId = req.user.id;
    const currentYear = new Date().getFullYear();

    // Get progress summary by area
    const progressByArea = await getAll(`
      SELECT 
        mo.title as area,
        COUNT(*) as entryCount,
        AVG(mo.progress) as avgProgress
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      WHERE p.therapistId = ?
      GROUP BY mo.title
      ORDER BY entryCount DESC
      LIMIT 5
    `, [therapistId]);

    const progressWithPercentages = progressByArea.map(area => ({
      ...area,
      avgProgress: area.avgProgress ? Math.round(area.avgProgress) : 0
    }));

    // Get monthly statistics
    const monthlyStats = await getAll(`
      SELECT 
        MONTH(a.appointmentDate) as month,
        COUNT(*) as appointmentCount
      FROM appointments a
      WHERE a.therapistId = ? AND YEAR(a.appointmentDate) = ?
      GROUP BY MONTH(a.appointmentDate)
      ORDER BY month
    `, [therapistId, currentYear]);

    // Get patient growth
    const patientGrowth = await getAll(`
      SELECT 
        DATE_FORMAT(p.createdAt, '%Y-%m') as month,
        COUNT(*) as newPatients
      FROM patients p
      WHERE p.therapistId = ? AND YEAR(p.createdAt) = ?
      GROUP BY DATE_FORMAT(p.createdAt, '%Y-%m')
      ORDER BY month
    `, [therapistId, currentYear]);

    res.json({
      success: true,
      data: {
        progress: {
          byArea: progressWithPercentages
        },
        trends: {
          monthlyAppointments: monthlyStats,
          patientGrowth: patientGrowth
        }
      }
    });
  } catch (error) {
    console.error('Get progress and trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch progress and trends' });
  }
};

module.exports = {
  getDashboard,
  getDashboardStats,  // New: Fast stats only
  getRecentItems,     // New: Lists only
  getProgressAndTrends, // New: Progress and trends only
  getQuickActions,
  getDashboardCharts
};

