import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useRealtimeData } from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Target,
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';
import InitialsAvatar from '../../components/InitialsAvatar';

const TherapistDashboard = () => {
  const { user } = useAuth();
  
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
  
  // Fetch dashboard data from API with optimized loading
  // Use suspense: false to allow partial rendering while loading
  const { data: dashboardData, isLoading, error, refetch } = useQuery(
    'therapistDashboard',
    () => therapistAPI.getDashboard(user?.id),
    {
      enabled: !!user?.id, // Only run query when user ID is available
      onError: (error) => {
        toast.error('Failed to load dashboard data');
        console.error('Error fetching dashboard:', error);
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      // Optimize: Use placeholder data to show UI structure immediately
      placeholderData: (previousData) => previousData,
      // Reduce loading priority - allow UI to render first
      retry: 1,
      retryDelay: 1000
    }
  );

  // Enable real-time updates
  const { isRefreshing } = useRealtimeData('therapistDashboard', refetch);

  // Extract data from API response
  const apiData = dashboardData?.data?.data || dashboardData?.data;
  const overview = apiData?.overview || {};
  const appointments = apiData?.appointments || {};
  const recent = apiData?.recent || {};
  const progress = apiData?.progress || {};
  const assessments = apiData?.assessments || {};
  const trends = apiData?.trends || {};

  // Calculate stats from real API data
  const stats = {
    totalPatients: overview.totalPatients || 0,
    todayAppointments: appointments.scheduled || 0, // Using scheduled appointments as today's sessions
    pendingNotes: overview.todayNotes || 0, // Using todayNotes from API
    upcomingAppointments: overview.upcomingAppointments || 0, // Upcoming appointments (not completed or past)
  };

  // Extract recent data from API
  const recentPatients = recent.dailyNotes || []; // Using dailyNotes as recent patients data
  const recentAppointments = recent.appointments || [];
  const recentAssessments = recent.assessments || [];


  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load dashboard data</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Check if data is loaded
  if (!dashboardData || !apiData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-4">No dashboard data available</div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="therapist-dashboard">
      {/* Loading indicator for real-time updates */}
      {isRefreshing && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          <span className="text-sm font-medium">Updating data...</span>
        </div>
      )}
      
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1>Welcome back, Dr. {user?.lastName || 'Therapist'}!</h1>
            <p>Here's your practice overview and key metrics for today</p>
          </div>
          <div className="welcome-actions">
            <button className="btn-primary" onClick={() => window.location.href = '/therapist/patients'}>
              <Users size={18} />
              <span>View Patients</span>
            </button>
            <button className="btn-secondary" onClick={() => window.location.href = '/therapist/schedule'}>
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
            <Users size={20} />
          </div>
          <div className="stat-content">
            <h3>Total Patients</h3>
            <p className="stat-number">{stats.totalPatients}</p>
            <span className="stat-change positive">
              <TrendingUp size={12} />
              Active
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon appointments">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <h3>Today's Sessions</h3>
            <p className="stat-number">{stats.todayAppointments}</p>
            <span className="stat-change positive">
              <Clock size={12} />
              Scheduled
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon notes">
            <FileText size={20} />
          </div>
          <div className="stat-content">
            <h3>Pending Notes</h3>
            <p className="stat-number">{stats.pendingNotes}</p>
            <span className="stat-change neutral">
              <AlertCircle size={12} />
              Awaiting
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon appointments">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <h3>Total Appointments</h3>
            <p className="stat-number">{stats.upcomingAppointments}</p>
            <span className="stat-change positive">
              <TrendingUp size={12} />
              Upcoming
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="actions-grid">
          <Link
            to="/therapist/daily-notes"
            className="action-card"
          >
            <div className="action-icon">
              <FileText className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>Write Daily Note</h4>
              <p>Document today's session</p>
            </div>
          </Link>

          <Link
            to="/therapist/ai-insights"
            className="action-card"
          >
            <div className="action-icon">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>AI Insights</h4>
              <p>Get AI-powered analysis</p>
            </div>
          </Link>

          <Link
            to="/therapist/progress-tracking"
            className="action-card"
          >
            <div className="action-icon">
              <Eye className="h-6 w-6" />
            </div>
            <div className="action-content">
              <h4>Track Progress</h4>
              <p>Monitor patient development</p>
            </div>
          </Link>
        </div>
      </div>


      {/* Recent Assessments */}
      {recentAssessments && recentAssessments.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Assessments</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentAssessments.slice(0, 5).map((assessment) => (
                  <li key={assessment.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{assessment.title || 'Assessment'}</p>
                        <p className="text-sm text-gray-500">{assessment.type || 'Assessment'} • {assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString() : 'No date'}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : assessment.status === 'in-progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {assessment.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recent Patients and Appointments */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Patients */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Patients</h3>
            <div className="flow-root">
              {recentPatients.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentPatients.map((patient) => (
                    <li key={patient.patientId} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <InitialsAvatar 
                            name={patient.patientName || 'Patient'} 
                            size="md" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{patient.patientName || 'Unknown Patient'}</p>
                          <p className="text-sm text-gray-500">
                            Last Session: {patient.lastSession ? new Date(patient.lastSession).toLocaleDateString() : 'No sessions yet'}
                            {patient.sessionDuration && ` • ${patient.sessionDuration} min`}
                          </p>
                        </div>
                        <div>
                          <Link
                            to={`/therapist/patients/${patient.patientId}`}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-green-700 bg-green-100 hover:bg-green-200"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Users className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">No recent patients found</p>
                  <p className="text-xs text-gray-400 mt-1">Patients will appear here after their first session</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Link
                to="/therapist/patients"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all patients
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upcoming Appointments</h3>
            <div className="flow-root">
              {recentAppointments.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentAppointments.slice(0, 5).map((appointment) => (
                    <li key={appointment.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{appointment.patientName || 'Appointment'}</p>
                          <p className="text-sm text-gray-500">
                            {appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleDateString() : 'No date'} 
                            {appointment.startTime && ` at ${formatTime12Hour(appointment.startTime)}`}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm text-gray-900">{appointment.type || 'Session'}</p>
                          <p className="text-xs text-gray-500">{appointment.status || 'Scheduled'}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <Calendar className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-sm text-gray-500">No upcoming appointments</p>
                  <p className="text-xs text-gray-400 mt-1">Schedule sessions to see them here</p>
                </div>
              )}
            </div>
            <div className="mt-6">
              <Link
                to="/therapist/schedule"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View full schedule
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Progress by Area */}
      {progress.byArea && progress.byArea.length > 0 && (
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Progress by Area</h3>
            <div className="space-y-4">
              {progress.byArea.map((area, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{area.area}</span>
                      <span className="text-sm text-gray-500">{area.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, area.progressPercentage))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{area.entryCount} entries</span>
                      <span>Avg: {Math.round(area.avgCurrentScore)}/{Math.round(area.avgTargetScore)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}



      {/* Alerts */}
      {stats.pendingNotes > 0 && (
        <div className="mt-8 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Action Required</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You have {stats.pendingNotes} pending daily notes that need to be completed.</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    to="/therapist/daily-notes"
                    className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                  >
                    Complete Notes
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistDashboard;