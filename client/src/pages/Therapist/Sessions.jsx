import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  Target, 
  Activity, 
  Eye, 
  TrendingUp, 
  AlertTriangle, 
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { SessionCreator, ModernCard, ModernButton } from '../../components';
import { therapistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Sessions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch sessions data from API
  const { data: sessionsData, isLoading, error } = useQuery(
    'therapistSessions',
    () => therapistAPI.getSessions(user?.id),
    {
      enabled: !!user?.id, // Only run query when user ID is available
      onError: (error) => {
        toast.error('Failed to load sessions');
        console.error('Error fetching sessions:', error);
      }
    }
  );

  // Transform API data
  const sessions = (sessionsData?.data?.sessions || []).map(session => ({
    id: session.id,
    patientName: session.patientName || 'Unknown Patient',
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    sessionType: session.sessionType,
    status: session.status,
    objectives: session.objectives,
    activities: session.activities,
    observations: session.observations,
    progress: session.progress,
    challenges: session.challenges,
    nextSteps: session.nextSteps,
    goals: session.goals,
    mood: session.mood,
    engagement: session.engagement,
    notes: session.notes,
    createdAt: session.createdAt
  }));

  // Delete session mutation
  const deleteSessionMutation = useMutation(
    (sessionId) => therapistAPI.deleteSession(sessionId),
    {
      onSuccess: () => {
        toast.success('Session deleted successfully');
        queryClient.invalidateQueries('therapistSessions');
      },
      onError: (error) => {
        toast.error('Failed to delete session');
        console.error('Delete session error:', error);
      }
    }
  );

  // Filter sessions based on search and filter criteria
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.sessionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.objectives && session.objectives.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    const matchesType = filterType === 'all' || session.sessionType === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'in-progress':
        return <PlayCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSessionCreated = (newSession) => {
    queryClient.invalidateQueries('therapistSessions');
    setShowCreateModal(false);
  };

  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      deleteSessionMutation.mutate(sessionId);
    }
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Therapy Sessions</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and track therapy sessions for your patients
          </p>
        </div>
        <ModernButton
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Session
        </ModernButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Sessions</p>
              <p className="text-2xl font-semibold text-gray-900">{sessions.length}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {sessions.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <PlayCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-2xl font-semibold text-gray-900">
                {sessions.filter(s => s.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </ModernCard>

        <ModernCard className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <User className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unique Patients</p>
              <p className="text-2xl font-semibold text-gray-900">
                {new Set(sessions.map(s => s.patientName)).size}
              </p>
            </div>
          </div>
        </ModernCard>
      </div>

      {/* Search and Filters */}
      <ModernCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
              <option value="therapy">Therapy</option>
              <option value="assessment">Assessment</option>
              <option value="consultation">Consultation</option>
              <option value="follow-up">Follow-up</option>
              <option value="evaluation">Evaluation</option>
              <option value="group">Group</option>
            </select>
          </div>
        </div>
      </ModernCard>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <ModernCard className="p-12 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first therapy session.
            </p>
            <div className="mt-6">
              <ModernButton
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Session
              </ModernButton>
            </div>
          </ModernCard>
        ) : (
          filteredSessions.map((session) => (
            <ModernCard key={session.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.patientName}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {getStatusIcon(session.status)}
                          <span className="ml-1 capitalize">{session.status.replace('-', ' ')}</span>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(session.sessionDate)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        </div>
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          {session.sessionType}
                        </div>
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {session.duration} min
                        </div>
                      </div>
                      {session.objectives && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {session.objectives}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ModernButton
                    onClick={() => handleViewDetails(session)}
                    variant="secondary"
                    size="sm"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </ModernButton>
                  <ModernButton
                    onClick={() => handleDeleteSession(session.id)}
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </ModernButton>
                </div>
              </div>
            </ModernCard>
          ))
        )}
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <SessionCreator
          onSessionCreated={handleSessionCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Session Details Modal */}
      {showDetailsModal && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Session Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Session Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Patient</label>
                      <p className="text-gray-900">{selectedSession.patientName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-gray-900 capitalize">{selectedSession.sessionType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date</label>
                      <p className="text-gray-900">{formatDate(selectedSession.sessionDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Time</label>
                      <p className="text-gray-900">{formatTime(selectedSession.startTime)} - {formatTime(selectedSession.endTime)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p className="text-gray-900">{selectedSession.duration} minutes</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedSession.status)}`}>
                        {getStatusIcon(selectedSession.status)}
                        <span className="ml-1 capitalize">{selectedSession.status.replace('-', ' ')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Session Content */}
                {selectedSession.objectives && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Objectives</h4>
                    <p className="text-gray-700">{selectedSession.objectives}</p>
                  </div>
                )}

                {selectedSession.activities && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Activities</h4>
                    <p className="text-gray-700">{selectedSession.activities}</p>
                  </div>
                )}

                {selectedSession.goals && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Goals</h4>
                    <p className="text-gray-700">{selectedSession.goals}</p>
                  </div>
                )}

                {/* Assessment */}
                {(selectedSession.mood || selectedSession.engagement) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Assessment</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedSession.mood && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Mood</label>
                          <p className="text-gray-900 capitalize">{selectedSession.mood}</p>
                        </div>
                      )}
                      {selectedSession.engagement && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Engagement</label>
                          <p className="text-gray-900 capitalize">{selectedSession.engagement}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {(selectedSession.observations || selectedSession.progress || selectedSession.challenges || selectedSession.nextSteps || selectedSession.notes) && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                    <div className="space-y-3">
                      {selectedSession.observations && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Observations</label>
                          <p className="text-gray-700">{selectedSession.observations}</p>
                        </div>
                      )}
                      {selectedSession.progress && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Progress</label>
                          <p className="text-gray-700">{selectedSession.progress}</p>
                        </div>
                      )}
                      {selectedSession.challenges && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Challenges</label>
                          <p className="text-gray-700">{selectedSession.challenges}</p>
                        </div>
                      )}
                      {selectedSession.nextSteps && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Next Steps</label>
                          <p className="text-gray-700">{selectedSession.nextSteps}</p>
                        </div>
                      )}
                      {selectedSession.notes && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Additional Notes</label>
                          <p className="text-gray-700">{selectedSession.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <ModernButton
                  onClick={() => setShowDetailsModal(false)}
                  variant="secondary"
                >
                  Close
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sessions;
