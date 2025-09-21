const { runQuery, getRow, getAll } = require('../config/database');

// Get therapist dashboard data
const getDashboard = async (req, res) => {
  try {
    // Get therapist ID from authenticated user (therapistId in patients table refers to userId)
    const therapistId = req.user.userId;

    // Get patient count
    const patientCountSql = `
      SELECT COUNT(*) as total
      FROM patients p
      WHERE p.therapistId = ?
    `;

    const patientCountResult = await getAll(patientCountSql, [therapistId]);
    const totalPatients = patientCountResult[0]?.total || 0;

    // Get assessment count
    const assessmentCountSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as inProgress,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled
      FROM assessments a
      WHERE a.therapistId = ?
    `;

    const assessmentCountResult = await getAll(assessmentCountSql, [therapistId]);
    const assessmentStats = assessmentCountResult[0] || { total: 0, completed: 0, inProgress: 0, scheduled: 0 };

    // Get appointment count
    const appointmentCountSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM appointments a
      WHERE a.therapistId = ?
    `;

    const appointmentCountResult = await getAll(appointmentCountSql, [therapistId]);
    const appointmentStats = appointmentCountResult[0] || { total: 0, scheduled: 0, confirmed: 0, completed: 0, cancelled: 0 };

    // Get daily notes count
    const dailyNotesCountSql = `
      SELECT COUNT(*) as total
      FROM daily_notes dn
      WHERE dn.therapistId = ? AND dn.sessionDate = CURDATE()
    `;

    const dailyNotesCountResult = await getAll(dailyNotesCountSql, [therapistId]);
    const todayNotes = dailyNotesCountResult[0]?.total || 0;

    // Get progress tracking count
    const progressCountSql = `
      SELECT COUNT(*) as total
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      WHERE p.therapistId = ?
    `;

    const progressCountResult = await getAll(progressCountSql, [therapistId]);
    const totalProgressEntries = progressCountResult[0]?.total || 0;

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
      AND a.status IN ('scheduled', 'confirmed')
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
    
    // Debug logging
    console.log('Recent daily notes query result:', recentDailyNotes);

    // Get progress summary by area
    const progressByAreaSql = `
      SELECT 
        pt.area,
        COUNT(*) as entryCount,
        AVG(pt.currentScore) as avgCurrentScore,
        AVG(pt.targetScore) as avgTargetScore
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      WHERE p.therapistId = ?
      GROUP BY pt.area
      ORDER BY entryCount DESC
      LIMIT 5
    `;

    const progressByArea = await getAll(progressByAreaSql, [therapistId]);

    // Calculate progress percentages for each area
    const progressWithPercentages = progressByArea.map(area => {
      let progressPercentage = 0;
      if (area.avgCurrentScore !== null && area.avgTargetScore !== null) {
        progressPercentage = Math.round((area.avgCurrentScore / area.avgTargetScore) * 100);
      }
      
      return {
        ...area,
        progressPercentage: Math.max(0, Math.min(100, progressPercentage))
      };
    });

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

    // Get assessment completion rate
    const completionRateSql = `
      SELECT 
        ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2
        ) as completionRate
      FROM assessments a
      WHERE a.therapistId = ?
    `;

    const completionRateResult = await getAll(completionRateSql, [therapistId]);
    const completionRate = completionRateResult[0]?.completionRate || 0;

    // Get average session duration
    const avgSessionDurationSql = `
      SELECT 
        ROUND(AVG(sessionDuration), 2) as avgDuration
      FROM daily_notes dn
      WHERE dn.therapistId = ? AND dn.sessionDuration IS NOT NULL
    `;

    const avgSessionDurationResult = await getAll(avgSessionDurationSql, [therapistId]);
    const avgSessionDuration = avgSessionDurationResult[0]?.avgDuration || 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalPatients,
          totalAssessments: assessmentStats.total,
          totalAppointments: appointmentStats.total,
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
    const therapistId = req.user.userId;

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

    // Get progress areas needing review
    const progressReviewSql = `
      SELECT 
        pt.id,
        pt.area,
        pt.nextReviewDate,
        CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE p.therapistId = ? 
      AND pt.nextReviewDate IS NOT NULL
      AND pt.nextReviewDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY pt.nextReviewDate ASC
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
    const therapistId = req.user.userId;
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

    // Get progress trends by area
    const progressTrendsSql = `
      SELECT 
        pt.area,
        DATE_FORMAT(pt.measurementDate, '${dateFormat}') as period,
        AVG(pt.currentScore) as avgScore
      FROM progress_tracking pt
      JOIN patients p ON pt.patientId = p.id
      WHERE p.therapistId = ? AND pt.measurementDate >= ${dateRange}
      GROUP BY pt.area, DATE_FORMAT(pt.measurementDate, '${dateFormat}')
      ORDER BY pt.area, period
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

module.exports = {
  getDashboard,
  getQuickActions,
  getDashboardCharts
};

