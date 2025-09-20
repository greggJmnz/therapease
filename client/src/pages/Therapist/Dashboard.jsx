import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { useRealtimeData } from '../../hooks/useWebSocket';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  AlertCircle,
  Plus,
  Eye,
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TherapistDashboard = () => {
  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error, refetch } = useQuery(
    'therapistDashboard',
    therapistAPI.getDashboard,
    {
      onError: (error) => {
        toast.error('Failed to load dashboard data');
        console.error('Error fetching dashboard:', error);
      },
      staleTime: 0, // Force fresh data
      cacheTime: 0, // Don't cache
      refetchOnMount: true,
      refetchOnWindowFocus: true
    }
  );

  // Enable real-time updates
  const { isRefreshing } = useRealtimeData('therapistDashboard', refetch);

  // Extract data from API response (therapist API has double nesting)
  const apiData = dashboardData?.data?.data;
  const overview = apiData?.overview || {};
  const appointments = apiData?.appointments || {};
  const recent = apiData?.recent || {};
  const progress = apiData?.progress || {};

  // Calculate stats from real data
  const stats = {
    totalPatients: overview.totalPatients || 0,
    todayAppointments: appointments.confirmed || 0,
    pendingNotes: overview.todayNotes || 0,
    recentProgress: progress.byArea?.length || 0,
  };

  // Transform recent patients data with robust deduplication
  const recentPatients = (recent.dailyNotes || [])
    .filter(patient => patient.patientName && patient.patientId) // Filter out invalid entries
    .map(patient => ({
      id: patient.patientId,
      name: patient.patientName.trim(), // Trim whitespace
      age: 'N/A', // Age would need to be fetched from patient data
      lastSession: patient.lastSession
    }))
    .reduce((unique, patient) => {
      // Deduplicate by patient ID (most reliable)
      const existing = unique.find(p => p.id === patient.id);
      if (!existing) {
        unique.push(patient);
      } else {
        // If same ID but different name, keep the one with more recent session
        if (patient.lastSession > existing.lastSession) {
          const index = unique.findIndex(p => p.id === patient.id);
          unique[index] = patient;
        }
      }
      return unique;
    }, [])
    .sort((a, b) => new Date(b.lastSession) - new Date(a.lastSession)); // Sort by most recent

  // Debug logging
  console.log('Recent patients raw data:', recent.dailyNotes);
  console.log('Transformed recent patients:', recentPatients);

  // Transform appointments data
  const upcomingAppointments = (recent.appointments || []).map(appointment => ({
    id: appointment.id,
    patientName: appointment.patientName || 'Unknown Patient',
    time: appointment.startTime || 'TBD',
    type: appointment.type || 'Regular Session'
  }));



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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Therapist Dashboard</h1>
          <p className="mt-2 text-sm text-gray-700">
            Welcome back! Here's what's happening with your patients today.
          </p>
        </div>

      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Patients</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalPatients}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Today's Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.todayAppointments}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Notes</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingNotes}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Recent Progress</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.recentProgress}</dd>
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
              to="/therapist/daily-notes"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
            >
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Write Daily Note</p>
                <p className="text-sm text-gray-500">Document today's session</p>
              </div>
            </Link>

            <Link
              to="/therapist/ai-insights"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
            >
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">AI Insights</p>
                <p className="text-sm text-gray-500">Get AI-powered analysis</p>
              </div>
            </Link>

            <Link
              to="/therapist/progress-tracking"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500"
            >
              <div className="flex-shrink-0">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Track Progress</p>
                <p className="text-sm text-gray-500">Monitor patient development</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Patients and Appointments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Patients */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Patients</h3>
            <div className="flow-root">
              {recentPatients.length > 0 ? (
                <ul className="-my-5 divide-y divide-gray-200">
                  {recentPatients.map((patient) => (
                    <li key={patient.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-800">
                              {patient.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{patient.name}</p>
                          <p className="text-sm text-gray-500">Age: {patient.age} • Last: {patient.lastSession}</p>
                        </div>
                        <div>
                          <Link
                            to={`/therapist/patients/${patient.id}`}
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
              <ul className="-my-5 divide-y divide-gray-200">
                {upcomingAppointments.map((appointment) => (
                  <li key={appointment.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Clock className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{appointment.patientName}</p>
                        <p className="text-sm text-gray-500">{appointment.time} • {appointment.type}</p>
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
                to="/therapist/schedule"
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                View full schedule
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {stats.pendingNotes > 0 && (
        <div className="rounded-md bg-yellow-50 p-4">
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
