const { getAll, getOne, getRow, runQuery, getConnection } = require('../config/database');
const { decryptSensitiveFields, decryptField } = require('../utils/encryption');

// Helper function to convert 24-hour time to 12-hour format
const formatTime12Hour = (time24) => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${hour12}:${minutes} ${ampm}`;
};

// Helper function to calculate time ago
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInMs = now - date;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US');
  }
};

// Get admin dashboard data - OPTIMIZED: Combined queries for better performance
const getDashboard = async (req, res) => {
  try {
    // OPTIMIZED: Combine all stats and health metrics into a single query
    // This reduces 2 queries to 1, dramatically improving performance
    const combinedStatsSql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'therapist') as totalTherapists,
        (SELECT COUNT(*) FROM users WHERE role = 'patient') as totalPatients,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as totalAdmins,
        (SELECT COUNT(*) FROM assessments) as totalAssessments,
        (SELECT COUNT(*) FROM appointments) as totalAppointments,
        (SELECT COUNT(*) FROM daily_notes) as totalDailyNotes,
        (SELECT COUNT(*) FROM main_objectives) as totalProgressEntries,
        (SELECT COUNT(*) FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newUsersThisWeek,
        (SELECT COUNT(*) FROM assessments WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newAssessmentsThisWeek,
        (SELECT COUNT(*) FROM appointments WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newAppointmentsThisWeek,
        (SELECT COUNT(*) FROM daily_notes WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newDailyNotesThisWeek,
        (SELECT COUNT(*) FROM main_objectives WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newProgressEntriesThisWeek
    `;

    const combinedResult = await getRow(combinedStatsSql);
    
    // Ensure all stats are numbers (not null) - MySQL COUNT() returns BIGINT, but subqueries might return null
    const stats = {
      totalTherapists: parseInt(combinedResult?.totalTherapists || 0),
      totalPatients: parseInt(combinedResult?.totalPatients || 0),
      totalAdmins: parseInt(combinedResult?.totalAdmins || 0),
      totalAssessments: parseInt(combinedResult?.totalAssessments || 0),
      totalAppointments: parseInt(combinedResult?.totalAppointments || 0),
      totalDailyNotes: parseInt(combinedResult?.totalDailyNotes || 0),
      totalProgressEntries: parseInt(combinedResult?.totalProgressEntries || 0)
    };

    // Ensure all health metrics are numbers
    const systemHealth = {
      newUsersThisWeek: parseInt(combinedResult?.newUsersThisWeek || 0),
      newAssessmentsThisWeek: parseInt(combinedResult?.newAssessmentsThisWeek || 0),
      newAppointmentsThisWeek: parseInt(combinedResult?.newAppointmentsThisWeek || 0),
      newDailyNotesThisWeek: parseInt(combinedResult?.newDailyNotesThisWeek || 0),
      newProgressEntriesThisWeek: parseInt(combinedResult?.newProgressEntriesThisWeek || 0)
    };

    // Get recent user registrations
    const recentUsersSql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.createdAt
      FROM users u
      ORDER BY u.createdAt DESC
      LIMIT 10
    `;

    const recentUsers = await getAll(recentUsersSql);

    // Get user growth over time (last 12 months for better coverage)
    const userGrowthSql = `
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        role,
        COUNT(*) as count
      FROM users
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), role
      ORDER BY month, role
    `;

    const userGrowthRaw = await getAll(userGrowthSql);
    // Ensure counts are numbers
    const userGrowth = userGrowthRaw.map(item => ({
      month: item.month || '',
      role: item.role || 'Unknown',
      count: parseInt(item.count || 0)
    }));

    // Get appointment trends over time (last 12 months)
    const appointmentTrendsSql = `
      SELECT 
        DATE_FORMAT(appointmentDate, '%Y-%m') as month,
        COUNT(*) as count
      FROM appointments
      WHERE appointmentDate >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(appointmentDate, '%Y-%m')
      ORDER BY month
    `;

    const appointmentTrendsRaw = await getAll(appointmentTrendsSql);
    // Ensure counts are numbers
    const appointmentTrends = appointmentTrendsRaw.map(item => ({
      month: item.month || '',
      count: parseInt(item.count || 0)
    }));

    // Get assessment trends over time (last 12 months)
    const assessmentTrendsSql = `
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as count
      FROM assessments
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month
    `;

    const assessmentTrendsRaw = await getAll(assessmentTrendsSql);
    // Ensure counts are numbers
    const assessmentTrends = assessmentTrendsRaw.map(item => ({
      month: item.month || '',
      count: parseInt(item.count || 0)
    }));

    // Get assessment statistics by type
    const assessmentStatsSql = `
      SELECT 
        type,
        COUNT(*) as count,
        AVG(score) as avgScore
      FROM assessments
      GROUP BY type
      ORDER BY count DESC
    `;

    // Get appointment statistics by status
    const appointmentStatsSql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM appointments
      GROUP BY status
      ORDER BY count DESC
    `;

    // OPTIMIZED: Execute assessment and appointment stats queries in parallel
    const [assessmentStatsRaw, appointmentStatsRaw] = await Promise.all([
      getAll(assessmentStatsSql),
      getAll(appointmentStatsSql)
    ]);

    // Ensure counts are numbers and handle null avgScore
    const assessmentStats = assessmentStatsRaw.map(stat => ({
      type: stat.type || 'Unknown',
      count: parseInt(stat.count || 0),
      avgScore: parseFloat(stat.avgScore || 0) || 0
    }));

    // Ensure counts are numbers
    const appointmentStats = appointmentStatsRaw.map(stat => ({
      status: stat.status || 'Unknown',
      count: parseInt(stat.count || 0)
    }));

    // Get additional analytics data
    const analyticsSql = `
      SELECT 
        (SELECT COUNT(*) FROM assessments WHERE status = 'completed') as completedAssessments,
        (SELECT COUNT(*) FROM assessments WHERE status = 'in-progress') as inProgressAssessments,
        (SELECT COUNT(*) FROM assessments WHERE status = 'scheduled') as scheduledAssessments,
        (SELECT AVG(score) FROM assessments WHERE score IS NOT NULL) as avgAssessmentScore,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed' AND appointmentDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as completedAppointmentsThisMonth,
        (SELECT COUNT(*) FROM appointments WHERE status = 'cancelled' AND appointmentDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as cancelledAppointmentsThisMonth,
        (SELECT AVG(duration) FROM appointments WHERE duration IS NOT NULL) as avgAppointmentDuration,
        (SELECT COUNT(*) FROM daily_notes WHERE sessionDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as sessionsThisMonth
    `;

    const analyticsResult = await getRow(analyticsSql);
    // Ensure all analytics are numbers (handle null/undefined from AVG)
    const analytics = {
      completedAssessments: parseInt(analyticsResult?.completedAssessments || 0),
      inProgressAssessments: parseInt(analyticsResult?.inProgressAssessments || 0),
      scheduledAssessments: parseInt(analyticsResult?.scheduledAssessments || 0),
      avgAssessmentScore: parseFloat(analyticsResult?.avgAssessmentScore || 0) || 0,
      completedAppointmentsThisMonth: parseInt(analyticsResult?.completedAppointmentsThisMonth || 0),
      cancelledAppointmentsThisMonth: parseInt(analyticsResult?.cancelledAppointmentsThisMonth || 0),
      avgAppointmentDuration: parseFloat(analyticsResult?.avgAppointmentDuration || 0) || 0,
      sessionsThisMonth: parseInt(analyticsResult?.sessionsThisMonth || 0)
    };

    // Calculate key performance indicators with proper null handling
    const cancelledAppointments = appointmentStats.find(s => s.status === 'cancelled');
    const cancelledCount = cancelledAppointments ? parseInt(cancelledAppointments.count || 0) : 0;
    const totalActiveAppointments = Math.max(0, stats.totalAppointments - cancelledCount);
    
    const completedAppointments = appointmentStats.find(s => s.status === 'completed');
    const completedCount = completedAppointments ? parseInt(completedAppointments.count || 0) : 0;
    const appointmentCompletionRate = totalActiveAppointments > 0 ? 
      Math.round((completedCount / totalActiveAppointments) * 100) : 0;
    
    const assessmentCompletionRate = stats.totalAssessments > 0 ? 
      Math.round((analytics.completedAssessments / stats.totalAssessments) * 100) : 0;

    const patientsPerTherapist = stats.totalTherapists > 0 ? 
      Math.round(stats.totalPatients / stats.totalTherapists) : 0;

    const avgSessionsPerPatient = stats.totalPatients > 0 ? 
      Math.round(stats.totalDailyNotes / stats.totalPatients) : 0;

    const responseData = {
      success: true,
      data: {
        stats,
        recentUsers,
        systemHealth,
        userGrowth,
        appointmentTrends,
        assessmentTrends,
        assessmentStats,
        appointmentStats,
        analytics: {
          ...analytics,
          appointmentCompletionRate,
          assessmentCompletionRate,
          patientsPerTherapist,
          avgSessionsPerPatient
        }
      }
    };
    
    res.json(responseData);

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin dashboard data' });
  }
};

// Get all users with pagination and filtering
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (role) {
      whereConditions.push('u.role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Exclude pending therapists from users list - only show approved/active therapists
    whereConditions.push('(u.role != ? OR u.status != ?)');
    params.push('therapist', 'pending');

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Get users with role-specific data
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        p.id as patientId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId,
        (SELECT CONCAT(u2.firstName, ' ', u2.lastName) FROM users u2 WHERE u2.id = p.therapistId) as therapistName,
        (SELECT COUNT(*) FROM patients pt WHERE pt.therapistId = t.userId) as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const users = await getAll(sql, params);

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format user data and decrypt sensitive fields
    const formattedUsers = users.map(user => {
      const formattedUser = {
        id: user.id,
        email: decryptField(user.email),
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: decryptField(user.phone),
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: decryptField(user.address),
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add role-specific data
      if (user.role === 'therapist') {
        formattedUser.therapist = {
          licenseNumber: user.licenseNumber,
          specialization: user.specialization,
          yearsOfExperience: user.yearsOfExperience,
          education: user.education,
          certifications: user.certifications,
          availability: user.availability
        };
        formattedUser.patientCount = user.patientCount || 0;
      } else if (user.role === 'patient') {
        formattedUser.patient = {
          id: user.patientId,
          diagnosis: user.diagnosis,
          medicalHistory: user.medicalHistory,
          goals: user.goals,
          status: 'active', // Default status since p.status column doesn't exist
          therapistId: user.therapistId
        };
        formattedUser.therapistName = user.therapistName;
      }

      return formattedUser;
    });

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.emergencyContact,
        p.insuranceInfo,
        p.status as patientStatus
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      WHERE u.id = ?
    `;

    const user = await getRow(sql, [parseInt(id)]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format user data and decrypt sensitive fields
    const formattedUser = {
      id: user.id,
      email: decryptField(user.email),
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: decryptField(user.phone),
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: decryptField(user.address),
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      status: user.status || 'active',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Add role-specific data
    if (user.role === 'therapist') {
      formattedUser.therapist = {
        licenseNumber: user.licenseNumber,
        specialization: user.specialization,
        yearsOfExperience: user.yearsOfExperience,
        education: user.education,
        certifications: user.certifications,
        availability: user.availability
      };
    } else if (user.role === 'patient') {
      formattedUser.patient = {
        diagnosis: user.diagnosis,
        medicalHistory: user.medicalHistory,
        goals: user.goals,
        emergencyContact: user.emergencyContact,
        insuranceInfo: user.insuranceInfo
      };
    }

    res.json({
      success: true,
      data: formattedUser
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const id = userId;
    const updateData = req.body;


    // Check if user exists
    const existingUser = await getRow('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
    
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Update user fields
      const userUpdateFields = [];
      const userUpdateParams = [];

      if (updateData.firstName !== undefined) {
        userUpdateFields.push('firstName = ?');
        userUpdateParams.push(updateData.firstName);
      }

      if (updateData.lastName !== undefined) {
        userUpdateFields.push('lastName = ?');
        userUpdateParams.push(updateData.lastName);
      }

      if (updateData.email !== undefined && updateData.email !== existingUser.email) {
        userUpdateFields.push('email = ?');
        userUpdateParams.push(updateData.email);
      }

      if (updateData.phone !== undefined) {
        userUpdateFields.push('phone = ?');
        userUpdateParams.push(updateData.phone);
      }

      if (updateData.dateOfBirth !== undefined) {
        userUpdateFields.push('dateOfBirth = ?');
        // Convert ISO date string to YYYY-MM-DD format for MySQL
        const dateValue = updateData.dateOfBirth instanceof Date 
          ? updateData.dateOfBirth.toISOString().split('T')[0]
          : new Date(updateData.dateOfBirth).toISOString().split('T')[0];
        userUpdateParams.push(dateValue);
      }

      if (updateData.gender !== undefined) {
        userUpdateFields.push('gender = ?');
        userUpdateParams.push(updateData.gender);
      }

      if (updateData.address !== undefined) {
        userUpdateFields.push('address = ?');
        userUpdateParams.push(updateData.address);
      }

      if (updateData.city !== undefined) {
        userUpdateFields.push('city = ?');
        userUpdateParams.push(updateData.city);
      }

      if (updateData.state !== undefined) {
        userUpdateFields.push('state = ?');
        userUpdateParams.push(updateData.state);
      }

      if (updateData.zipCode !== undefined) {
        userUpdateFields.push('zipCode = ?');
        userUpdateParams.push(updateData.zipCode);
      }

      if (updateData.country !== undefined) {
        userUpdateFields.push('country = ?');
        userUpdateParams.push(updateData.country);
      }

        if (updateData.status !== undefined) {
          userUpdateFields.push('status = ?');
          userUpdateParams.push(updateData.status);
        }

      // Update user if there are user fields to update
      if (userUpdateFields.length > 0) {
        const updateUserSql = `
          UPDATE users 
          SET ${userUpdateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        
        userUpdateParams.push(parseInt(id));
        await connection.execute(updateUserSql, userUpdateParams);
      }

      // Update role-specific data
      if (existingUser.role === 'therapist' && updateData.therapist) {
        const therapistUpdateFields = [];
        const therapistUpdateParams = [];

        if (updateData.therapist.licenseNumber !== undefined) {
          therapistUpdateFields.push('licenseNumber = ?');
          therapistUpdateParams.push(updateData.therapist.licenseNumber);
        }

        if (updateData.therapist.specialization !== undefined) {
          therapistUpdateFields.push('specialization = ?');
          therapistUpdateParams.push(updateData.therapist.specialization);
        }

        if (updateData.therapist.yearsOfExperience !== undefined) {
          therapistUpdateFields.push('yearsOfExperience = ?');
          therapistUpdateParams.push(parseInt(updateData.therapist.yearsOfExperience));
        }

        if (updateData.therapist.education !== undefined) {
          therapistUpdateFields.push('education = ?');
          therapistUpdateParams.push(updateData.therapist.education);
        }

        if (updateData.therapist.certifications !== undefined) {
          therapistUpdateFields.push('certifications = ?');
          therapistUpdateParams.push(updateData.therapist.certifications);
        }

        if (updateData.therapist.availability !== undefined) {
          therapistUpdateFields.push('availability = ?');
          therapistUpdateParams.push(updateData.therapist.availability);
        }

        if (therapistUpdateFields.length > 0) {
          const updateTherapistSql = `
            UPDATE therapists 
            SET ${therapistUpdateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
            WHERE userId = ?
          `;
          
          therapistUpdateParams.push(parseInt(id));
          await connection.execute(updateTherapistSql, therapistUpdateParams);
        }
      }

      if (existingUser.role === 'patient' && updateData.patient) {
        const patientUpdateFields = [];
        const patientUpdateParams = [];

        if (updateData.patient.diagnosis !== undefined) {
          patientUpdateFields.push('diagnosis = ?');
          patientUpdateParams.push(updateData.patient.diagnosis);
        }

        if (updateData.patient.medicalHistory !== undefined) {
          patientUpdateFields.push('medicalHistory = ?');
          patientUpdateParams.push(updateData.patient.medicalHistory);
        }

        if (updateData.patient.goals !== undefined) {
          patientUpdateFields.push('goals = ?');
          patientUpdateParams.push(updateData.patient.goals);
        }

        if (updateData.patient.emergencyContact !== undefined) {
          patientUpdateFields.push('emergencyContact = ?');
          patientUpdateParams.push(updateData.patient.emergencyContact);
        }

        if (updateData.patient.insuranceInfo !== undefined) {
          patientUpdateFields.push('insuranceInfo = ?');
          patientUpdateParams.push(updateData.patient.insuranceInfo);
        }


        if (patientUpdateFields.length > 0) {
          const updatePatientSql = `
            UPDATE patients 
            SET ${patientUpdateFields.join(', ')}, updatedAt = CURRENT_TIMESTAMP
            WHERE userId = ?
          `;
          
          patientUpdateParams.push(parseInt(id));
          await connection.execute(updatePatientSql, patientUpdateParams);
        }
      }

      // Commit transaction
      await connection.commit();

      // Get updated user and return response
      return await getUserById({ params: { id: userId } }, res);

    } catch (error) {
      // Rollback transaction on error
      console.error('Transaction error:', error);
      console.error('Transaction error details:', {
        message: error.message,
        stack: error.stack,
        userUpdateFields: userUpdateFields || 'undefined',
        userUpdateParams: userUpdateParams || 'undefined'
      });
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update user error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      userId: userId || 'undefined',
      updateData: updateData || 'undefined'
    });
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update user',
      details: error.message 
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const existingUser = await getRow('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deletion of admin users
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete admin users'
      });
    }

    // Delete user (this will cascade to delete related records due to foreign key constraints)
    await runQuery('DELETE FROM users WHERE id = ?', [parseInt(userId)]);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: existingUser
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};

// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateFormat, dateRange;
    switch (period) {
      case 'week':
        dateFormat = '%Y-%u';
        dateRange = 'DATE_SUB(NOW(), INTERVAL 4 WEEK)';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        dateRange = 'DATE_SUB(NOW(), INTERVAL 6 MONTH)';
        break;
      case 'year':
        dateFormat = '%Y';
        dateRange = 'DATE_SUB(NOW(), INTERVAL 2 YEAR)';
        break;
      default:
        dateFormat = '%Y-%m';
        dateRange = 'DATE_SUB(NOW(), INTERVAL 6 MONTH)';
    }

    // Get user growth trends
    const userGrowthSql = `
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as period,
        role,
        COUNT(*) as count
      FROM users
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '${dateFormat}'), role
      ORDER BY period, role
    `;

    const userGrowth = await getAll(userGrowthSql);

    // Get assessment trends
    const assessmentTrendsSql = `
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as period,
        COUNT(*) as count
      FROM assessments
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '${dateFormat}')
      ORDER BY period
    `;

    const assessmentTrends = await getAll(assessmentTrendsSql);

    // Get appointment trends
    const appointmentTrendsSql = `
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as period,
        COUNT(*) as count
      FROM appointments
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '${dateFormat}')
      ORDER BY period
    `;

    const appointmentTrends = await getAll(appointmentTrendsSql);

    // Get daily notes trends
    const dailyNotesTrendsSql = `
      SELECT 
        DATE_FORMAT(createdAt, '${dateFormat}') as period,
        COUNT(*) as count
      FROM daily_notes
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '${dateFormat}')
      ORDER BY period
    `;

    const dailyNotesTrends = await getAll(dailyNotesTrendsSql);

    res.json({
      success: true,
      data: {
        userGrowth,
        assessmentTrends,
        appointmentTrends,
        dailyNotesTrends
      }
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch system statistics' });
  }
};

// Get daily trends data for growth charts
const getDailyTrends = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const dateRange = `DATE_SUB(NOW(), INTERVAL ${parseInt(days)} DAY)`;

    // Get daily user registration trends
    const dailyUserTrends = await getAll(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-%d') as date,
        role,
        COUNT(*) as count
      FROM users
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d'), role
      ORDER BY date, role
    `);

    // Get daily appointment trends
    const dailyAppointmentTrends = await getAll(`
      SELECT 
        DATE_FORMAT(appointmentDate, '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM appointments
      WHERE appointmentDate >= ${dateRange}
      GROUP BY DATE_FORMAT(appointmentDate, '%Y-%m-%d')
      ORDER BY date
    `);

    // Get daily assessment trends
    const dailyAssessmentTrends = await getAll(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-%d') as date,
        COUNT(*) as count
      FROM assessments
      WHERE createdAt >= ${dateRange}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
      ORDER BY date
    `);

    res.json({
      success: true,
      data: {
        userTrends: dailyUserTrends,
        appointmentTrends: dailyAppointmentTrends,
        assessmentTrends: dailyAssessmentTrends
      }
    });

  } catch (error) {
    console.error('Get daily trends error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch daily trends data' });
  }
};

// Get appointments for admin
const getAppointments = async (req, res) => {
  try {
    const sql = `
      SELECT 
        a.id,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.duration,
        a.type,
        a.status,
        a.approvalStatus,
        a.therapistApprovedBy,
        a.adminApprovedBy,
        a.createdBy,
        a.reason,
        a.notes,
        a.createdAt,
        a.updatedAt,
        p.firstName as patientFirstName,
        p.lastName as patientLastName,
        t.firstName as therapistFirstName,
        t.lastName as therapistLastName,
        a.patientId,
        a.therapistId,
        CONCAT(therapistApprover.firstName, ' ', therapistApprover.lastName) as therapistApproverName,
        CONCAT(adminApprover.firstName, ' ', adminApprover.lastName) as adminApproverName,
        creator.role as creatorRole
      FROM appointments a
      LEFT JOIN patients pt ON a.patientId = pt.id
      LEFT JOIN users p ON pt.userId = p.id
      LEFT JOIN users t ON a.therapistId = t.id
      LEFT JOIN users therapistApprover ON a.therapistApprovedBy = therapistApprover.id
      LEFT JOIN users adminApprover ON a.adminApprovedBy = adminApprover.id
      LEFT JOIN users creator ON a.createdBy = creator.id
      ORDER BY a.appointmentDate DESC, a.startTime DESC
    `;

    const appointments = await getAll(sql);

    // Decrypt sensitive fields (notes) before formatting
    const decryptedAppointments = appointments.map(appointment => {
      try {
        return decryptSensitiveFields(appointment, ['notes']);
      } catch (error) {
        console.error('Decryption error for appointment', appointment.id, ':', error);
        return appointment; // Return original if decryption fails
      }
    });

    // Format appointment data
    const formattedAppointments = decryptedAppointments.map(appointment => ({
      id: appointment.id,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.approvalStatus === 'pending' ? 'pending' : appointment.status,
      approvalStatus: appointment.approvalStatus,
      therapistApproverName: appointment.therapistApproverName,
      adminApproverName: appointment.adminApproverName,
      creatorRole: appointment.creatorRole,
      createdBy: appointment.createdBy,
      reason: appointment.reason || 'No reason provided',
      room: 'Room TBD', // Default room since it's not in the table
      notes: appointment.notes,
      patientName: `${appointment.patientFirstName || ''} ${appointment.patientLastName || ''}`.trim(),
      therapistName: `${appointment.therapistFirstName || ''} ${appointment.therapistLastName || ''}`.trim(),
      patientId: appointment.patientId,
      therapistId: appointment.therapistId,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt
    }));
    

    res.json({
      success: true,
      data: {
        appointments: formattedAppointments,
        total: formattedAppointments.length
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments'
    });
  }
};

// Create appointment (admin)
const createAppointment = async (req, res) => {
  try {
    const {
      therapistId,
      patientId,
      date,
      time,
      duration,
      reason,
      type,
      notes
    } = req.body;
    

    // Validate required fields
    if (!therapistId || !patientId || !date || !time || !duration || !reason || !reason.trim() || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: therapistId, patientId, date, time, duration, reason, type'
      });
    }

    // Validate therapist exists
    const therapistSql = `
      SELECT t.id, t.userId, CONCAT(u.firstName, ' ', u.lastName) as therapistName, u.phone as therapistPhone
      FROM therapists t
      JOIN users u ON t.userId = u.id
      WHERE t.userId = ?
    `;
    
    const therapist = await getRow(therapistSql, [parseInt(therapistId)]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    // Validate patient exists
    const patientSql = `
      SELECT p.id, p.userId, p.therapistId, CONCAT(u.firstName, ' ', u.lastName) as patientName, u.phone as patientPhone
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId)]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Check if therapist is assigned to this patient (primary or secondary assignment)
    const assignmentCheckSql = `
      SELECT pta.id, pta.assignmentType, pta.status
      FROM patient_therapist_assignments pta
      WHERE pta.patientId = ? AND pta.therapistId = ? AND pta.status = 'active'
    `;
    
    // Check if this is the primary therapist (stored in patients.therapistId)
    const isPrimaryTherapist = patient.therapistId === parseInt(therapistId);
    // Check if this is a secondary/collaborative therapist
    const secondaryAssignment = await getRow(assignmentCheckSql, [parseInt(patientId), parseInt(therapistId)]);
    
    if (!isPrimaryTherapist && !secondaryAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Therapist is not assigned to this patient'
      });
    }

    // Calculate end time
    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + parseInt(duration) * 60000);
    const endTimeStr = endTime.toTimeString().slice(0, 8);

    // Check for scheduling conflicts
    const conflictSql = `
      SELECT id FROM appointments 
      WHERE therapistId = ? AND appointmentDate = ? AND status != 'cancelled'
      AND (
        (startTime <= ? AND endTime > ?) OR
        (startTime < ? AND endTime >= ?) OR
        (startTime >= ? AND endTime <= ?)
      )
    `;

    const conflicts = await getAll(conflictSql, [
      therapist.userId, // Use therapist user ID
      date, 
      time, endTimeStr, 
      time, endTimeStr, 
      time, endTimeStr
    ]);

    if (conflicts.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Time slot conflicts with existing appointment'
      });
    }

    // Insert appointment
    const insertSql = `
      INSERT INTO appointments (
        patientId, therapistId, appointmentDate, startTime, endTime, 
        duration, type, status, approvalStatus, approvedBy, approvedAt, createdBy, reason, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
    `;

    const insertParams = [
      patient.id, // Use patient profile ID
      therapist.userId, // Use therapist user ID
      date,
      time,
      endTimeStr,
      parseInt(duration),
      type,
      'scheduled',
      'pending', // Admin-created appointments need therapist approval
      null, // approvedBy - will be set when therapist approves
      req.user.id, // Admin who created the appointment (createdBy)
      reason, // Include reason field
      notes || null
    ];

    const result = await runQuery(insertSql, insertParams);
    const appointmentId = result.insertId;

    // Get the created appointment with full details
    const getAppointmentSql = `
      SELECT 
        a.*,
        CONCAT(pu.firstName, ' ', pu.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName,
        pu.phone as patientPhone,
        tu.phone as therapistPhone,
        CONCAT(therapistApprover.firstName, ' ', therapistApprover.lastName) as therapistApproverName,
        CONCAT(adminApprover.firstName, ' ', adminApprover.lastName) as adminApproverName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users pu ON p.userId = pu.id
      JOIN users tu ON a.therapistId = tu.id
      LEFT JOIN users therapistApprover ON a.therapistApprovedBy = therapistApprover.id
      LEFT JOIN users adminApprover ON a.adminApprovedBy = adminApprover.id
      WHERE a.id = ?
    `;

    const newAppointment = await getRow(getAppointmentSql, [appointmentId]);

    // Create notifications for therapist, patient, and admin
    try {
      const notificationController = require('./notificationController');
      
      // Create notification for therapist (no SMS - appointment is pending approval)
      // SMS will be sent when appointment is approved
      const therapistMessage = `Hi ${therapist.therapistName}! You have a new ${type} appointment request with ${patient.patientName} on ${date} at ${formatTime12Hour(time)}. This appointment is pending your approval. TherapEase Team`;
      await notificationController.createNotification(
        therapist.userId, // Use therapist user ID
        'New Appointment Request (Pending Approval)',
        therapistMessage,
        'appointment',
        { 
          relatedId: appointmentId,
          sendSMS: false, // No SMS - appointment is pending, SMS will be sent when approved
          sendEmail: true, // Send email notification
          sendPush: true // Send push notification
        }
      );

      // Create notification for patient
      await notificationController.createAppointmentCreationNotificationForPatient(appointmentId);

      // Create notification for admin (get all admin users)
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      for (const admin of adminUsers) {
        await notificationController.createNotification(
          admin.id,
          'Appointment Created by Admin',
          `An admin has created a ${type} appointment between ${therapist.therapistName} and ${patient.patientName} on ${date} at ${formatTime12Hour(time)}`,
          'appointment',
          { relatedId: appointmentId }
        );
      }
    } catch (notificationError) {
      console.error('Notification creation error:', notificationError);
      // Continue without notifications if there's an error
    }

    // Broadcast appointment change via WebSocket
    // TODO: Re-enable WebSocket after fixing the issue
    /*
    const websocketService = require('../services/websocketService');
    websocketService.broadcastAppointmentChange(newAppointment, 'created');
    */

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: {
        id: appointmentId,
        patientName: patient.patientName,
        therapistName: therapist.therapistName,
        date: date,
        time: time,
        duration: parseInt(duration),
        type: type,
        status: 'scheduled',
        location: 'Room TBD',
        reason: reason,
        notes: notes
      }
    });

  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create appointment' 
    });
  }
};

// Get notifications for admin
const getNotifications = async (req, res) => {
  try {
    // Use CONVERT_TZ to ensure createdAt is in UTC regardless of server timezone
    const sql = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.isRead,
        n.relatedId,
        CONVERT_TZ(n.createdAt, @@session.time_zone, '+00:00') as createdAt,
        u.firstName,
        u.lastName
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      WHERE n.userId = ? AND n.type != 'therapist_assignment'
      ORDER BY n.createdAt DESC
    `;

    const adminUserId = req.user.id;
    const notifications = await getAll(sql, [adminUserId]);

    // Format notification data
    const formattedNotifications = notifications.map(notification => {
      // createdAt is already in UTC from CONVERT_TZ, parse it correctly
      let createdAt;
      if (notification.createdAt instanceof Date) {
        createdAt = notification.createdAt;
      } else if (typeof notification.createdAt === 'string') {
        // If it's a string, ensure it's treated as UTC
        // MySQL CONVERT_TZ returns datetime string, append 'Z' to indicate UTC
        const dateStr = notification.createdAt.endsWith('Z') 
          ? notification.createdAt 
          : notification.createdAt + 'Z';
        createdAt = new Date(dateStr);
      } else {
        createdAt = new Date(notification.createdAt);
      }
      // Format in UTC to avoid server timezone issues - frontend will use createdAt ISO string
      const date = createdAt.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      });
      const time = createdAt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
      
      return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: 'medium', // Default priority since column doesn't exist
        read: notification.isRead === 1,
        user: notification.firstName ? `${notification.firstName} ${notification.lastName}` : null,
        relatedId: notification.relatedId || null, // Include relatedId for appointment approvals
        createdAt: createdAt.toISOString(), // Ensure ISO string for frontend
        updatedAt: createdAt.toISOString(), // Use createdAt as updatedAt since updatedAt doesn't exist
        date: date,
        time: time,
        timeAgo: getTimeAgo(createdAt)
      };
    });

    // Get unread count
    const unreadSql = `
      SELECT COUNT(*) as unread
      FROM notifications n
      WHERE n.userId = ? AND n.isRead = 0
    `;

    const [unreadResult] = await getAll(unreadSql, [adminUserId]);
    const unreadCount = unreadResult.unread;

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: formattedNotifications.length,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notifications' 
    });
  }
};

// Mark notification as read
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;
    
    // Check if notification exists and belongs to admin
    const notificationSql = `
      SELECT id, isRead FROM notifications 
      WHERE id = ? AND userId = ?
    `;
    const notification = await getRow(notificationSql, [parseInt(id), adminUserId]);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    if (notification.isRead === 1) {
      return res.status(400).json({
        success: false,
        error: 'Notification is already marked as read'
      });
    }

    // Mark as read
    await runQuery(
      'UPDATE notifications SET isRead = 1 WHERE id = ?',
      [parseInt(id)]
    );
    res.json({
      success: true,
      message: 'Notification marked as read successfully'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notification as read' 
    });
  }
};

// Mark all notifications as read
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const adminUserId = req.user.id;

    // Mark all admin notifications as read
    const result = await runQuery(
      'UPDATE notifications SET isRead = 1 WHERE userId = ? AND isRead = 0',
      [adminUserId]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read successfully',
      updatedCount: result.affectedRows
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark all notifications as read' 
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;

    // Check if notification exists and belongs to admin
    const notificationSql = `
      SELECT id FROM notifications 
      WHERE id = ? AND userId = ?
    `;
    const notification = await getRow(notificationSql, [parseInt(id), adminUserId]);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found'
      });
    }

    // Delete notification
    await runQuery('DELETE FROM notifications WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete notification' 
    });
  }
};

// Get patient assessments
const getPatientAssessments = async (req, res) => {
  try {
    const { patientId } = req.params;

    const sql = `
      SELECT 
        a.id,
        a.title,
        a.type,
        a.category,
        a.assessmentDate,
        a.status,
        a.score,
        a.maxScore,
        a.summary,
        a.recommendations,
        a.areas,
        a.aiInsights,
        a.createdAt,
        a.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM assessments a
      JOIN users u ON a.therapistId = u.id
      JOIN patients p ON a.patientId = p.id
      WHERE p.userId = ?
      ORDER BY a.assessmentDate DESC
    `;

    const assessments = await getAll(sql, [parseInt(patientId)]);

    res.json({
      success: true,
      data: assessments
    });

  } catch (error) {
    console.error('Get patient assessments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient assessments' });
  }
};

// Get patient sessions
const getPatientSessions = async (req, res) => {
  try {
    const { patientId } = req.params;

    const sql = `
      SELECT 
        s.id,
        s.sessionDate,
        s.startTime,
        s.endTime,
        s.duration,
        s.sessionType,
        s.status,
        s.objectives,
        s.activities,
        s.observations,
        s.progress,
        s.challenges,
        s.nextSteps,
        s.goals,
        s.mood,
        s.engagement,
        s.notes,
        s.createdAt,
        s.updatedAt,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM sessions s
      JOIN users u ON s.therapistId = u.id
      JOIN patients p ON s.patientId = p.id
      WHERE p.userId = ?
      ORDER BY s.sessionDate DESC
    `;

    const sessions = await getAll(sql, [parseInt(patientId)]);

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Get patient sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient sessions' });
  }
};

// Get patient progress
const getPatientProgress = async (req, res) => {
  try {
    const { patientId } = req.params;

    const sql = `
      SELECT 
        mo.id,
        mo.title as area,
        NULL as baselineScore,
        mo.progress as currentScore,
        100 as targetScore,
        mo.description as progressNotes,
        mo.updatedAt as measurementDate,
        mo.targetDate as nextReviewDate,
        mo.createdAt,
        mo.updatedAt,
        tp.title as assessmentTitle
      FROM main_objectives mo
      JOIN treatment_plans tp ON mo.treatmentPlanId = tp.id
      JOIN patients p ON tp.patientId = p.id
      WHERE p.userId = ? AND tp.status = 'active'
      ORDER BY mo.updatedAt DESC
    `;

    const progress = await getAll(sql, [parseInt(patientId)]);

    res.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Get patient progress error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch patient progress' });
  }
};

// Get therapists for admin
const getTherapists = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        t.maxPatients,
        t.isAcceptingPatients,
        (SELECT COUNT(DISTINCT pta.patientId) FROM patient_therapist_assignments pta WHERE pta.therapistId = t.userId AND pta.status = 'active') as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist' AND u.status != 'pending'
      ORDER BY u.createdAt DESC
    `;

    const therapists = await getAll(sql);

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format therapist data and decrypt sensitive fields
    const formattedTherapists = therapists.map(therapist => ({
      id: therapist.id,
      email: decryptField(therapist.email),
      role: therapist.role,
      firstName: therapist.firstName,
      lastName: therapist.lastName,
      phone: decryptField(therapist.phone),
      dateOfBirth: therapist.dateOfBirth,
      gender: therapist.gender,
      address: decryptField(therapist.address),
      city: therapist.city,
      state: therapist.state,
      zipCode: therapist.zipCode,
      status: therapist.status || 'active', // Use user status as primary
      createdAt: therapist.createdAt,
      updatedAt: therapist.updatedAt,
      therapist: {
        licenseNumber: therapist.licenseNumber,
        specialization: therapist.specialization,
        yearsOfExperience: therapist.yearsOfExperience,
        education: therapist.education,
        certifications: therapist.certifications,
        availability: therapist.availability,
        status: 'active', // Default status since t.status column doesn't exist
        maxPatients: therapist.maxPatients || 20,
        isAcceptingPatients: therapist.isAcceptingPatients !== false
      },
      patientCount: therapist.patientCount || 0
    }));

    res.json({
      success: true,
      data: {
        users: formattedTherapists,
        total: formattedTherapists.length
      }
    });

  } catch (error) {
    console.error('Get therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch therapists' });
  }
};

// Get pending therapists (therapists with status 'pending')
const getPendingTherapists = async (req, res) => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist' AND u.status = 'pending'
      ORDER BY u.createdAt DESC
    `;

    const therapists = await getAll(sql);
    
    console.log(`[getPendingTherapists] SQL query executed`);
    console.log(`[getPendingTherapists] Found ${therapists.length} pending therapists`);
    
    // Debug: Check what statuses exist in the database
    const statusCheck = await getAll(`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM users 
      WHERE role = 'therapist' 
      GROUP BY status
    `);
    console.log(`[getPendingTherapists] Therapist statuses in DB:`, statusCheck);

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format therapist data and decrypt sensitive fields
    const formattedTherapists = therapists.map(therapist => {
      try {
        return {
          id: therapist.id,
          email: decryptField(therapist.email) || therapist.email, // Fallback to original if decryption fails
          role: therapist.role,
          firstName: therapist.firstName,
          lastName: therapist.lastName,
          phone: decryptField(therapist.phone) || therapist.phone, // Fallback to original if decryption fails
          dateOfBirth: therapist.dateOfBirth,
          gender: therapist.gender,
          address: decryptField(therapist.address) || therapist.address, // Fallback to original if decryption fails
          city: therapist.city,
          state: therapist.state,
          zipCode: therapist.zipCode,
          status: therapist.status,
          createdAt: therapist.createdAt,
          updatedAt: therapist.updatedAt,
          therapist: {
            licenseNumber: therapist.licenseNumber,
            specialization: therapist.specialization,
            yearsOfExperience: therapist.yearsOfExperience,
            education: therapist.education,
            certifications: therapist.certifications,
            availability: therapist.availability
          }
        };
      } catch (error) {
        console.error('Error formatting therapist data:', error);
        // Return therapist data with original (possibly unencrypted) values
        return {
          id: therapist.id,
          email: therapist.email,
          role: therapist.role,
          firstName: therapist.firstName,
          lastName: therapist.lastName,
          phone: therapist.phone,
          dateOfBirth: therapist.dateOfBirth,
          gender: therapist.gender,
          address: therapist.address,
          city: therapist.city,
          state: therapist.state,
          zipCode: therapist.zipCode,
          status: therapist.status,
          createdAt: therapist.createdAt,
          updatedAt: therapist.updatedAt,
          therapist: {
            licenseNumber: therapist.licenseNumber,
            specialization: therapist.specialization,
            yearsOfExperience: therapist.yearsOfExperience,
            education: therapist.education,
            certifications: therapist.certifications,
            availability: therapist.availability
          }
        };
      }
    });

    console.log(`[getPendingTherapists] Returning ${formattedTherapists.length} formatted therapists`);
    if (formattedTherapists.length > 0) {
      console.log(`[getPendingTherapists] Sample therapist:`, JSON.stringify(formattedTherapists[0], null, 2));
    }

    res.json({
      success: true,
      data: {
        therapists: formattedTherapists,
        total: formattedTherapists.length
      }
    });

  } catch (error) {
    console.error('Get pending therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending therapists' });
  }
};

// Approve pending therapist
const approvePendingTherapist = async (req, res) => {
  try {
    const { therapistId } = req.params;

    if (!therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Therapist ID is required'
      });
    }

    // Check if therapist exists and is pending, get email and name for notification
    const therapist = await getRow(
      'SELECT id, status, email, firstName, lastName FROM users WHERE id = ? AND role = ?',
      [therapistId, 'therapist']
    );

    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    if (therapist.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Therapist is not pending approval'
      });
    }

    // Update therapist status to active
    await runQuery(
      'UPDATE users SET status = ?, updatedAt = NOW() WHERE id = ?',
      ['active', therapistId]
    );

    // Send email notification to the therapist
    try {
      const emailService = require('../services/emailService');
      const { decryptField } = require('../utils/encryption');
      
      // Decrypt email
      const therapistEmail = decryptField(therapist.email) || therapist.email;
      const therapistName = therapist.firstName || 'Therapist';
      
      // Get frontend URL for login link
      const frontendUrl = process.env.FRONTEND_URL || 
                         (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0].trim() : 'https://therapease.site');
      const loginUrl = `${frontendUrl}/auth/login`;
      
      // Create email content
      const emailSubject = 'Your TherapEase Account Has Been Approved';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Account Approved - Welcome to TherapEase!</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Dear ${therapistName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Great news! Your therapist account has been approved by the administrator. You can now log in to the TherapEase portal and start using the platform.
          </p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>Next Steps:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #1e40af;">
              <li>Visit the login page: <a href="${loginUrl}" style="color: #2563eb; text-decoration: none;">${loginUrl}</a></li>
              <li>Log in with your registered email and password</li>
              <li>Complete your profile setup if needed</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            If you have any questions or need assistance, please don't hesitate to contact our support team.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
            Best regards,<br>
            <strong>The TherapEase Team</strong>
          </p>
        </div>
      `;
      
      const emailText = `
Account Approved - Welcome to TherapEase!

Dear ${therapistName},

Great news! Your therapist account has been approved by the administrator. You can now log in to the TherapEase portal and start using the platform.

Next Steps:
- Visit the login page: ${loginUrl}
- Log in with your registered email and password
- Complete your profile setup if needed

If you have any questions or need assistance, please don't hesitate to contact our support team.

Best regards,
The TherapEase Team
      `;
      
      // Send email using SendGrid API or SMTP
      const emailResult = await emailService.sendViaSendGridAPI(
        therapistEmail,
        emailSubject,
        emailHtml,
        emailText,
        process.env.EMAIL_FROM || 'therapease16@gmail.com'
      );
      
      if (emailResult.success) {
        console.log(`✅ Approval email sent successfully to ${therapistEmail}`);
      } else {
        console.error(`⚠️ Failed to send approval email to ${therapistEmail}:`, emailResult.error);
      }
      
      // Also create a notification record
      const notificationController = require('./notificationController');
      await notificationController.createNotification(
        therapistId,
        'Account Approved',
        `Your therapist account has been approved. You can now log in to the TherapEase portal.`,
        'system',
        {
          sendEmail: false, // Already sent email above
          sendPush: true,
          sendSMS: false
        }
      );
      
    } catch (notificationError) {
      console.error('Error sending approval notification:', notificationError);
      // Don't fail the approval if notification fails
    }

    res.json({
      success: true,
      message: 'Therapist approved successfully',
      data: {
        therapistId: therapistId,
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Approve pending therapist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve therapist'
    });
  }
};

// Reject pending therapist
const rejectPendingTherapist = async (req, res) => {
  const connection = await getConnection();
  try {
    const { therapistId } = req.params;

    if (!therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Therapist ID is required'
      });
    }

    // Check if therapist exists and is pending, get therapist record ID and email for notification
    const therapist = await getRow(
      'SELECT u.id, u.status, u.email, u.firstName, u.lastName, t.id as therapistRecordId FROM users u LEFT JOIN therapists t ON u.id = t.userId WHERE u.id = ? AND u.role = ?',
      [therapistId, 'therapist']
    );

    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    if (therapist.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Therapist is not pending approval'
      });
    }

    // Send email notification to the therapist before deleting
    try {
      const emailService = require('../services/emailService');
      const { decryptField } = require('../utils/encryption');
      
      // Decrypt email
      const therapistEmail = decryptField(therapist.email) || therapist.email;
      const therapistName = therapist.firstName || 'Therapist';
      
      // Create email content
      const emailSubject = 'TherapEase Registration - Application Not Approved';
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; margin-bottom: 20px;">Application Not Approved</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Dear ${therapistName},
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for your interest in joining TherapEase. After careful review of your application, we regret to inform you that we are unable to approve your therapist account at this time.
          </p>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #991b1b;">
              <strong>What this means:</strong>
            </p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #991b1b;">
              <li>Your account registration has been declined</li>
              <li>Your account and all associated data have been removed from our system</li>
              <li>You will not be able to log in to the TherapEase platform</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            If you have any questions about this decision or would like to discuss your application further, please contact our support team.
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-top: 30px;">
            Best regards,<br>
            <strong>The TherapEase Team</strong>
          </p>
        </div>
      `;
      
      const emailText = `
Application Not Approved

Dear ${therapistName},

Thank you for your interest in joining TherapEase. After careful review of your application, we regret to inform you that we are unable to approve your therapist account at this time.

What this means:
- Your account registration has been declined
- Your account and all associated data have been removed from our system
- You will not be able to log in to the TherapEase platform

If you have any questions about this decision or would like to discuss your application further, please contact our support team.

Best regards,
The TherapEase Team
      `;
      
      // Send email
      const emailResult = await emailService.sendViaSendGridAPI(
        therapistEmail,
        emailSubject,
        emailHtml,
        emailText,
        process.env.EMAIL_FROM || 'therapease16@gmail.com'
      );
      
      if (emailResult.success) {
        console.log(`✅ Rejection email sent to ${therapistEmail}`);
      } else {
        console.error(`⚠️ Failed to send rejection email to ${therapistEmail}:`, emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending rejection email:', emailError);
      // Continue with deletion even if email fails
    }

    // Start transaction to delete both user and therapist records
    await connection.beginTransaction();

    try {
      // Delete therapist record first (due to foreign key constraint)
      if (therapist.therapistRecordId) {
        await runQuery('DELETE FROM therapists WHERE id = ?', [therapist.therapistRecordId]);
        console.log(`✓ Deleted therapist record (ID: ${therapist.therapistRecordId})`);
      }
      
      // Then delete user record
      await runQuery('DELETE FROM users WHERE id = ?', [therapistId]);
      console.log(`✓ Deleted user record (ID: ${therapistId})`);
      
      await connection.commit();

      res.json({
        success: true,
        message: 'Therapist rejected and account deleted successfully',
        data: {
          therapistId: therapistId,
          deleted: true
        }
      });

    } catch (deleteError) {
      await connection.rollback();
      throw deleteError;
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Reject pending therapist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject therapist'
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Get all users for admin user management
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 100, role, search, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];

    if (role && role !== 'all') {
      whereConditions.push('u.role = ?');
      params.push(role);
    }

    if (search) {
      whereConditions.push('(u.firstName LIKE ? OR u.lastName LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Exclude pending therapists from users management list - only show approved/active therapists
    whereConditions.push('(u.role != ? OR u.status != ?)');
    params.push('therapist', 'pending');

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;
    
    const [countResult] = await getAll(countSql, params);
    const total = countResult.total;

    // Get users with role-specific data
    const sql = `
      SELECT 
        u.id,
        u.email,
        u.password,
        u.role,
        u.firstName,
        u.lastName,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.status,
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.education,
        t.certifications,
        t.availability,
        p.diagnosis,
        p.medicalHistory,
        p.status as patientStatus,
        p.therapistId,
        (SELECT COUNT(*) FROM patients pt WHERE pt.therapistId = t.userId) as patientCount
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const users = await getAll(sql, params);

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format user data and decrypt sensitive fields
    const formattedUsers = users.map(user => {
      const formattedUser = {
        id: user.id,
        email: decryptField(user.email),
        password: user.password, // Include password for admin view (will be masked in frontend)
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: decryptField(user.phone),
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: decryptField(user.address),
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        status: user.status || 'active', // Use actual status field
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add role-specific data
      if (user.role === 'therapist') {
        formattedUser.therapist = {
          licenseNumber: user.licenseNumber,
          specialization: user.specialization,
          yearsOfExperience: user.yearsOfExperience,
          education: user.education,
          certifications: user.certifications,
          availability: user.availability
        };
        formattedUser.patientCount = user.patientCount || 0;
      } else if (user.role === 'patient') {
        formattedUser.patient = {
          diagnosis: user.diagnosis,
          medicalHistory: user.medicalHistory,
          status: 'active', // Default status since p.status column doesn't exist
          therapistId: user.therapistId
        };
      }

      return formattedUser;
    });

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// Reset user password (admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hashPassword } = require('../utils/password');

    // Check if user exists
    const user = await getRow('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await hashPassword(tempPassword);

    // Update user password
    await runQuery(
      'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, parseInt(userId)]
    );

    // Log the password reset action

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        userId: parseInt(userId),
        email: user.email,
        tempPassword: tempPassword // Only return this in development
      }
    });

  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

// Send password reset link to user (Admin function)
const sendPasswordResetLink = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await getRow('SELECT id, email, firstName, lastName FROM users WHERE id = ?', [parseInt(userId)]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Import email service
    const emailService = require('../services/emailService');
    
    // Generate reset token
    const resetToken = emailService.generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Invalidate any existing reset tokens for this user
      await connection.execute(
        'UPDATE password_reset_tokens SET used = TRUE WHERE userId = ? AND used = FALSE',
        [user.id]
      );

      // Store new reset token
      await connection.execute(
        'INSERT INTO password_reset_tokens (userId, token, expiresAt) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt]
      );

      await connection.commit();

      // Decrypt email before sending
      const decryptedEmail = decryptField(user.email);

      // Send reset email (if email service is enabled) - non-blocking
      // Fire and forget - don't wait for email to send to avoid API timeout
      emailService.sendPasswordResetEmail(
        decryptedEmail, 
        resetToken, 
        user.firstName || 'User'
      ).then(emailResult => {
        if (emailResult.success) {
        } else {
          console.warn(`⚠️ Failed to send password reset email to ${decryptedEmail}: ${emailResult.error}`);
      }
      }).catch(error => {
        console.error(`❌ Error sending password reset email to ${decryptedEmail}:`, error.message);
      });

      // Return success immediately - email is sent in background
      // URL encode the token to ensure it's safely handled in the URL
      const encodedToken = encodeURIComponent(resetToken);
      
      // Get frontend URL from environment or derive from CORS_ORIGIN
      const getFrontendUrl = () => {
        if (process.env.FRONTEND_URL) {
          return process.env.FRONTEND_URL;
        }
        if (process.env.NODE_ENV === 'production') {
          if (process.env.CORS_ORIGIN) {
            // Get the first origin from CORS_ORIGIN (comma-separated list)
            const firstOrigin = process.env.CORS_ORIGIN.split(',')[0].trim();
            // Use the origin as-is (it should already be a full URL like https://therapease.site)
            return firstOrigin;
          }
          return 'https://therapease.site';
        }
        return 'http://localhost:3000';
      };
      
      const resetLink = `${getFrontendUrl()}/auth/reset-password?token=${encodedToken}`;
      res.json({
        success: true,
        message: 'Password reset token created successfully. Email will be sent if email service is configured.',
        data: {
          userId: parseInt(userId),
          email: decryptedEmail,
          resetToken: resetToken,
          resetLink: resetLink
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Send password reset link error:', error);
    res.status(500).json({ success: false, error: 'Failed to send reset link' });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    // Check if user exists
    const user = await getRow('SELECT * FROM users WHERE id = ?', [parseInt(userId)]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent deactivating admin users
    if (user.role === 'admin' && status === 'inactive') {
      return res.status(403).json({
        success: false,
        error: 'Cannot deactivate admin users'
      });
    }

    // Update user status using the actual status field
    await runQuery(
      'UPDATE users SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [status, parseInt(userId)]
    );

    // If user is a patient, also update their patient status to match
    if (user.role === 'patient') {
      const patientResult = await runQuery(
        'UPDATE patients SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [status, parseInt(userId)]
      );
    }

    // If user is a therapist, also update their therapist status to match
    if (user.role === 'therapist') {
      const therapistResult = await runQuery(
        'UPDATE therapists SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?',
        [status, parseInt(userId)]
      );
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: {
        userId: parseInt(userId),
        email: user.email,
        status: status
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user status' });
  }
};

// Get available therapists for patient assignment
const getAvailableTherapists = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    // Get therapists with their current patient count and capacity
    const sql = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        t.id as therapistId,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        t.maxPatients,
        t.isAcceptingPatients,
        (SELECT COUNT(DISTINCT pta.patientId) FROM patient_therapist_assignments pta WHERE pta.therapistId = u.id AND pta.status = 'active') as currentPatientCount
      FROM users u
      JOIN therapists t ON u.id = t.userId
      WHERE u.role = 'therapist' 
        AND u.status = 'active'
        AND t.isAcceptingPatients = TRUE
      ORDER BY currentPatientCount ASC, u.firstName ASC
    `;

    const therapists = await getAll(sql);

    // Filter therapists who have available slots
    const availableTherapists = therapists.filter(therapist => {
      const currentCount = therapist.currentPatientCount || 0;
      const maxPatients = therapist.maxPatients || 20;
      return currentCount < maxPatients;
    });

    // If patientId is provided, exclude therapists already assigned to this patient
    let filteredTherapists = availableTherapists;
    if (patientId) {
      const assignedTherapistIds = await getAll(
        'SELECT DISTINCT therapistId FROM patient_therapist_assignments WHERE patientId = ? AND status = "active"',
        [parseInt(patientId)]
      );
      const assignedIds = assignedTherapistIds.map(assignment => assignment.therapistId);
      filteredTherapists = availableTherapists.filter(therapist => !assignedIds.includes(therapist.id));
    }

    // Fetch working hours for each therapist
    const therapistsWithWorkingHours = await Promise.all(
      filteredTherapists.map(async (therapist) => {
        const workingHoursSql = `
          SELECT dayOfWeek, startTime, endTime, isEnabled
          FROM working_hours
          WHERE userId = ?
          ORDER BY 
            CASE dayOfWeek
              WHEN 'monday' THEN 1
              WHEN 'tuesday' THEN 2
              WHEN 'wednesday' THEN 3
              WHEN 'thursday' THEN 4
              WHEN 'friday' THEN 5
              WHEN 'saturday' THEN 6
              WHEN 'sunday' THEN 7
            END
        `;
        
        const workingHoursData = await getAll(workingHoursSql, [therapist.id]);
        
        // Format working hours
        const workingHours = {};
        workingHoursData.forEach(hour => {
          workingHours[hour.dayOfWeek] = {
            start: hour.startTime,
            end: hour.endTime,
            enabled: hour.isEnabled
          };
        });

        return {
          ...therapist,
          workingHours
        };
      })
    );

    // Format response
    const formattedTherapists = therapistsWithWorkingHours.map(therapist => ({
      id: therapist.id,
      therapistId: therapist.therapistId,
      name: `${therapist.firstName} ${therapist.lastName}`,
      email: therapist.email,
      phone: therapist.phone,
      specialization: therapist.specialization,
      yearsOfExperience: therapist.yearsOfExperience,
      workingHours: therapist.workingHours,
      currentPatientCount: therapist.currentPatientCount,
      maxPatients: therapist.maxPatients,
      availableSlots: therapist.maxPatients - therapist.currentPatientCount,
      isAvailable: therapist.currentPatientCount < therapist.maxPatients
    }));

    res.json({
      success: true,
      data: {
        therapists: formattedTherapists,
        total: formattedTherapists.length
      }
    });

  } catch (error) {
    console.error('Get available therapists error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available therapists' });
  }
};

// Assign therapist to patient
const assignTherapistToPatient = async (req, res) => {
  try {
    const { patientId, therapistId } = req.body;


    // Validate required fields
    if (!patientId || !therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, therapistId'
      });
    }

    // Check if patient exists
    const patientSql = `
      SELECT p.id, p.userId, p.therapistId, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId)]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Check if therapist exists and is available
    const therapistSql = `
      SELECT 
        t.id, 
        t.userId, 
        t.maxPatients, 
        t.isAcceptingPatients,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName,
        (SELECT COUNT(DISTINCT pta.patientId) FROM patient_therapist_assignments pta WHERE pta.therapistId = t.userId AND pta.status = 'active') as currentPatientCount
      FROM therapists t
      JOIN users u ON t.userId = u.id
      WHERE t.userId = ?
    `;
    
    const therapist = await getRow(therapistSql, [parseInt(therapistId)]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    // Check if therapist is accepting new patients
    if (!therapist.isAcceptingPatients) {
      return res.status(400).json({
        success: false,
        error: 'Therapist is not currently accepting new patients'
      });
    }

    // Check if therapist has available slots
    const currentCount = therapist.currentPatientCount || 0;
    const maxPatients = therapist.maxPatients || 20;
    
    if (currentCount >= maxPatients) {
      return res.status(400).json({
        success: false,
        error: `Therapist has reached maximum patient capacity (${maxPatients} patients)`
      });
    }

    // Check if patient already has a therapist assigned
    if (patient.therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Patient already has a therapist assigned'
      });
    }

    // Check if patient already has a primary therapist assignment
    const existingPrimaryAssignment = await getRow(
      'SELECT pta.id, CONCAT(u.firstName, " ", u.lastName) as therapistName FROM patient_therapist_assignments pta JOIN users u ON pta.therapistId = u.id WHERE pta.patientId = ? AND pta.assignmentType = "primary" AND pta.status = "active"',
      [patient.id]
    );

    if (existingPrimaryAssignment) {
      return res.status(400).json({
        success: false,
        error: `Patient already has a primary therapist (${existingPrimaryAssignment.therapistName}). Only one primary therapist is allowed per patient.`
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create assignment in patient_therapist_assignments table
      await connection.execute(
        'INSERT INTO patient_therapist_assignments (patientId, therapistId, assignmentType, assignedBy, status) VALUES (?, ?, ?, ?, "active")',
        [patient.id, parseInt(therapistId), 'primary', req.user.id]
      );

      // Also update the patients table for backward compatibility
      await connection.execute(
        'UPDATE patients SET therapistId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [parseInt(therapistId), patient.id]
      );

      // Create notifications
      const notificationController = require('./notificationController');
      
      // Notify therapist
      await notificationController.createNotification(
        parseInt(therapistId),
        'New Patient Assigned',
        `You have been assigned a new patient: ${patient.patientName}`,
        'patient_assignment',
        { patientId: patient.id, therapistId: parseInt(therapistId) }
      );

      // Create priority notification for assessment scheduling
      await notificationController.createNotification(
        parseInt(therapistId),
        'Priority: Schedule Initial Assessment',
        `Please schedule an initial assessment for your new patient: ${patient.patientName}. This is a priority task.`,
        'assessment_priority',
        { patientId: patient.id, therapistId: parseInt(therapistId), priority: 'high' }
      );

      // Notify patient (use patient.userId, not patientId)
      await notificationController.createNotification(
        patient.userId,
        'Therapist Assigned',
        `You have been assigned to therapist: ${therapist.therapistName}`,
        'therapist_assignment',
        { patientId: patient.id, therapistId: parseInt(therapistId) }
      );

      // Notify admin users
      const adminUsers = await getAll('SELECT id FROM users WHERE role = "admin"');
      for (const admin of adminUsers) {
        await notificationController.createNotification(
          admin.id,
          'Patient-Therapist Assignment',
          `Patient ${patient.patientName} has been assigned to therapist ${therapist.therapistName}`,
          'admin_notification',
          { patientId: patient.id, therapistId: parseInt(therapistId) }
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Therapist assigned to patient successfully',
        data: {
          patientId: patient.id,
          patientName: patient.patientName,
          therapistId: parseInt(therapistId),
          therapistName: therapist.therapistName,
          currentPatientCount: currentCount + 1,
          maxPatients: maxPatients
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('=== ASSIGN THERAPIST TO PATIENT ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to assign therapist to patient',
      details: error.message 
    });
  }
};

// Unassign therapist from patient
const unassignTherapistFromPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Check if patient exists
    const patientSql = `
      SELECT p.id, p.userId, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM patients p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `;
    
    const patient = await getRow(patientSql, [parseInt(patientId)]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Check if patient has a primary therapist assignment
    const primaryAssignmentSql = `
      SELECT pta.id, pta.therapistId, pta.assignmentType,
             CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM patient_therapist_assignments pta
      JOIN users u ON pta.therapistId = u.id
      WHERE pta.patientId = ? AND pta.assignmentType = 'primary' AND pta.status = 'active'
    `;
    
    const primaryAssignment = await getRow(primaryAssignmentSql, [patient.id]);
    
    if (!primaryAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Patient does not have a primary therapist assigned'
      });
    }

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Remove only the PRIMARY therapist assignment (not secondary or collaborative)
      await connection.execute(
        'DELETE FROM patient_therapist_assignments WHERE patientId = ? AND assignmentType = "primary" AND status = "active"',
        [patient.id]
      );

      // Also clear the old therapistId field for backward compatibility
      await connection.execute(
        'UPDATE patients SET therapistId = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [patient.id]
      );

      // Create notifications
      const notificationController = require('./notificationController');
      
      // Notify only the primary therapist
      await notificationController.createNotification(
        primaryAssignment.therapistId,
        'Patient Unassigned',
        `Patient ${patient.patientName} has been unassigned from you`,
        'patient_unassignment',
        { patientId: patient.id, therapistId: primaryAssignment.therapistId }
      );

      // Notify patient
      await notificationController.createNotification(
        patient.userId,
        'Primary Therapist Unassigned',
        `Your primary therapist ${primaryAssignment.therapistName} has been unassigned from you`,
        'therapist_unassignment',
        { patientId: patient.id, therapistId: primaryAssignment.therapistId }
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Primary therapist unassigned from patient successfully',
        data: {
          patientId: patient.id,
          patientName: patient.patientName,
          unassignedTherapist: {
            therapistId: primaryAssignment.therapistId,
            therapistName: primaryAssignment.therapistName,
            assignmentType: primaryAssignment.assignmentType
          }
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Unassign therapist from patient error:', error);
    res.status(500).json({ success: false, error: 'Failed to unassign therapist from patient' });
  }
};

// Update therapist capacity and availability
const updateTherapistAvailability = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { maxPatients, isAcceptingPatients } = req.body;

    // Check if therapist exists
    const therapistSql = `
      SELECT t.id, t.userId, CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM therapists t
      JOIN users u ON t.userId = u.id
      WHERE t.userId = ?
    `;
    
    const therapist = await getRow(therapistSql, [parseInt(therapistId)]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    // Validate maxPatients if provided
    if (maxPatients !== undefined) {
      const currentPatientCount = await getRow(
        'SELECT COUNT(DISTINCT patientId) as count FROM patient_therapist_assignments WHERE therapistId = ? AND status = "active"',
        [parseInt(therapistId)]
      );
      
      if (maxPatients < currentPatientCount.count) {
        return res.status(400).json({
          success: false,
          error: `Cannot set max patients to ${maxPatients}. Therapist currently has ${currentPatientCount.count} patients assigned.`
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (maxPatients !== undefined) {
      updateFields.push('maxPatients = ?');
      updateParams.push(parseInt(maxPatients));
    }

    if (isAcceptingPatients !== undefined) {
      updateFields.push('isAcceptingPatients = ?');
      updateParams.push(Boolean(isAcceptingPatients));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push('updatedAt = CURRENT_TIMESTAMP');
    updateParams.push(parseInt(therapistId));

    // Update therapist
    await runQuery(
      `UPDATE therapists SET ${updateFields.join(', ')} WHERE userId = ?`,
      updateParams
    );

    res.json({
      success: true,
      message: 'Therapist availability updated successfully',
      data: {
        therapistId: parseInt(therapistId),
        therapistName: therapist.therapistName,
        maxPatients: maxPatients,
        isAcceptingPatients: isAcceptingPatients
      }
    });

  } catch (error) {
    console.error('Update therapist availability error:', error);
    res.status(500).json({ success: false, error: 'Failed to update therapist availability' });
  }
};

// Get therapist working hours (admin)
const getTherapistWorkingHours = async (req, res) => {
  try {
    const { therapistId } = req.params;

    // Get therapist basic info
    const therapistSql = `
      SELECT 
        u.id,
        u.firstName,
        u.lastName,
        u.email,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM users u
      JOIN therapists t ON u.id = t.userId
      WHERE u.id = ? AND u.role = 'therapist'
    `;
    
    const therapist = await getRow(therapistSql, [parseInt(therapistId)]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    // Get working hours
    const workingHoursSql = `
      SELECT dayOfWeek, startTime, endTime, isEnabled
      FROM working_hours
      WHERE userId = ?
      ORDER BY 
        CASE dayOfWeek
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 7
        END
    `;
    
    const workingHoursData = await getAll(workingHoursSql, [parseInt(therapistId)]);
    
    // Format working hours
    const workingHours = {};
    workingHoursData.forEach(hour => {
      workingHours[hour.dayOfWeek] = {
        start: hour.startTime,
        end: hour.endTime,
        enabled: hour.isEnabled
      };
    });

    // If no working hours found, return default structure
    if (workingHoursData.length === 0) {
      const defaultDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      defaultDays.forEach(day => {
        workingHours[day] = {
          start: day === 'saturday' || day === 'sunday' ? '10:00' : '09:00',
          end: day === 'saturday' || day === 'sunday' ? '14:00' : '17:00',
          enabled: day === 'saturday' || day === 'sunday' ? false : true
        };
      });
    }

    res.json({
      success: true,
      data: {
        therapist: {
          id: therapist.id,
          name: therapist.therapistName,
          email: therapist.email
        },
        workingHours: workingHours
      }
    });

  } catch (error) {
    console.error('Get therapist working hours error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch therapist working hours' 
    });
  }
};

// Update appointment (admin)
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if appointment exists
    const existingAppointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ?
    `, [parseInt(id)]);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check for scheduling conflicts if time is being changed
    if (updateData.appointmentDate || updateData.startTime || updateData.endTime) {
      const newDate = updateData.appointmentDate || existingAppointment.appointmentDate;
      const newStartTime = updateData.startTime || existingAppointment.startTime;
      const newEndTime = updateData.endTime || existingAppointment.endTime;

      const conflictSql = `
        SELECT id FROM appointments 
        WHERE therapistId = ? AND appointmentDate = ? AND status != 'cancelled' AND id != ?
        AND (
          (startTime <= ? AND endTime > ?) OR
          (startTime < ? AND endTime >= ?) OR
          (startTime >= ? AND endTime <= ?)
        )
      `;

      const conflicts = await getAll(conflictSql, [
        existingAppointment.therapistId,
        newDate, 
        parseInt(id),
        newStartTime, newEndTime, 
        newStartTime, newEndTime, 
        newStartTime, newEndTime
      ]);

      if (conflicts.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Time slot conflicts with existing appointment'
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (updateData.appointmentDate) {
      updateFields.push('appointmentDate = ?');
      updateValues.push(updateData.appointmentDate);
    }
    if (updateData.startTime) {
      updateFields.push('startTime = ?');
      updateValues.push(updateData.startTime);
    }
    if (updateData.endTime) {
      updateFields.push('endTime = ?');
      updateValues.push(updateData.endTime);
    }
    if (updateData.duration) {
      updateFields.push('duration = ?');
      updateValues.push(updateData.duration);
    }
    if (updateData.type) {
      updateFields.push('type = ?');
      updateValues.push(updateData.type);
    }
    if (updateData.status) {
      // Validate status - appointments.status ENUM only allows: 'scheduled', 'completed', 'cancelled'
      // 'pending' is for approvalStatus, not status
      const validStatuses = ['scheduled', 'completed', 'cancelled'];
      const validStatus = validStatuses.includes(updateData.status) ? updateData.status : null;
      
      if (validStatus) {
        updateFields.push('status = ?');
        updateValues.push(validStatus);
        
        // If status is being changed to 'scheduled', also update approval status to approved
        if (validStatus === 'scheduled') {
          updateFields.push('approvalStatus = ?');
          updateValues.push('approved');
          updateFields.push('approvedBy = ?');
          updateValues.push(req.user.id);
          updateFields.push('approvedAt = NOW()');
        }
      } else if (updateData.status === 'pending') {
        // If trying to set status to 'pending', actually set approvalStatus to 'pending'
        // Keep the current status (don't change status column)
        updateFields.push('approvalStatus = ?');
        updateValues.push('pending');
        // Clear approval fields when setting back to pending
        updateFields.push('approvedBy = NULL');
        updateFields.push('approvedAt = NULL');
      } else {
        return res.status(400).json({
          success: false,
          error: `Invalid status: ${updateData.status}. Valid statuses are: ${validStatuses.join(', ')}. Use approvalStatus for 'pending'.`
        });
      }
    }
    
    // Handle approvalStatus separately if provided
    if (updateData.approvalStatus) {
      const validApprovalStatuses = ['pending', 'approved', 'rejected'];
      if (validApprovalStatuses.includes(updateData.approvalStatus)) {
        updateFields.push('approvalStatus = ?');
        updateValues.push(updateData.approvalStatus);
        
        if (updateData.approvalStatus === 'approved') {
          updateFields.push('approvedBy = ?');
          updateValues.push(req.user.id);
          updateFields.push('approvedAt = NOW()');
        } else if (updateData.approvalStatus === 'pending') {
          // Clear approval fields when setting back to pending
          updateFields.push('approvedBy = NULL');
          updateFields.push('approvedAt = NULL');
        }
      } else {
        return res.status(400).json({
          success: false,
          error: `Invalid approvalStatus: ${updateData.approvalStatus}. Valid values are: ${validApprovalStatuses.join(', ')}.`
        });
      }
    }
    if (updateData.notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(updateData.notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push('updatedAt = NOW()');
    updateValues.push(parseInt(id));

    // Build SQL - handle NULL values separately
    // Separate fields with NULL from fields with values
    const fieldsWithValues = [];
    const fieldsWithNull = [];
    const valuesForQuery = [];
    
    updateFields.forEach((field, index) => {
      if (field.includes('= NULL')) {
        // Extract field name for NULL assignment
        const fieldName = field.replace(' = NULL', '');
        fieldsWithNull.push(`${fieldName} = NULL`);
      } else if (field.includes('NOW()')) {
        // Fields with NOW() don't need values
        fieldsWithValues.push(field);
      } else if (index < updateValues.length) {
        fieldsWithValues.push(field);
        valuesForQuery.push(updateValues[index]);
      }
    });
    
    // Combine all fields
    const allFields = [...fieldsWithValues, ...fieldsWithNull];
    valuesForQuery.push(parseInt(id));
    
    const updateSql = `UPDATE appointments SET ${allFields.join(', ')} WHERE id = ?`;
    await runQuery(updateSql, valuesForQuery);

    // Get updated appointment
    const updatedAppointment = await getRow(`
      SELECT 
        a.*,
        CONCAT(pu.firstName, ' ', pu.lastName) as patientName,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName,
        p.userId as patientUserId
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users pu ON p.userId = pu.id
      JOIN users tu ON a.therapistId = tu.id
      WHERE a.id = ?
    `, [parseInt(id)]);

    // Send notifications if status was changed to scheduled
    if (updateData.status === 'scheduled') {
      try {
        const notificationController = require('./notificationController');
        
        // Notify patient
        await notificationController.createNotification(
          updatedAppointment.patientUserId,
          'Appointment Status Updated',
          `Your appointment on ${new Date(updatedAppointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(updatedAppointment.startTime)} has been ${updateData.status}.`,
          'appointment',
          { relatedId: parseInt(id) }
        );

        // Notify therapist
        await notificationController.createNotification(
          updatedAppointment.therapistId,
          'Appointment Status Updated',
          `The appointment with ${updatedAppointment.patientName} on ${new Date(updatedAppointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(updatedAppointment.startTime)} has been ${updateData.status}.`,
          'appointment',
          { relatedId: parseInt(id) }
        );
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
        // Continue without failing the update if notifications fail
      }
    }

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update appointment' 
    });
  }
}

// Delete appointment (admin)
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if appointment exists
    const existingAppointment = await getRow(`
      SELECT * FROM appointments 
      WHERE id = ?
    `, [parseInt(id)]);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Delete appointment
    await runQuery('DELETE FROM appointments WHERE id = ?', [parseInt(id)]);

    res.json({
      success: true,
      message: 'Appointment deleted successfully',
      data: existingAppointment
    });

  } catch (error) {
    console.error('Delete appointment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete appointment' });
  }
};

// Get reports data (admin)
const getReports = async (req, res) => {
  try {
    // Get basic statistics
    const totalUsers = await getRow('SELECT COUNT(*) as count FROM users');
    const totalPatients = await getRow('SELECT COUNT(*) as count FROM patients');
    const totalTherapists = await getRow('SELECT COUNT(*) as count FROM therapists');
    const totalAppointments = await getRow('SELECT COUNT(*) as count FROM appointments');
    
    // Get appointment statistics by status
    const appointmentStats = await getAll(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status
    `);
    
    // Get appointment statistics by type
    const appointmentTypes = await getAll(`
      SELECT type, COUNT(*) as count 
      FROM appointments 
      GROUP BY type
    `);
    
    // Get monthly appointment trends (last 12 months for better coverage)
    const monthlyTrends = await getAll(`
      SELECT 
        DATE_FORMAT(appointmentDate, '%Y-%m') as month,
        COUNT(*) as count
      FROM appointments 
      WHERE appointmentDate >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(appointmentDate, '%Y-%m')
      ORDER BY month
    `);
    
    // Get user registration trends with role breakdown (last 12 months)
    const userTrends = await getAll(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        role,
        COUNT(*) as count
      FROM users 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), role
      ORDER BY month, role
    `);
    
    // Get assessment trends (last 12 months)
    const assessmentTrends = await getAll(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as count
      FROM assessments 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month
    `);
    
    // Get daily trends for recent periods (last 30 days)
    const dailyTrends = await getAll(`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-%d') as date,
        'appointment' as type,
        COUNT(*) as count
      FROM appointments 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
      UNION ALL
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m-%d') as date,
        'user' as type,
        COUNT(*) as count
      FROM users 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m-%d')
      ORDER BY date, type
    `);
    
    // Get recent activity (last 30 days)
    const recentActivity = await getAll(`
      SELECT 
        'appointment' as type,
        COUNT(*) as count,
        'Appointments scheduled' as description
      FROM appointments 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      UNION ALL
      SELECT 
        'user' as type,
        COUNT(*) as count,
        'New users registered' as description
      FROM users 
      WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    res.json({
      success: true,
      data: {
        summary: {
          totalUsers: totalUsers.count,
          totalPatients: totalPatients.count,
          totalTherapists: totalTherapists.count,
          totalAppointments: totalAppointments.count
        },
        appointmentStats: appointmentStats,
        appointmentTypes: appointmentTypes,
        monthlyTrends: monthlyTrends,
        userTrends: userTrends,
        assessmentTrends: assessmentTrends,
        dailyTrends: dailyTrends,
        recentActivity: recentActivity
      }
    });

  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports data'
    });
  }
};

// Add additional therapist to patient
const addTherapistToPatient = async (req, res) => {
  try {
    const { patientId, therapistId, assignmentType = 'secondary', notes = '' } = req.body;
    const assignedBy = req.user.id;

    if (!patientId || !therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, therapistId'
      });
    }

    // Check if patient exists
    const patientSql = `SELECT p.id, p.userId, CONCAT(u.firstName, ' ', u.lastName) as patientName FROM patients p JOIN users u ON p.userId = u.id WHERE p.id = ?`;
    const patient = await getRow(patientSql, [parseInt(patientId)]);
    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Check if therapist exists and is available
    const therapistSql = `SELECT t.userId, t.maxPatients, t.isAcceptingPatients, CONCAT(u.firstName, ' ', u.lastName) as therapistName, (SELECT COUNT(*) FROM patient_therapist_assignments pta WHERE pta.therapistId = t.userId AND pta.status = 'active') as currentPatientCount FROM therapists t JOIN users u ON t.userId = u.id WHERE t.userId = ?`;
    const therapist = await getRow(therapistSql, [parseInt(therapistId)]);
    if (!therapist) {
      return res.status(404).json({
        success: false,
        error: 'Therapist not found'
      });
    }

    if (!therapist.isAcceptingPatients) {
      return res.status(400).json({
        success: false,
        error: 'Therapist is not currently accepting new patients'
      });
    }

    const currentCount = therapist.currentPatientCount || 0;
    const maxPatients = therapist.maxPatients || 20;
    if (currentCount >= maxPatients) {
      return res.status(400).json({
        success: false,
        error: `Therapist has reached maximum patient capacity (${maxPatients} patients)`
      });
    }

    // Check if patient already has a primary therapist (only if trying to assign as primary)
    if (assignmentType === 'primary') {
      const existingPrimaryTherapist = await getRow(
        'SELECT pta.id, CONCAT(u.firstName, " ", u.lastName) as therapistName FROM patient_therapist_assignments pta JOIN users u ON pta.therapistId = u.id WHERE pta.patientId = ? AND pta.assignmentType = "primary" AND pta.status = "active"',
        [parseInt(patientId)]
      );

      if (existingPrimaryTherapist) {
        return res.status(400).json({
          success: false,
          error: `Patient already has a primary therapist (${existingPrimaryTherapist.therapistName}). Only one primary therapist is allowed per patient.`
        });
      }
    }

    // Check if assignment already exists
    const existingAssignment = await getRow(
      'SELECT id FROM patient_therapist_assignments WHERE patientId = ? AND therapistId = ? AND status = "active"',
      [parseInt(patientId), parseInt(therapistId)]
    );

    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: 'Therapist is already assigned to this patient'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create new assignment
      await connection.execute(
        'INSERT INTO patient_therapist_assignments (patientId, therapistId, assignmentType, assignedBy, notes, status) VALUES (?, ?, ?, ?, ?, "active")',
        [parseInt(patientId), parseInt(therapistId), assignmentType, assignedBy, notes]
      );

      // Create notifications
      const notificationController = require('./notificationController');
      
      // Notify new therapist
      await notificationController.createNotification(
        parseInt(therapistId),
        'New Patient Assignment',
        `You have been assigned as ${assignmentType} therapist to patient: ${patient.patientName}`,
        'patient_assignment',
        { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
      );

      // Notify patient
      await notificationController.createNotification(
        patient.userId,
        'Additional Therapist Assigned',
        `A new ${assignmentType} therapist has been assigned to you: ${therapist.therapistName}`,
        'therapist_assignment',
        { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
      );

      // Notify existing therapists
      const existingTherapists = await getAll(
        'SELECT DISTINCT therapistId FROM patient_therapist_assignments WHERE patientId = ? AND therapistId != ? AND status = "active"',
        [parseInt(patientId), parseInt(therapistId)]
      );

      for (const existingTherapist of existingTherapists) {
        await notificationController.createNotification(
          existingTherapist.therapistId,
          'Additional Therapist Added',
          `A new ${assignmentType} therapist has been added to your shared patient: ${patient.patientName}`,
          'therapist_collaboration',
          { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Additional therapist assigned to patient successfully',
        data: {
          patientId: parseInt(patientId),
          patientName: patient.patientName,
          therapistId: parseInt(therapistId),
          therapistName: therapist.therapistName,
          assignmentType,
          currentPatientCount: currentCount + 1,
          maxPatients
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Add therapist to patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign additional therapist to patient'
    });
  }
};

// Remove therapist from patient
const removeTherapistFromPatient = async (req, res) => {
  try {
    const { patientId, therapistId } = req.params;
    const { reason = 'No reason provided' } = req.body;

    if (!patientId || !therapistId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, therapistId'
      });
    }

    // Check if assignment exists
    const assignmentSql = `
      SELECT pta.id, pta.assignmentType, pta.patientId, pta.therapistId,
             CONCAT(u1.firstName, ' ', u1.lastName) as patientName,
             CONCAT(u2.firstName, ' ', u2.lastName) as therapistName
      FROM patient_therapist_assignments pta
      JOIN patients p ON pta.patientId = p.id
      JOIN users u1 ON p.userId = u1.id
      JOIN users u2 ON pta.therapistId = u2.id
      WHERE pta.patientId = ? AND pta.therapistId = ? AND pta.status = 'active'
    `;
    const assignment = await getRow(assignmentSql, [parseInt(patientId), parseInt(therapistId)]);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Therapist assignment not found'
      });
    }

    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Delete the assignment record entirely instead of marking as inactive
      // This avoids unique constraint issues
      await connection.execute(
        'DELETE FROM patient_therapist_assignments WHERE id = ?',
        [assignment.id]
      );

      // Create notifications
      const notificationController = require('./notificationController');
      
      // Notify removed therapist
      await notificationController.createNotification(
        parseInt(therapistId),
        'Patient Assignment Removed',
        `You have been removed as ${assignment.assignmentType} therapist from patient: ${assignment.patientName}. Reason: ${reason}`,
        'assignment_removed',
        { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
      );

      // Notify patient
      const patient = await getRow('SELECT userId FROM patients WHERE id = ?', [parseInt(patientId)]);
      if (patient) {
        await notificationController.createNotification(
          patient.userId,
          'Therapist Removed',
          `Your ${assignment.assignmentType} therapist ${assignment.therapistName} has been removed. Reason: ${reason}`,
          'therapist_removed',
          { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
        );
      }

      // Notify remaining therapists
      const remainingTherapists = await getAll(
        'SELECT DISTINCT therapistId FROM patient_therapist_assignments WHERE patientId = ? AND therapistId != ? AND status = "active"',
        [parseInt(patientId), parseInt(therapistId)]
      );

      for (const remainingTherapist of remainingTherapists) {
        await notificationController.createNotification(
          remainingTherapist.therapistId,
          'Therapist Removed from Shared Patient',
          `Therapist ${assignment.therapistName} has been removed from your shared patient: ${assignment.patientName}`,
          'therapist_collaboration',
          { patientId: parseInt(patientId), therapistId: parseInt(therapistId) }
        );
      }

      await connection.commit();

      res.json({
        success: true,
        message: 'Therapist removed from patient successfully',
        data: {
          patientId: parseInt(patientId),
          patientName: assignment.patientName,
          therapistId: parseInt(therapistId),
          therapistName: assignment.therapistName,
          assignmentType: assignment.assignmentType
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Remove therapist from patient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove therapist from patient'
    });
  }
};

// Get patient's assigned therapists
const getPatientTherapists = async (req, res) => {
  try {
    const { patientId } = req.params;

    const sql = `
      SELECT 
        pta.id,
        pta.assignmentType,
        pta.assignedAt,
        pta.status,
        pta.notes,
        u.id as therapistId,
        u.firstName,
        u.lastName,
        u.email,
        t.specialization,
        t.yearsOfExperience,
        CONCAT(u.firstName, ' ', u.lastName) as therapistName
      FROM patient_therapist_assignments pta
      JOIN users u ON pta.therapistId = u.id
      LEFT JOIN therapists t ON u.id = t.userId
      WHERE pta.patientId = ? AND pta.status = 'active'
      ORDER BY pta.assignmentType, pta.assignedAt
    `;

    const therapists = await getAll(sql, [parseInt(patientId)]);

    res.json({
      success: true,
      data: {
        therapists: therapists.map(therapist => ({
          id: therapist.id,
          therapistId: therapist.therapistId,
          name: therapist.therapistName,
          email: therapist.email,
          specialization: therapist.specialization,
          yearsOfExperience: therapist.yearsOfExperience,
          assignmentType: therapist.assignmentType,
          assignedAt: therapist.assignedAt,
          status: therapist.status,
          notes: therapist.notes
        })),
        total: therapists.length
      }
    });

  } catch (error) {
    console.error('Get patient therapists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patient therapists'
    });
  }
};

// Get patients with their therapist assignments for admin scheduling
// OPTIMIZED: Single query with JSON_ARRAYAGG instead of N+1 queries
const getPatientsWithAssignments = async (req, res) => {
  try {
    const sql = `
      SELECT 
        p.id,
        p.userId,
        p.diagnosis,
        p.medicalHistory,
        p.goals,
        p.therapistId as primaryTherapistId,
        p.status,
        p.createdAt,
        p.updatedAt,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.dateOfBirth,
        u.gender,
        u.address,
        u.city,
        u.state,
        u.zipCode,
        u.country,
        (SELECT CONCAT(u_primary.firstName, ' ', u_primary.lastName) 
         FROM users u_primary 
         WHERE u_primary.id = p.therapistId) as primaryTherapistName,
        
        -- Use JSON_ARRAYAGG to get all assigned therapists in a single JSON array
        JSON_ARRAYAGG(
          -- Only add to the array if an assignment exists
          IF(
            pta.id IS NOT NULL,
            JSON_OBJECT(
              'id', pta.id,
              'assignmentType', pta.assignmentType,
              'assignedAt', pta.assignedAt,
              'assignmentStatus', pta.status,
              'notes', pta.notes,
              'therapistId', tu.id,
              'firstName', tu.firstName,
              'lastName', tu.lastName,
              'email', tu.email,
              'specialization', t.specialization,
              'yearsOfExperience', t.yearsOfExperience,
              'therapistName', CONCAT(tu.firstName, ' ', tu.lastName)
            ),
            NULL
          )
        ) AS therapistAssignments
        
      FROM patients p
      JOIN users u ON p.userId = u.id
      
      -- LEFT JOIN to include patients with NO therapists
      LEFT JOIN patient_therapist_assignments pta ON p.id = pta.patientId AND pta.status = 'active'
      LEFT JOIN users tu ON pta.therapistId = tu.id
      LEFT JOIN therapists t ON tu.id = t.userId

      WHERE u.role = 'patient'
      
      -- Group by the patient to aggregate therapist assignments
      GROUP BY p.id, u.id
      
      ORDER BY u.firstName, u.lastName
    `;

    const patients = await getAll(sql);

    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Format patient data and decrypt sensitive fields
    const formattedPatients = patients.map(patient => {
      
      // The therapistAssignments column is a JSON string, parse it.
      // Filter out any NULL values that result from patients with no assignments.
      let assignments = [];
      if (patient.therapistAssignments) {
          try {
              // Check if it's a string (from JSON_ARRAYAGG) or already an array
              const parsed = typeof patient.therapistAssignments === 'string' 
                  ? JSON.parse(patient.therapistAssignments) 
                  : patient.therapistAssignments;
              
              assignments = (parsed || []).filter(Boolean); // Filter out any [null] entries
              
              // Decrypt therapist emails in assignments
              assignments = assignments.map(assignment => {
                if (assignment.email) {
                  assignment.email = decryptField(assignment.email);
                }
                return assignment;
              });
          } catch (e) {
              console.error("Failed to parse therapistAssignments JSON:", e);
              assignments = [];
          }
      }

      // Add the (legacy) primary therapist to the list if they aren't already there
      if (patient.primaryTherapistId && !assignments.some(a => a.therapistId === patient.primaryTherapistId)) {
        assignments.unshift({
          id: `primary-${patient.id}`,
          assignmentType: 'primary',
          assignedAt: patient.createdAt,
          assignmentStatus: 'active',
          notes: 'Primary therapist',
          therapistId: patient.primaryTherapistId,
          therapistName: patient.primaryTherapistName || 'Primary Therapist'
        });
      }

      return {
        id: patient.id,
        userId: patient.userId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: decryptField(patient.email),
        phone: decryptField(patient.phone),
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        address: decryptField(patient.address),
        city: patient.city,
        state: patient.state,
        zipCode: patient.zipCode,
        country: patient.country,
        diagnosis: patient.diagnosis,
        medicalHistory: patient.medicalHistory,
        goals: patient.goals,
        status: patient.status,
        primaryTherapistId: patient.primaryTherapistId,
        primaryTherapistName: patient.primaryTherapistName,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        therapistAssignments: assignments
      };
    });

    res.json({
      success: true,
      data: {
        patients: formattedPatients,
        total: formattedPatients.length
      }
    });

  } catch (error) {
    console.error('Get patients with assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch patients with assignments'
    });
  }
};

// Create user (admin only)
const createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      dateOfBirth,
      gender,
      address,
      city,
      state,
      zipCode,
      // Role-specific data
      therapist,
      patient
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, password, role'
      });
    }

    // Validate role
    const validRoles = ['admin', 'therapist', 'patient'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: admin, therapist, patient'
      });
    }

    // Check if user with email already exists (handle encrypted emails)
    const { decryptField } = require('../utils/encryption');
    const allUsers = await getAll('SELECT id, email FROM users');
    const existingUser = allUsers.find(u => {
      try {
        const decryptedEmail = decryptField(u.email);
        return decryptedEmail && decryptedEmail.toLowerCase() === email.toLowerCase();
      } catch (error) {
        return u.email && u.email.toLowerCase() === email.toLowerCase();
      }
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash the password
    const { hashPassword } = require('../utils/password');
    const hashedPassword = await hashPassword(password);

    // Encrypt sensitive fields before storing
    const { encryptField } = require('../utils/encryption');
    const encryptedEmail = encryptField(email);
    const encryptedPhone = phone ? encryptField(phone) : null;
    const encryptedAddress = address ? encryptField(address) : null;

    // Start transaction
    const connection = await getConnection();
    await connection.beginTransaction();

    try {
      // Create user
      const createUserSql = `
        INSERT INTO users (email, password, role, firstName, lastName, phone, dateOfBirth, gender, address, city, state, zipCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const userParams = [
        encryptedEmail,
        hashedPassword,
        role,
        firstName,
        lastName,
        encryptedPhone,
        dateOfBirth || null,
        gender || null,
        encryptedAddress,
        city || null,
        state || null,
        zipCode || null
      ];

      const userResult = await connection.execute(createUserSql, userParams);
      const userId = userResult[0].insertId;

      let roleData = {};

      // Create role-specific record
      if (role === 'therapist' && therapist) {
        const createTherapistSql = `
          INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education, certifications, availability, maxPatients, isAcceptingPatients)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const therapistParams = [
          userId,
          therapist.licenseNumber || null,
          therapist.specialization || null,
          therapist.yearsOfExperience ? parseInt(therapist.yearsOfExperience) : null,
          therapist.education || null,
          therapist.certifications || null,
          therapist.availability || null,
          therapist.maxPatients || 20,
          therapist.isAcceptingPatients !== undefined ? therapist.isAcceptingPatients : true
        ];

        const therapistResult = await connection.execute(createTherapistSql, therapistParams);
        const therapistId = therapistResult[0].insertId;

        // Get created therapist data
        const getTherapistSql = `
          SELECT 
            t.id,
            t.licenseNumber,
            t.specialization,
            t.yearsOfExperience,
            t.education,
            t.certifications,
            t.availability,
            t.maxPatients,
            t.isAcceptingPatients
          FROM therapists t
          WHERE t.id = ?
        `;

        roleData = await getRow(getTherapistSql, [therapistId]);

      } else if (role === 'patient' && patient) {
        const createPatientSql = `
          INSERT INTO patients (userId, diagnosis, medicalHistory, goals, emergencyContact, insuranceInfo)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        const patientParams = [
          userId,
          patient.diagnosis || null,
          patient.medicalHistory || null,
          patient.goals || null,
          patient.emergencyContact || null,
          patient.insuranceInfo || null
        ];

        const patientResult = await connection.execute(createPatientSql, patientParams);
        const patientId = patientResult[0].insertId;

        // Get created patient data
        const getPatientSql = `
          SELECT 
            p.id,
            p.diagnosis,
            p.medicalHistory,
            p.goals,
            p.emergencyContact,
            p.insuranceInfo
          FROM patients p
          WHERE p.id = ?
        `;

        roleData = await getRow(getPatientSql, [patientId]);
      }

      // Commit transaction
      await connection.commit();

      // Get created user
      const getUserSql = `
        SELECT 
          u.id,
          u.email,
          u.role,
          u.firstName,
          u.lastName,
          u.phone,
          u.dateOfBirth,
          u.gender,
          u.address,
          u.city,
          u.state,
          u.zipCode,
          u.createdAt,
          u.updatedAt
        FROM users u
        WHERE u.id = ?
      `;

      const newUser = await getRow(getUserSql, [userId]);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: { ...newUser, ...roleData },
          password: password // Return the plain password for admin to share with user
        }
      });

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Create user error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create user',
      details: error.message 
    });
  }
};

// Approve appointment
const approveAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const adminId = req.user.id;

    // Get appointment details - also get creator role to determine approval requirements
    const appointment = await getRow(`
      SELECT 
        a.*, 
        p.userId as patientUserId, 
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        creator.role as creatorRole
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN users creator ON a.createdBy = creator.id
      WHERE a.id = ? AND a.approvalStatus = 'pending'
    `, [appointmentId]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or already processed'
      });
    }

    // Determine approval requirements based on who created the appointment
    // Patient-created: needs both therapist AND admin approval
    // Therapist-created: needs only admin approval
    const isPatientCreated = appointment.creatorRole === 'patient' || !appointment.createdBy;
    const isTherapistCreated = appointment.creatorRole === 'therapist';

    // Set admin approval
    let updateSql;
    let updateParams;

    if (isPatientCreated) {
      // Patient-created: Set adminApprovedBy, check if therapist also approved
      updateSql = `
        UPDATE appointments 
        SET status = 'scheduled',
            adminApprovedBy = ?,
            approvedBy = ?,
            approvedAt = CASE 
              WHEN therapistApprovedBy IS NOT NULL THEN NOW()
              ELSE approvedAt
            END,
            approvalStatus = CASE 
              WHEN therapistApprovedBy IS NOT NULL THEN 'approved'
              ELSE 'pending'
            END
        WHERE id = ?
      `;
      updateParams = [adminId, adminId, appointmentId];
    } else if (isTherapistCreated) {
      // Therapist-created: Only needs admin approval, so approve immediately
      updateSql = `
        UPDATE appointments 
        SET status = 'scheduled',
            adminApprovedBy = ?,
            approvalStatus = 'approved',
            approvedBy = ?,
            approvedAt = NOW()
        WHERE id = ?
      `;
      updateParams = [adminId, adminId, appointmentId];
    } else {
      // Admin-created or unknown: Should not happen in this flow, but handle gracefully
      updateSql = `
        UPDATE appointments 
        SET status = 'scheduled',
            adminApprovedBy = ?,
            approvalStatus = 'approved',
            approvedBy = ?,
            approvedAt = NOW()
        WHERE id = ?
      `;
      updateParams = [adminId, adminId, appointmentId];
    }

    await runQuery(updateSql, updateParams);

    // Get updated appointment to check if it's fully approved
    // Include therapistApprovedBy and adminApprovedBy to verify both approvals for patient-created appointments
    const updatedAppointment = await getRow(`
      SELECT 
        a.*,
        a.therapistApprovedBy,
        a.adminApprovedBy,
        p.userId as patientUserId,
        CONCAT(u.firstName, ' ', u.lastName) as patientName,
        creator.role as creatorRole
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      LEFT JOIN users creator ON a.createdBy = creator.id
      WHERE a.id = ?
    `, [appointmentId]);

    // Create notifications
    const notificationController = require('./notificationController');
    
    // Import decryption utility
    const { decryptField } = require('../utils/encryption');
    
    // Only send SMS when appointment is fully approved (approvalStatus = 'approved')
    const isFullyApproved = updatedAppointment.approvalStatus === 'approved';
    
    if (isFullyApproved) {
      // Appointment is fully approved - send "appointment scheduled" SMS
      
      // Get therapist info
      const therapistInfo = await getRow(`
        SELECT CONCAT(firstName, ' ', lastName) as therapistName, phone as therapistPhone
        FROM users WHERE id = ?
      `, [updatedAppointment.therapistId]);
      
      // Get patient info
      const patientUser = await getRow(`
        SELECT email, phone, firstName
        FROM users
        WHERE id = ?
      `, [updatedAppointment.patientUserId]);
      
      const decryptedPatientPhone = patientUser && patientUser.phone ? decryptField(patientUser.phone) : null;
      const decryptedTherapistPhone = therapistInfo && therapistInfo.therapistPhone ? decryptField(therapistInfo.therapistPhone) : null;
      
      const appointmentDate = new Date(updatedAppointment.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = new Date(`2000-01-01T${updatedAppointment.startTime}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      // Determine who should receive SMS based on who created the appointment
      if (updatedAppointment.creatorRole === 'therapist') {
        // Therapist-created: Send SMS only to patient when admin approves
        // Therapist who created the appointment should NOT receive SMS (they already know about it)
        // Patient SMS
        if (decryptedPatientPhone) {
          const patientMessage = `Your ${updatedAppointment.type} appointment with ${therapistInfo.therapistName} has been scheduled for ${formattedDate} at ${formattedTime}. You'll receive a reminder the day before. TherapEase Team`;
          await notificationController.createNotification(
            updatedAppointment.patientUserId,
            'Appointment Scheduled',
            patientMessage,
            'appointment',
            { 
              relatedId: appointmentId,
              sendSMS: true,
              phoneNumber: decryptedPatientPhone
            }
          );
        }
        
        // Therapist notification (in-app only, no SMS)
        await notificationController.createNotification(
          updatedAppointment.therapistId,
          'Appointment Scheduled',
          `Your ${updatedAppointment.type} appointment with ${updatedAppointment.patientName} has been scheduled for ${formattedDate} at ${formattedTime}.`,
          'appointment',
          { 
            relatedId: appointmentId,
            sendSMS: false, // No SMS - therapist created it
            sendEmail: true,
            sendPush: true
          }
        );
      } else if (updatedAppointment.creatorRole === 'patient' || !updatedAppointment.createdBy) {
        // Patient-created: Only send SMS to patient when BOTH therapist and admin approve
        // Explicitly verify both approvals are present before sending SMS
        if (updatedAppointment.therapistApprovedBy && updatedAppointment.adminApprovedBy && decryptedPatientPhone) {
          const patientMessage = `Your ${updatedAppointment.type} appointment with ${therapistInfo.therapistName} has been scheduled for ${formattedDate} at ${formattedTime}. You'll receive a reminder the day before. TherapEase Team`;
          await notificationController.createNotification(
            updatedAppointment.patientUserId,
            'Appointment Scheduled',
            patientMessage,
            'appointment',
            { 
              relatedId: appointmentId,
              sendSMS: true,
              phoneNumber: decryptedPatientPhone
            }
          );
        }
        // If either approval is missing, no SMS is sent (appointment remains pending)
      }
      // Admin-created appointments: SMS will be sent when therapist approves (handled in appointmentController)
    } else {
      // Appointment is still pending - send in-app notification only (no SMS)
      await notificationController.createNotification(
        updatedAppointment.patientUserId,
        'Appointment Approval Update',
        `Your appointment on ${new Date(updatedAppointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(updatedAppointment.startTime)} is pending approval.`,
        'appointment',
        { 
          relatedId: appointmentId,
          sendSMS: false,
          sendEmail: true,
          sendPush: true
        }
      );
    }

    res.json({
      success: true,
      message: 'Appointment approved successfully'
    });

  } catch (error) {
    console.error('Approve appointment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve appointment' 
    });
  }
};

// Reject appointment
const rejectAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    // Get appointment details
    const appointment = await getRow(`
      SELECT a.*, p.userId as patientUserId, CONCAT(u.firstName, ' ', u.lastName) as patientName
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users u ON p.userId = u.id
      WHERE a.id = ? AND a.approvalStatus = 'pending'
    `, [appointmentId]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or already processed'
      });
    }

    // Update appointment status
    await runQuery(`
      UPDATE appointments 
      SET status = 'cancelled', 
          approvalStatus = 'rejected', 
          approvedBy = ?, 
          approvedAt = NOW(),
          notes = CONCAT(COALESCE(notes, ''), '\nRejection reason: ', ?)
      WHERE id = ?
    `, [adminId, reason || 'No reason provided', appointmentId]);

    // Create notifications
    const notificationController = require('./notificationController');
    
    // Notify patient
    await notificationController.createNotification(
      appointment.patientUserId,
      'Appointment Rejected',
      `Your appointment request for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(appointment.startTime)} has been rejected. Reason: ${reason || 'No reason provided'}`,
      'appointment',
      { relatedId: appointmentId }
    );

    // Notify therapist
    await notificationController.createNotification(
      appointment.therapistId,
      'Appointment Rejected',
      `The appointment request with ${appointment.patientName} for ${new Date(appointment.appointmentDate).toLocaleDateString()} at ${formatTime12Hour(appointment.startTime)} has been rejected.`,
      'appointment',
      { relatedId: appointmentId }
    );

    res.json({
      success: true,
      message: 'Appointment rejected successfully'
    });

  } catch (error) {
    console.error('Reject appointment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reject appointment' 
    });
  }
};

// Get pending appointments for approval
const getPendingAppointments = async (req, res) => {
  try {
    const appointments = await getAll(`
      SELECT 
        a.id,
        a.patientId,
        a.therapistId,
        a.appointmentDate,
        a.startTime,
        a.endTime,
        a.duration,
        a.type,
        a.reason,
        a.notes,
        a.createdAt,
        CONCAT(pu.firstName, ' ', pu.lastName) as patientName,
        pu.phone as patientPhone,
        CONCAT(tu.firstName, ' ', tu.lastName) as therapistName,
        tu.phone as therapistPhone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
      JOIN users pu ON p.userId = pu.id
      JOIN users tu ON a.therapistId = tu.id
      WHERE a.approvalStatus = 'pending'
      ORDER BY a.createdAt ASC
    `);

    res.json({
      success: true,
      data: appointments
    });

  } catch (error) {
    console.error('Get pending appointments error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending appointments' 
    });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSystemStats,
  getDailyTrends,
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getReports,
  getPatientAssessments,
  getPatientSessions,
  getPatientProgress,
  getTherapists,
  resetUserPassword,
  sendPasswordResetLink,
  updateUserStatus,
  getAvailableTherapists,
  getTherapistWorkingHours,
  assignTherapistToPatient,
  unassignTherapistFromPatient,
  updateTherapistAvailability,
  addTherapistToPatient,
  removeTherapistFromPatient,
  getPatientTherapists,
  getPatientsWithAssignments,
  approveAppointment,
  rejectAppointment,
  getPendingAppointments,
  getPendingTherapists,
  approvePendingTherapist,
  rejectPendingTherapist
};
