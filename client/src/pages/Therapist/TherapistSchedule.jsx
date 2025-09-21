import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import InitialsAvatar from '../../components/InitialsAvatar';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  MessageSquare,
  Activity
} from 'lucide-react';
import { UltraModernCalendar, PatientSessionScheduler, SessionCreator } from '../../components';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';

const TherapistSchedule = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Fetch schedule data from API
  const { data: scheduleData, isLoading, error } = useQuery(
    'therapistSchedule',
    therapistAPI.getSchedule,
    {
      onError: (error) => {
        toast.error('Failed to load schedule data');
        console.error('Error fetching schedule:', error);
      }
    }
  );

  // Transform API data to match component expectations
  const appointments = (scheduleData?.data?.appointments || []).map(appointment => ({
    id: appointment.id,
    patientName: appointment.patientName || 'Unknown Patient',
    type: appointment.type || 'OT Session',
    date: appointment.appointmentDate,
    time: appointment.startTime,
    duration: `${appointment.duration} minutes`,
    status: appointment.status || 'scheduled',
    room: 'Room 101', // This would need to be added to the API
    notes: appointment.notes || '',
    priority: 'medium', // This would need to be calculated
    phone: appointment.patientPhone || 'N/A',
    email: 'N/A' // This would need to be added to the API
  }));

  // Transform sessions data to match component expectations
  const sessions = (scheduleData?.data?.sessions || []).map(session => ({
    id: session.id,
    patientName: session.patientName || 'Unknown Patient',
    type: session.type || 'Therapy Session',
    date: session.sessionDate,
    time: session.startTime,
    duration: `${session.duration} minutes`,
    status: session.status || 'scheduled',
    room: 'Room 101', // This would need to be added to the API
    notes: session.notes || '',
    priority: 'medium', // This would need to be calculated
    phone: session.patientPhone || 'N/A',
    email: 'N/A' // This would need to be added to the API
  }));

  // Combine appointments and sessions
  const allEvents = [...appointments, ...sessions];

  // Calendar events for UltraModernCalendar
  const calendarEvents = allEvents.map(event => {
    // Convert therapy type to display name
    const getDisplayName = (type) => {
      const typeMap = {
        'sensory-assessment': 'Sensory Assessment',
        'fine-motor-skills': 'Fine Motor Skills',
        'coordination-training': 'Coordination Training',
        'social-play-therapy': 'Social Play Therapy',
        'writing-grip-training': 'Writing Grip Training',
        'sensory-evaluation': 'Sensory Evaluation',
        'balance-training': 'Balance Training',
        'handwriting-grip': 'Handwriting Grip',
        'motor-skills-evaluation': 'Motor Skills Evaluation',
        'OT Session': 'OT Session'
      };
      return typeMap[type] || type;
    };

    // Parse the event date and time properly
    const eventDate = new Date(event.date);
    const [hours, minutes] = event.time.split(':');
    const startTime = new Date(eventDate);
    startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(startTime.getMinutes() + event.duration); // Use actual duration


    return {
      id: event.id,
      title: `${event.patientName} - ${getDisplayName(event.type)}`,
      start: startTime,
      end: endTime,
      backgroundColor: event.priority === 'high' ? '#ef4444' : event.priority === 'medium' ? '#f59e0b' : '#10b981',
      borderColor: event.priority === 'high' ? '#dc2626' : event.priority === 'medium' ? '#d97706' : '#059669',
      extendedProps: {
        patientName: event.patientName,
        type: event.type,
        status: event.status,
        room: event.room,
        notes: event.notes,
        phone: event.phone,
        email: event.email,
        sessionId: event.id // Add sessionId for sessions
      }
    };
  });



  // Filter events based on search and filter criteria
  const filteredAppointments = allEvents.filter(event => {
    const matchesSearch = event.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    const matchesType = filterType === 'all' || event.type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load schedule data</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
            <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your therapy sessions and patient appointments.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowSessionModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Activity className="h-4 w-4 mr-2" />
            Create Session
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Appointments</dt>
                  <dd className="text-lg font-medium text-gray-900">{appointments.length}</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </dd>
                </dl>
            </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {appointments.filter(a => a.status === 'scheduled').length}
                  </dd>
                </dl>
            </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Unique Patients</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {new Set(appointments.map(a => a.patientName)).size}
                  </dd>
                </dl>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'list'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            List View
          </button>
        </nav>
              </div>

      {/* Content */}
      {activeTab === 'calendar' ? (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Schedule Calendar</h3>
            </div>
            <UltraModernCalendar 
              events={calendarEvents} 
              onAddEvent={() => setShowSessionModal(true)}
              onEventClick={(event) => {
                console.log('Event clicked:', event);
                // You can open a modal or navigate to event details here
              }}
              onDateClick={(date) => {
                console.log('Date clicked:', date);
                setShowSessionModal(true);
              }}
            />
            </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
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
              <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Types</option>
                  <option value="sensory-assessment">Sensory Assessment</option>
                  <option value="fine-motor-skills">Fine Motor Skills</option>
                  <option value="coordination-training">Coordination Training</option>
                  <option value="OT Session">OT Session</option>
            </select>
        </div>
      </div>

      {/* Appointments List */}
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {filteredAppointments.map((event) => (
                  <li key={event.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <InitialsAvatar
                          name={event.patientName}
                          size="md"
                          className="h-10 w-10 rounded-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {event.patientName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {event.type} • {event.date} at {event.time}
                            </p>
                  </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              event.status === 'confirmed' 
                                ? 'bg-green-100 text-green-800'
                                : event.status === 'scheduled'
                                ? 'bg-yellow-100 text-yellow-800'
                                : event.status === 'completed'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                }`}>
                  {event.status}
                </span>
              <button
                onClick={() => setSelectedAppointment(event)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
      </div>
    </div>
                  </li>
                ))}
              </ul>
    </div>

            {filteredAppointments.length === 0 && (
        <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions or appointments found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by creating a new session.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Appointment Details</h3>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700">Patient</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAppointment.patientName}</p>
                </div>

                      <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAppointment.type}</p>
                      </div>
                
                      <div>
                  <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedAppointment.date} at {selectedAppointment.time}
                  </p>
                      </div>
                
                      <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAppointment.duration}</p>
                  </div>

                      <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedAppointment.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : selectedAppointment.status === 'scheduled'
                      ? 'bg-yellow-100 text-yellow-800'
                      : selectedAppointment.status === 'completed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedAppointment.status}
                  </span>
                      </div>
                
                      <div>
                  <label className="block text-sm font-medium text-gray-700">Room</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAppointment.room}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedAppointment.notes || 'No notes'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact</label>
                  <p className="mt-1 text-sm text-gray-900">
                    <Phone className="inline h-4 w-4 mr-1" />
                    {selectedAppointment.phone}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                  Edit Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Create Session Modal */}
      {showSessionModal && (
        <SessionCreator
          onSessionCreated={(newSession) => {
            toast.success('Session created successfully');
            setShowSessionModal(false);
            queryClient.invalidateQueries('therapistSchedule');
          }}
          onClose={() => setShowSessionModal(false)}
        />
      )}
    </div>
  );
};

export default TherapistSchedule;
