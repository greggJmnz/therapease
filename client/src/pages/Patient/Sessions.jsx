import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Target, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch scheduled sessions data
    const fetchSessions = async () => {
      try {
        // This will be implemented with actual API calls
        // For now, using mock data
        setSessions([
          {
            id: 1,
            date: '2024-01-20',
            time: '09:00 AM',
            duration: '45 minutes',
            therapist: 'Dr. Sarah Wilson',
            type: 'Regular Session',
            focus: 'Fine Motor Skills',
            location: 'Main Clinic - Room 3',
            status: 'scheduled',
            goals: [
              'Continue bead threading exercises',
              'Practice pencil grip',
              'Work on hand-eye coordination'
            ]
          },
          {
            id: 2,
            date: '2024-01-25',
            time: '10:30 AM',
            duration: '60 minutes',
            therapist: 'Dr. Sarah Wilson',
            type: 'Progress Review',
            focus: 'Comprehensive Assessment',
            location: 'Main Clinic - Room 3',
            status: 'scheduled',
            goals: [
              'Evaluate fine motor progress',
              'Assess balance improvements',
              'Review home exercise compliance'
            ]
          },
          {
            id: 3,
            date: '2024-01-18',
            time: '02:00 PM',
            duration: '45 minutes',
            therapist: 'Dr. Sarah Wilson',
            type: 'Regular Session',
            focus: 'Balance & Coordination',
            location: 'Main Clinic - Room 3',
            status: 'completed',
            goals: [
              'Balance beam walking',
              'Obstacle course navigation',
              'Jumping activities'
            ],
            notes: 'Great session! Showed improved balance and following instructions.'
          },
          {
            id: 4,
            date: '2024-01-15',
            time: '09:00 AM',
            duration: '45 minutes',
            therapist: 'Dr. Sarah Wilson',
            type: 'Regular Session',
            focus: 'Sensory Integration',
            location: 'Main Clinic - Room 3',
            status: 'completed',
            goals: [
              'Tactile exploration',
              'Auditory processing',
              'Sensory tolerance'
            ],
            notes: 'Participated well in sensory activities. Good progress with texture tolerance.'
          }
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const completedSessions = sessions.filter(s => s.status === 'completed');

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Scheduled Sessions</h1>
        <p className="mt-2 text-sm text-gray-700">
          View your upcoming and completed therapy sessions
        </p>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
                  <dd className="text-lg font-medium text-gray-900">{sessions.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Upcoming</dt>
                  <dd className="text-lg font-medium text-gray-900">{upcomingSessions.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{completedSessions.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Upcoming Sessions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {upcomingSessions.map((session) => (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {session.type} - {session.focus}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.date}
                        <Clock className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.time} ({session.duration})
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.therapist}
                        <MapPin className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusLabel(session.status)}
                    </span>
                  </div>
                </div>

                {/* Session Goals */}
                <div className="mt-4 ml-16">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Session Goals:</h4>
                  <ul className="space-y-1">
                    {session.goals.map((goal, index) => (
                      <li key={index} className="flex items-start">
                        <Target className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                        <span className="text-sm text-gray-600">{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Sessions */}
      {completedSessions.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Completed Sessions</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedSessions.map((session) => (
              <div key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      {getStatusIcon(session.status)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {session.type} - {session.focus}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.date}
                        <Clock className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.time} ({session.duration})
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.therapist}
                        <MapPin className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {session.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {getStatusLabel(session.status)}
                    </span>
                  </div>
                </div>

                {/* Session Goals */}
                <div className="mt-4 ml-16">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Session Goals:</h4>
                  <ul className="space-y-1 mb-4">
                    {session.goals.map((goal, index) => (
                      <li key={index} className="flex items-start">
                        <Target className="flex-shrink-0 h-4 w-4 text-green-500 mt-0.5 mr-2" />
                        <span className="text-sm text-gray-600">{goal}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Session Notes */}
                  {session.notes && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Session Notes:</h5>
                      <p className="text-sm text-gray-700">{session.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Sessions Message */}
      {sessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions scheduled</h3>
          <p className="text-sm text-gray-500">
            Contact your therapist to schedule your next session.
          </p>
        </div>
      )}

      {/* Session Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Session Preparation Tips</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Arrive Early</h4>
                <p className="text-xs text-gray-500">Come 10-15 minutes before your session</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Target className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Review Goals</h4>
                <p className="text-xs text-gray-500">Think about what you want to work on</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Track Progress</h4>
                <p className="text-xs text-gray-500">Note any improvements or challenges</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sessions;
