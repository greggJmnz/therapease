const { runQuery, getRow, getAll } = require('../config/database');

// Get therapist dashboard data
const getDashboard = async (req, res) => {
  try {
    // Get therapist ID from authenticated user (therapistId in patients table refers to userId)
    const therapistId = req.user.id;

    // Get patient count from patient_therapist_assignments table
    const patientCountSql = `
      SELECT COUNT(DISTINCT pta.patientId) as total
      FROM patient_therapist_assignments pta
      WHERE pta.therapistId = ? AND pta.status = 'active'
    `;

    const patientCountResult = await getAll(patientCountSql, [therapistId]);
    const totalPatients = patientCountResult[0]?.total || 0;

    // Get assessment count (only assessments created by this therapist)
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

    // Get appointment count (only appointments created by this therapist)
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

    // Get upcoming appointments count (not completed or past)
    const upcomingAppointmentsCountSql = `
      SELECT COUNT(*) as upcomingCount
      FROM appointments a
      WHERE a.therapistId = ? 
      AND a.appointmentDate >= CURDATE()
      AND a.status = 'scheduled'
    `;

    const upcomingAppointmentsCountResult = await getAll(upcomingAppointmentsCountSql, [therapistId]);
    const upcomingAppointmentsCount = upcomingAppointmentsCountResult[0]?.upcomingCount || 0;

    // Get daily notes count (only notes created by this therapist)
    const dailyNotesCountSql = `
      SELECT COUNT(*) as total
      FROM daily_notes dn
      WHERE dn.therapistId = ? AND dn.sessionDate = CURDATE()
    `;

    const dailyNotesCountResult = await getAll(dailyNotesCountSql, [therapistId]);
    const todayNotes = dailyNotesCountResult[0]?.total || 0;

    // Get progress tracking count (treatment plan objectives for patients assigned to this therapist)
    const progressCountSql = `
      SELECT COUNT(DISTINCT mo.id) as total
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId
      WHERE p.therapistId = ? OR (pta.therapistId = ? AND pta.status = 'active')
    `;

    const progressCountResult = await getAll(progressCountSql, [therapistId, therapistId]);
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

module.exports = {
  getDashboard,
  getQuickActions,
  getDashboardCharts
};

