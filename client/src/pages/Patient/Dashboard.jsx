import React, { useMemo, useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useNavigationState } from '../../hooks/useNavigationState';
import {
  Calendar,
  FileText,
  TrendingUp,
  Plus,
  User,
  Award,
  BarChart3,
  Bell,
  Target,
  Activity,
  CheckCircle,
  BookOpen,
  MessageSquare,
  Eye,
  Heart,
  Star,
  ArrowRight
} from 'lucide-react';
import { patientAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
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
  const { startNavigation, completeNavigation, canNavigate } = useNavigationState();

  // Note: Onboarding status check and navigation is now handled in PatientLayout

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error } = useQuery(
    'patientDashboard',
    patientAPI.getDashboard,
    {
      onError: (error) => {
        toast.error('Failed to load dashboard data');
        console.error('Error fetching dashboard:', error);
      },
      onSuccess: (data) => {
        // Dashboard data loaded successfully
      }
    }
  );

  // Get notifications for the patient
  const { notifications, stats: notificationStats } = useNotifications();

  // Process real dashboard data with useMemo
  const dashboardStats = useMemo(() => {
    if (!dashboardData?.data?.data) {
      return {
        totalAppointments: 0,
        progressEntries: 0,
        dailyNotesCount: 0,
        patientName: 'Patient',
        therapistName: 'Your Therapist',
        therapistSpecialization: 'Therapy Specialist',
        therapistExperience: 0,
        upcomingAppointments: [],
        recentProgress: [],
        diagnosis: 'No diagnosis available',
        patient: {
          goals: 'Your therapy goals will be set during your first session with your therapist.'
        }
      };
    }

    // Extract data from nested API response structure
    const data = dashboardData.data.data;
    
    return {
      totalAppointments: data.upcomingAppointments?.length || 0,
      progressEntries: data.recentProgress?.length || 0,
      dailyNotesCount: data.dailyNotesCount || 0,
      patientName: data.patient?.firstName || 'Patient',
      therapistName: data.therapist ? `${data.therapist.firstName || ''} ${data.therapist.lastName || ''}`.trim() || 'Your Therapist' : 'Your Therapist',
      therapistSpecialization: data.therapist?.specialization || 'Therapy Specialist',
      therapistExperience: data.therapist?.yearsOfExperience || 0,
      upcomingAppointments: Array.isArray(data.upcomingAppointments) ? data.upcomingAppointments : [],
      recentProgress: Array.isArray(data.recentProgress) ? data.recentProgress : [],
      diagnosis: data.patient?.diagnosis || 'No diagnosis available',
      patient: data.patient || {}
    };
  }, [dashboardData]);

  // Get recent notifications
  const recentNotifications = notifications?.slice(0, 3) || [];

  // Show loading state while fetching dashboard data
  if (isLoading) {
    return (
      <div className="patient-dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load dashboard data</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="patient-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1>Welcome back, {dashboardStats.patientName}!</h1>
            <p>Ready to continue your progress? Let's keep building on your strengths and working towards your therapy goals together.</p>
          </div>
          <div className="welcome-actions">
            <button className="btn-primary" onClick={() => window.location.href = '/patient/progress'}>
              <Target size={18} />
              <span>View Progress</span>
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/patient/appointments'}>
              <Calendar size={18} />
              <span>Schedule Session</span>
            </button>
          </div>
        </div>
      </div>


      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon appointments">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <h3>Total Sessions</h3>
            <p className="stat-number">{dashboardStats.totalAppointments}</p>
            <span className="stat-change positive">
              <CheckCircle size={12} />
              Completed
            </span>
          </div>
        </div>


        <div className="stat-card">
          <div className="stat-icon progress">
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <h3>Progress Entries</h3>
            <p className="stat-number">{dashboardStats.progressEntries}</p>
            <span className="stat-change positive">
              <Activity size={12} />
              Tracked
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon notes">
            <FileText size={20} />
          </div>
          <div className="stat-content">
            <h3>Daily Notes</h3>
            <p className="stat-number">{dashboardStats.dailyNotesCount}</p>
            <span className="stat-change positive">
              <BookOpen size={12} />
              Available
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="actions-grid">
          <Link
            to="/patient/appointments"
            className="action-card"
          >
            <div className="action-icon">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>Book Session</h4>
              <p>Schedule session</p>
            </div>
          </Link>

          <Link
            to="/patient/progress"
            className="action-card"
          >
            <div className="action-icon">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>View Progress</h4>
              <p>Track progress</p>
            </div>
          </Link>

          <Link
            to="/patient/daily-notes"
            className="action-card"
          >
            <div className="action-icon">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>Daily Notes</h4>
              <p>Read notes</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions & Progress Summary */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upcoming Sessions */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm border border-blue-100">
            <div className="px-4 py-3 border-b border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Upcoming Sessions</h3>
                  <p className="text-xs text-gray-600">Your scheduled therapy sessions</p>
                </div>
                <Link
                  to="/patient/appointments"
                  className="text-blue-600 hover:text-emerald-600 text-xs font-medium flex items-center"
                >
                  View All
                  <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>
            </div>
            <div className="p-4">
              {dashboardStats.upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {dashboardStats.upcomingAppointments.slice(0, 3).map((appointment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg border border-blue-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-lg flex items-center justify-center">
                          <Calendar size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {appointment.type || 'Therapy Session'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'No date'} at {formatTime12Hour(appointment.startTime)}
                          </p>
                          <p className="text-xs text-gray-500">With {dashboardStats.therapistName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          appointment.status === 'scheduled' ? 'bg-green-100 text-green-800' :
                          appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status || 'Scheduled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Calendar className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">No upcoming sessions</p>
                  <p className="text-xs text-gray-400 mt-1">Book a session to get started</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-lg shadow-sm border border-emerald-100">
            <div className="px-4 py-3 border-b border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Progress</h3>
                  <p className="text-xs text-gray-600">Your latest progress tracking entries</p>
                </div>
                <Link
                  to="/patient/progress"
                  className="text-emerald-600 hover:text-green-600 text-xs font-medium flex items-center"
                >
                  View All
                  <ArrowRight size={14} className="ml-1" />
                </Link>
              </div>
            </div>
            <div className="p-4">
              {dashboardStats.recentProgress.length > 0 ? (
                <div className="space-y-4">
                  {dashboardStats.recentProgress.slice(0, 3).map((progress, index) => {
                    const percentage = Math.round((progress.currentScore / progress.targetScore) * 100);
                    const colors = [
                      { bg: 'from-blue-500 to-emerald-500', text: 'text-blue-600', bgLight: 'bg-gradient-to-r from-blue-50 to-emerald-50' },
                      { bg: 'from-emerald-500 to-green-500', text: 'text-emerald-600', bgLight: 'bg-gradient-to-r from-emerald-50 to-green-50' },
                      { bg: 'from-green-500 to-teal-500', text: 'text-green-600', bgLight: 'bg-gradient-to-r from-green-50 to-teal-50' }
                    ];
                    const colorScheme = colors[index % colors.length];
                    
                    return (
                      <div key={index} className={`p-3 rounded-lg border ${colorScheme.bgLight} border-emerald-100`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{progress.area}</h4>
                          <span className="text-xs font-medium text-emerald-600">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div 
                            className={`h-2 rounded-full bg-gradient-to-r ${colorScheme.bg}`}
                            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600">
                          {progress.currentScore} / {progress.targetScore} - {progress.measurementDate ? new Date(progress.measurementDate).toLocaleDateString() : 'No date'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <TrendingUp className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">No progress entries yet</p>
                  <p className="text-xs text-gray-400 mt-1">Progress will appear here after your first session</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Therapist Info */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-lg shadow-sm border border-blue-100 p-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User size={20} className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1 text-sm">{dashboardStats.therapistName}</h4>
              <p className="text-xs text-gray-600 mb-2">{dashboardStats.therapistSpecialization}</p>
              <div className="flex items-center justify-center space-x-1 text-yellow-400 mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} className="fill-current" />
                ))}
              </div>
              <p className="text-xs text-gray-500">{dashboardStats.therapistExperience} years experience</p>
            </div>
          </div>

          {/* Recent Updates */}
          <div className="bg-gradient-to-br from-white to-emerald-50 rounded-lg shadow-sm border border-emerald-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Bell size={16} className="text-emerald-600" />
                <h3 className="text-base font-semibold text-gray-900">Recent Updates</h3>
              </div>
              {notificationStats?.unreadCount > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificationStats.unreadCount}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((notification, index) => (
                  <div key={index} className="p-2 bg-white rounded border border-emerald-100">
                    <p className="text-xs text-gray-900 font-medium">{notification.title}</p>
                    <p className="text-xs text-gray-600">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.date ? `${notification.date} at ${notification.time}` : 'No date'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">No recent updates</p>
                </div>
              )}
            </div>
          </div>

          {/* Goals */}
          <div className="bg-gradient-to-br from-white to-green-50 rounded-lg shadow-sm border border-green-100 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Target size={16} className="text-green-600" />
              <h3 className="text-base font-semibold text-gray-900">Your Goals</h3>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
              <p className="text-xs text-green-800 leading-relaxed">
                {dashboardStats.patient?.goals || 'Your therapy goals will be set during your first session with your therapist.'}
              </p>
            </div>
          </div>

          {/* Diagnosis Info */}
          <div className="bg-gradient-to-br from-white to-teal-50 rounded-lg shadow-sm border border-teal-100 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <FileText size={16} className="text-teal-600" />
              <h3 className="text-base font-semibold text-gray-900">Diagnosis</h3>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-lg p-3 border border-teal-100">
              <p className="text-xs text-teal-800 font-medium">{dashboardStats.diagnosis}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;