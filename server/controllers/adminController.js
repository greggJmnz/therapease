const { runQuery, getRow, getAll } = require('../config/database');

// Get admin dashboard data
const getDashboard = async (req, res) => {
  try {
    // Get system statistics
    const statsSql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'therapist') as totalTherapists,
        (SELECT COUNT(*) FROM users WHERE role = 'patient') as totalPatients,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') as totalAdmins,
        (SELECT COUNT(*) FROM assessments) as totalAssessments,
        (SELECT COUNT(*) FROM appointments) as totalAppointments,
        (SELECT COUNT(*) FROM daily_notes) as totalDailyNotes,
        (SELECT COUNT(*) FROM progress_tracking) as totalProgressEntries
    `;

    const [statsResult] = await getAll(statsSql);
    const stats = statsResult;

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

    // Get system health metrics
    const systemHealthSql = `
      SELECT 
        (SELECT COUNT(*) FROM users WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newUsersThisWeek,
        (SELECT COUNT(*) FROM assessments WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newAssessmentsThisWeek,
        (SELECT COUNT(*) FROM appointments WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as newAppointmentsThisWeek
    `;

    const [systemHealthResult] = await getAll(systemHealthSql);
    const systemHealth = systemHealthResult;

    // Get user growth over time
    const userGrowthSql = `
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        role,
        COUNT(*) as count
      FROM users
      WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m'), role
      ORDER BY month, role
    `;

    const userGrowth = await getAll(userGrowthSql);

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

    const assessmentStats = await getAll(assessmentStatsSql);

    // Get appointment statistics by status
    const appointmentStatsSql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM appointments
      GROUP BY status
      ORDER BY count DESC
    `;

    const appointmentStats = await getAll(appointmentStatsSql);

    res.json({
      success: true,
      data: {
        stats,
        recentUsers,
        systemHealth,
        userGrowth,
        assessmentStats,
        appointmentStats
      }
    });

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch admin dashboard data' });
  }
};

// Get all users with pagination and filtering
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const offset = (page - 1) * limit;

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
        u.createdAt,
        u.updatedAt,
        t.licenseNumber,
        t.specialization,
        t.yearsOfExperience,
        p.diagnosis,
        p.medicalHistory,
        p.status as patientStatus
      FROM users u
      LEFT JOIN therapists t ON u.id = t.userId
      LEFT JOIN patients p ON u.id = p.userId
      ${whereClause}
      ORDER BY u.createdAt DESC
      LIMIT ? OFFSET ?
    `;

    const queryParams = [...params, parseInt(limit), offset];
    const users = await getAll(sql, queryParams);

    // Format user data
    const formattedUsers = users.map(user => {
      const formattedUser = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      // Add role-specific data
      if (user.role === 'therapist') {
        formattedUser.therapist = {
          licenseNumber: user.licenseNumber,
          specialization: user.specialization,
          yearsOfExperience: user.yearsOfExperience
        };
      } else if (user.role === 'patient') {
        formattedUser.patient = {
          diagnosis: user.diagnosis,
          medicalHistory: user.medicalHistory,
          status: user.patientStatus
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
        p.insuranceInfo
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

    // Format user data
    const formattedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
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
    const { id } = req.params;
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

      if (updateData.phone !== undefined) {
        userUpdateFields.push('phone = ?');
        userUpdateParams.push(updateData.phone);
      }

      if (updateData.dateOfBirth !== undefined) {
        userUpdateFields.push('dateOfBirth = ?');
        userUpdateParams.push(updateData.dateOfBirth);
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

      // Get updated user
      const updatedUser = await getUserById(req, res);

    } catch (error) {
      // Rollback transaction on error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await getRow('SELECT * FROM users WHERE id = ?', [parseInt(id)]);
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
    await runQuery('DELETE FROM users WHERE id = ?', [parseInt(id)]);

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
        a.notes,
        a.createdAt,
        a.updatedAt,
        p.firstName as patientFirstName,
        p.lastName as patientLastName,
        t.firstName as therapistFirstName,
        t.lastName as therapistLastName
      FROM appointments a
      LEFT JOIN patients pt ON a.patientId = pt.id
      LEFT JOIN users p ON pt.userId = p.id
      LEFT JOIN therapists th ON a.therapistId = th.id
      LEFT JOIN users t ON th.userId = t.id
      ORDER BY a.appointmentDate DESC, a.startTime DESC
    `;

    const appointments = await getAll(sql);

    // Format appointment data
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      appointmentDate: appointment.appointmentDate,
      appointmentTime: appointment.startTime,
      endTime: appointment.endTime,
      duration: appointment.duration,
      type: appointment.type,
      status: appointment.status,
      room: 'Room TBD', // Default room since it's not in the table
      notes: appointment.notes,
      patientName: `${appointment.patientFirstName || ''} ${appointment.patientLastName || ''}`.trim(),
      therapistName: `${appointment.therapistFirstName || ''} ${appointment.therapistLastName || ''}`.trim(),
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

// Get notifications for admin
const getNotifications = async (req, res) => {
  try {
    const sql = `
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.isRead,
        n.createdAt,
        u.firstName,
        u.lastName
      FROM notifications n
      LEFT JOIN users u ON n.userId = u.id
      ORDER BY n.createdAt DESC
    `;

    const notifications = await getAll(sql);

    // Format notification data
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: 'medium', // Default priority since it's not in the table
      read: notification.isRead,
      user: notification.firstName ? `${notification.firstName} ${notification.lastName}` : null,
      createdAt: notification.createdAt,
      updatedAt: notification.createdAt // Use createdAt as updatedAt since updatedAt doesn't exist
    }));

    res.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        total: formattedNotifications.length
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

module.exports = {
  getDashboard,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSystemStats,
  getAppointments,
  getNotifications
};
