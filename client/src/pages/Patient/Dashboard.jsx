import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import {
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Download,
  MessageSquare,
} from 'lucide-react';
import { patientAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PatientDashboard = () => {
  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error } = useQuery(
    'patientDashboard',
    patientAPI.getDashboard,
    {
      onError: (error) => {
        toast.error('Failed to load dashboard data');
        console.error('Error fetching dashboard:', error);
      }
    }
  );

  // Extract data from API response (patient API has single nesting)
  const patient = dashboardData?.data?.patient || {};
  const therapist = dashboardData?.data?.therapist || {};
  const upcomingAppointments = dashboardData?.data?.upcomingAppointments || [];
  const recentProgress = dashboardData?.data?.recentProgress || [];

  // Calculate stats from real data
  const stats = {
    upcomingAppointments: upcomingAppointments.length,
    recentNotes: 0, // This would need to be fetched from daily notes API
    progressUpdates: recentProgress.length,
    pendingTasks: 0, // This would need to be calculated from home exercises
  };

  // Transform appointments to match component expectations
  const transformedAppointments = upcomingAppointments.map(appointment => ({
    id: appointment.id,
    date: appointment.appointmentDate,
    time: appointment.startTime,
    therapist: `${therapist.firstName} ${therapist.lastName}`,
    type: appointment.type || 'Regular Session'
  }));

  // Transform progress to notes format for display
  const recentNotes = recentProgress.map(progress => ({
    id: progress.area,
    date: progress.measurementDate,
    therapist: `${therapist.firstName} ${therapist.lastName}`,
    summary: progress.progressNotes || `Progress update for ${progress.area}`
  }));

  // Debug logging (can be removed in production)
  console.log('PatientDashboard - dashboardData:', dashboardData);
  console.log('PatientDashboard - patient:', patient);
  console.log('PatientDashboard - therapist:', therapist);
  console.log('PatientDashboard - stats:', stats);
  console.log('PatientDashboard - transformedAppointments:', transformedAppointments);
  console.log('PatientDashboard - recentProgress:', recentProgress);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back, {patient.firstName}! Here's your therapy progress and upcoming activities.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/patient/appointments"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Book Appointment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.upcomingAppointments}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Notes</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.recentNotes}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Progress Updates</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.progressUpdates}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/patient/appointments"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Book Appointment</p>
                <p className="text-sm text-gray-500">Schedule your next session</p>
              </div>
            </Link>

            <Link
              to="/patient/daily-notes"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">View Notes</p>
                <p className="text-sm text-gray-500">Read therapist updates</p>
              </div>
            </Link>

            <Link
              to="/patient/progress"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <div className="flex-shrink-0">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Track Progress</p>
                <p className="text-sm text-gray-500">Monitor your development</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments and Recent Notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Appointments */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Upcoming Appointments</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {transformedAppointments.map((appointment) => (
                  <li key={appointment.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{appointment.therapist}</p>
                        <p className="text-sm text-gray-500">{appointment.date} • {appointment.time}</p>
                        <p className="text-sm text-gray-500">{appointment.type}</p>
                      </div>
                      <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.time}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/patient/appointments"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all appointments
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Therapy Notes</h3>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentNotes.map((note) => (
                  <li key={note.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{note.therapist}</p>
                        <p className="text-sm text-gray-500">{note.date}</p>
                        <p className="text-sm text-gray-700 mt-1">{note.summary}</p>
                      </div>
                      <div>
                        <Link
                          to={`/patient/daily-notes/${note.id}`}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-green-700 bg-green-100 hover:bg-green-200"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/patient/daily-notes"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View all notes
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Progress Summary</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProgress.length > 0 ? (
              recentProgress.map((progress, index) => {
                const progressPercentage = Math.round((progress.currentScore / progress.targetScore) * 100);
                const colors = [
                  { bg: 'from-blue-50 to-blue-100', text: 'text-blue-900', textBold: 'text-blue-800', icon: 'text-blue-600' },
                  { bg: 'from-green-50 to-green-100', text: 'text-green-900', textBold: 'text-green-800', icon: 'text-green-600' },
                  { bg: 'from-purple-50 to-purple-100', text: 'text-purple-900', textBold: 'text-purple-800', icon: 'text-purple-600' }
                ];
                const color = colors[index % colors.length];
                
                return (
                  <div key={progress.area} className={`bg-gradient-to-r ${color.bg} p-4 rounded-lg`}>
                    <div className="flex items-center">
                      <TrendingUp className={`h-8 w-8 ${color.icon}`} />
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${color.text}`}>{progress.area}</p>
                        <p className={`text-lg font-bold ${color.textBold}`}>{progressPercentage}%</p>
                        <p className={`text-xs ${color.text}`}>
                          {progress.currentScore}/{progress.targetScore} points
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No progress data available yet</p>
                <p className="text-sm text-gray-400">Progress tracking will appear here after your first session</p>
              </div>
            )}
          </div>
          <div className="mt-6">
            <Link
              to="/patient/progress"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              View detailed progress
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.pendingTasks > 0 && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Home Exercises</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>You have {stats.pendingTasks} home exercises to complete this week.</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    to="/patient/progress"
                    className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-yellow-50 focus:ring-yellow-600"
                  >
                    View Exercises
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

export default PatientDashboard;
