import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useRealtimeData } from '../../hooks/useWebSocket';
import InitialsAvatar from '../../components/InitialsAvatar';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  Bell, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  TrendingUp,
  Clock,
  MapPin,
  FileText,
  X,
  BarChart3,
  Target,
  User,
  CheckCircle
} from 'lucide-react';
import { UltraModernCalendar } from '../../components';
import { adminAPI } from '../../services/api';
import './AdminDashboard.css';
import '../../layouts/Layouts.css';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Utility function to convert 24-hour time to 12-hour format
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      return time24; // Return original if parsing fails
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Recent Activity handlers
  const handleNotificationClick = (notification) => {
    // Navigate based on notification type
    switch (notification.type) {
      case 'appointment':
        navigate('/admin/appointments');
        break;
      case 'therapist':
        navigate('/admin/therapists');
        break;
      case 'patient':
        navigate('/admin/patients');
        break;
      default:
        navigate('/admin/notifications');
    }
  };

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery(
    'adminDashboard',
    adminAPI.getDashboard,
    {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 3,
      onError: (error) => {
        console.error('Error fetching dashboard data:', error);
      },
      onSuccess: (data) => {
        // Dashboard data loaded successfully
      }
    }
  );

  // Enable real-time updates for admin dashboard
  useRealtimeData('adminDashboard', refetchDashboard);

  // Fetch patients data from API
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'adminPatients',
    adminAPI.getPatients,
    {
      onError: (error) => {
        console.error('Error fetching patients data:', error);
      }
    }
  );

  // Fetch therapists data from API
  const { data: therapistsData, isLoading: therapistsLoading, error: therapistsError } = useQuery(
    'adminTherapists',
    adminAPI.getTherapists,
    {
      onError: (error) => {
        console.error('Error fetching therapists data:', error);
      }
    }
  );

  // Fetch notifications data from API
  const { data: notificationsData, isLoading: notificationsLoading, error: notificationsError } = useQuery(
    'adminNotificationsDashboard',
    adminAPI.getNotifications,
    {
      staleTime: 300000, // 5 minutes - match header query
      cacheTime: 600000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchInterval: false, // Disable automatic refetching
      retry: 3,
      onError: (error) => {
        console.error('Error fetching notifications:', error);
      }
    }
  );

  // Fetch appointments data from API
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError } = useQuery(
    'adminAppointments',
    adminAPI.getAppointments,
    {
      onError: (error) => {
        console.error('Error fetching appointments data:', error);
      }
    }
  );

  // Extract data from API responses
  // The API returns {success: true, data: {stats: {...}}}
  // But Axios wraps it in {data: {success: true, data: {stats: {...}}}}
  const correctStats = dashboardData?.data?.data?.stats || dashboardData?.data?.stats || {};
  
  const dashboardStats = {
    totalPatients: correctStats.totalPatients || 0,
    totalTherapists: correctStats.totalTherapists || 0,
    totalAdmins: correctStats.totalAdmins || 0,
    totalAssessments: correctStats.totalAssessments || 0,
    totalAppointments: correctStats.totalAppointments || 0,
    totalDailyNotes: correctStats.totalDailyNotes || 0,
    totalProgressEntries: correctStats.totalProgressEntries || 0
  };
  


  const patients = (patientsData?.data?.users || [])
    .filter(user => user.role === 'patient')
    .map(patient => ({
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      gender: patient.gender || 'N/A',
      dateOfBirth: patient.dateOfBirth,
      age: patient.dateOfBirth ? 
        new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() + ' years old' : 'N/A',
      therapist: patient.therapistName || 'Unassigned',
      status: patient.patient?.status || 'active',
      lastSession: patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : 'N/A',
      progress: patient.patient?.progress || 0,
    }));

  const therapists = (therapistsData?.data?.users || [])
    .filter(user => user.role === 'therapist')
    .map(therapist => ({
      id: therapist.id,
      name: `${therapist.firstName} ${therapist.lastName}`,
      specialization: therapist.therapist?.specialization || 'Pediatric OT',
      licenseNumber: therapist.therapist?.licenseNumber || 'N/A',
      experience: therapist.therapist?.yearsOfExperience ? `${therapist.therapist.yearsOfExperience} years` : 'N/A',
      status: 'active',
      patientsCount: therapist.patientCount || 0,
    }));

  // Extract notifications from API response and map to expected format
  const notifications = (notificationsData?.data?.notifications || []).map(notification => ({
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    date: notification.date,
    time: notification.time,
    timeAgo: notification.timeAgo,
    priority: notification.priority || 'medium',
    read: notification.read
  }));

  // Generate real data for charts based on API data
  const generatePatientGrowthData = () => {
    // Use actual user growth data from API if available
    const userGrowth = dashboardData?.data?.data?.userGrowth || dashboardData?.data?.userGrowth || [];
    
    
    if (userGrowth.length > 0) {
      // Process user growth data to show patient growth over time
      const patientGrowth = userGrowth
        .filter(item => item.role === 'patient')
        .reduce((acc, item) => {
          const existing = acc.find(month => month.month === item.month);
          if (existing) {
            existing.patients += item.count;
          } else {
            acc.push({
              month: item.month,
              patients: item.count
            });
          }
          return acc;
        }, [])
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => ({
          month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
          patients: item.patients
        }));
      
      return patientGrowth;
    }
    
    // Fallback to calculated data if API data not available
    const currentMonth = new Date().getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const totalPatients = dashboardStats.totalPatients || 0;
    
    // Generate realistic growth data based on current patient count
    const data = [];
    
    for (let i = 0; i < 6; i++) {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      const growthFactor = 0.7 + (i * 0.1); // Gradual growth
      const patients = Math.max(0, Math.floor(totalPatients * growthFactor));
      
      data.push({
        month: months[monthIndex],
        patients: patients
      });
    }
    
    return data;
  };

  const generateAppointmentData = () => {
    // Use actual appointment stats from API if available
    const appointmentStats = dashboardData?.data?.data?.appointmentStats || dashboardData?.data?.appointmentStats || [];
    
    
    if (appointmentStats.length > 0) {
      const processedStats = appointmentStats.map(stat => ({
        status: stat.status.charAt(0).toUpperCase() + stat.status.slice(1),
        count: stat.count
      }));
      return processedStats;
    }
    
    // Fallback to calculated data if API data not available
    const totalAppointments = dashboardStats.totalAppointments || 0;
    const completed = Math.floor(totalAppointments * 0.6);
    const scheduled = Math.floor(totalAppointments * 0.3);
    const confirmed = Math.floor(totalAppointments * 0.1);
    const cancelled = Math.max(0, totalAppointments - completed - scheduled - confirmed);
    
    return [
      { status: 'Scheduled', count: scheduled },
      { status: 'Confirmed', count: confirmed },
      { status: 'Completed', count: completed },
      { status: 'Cancelled', count: cancelled }
    ];
  };


  const generateUserDistributionData = () => {
    const distributionData = [
      { name: 'Patients', value: dashboardStats.totalPatients || 0, color: '#3B82F6' },
      { name: 'Therapists', value: dashboardStats.totalTherapists || 0, color: '#10B981' },
      { name: 'Admins', value: dashboardStats.totalAdmins || 0, color: '#8B5CF6' }
    ].filter(item => item.value > 0);
    
    
    return distributionData;
  };



  // Loading state
  if (dashboardLoading || patientsLoading || therapistsLoading || appointmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboardError || patientsError || therapistsError || appointmentsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load dashboard data</div>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Generate calendar events from real appointment data
  const calendarEvents = (appointmentsData?.data?.appointments || [])
    .filter(appointment => {
      // Only show upcoming appointments (next 30 days)
      const appointmentDate = new Date(appointment.appointmentDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
      return appointmentDate >= today && appointmentDate <= thirtyDaysFromNow;
    })
    .map(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate);
      const startTime = new Date(`${appointmentDate.toISOString().split('T')[0]}T${appointment.appointmentTime}`);
      const endTime = new Date(`${appointmentDate.toISOString().split('T')[0]}T${appointment.endTime}`);
      
      return {
        title: `${appointment.therapistName} - ${appointment.patientName}`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        priority: appointment.status === 'scheduled' ? 'high' : 'medium',
        type: appointment.type,
        extendedProps: { 
          type: appointment.type, 
          therapist: appointment.therapistName, 
          patient: appointment.patientName,
          room: appointment.room || 'Room TBD',
          status: appointment.status,
          duration: appointment.duration
        }
      };
    });

  // Extract appointments from API response
  const appointments = (appointmentsData?.data?.appointments || []).map(appointment => ({
    id: appointment.id,
    patientName: appointment.patientName,
    therapistName: appointment.therapistName,
    date: new Date(appointment.appointmentDate).toLocaleDateString(),
    time: appointment.appointmentTime,
    duration: `${appointment.duration} minutes`,
    type: appointment.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    status: appointment.status,
    location: appointment.room || 'Room TBD'
  }));

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.therapist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const renderDashboard = () => (
    <div className="admin-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1>Welcome back, Admin!</h1>
            <p>Here's your practice overview and key metrics for today</p>
          </div>
          <div className="welcome-actions">
            <button className="btn-primary" onClick={() => navigate('/admin/patients')}>
              <Users size={18} />
              <span>Manage Patients</span>
            </button>
            <button className="btn-secondary" onClick={() => navigate('/admin/appointments')}>
              <Calendar size={18} />
              <span>Schedule Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon patients">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Patients</h3>
            <p className="stat-number">{dashboardStats.totalPatients || 0}</p>
            <span className="stat-change positive">
              <TrendingUp size={16} />
              +12% this month
            </span>
          </div>
        </div>
        

        <div className="stat-card">
          <div className="stat-icon therapists">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <h3>Active Therapists</h3>
            <p className="stat-number">{dashboardStats.totalTherapists || 0}</p>
            <span className="stat-change positive">
              <CheckCircle size={16} />
              All active
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon appointments">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Today's Sessions</h3>
            <p className="stat-number">
              {appointmentsData?.data?.appointments?.filter(appointment => {
                const appointmentDate = new Date(appointment.appointmentDate);
                const today = new Date();
                return appointmentDate.toDateString() === today.toDateString();
              }).length || 0}
            </p>
            <span className="stat-change neutral">
              <Clock size={16} />
              Scheduled
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon appointments">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Appointments</h3>
            <p className="stat-number">{dashboardStats.totalAppointments || 0}</p>
            <span className="stat-change positive">
              <TrendingUp size={16} />
              All time
            </span>
          </div>
        </div>

      </div>

      {/* Recent Activity Section */}
      <div className="recent-activity-section">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {notifications.slice(0, 5).map(notification => (
            <div 
              key={notification.id} 
              className={`activity-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={`activity-icon ${notification.priority}`}>
                <Bell size={16} />
              </div>
              <div className="activity-content">
                <p className="activity-title">{notification.title}</p>
                <span className="activity-time">{notification.createdAt ? (() => {
                  try {
                    const date = new Date(notification.createdAt);
                    const formattedDate = date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                    const formattedTime = date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                    return `${formattedDate} at ${formattedTime}`;
                  } catch {
                    return notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now');
                  }
                })() : (notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now'))}</span>
              </div>
              {!notification.read && <div className="unread-dot"></div>}
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="activity-item">
              <div className="activity-icon">
                <Bell size={16} />
              </div>
              <div className="activity-content">
                <p>No recent activity</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section */}
      <div className="analytics-section">
        <h3>Analytics Overview</h3>
        <div className="chart-grid">
          {/* Patient Growth Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Patient Growth</h3>
              <TrendingUp size={16} className="text-green-500" />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={generatePatientGrowthData()}>
                  <defs>
                    <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="patients" 
                    stroke="#3B82F6" 
                    fill="url(#patientGradient)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Appointment Status Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Appointments</h3>
              <Calendar size={16} className="text-blue-500" />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={generateAppointmentData()}>
                  <XAxis dataKey="status" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* User Distribution Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>User Distribution</h3>
              <Users size={16} className="text-purple-500" />
            </div>
            <div className="chart-content">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={generateUserDistributionData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {generateUserDistributionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

    </div>
  );

  const renderPatients = () => (
          <div className="patients-section">
      <div className="section-header">
        <h2>Patient Management</h2>
        <button className="btn-primary" onClick={() => navigate('/admin/patients')}>
          <Plus size={16} />
          Add Patient
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <Filter size={20} />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
              </div>
              
      <div className="patients-table">
              <table>
                <thead>
                  <tr>
              <th>Patient</th>
                    <th>Age</th>
                    <th>Therapist</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Last Session</th>
              <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
            {filteredPatients.map(patient => (
                    <tr key={patient.id}>
                <td className="patient-info">
                  <InitialsAvatar 
                    name={patient.name} 
                    size="md" 
                    className="patient-avatar" 
                  />
                  <div>
                    <p className="patient-name">{patient.name}</p>
                    <p className="patient-gender">{patient.gender}</p>
                  </div>
                      </td>
                      <td>{patient.age}</td>
                      <td>{patient.therapist}</td>
                <td>
                  <span className={`status-badge ${patient.status}`}>
                    {patient.status}
                  </span>
                </td>
                <td>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${patient.progress}%` }}
                    ></div>
                    <span>{patient.progress}%</span>
                  </div>
                </td>
                <td>{patient.lastSession}</td>
                <td className="actions">
                  <button className="action-btn" onClick={() => setSelectedPatient(patient)}>
                    <Eye size={16} />
                  </button>
                  <button className="action-btn">
                    <Edit size={16} />
                  </button>
                  <button className="action-btn danger">
                    <Trash2 size={16} />
                  </button>
                </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

  const renderTherapists = () => (
    <div className="therapists-section">
      <div className="section-header">
        <h2>Therapist Management</h2>
        <button className="btn-primary">
          <Plus size={16} />
          Add Therapist
        </button>
                  </div>

      <div className="therapists-grid">
        {therapists.map(therapist => (
          <div key={therapist.id} className="therapist-card">
            <div className="therapist-header">
              <InitialsAvatar 
                name={therapist.name} 
                size="lg" 
                className="therapist-avatar" 
              />
              <div className="therapist-info">
                <h3>{therapist.name}</h3>
                <p className="specialization">{therapist.specialization}</p>

              </div>
              <span className={`status-badge ${therapist.status}`}>
                {therapist.status}
              </span>
            </div>
            
            <div className="therapist-details">
              <div className="detail-item">
                <span className="label">License:</span>
                <span>{therapist.licenseNumber}</span>
              </div>
              <div className="detail-item">
                <span className="label">Experience:</span>
                <span>{therapist.experience}</span>
              </div>
              <div className="detail-item">
                <span className="label">Patients:</span>
                <span>{therapist.patientsCount}</span>
              </div>
            </div>

            <div className="therapist-actions">
              <button className="action-btn">
                <Eye size={16} />
                View
              </button>
              <button className="action-btn">
                <Edit size={16} />
                Edit
              </button>
              {therapist.status === 'pending' && (
                <button className="action-btn approve">
                  <UserCheck size={16} />
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
            </div>
          </div>
        );

  const renderNotifications = () => (
    <div className="notifications-section">
      <div className="section-header">
        <h2>System Notifications</h2>
        <button className="btn-secondary">
          <Bell size={16} />
          Mark All Read
        </button>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification-card ${notification.priority} ${!notification.read ? 'unread' : ''}`}>
            <div className="notification-icon">
              <Bell size={20} />
            </div>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <div className="notification-meta">
                <span className="time">{notification.createdAt ? (() => {
                  try {
                    const date = new Date(notification.createdAt);
                    const formattedDate = date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });
                    const formattedTime = date.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                    return `${formattedDate} at ${formattedTime}`;
                  } catch {
                    return notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now');
                  }
                })() : (notification.date && notification.time ? `${notification.date} at ${notification.time}` : (notification.timeAgo || 'Just now'))}</span>
                <span className={`priority-badge ${notification.priority}`}>
                  {notification.priority}
                </span>
              </div>
                </div>
            <div className="notification-actions">
              {!notification.read && (
                <button className="mark-read-btn">Mark Read</button>
              )}
              <button className="action-btn">
                <Eye size={16} />
              </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
  );

  const renderAppointments = () => (
    <div className="appointments-section">
      <div className="section-header">
        <h3>Appointments & Schedule</h3>
        <button className="btn-primary">
          <Plus size={16} />
          Schedule Appointment
        </button>
                </div>

      <div className="appointments-list">
        {appointments.map(appointment => (
          <div key={appointment.id} className="appointment-card">
            <div className="appointment-time">
              <Clock size={16} />
              <span>{formatTime12Hour(appointment.time)}</span>
                    </div>
            <div className="appointment-details">
              <h4>{appointment.patientName}</h4>
              <p className="appointment-type">{appointment.type}</p>
              <div className="appointment-meta">
                <span className="duration">{appointment.duration}</span>
                <span className="room">
                  <MapPin size={14} />
                  {appointment.room}
                </span>
              </div>
            </div>
            <div className="appointment-status">
              <span className={`status-badge ${appointment.status}`}>
                {appointment.status}
              </span>
            </div>
          </div>
        ))}
      </div>

            <div className="calendar-container">
        <h3>Monthly Schedule Overview</h3>
        <UltraModernCalendar
          events={calendarEvents}
          onEventClick={(event) => {
            // You can open a modal or navigate to event details here
          }}
          onDateClick={(date) => {
            // You can show events for that date or open add event modal
          }}
          onAddEvent={() => {
          }}
          showQuickActions={true}
          showSearch={true}
          showFilters={true}
          className="mt-6"
        />
            </div>
          </div>
        );

  return (
    <div className="admin-dashboard-content">
      {renderDashboard()}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal-content patient-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Patient Profile - Modern View</h3>
              <button className="close-btn" onClick={() => setSelectedPatient(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="patient-detail-modern">
                {/* Header Section */}
                <div className="patient-header">
                  <div className="avatar-container">
                    <InitialsAvatar 
                      name={selectedPatient.name} 
                      size="xl" 
                      className="patient-avatar-large" 
                    />
                    <div className={`status-indicator ${selectedPatient.status}`}></div>
                  </div>
                  <div className="patient-basic-info">
                    <h2 className="patient-name-large">{selectedPatient.name}</h2>
                    <p className="patient-role">{selectedPatient.gender} • {selectedPatient.age}</p>
                    <div className="patient-status-container">
                      <span className={`status-badge-large ${selectedPatient.status}`}>
                        {selectedPatient.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Information Grid */}
                <div className="profile-grid">
                  {/* Personal Information */}
                  <div className="profile-section">
                    <h3 className="section-title">
                      <User size={20} />
                      Personal Information
                    </h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Full Name</label>
                        <div className="info-value">{selectedPatient.name}</div>
                      </div>
                      <div className="info-item">
                        <label>Gender</label>
                        <div className="info-value">{selectedPatient.gender}</div>
                      </div>
                      <div className="info-item">
                        <label>Age</label>
                        <div className="info-value">{selectedPatient.age}</div>
                      </div>
                      <div className="info-item">
                        <label>Patient ID</label>
                        <div className="info-value">#{selectedPatient.id}</div>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Information */}
                  <div className="profile-section">
                    <h3 className="section-title">
                      <Target size={20} />
                      Treatment Information
                    </h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Assigned Therapist</label>
                        <div className="info-value">{selectedPatient.therapist}</div>
                      </div>
                      <div className="info-item">
                        <label>Treatment Status</label>
                        <div className="info-value">
                    <span className={`status-badge ${selectedPatient.status}`}>
                      {selectedPatient.status}
                    </span>
                </div>
              </div>
                      <div className="info-item">
                        <label>Progress</label>
                        <div className="info-value">
                          <div className="progress-container">
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{ width: `${selectedPatient.progress}%` }}
                              ></div>
                            </div>
                            <span className="progress-text">{selectedPatient.progress}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="info-item">
                        <label>Last Session</label>
                        <div className="info-value">{selectedPatient.lastSession}</div>
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="profile-section">
                    <h3 className="section-title">
                      <FileText size={20} />
                      Medical Information
                    </h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Diagnosis</label>
                        <div className="info-value">{selectedPatient.diagnosis || 'Not specified'}</div>
                      </div>
                      <div className="info-item">
                        <label>Medical History</label>
                        <div className="info-value">{selectedPatient.medicalHistory || 'No medical history provided'}</div>
                      </div>
                      <div className="info-item">
                        <label>Treatment Plan</label>
                        <div className="info-value">{selectedPatient.treatmentPlan || 'Treatment plan not specified'}</div>
                      </div>
                      <div className="info-item">
                        <label>Next Appointment</label>
                        <div className="info-value">
                          {appointmentsData?.data?.appointments?.find(appointment => 
                            appointment.patientName === selectedPatient.name && 
                            new Date(appointment.appointmentDate) > new Date()
                          )?.appointmentDate ? 
                            new Date(appointmentsData.data.appointments.find(appointment => 
                              appointment.patientName === selectedPatient.name && 
                              new Date(appointment.appointmentDate) > new Date()
                            ).appointmentDate).toLocaleDateString() : 
                            'No upcoming appointments'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracking */}
                  <div className="profile-section">
                    <h3 className="section-title">
                      <BarChart3 size={20} />
                      Progress Tracking
                    </h3>
                    <div className="progress-stats">
                      <div className="stat-card">
                        <div className="stat-value">{selectedPatient.progress}%</div>
                        <div className="stat-label">Overall Progress</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">
                          {appointmentsData?.data?.appointments?.filter(appointment => 
                            appointment.patientName === selectedPatient.name && 
                            appointment.status === 'completed'
                          ).length || 0}
                        </div>
                        <div className="stat-label">Sessions Completed</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-value">
                          {appointmentsData?.data?.appointments?.filter(appointment => 
                            appointment.patientName === selectedPatient.name && 
                            appointment.status === 'completed' &&
                            appointment.type === 'progress_review'
                          ).length || 0}
                        </div>
                        <div className="stat-label">Progress Reviews</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="patient-actions">
                  <button className="action-btn primary">
                    <Edit size={16} />
                    Edit Patient
                  </button>
                  <button className="action-btn secondary">
                    <FileText size={16} />
                    View Reports
                  </button>
                  <button className="action-btn secondary">
                    <Calendar size={16} />
                    Schedule Session
                  </button>
                  <button className="action-btn danger">
                    <Trash2 size={16} />
                    Remove Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
