import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Search, 
  CheckCircle,
  AlertCircle,
  X,
  List,
  Grid3X3,
  Stethoscope,
  AlertTriangle,
  Info,
  SortAsc,
  SortDesc,
  Edit
} from 'lucide-react';
import { UltraModernCalendar, SessionCreator } from '../../components';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './TherapistSchedule.css';

const TherapistSchedule = () => {
  const queryClient = useQueryClient();
  
  // Utility function to convert 24-hour time to 12-hour format
  const formatTime12Hour = (time24) => {
    try {
      const [hours, minutes] = time24.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (error) {
      return time24; // Return original if parsing fails
    }
  };

  // Utility function to safely format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch (error) {
      return 'Not available';
    }
  };
  
  // State for view management (same as admin appointments)
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  
  // State for edit appointment modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    appointmentDate: '',
    startTime: '',
    endTime: '',
    duration: '',
    type: '',
    status: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch schedule data from API
  const { data: scheduleData, isLoading, error, refetch } = useQuery(
    'therapistSchedule',
    therapistAPI.getSchedule,
    {
      onError: (error) => {
        toast.error('Failed to load schedule data');
        console.error('Error fetching schedule:', error);
      }
    }
  );

  // Extract and enhance appointments from API response (same logic as admin appointments)
  const allAppointments = useMemo(() => {
    if (!scheduleData?.data?.data) {
      return [];
    }

    const rawAppointments = scheduleData.data.data.appointments || [];
    const rawSessions = scheduleData.data.data.sessions || [];
    
    // Combine appointments and sessions
    const allEvents = [...rawAppointments, ...rawSessions];
    
    // Additional safety filter: ensure we only show appointments for the current therapist
    // (This should already be filtered by the backend, but adding as extra safety)
    // Since all events should have the same therapistId (filtered by backend), we can use the first one
    const currentTherapistId = allEvents.length > 0 ? allEvents[0].therapistId : null;
    const filteredEvents = currentTherapistId 
      ? allEvents.filter(event => event.therapistId === currentTherapistId)
      : allEvents; // If no events, return empty array
    
    return filteredEvents.map(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate || appointment.sessionDate || new Date());
      const appointmentTime = appointment.startTime || appointment.time || '09:00';
      
      // Create proper dateTime by combining date and time
      let dateTime = new Date(appointmentDate);
      try {
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          dateTime.setHours(hours, minutes, 0, 0);
        } else {
          // Fallback to 9:00 AM if time parsing fails
          dateTime.setHours(9, 0, 0, 0);
        }
      } catch (error) {
        console.warn('Error parsing time:', appointmentTime, error);
        // Fallback to 9:00 AM if time parsing fails
        dateTime.setHours(9, 0, 0, 0);
      }
      
      
      const processedAppointment = {
    id: appointment.id,
    patientName: appointment.patientName || 'Unknown Patient',
        therapistName: 'Current Therapist', // Since this is therapist view
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTime,
        duration: appointment.duration || 60,
        type: appointment.type || 'session',
    status: appointment.status || 'scheduled',
        reason: appointment.reason || '',
    notes: appointment.notes || '',
        createdAt: appointment.createdAt || appointment.appointmentDate || appointment.sessionDate || new Date().toISOString(),
        updatedAt: appointment.updatedAt,
        // Additional computed fields
        dateTime: dateTime,
        endTime: new Date(dateTime.getTime() + (appointment.duration || 60) * 60000),
        isUpcoming: dateTime > new Date(),
        isToday: dateTime.toDateString() === new Date().toDateString(),
        isPast: dateTime < new Date()
      };
      
      return processedAppointment;
    });
  }, [scheduleData]);

  // Filtered and sorted appointments (same logic as admin appointments)
  const filteredAppointments = useMemo(() => {
    let filtered = allAppointments;

    // Remove appointments with "therapy" status
    filtered = filtered.filter(appointment => appointment.status !== 'therapy');

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.type === typeFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = a.dateTime - b.dateTime;
          break;
        case 'patient':
          comparison = a.patientName.localeCompare(b.patientName);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = a.dateTime - b.dateTime;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allAppointments, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    const tableContainer = document.querySelector('.schedule-table-container');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  // Convert appointments to calendar events with color coding (same logic as admin appointments)
  const calendarEvents = useMemo(() => {
    const events = allAppointments.map(appointment => {
      const startTime = appointment.dateTime;
      const endTime = appointment.endTime;
      
      // Determine priority and color based on status and type
      let priority = 'medium';
      let color = 'blue';
      
      if (appointment.status === 'scheduled' || appointment.status === 'completed') {
        priority = 'high';
        color = 'green';
      } else if (appointment.status === 'cancelled') {
        priority = 'low';
        color = 'red';
      } else if (appointment.status === 'pending') {
        priority = 'medium';
        color = 'yellow';
      }
      
      // Map appointment types to calendar-compatible types for better color coding
      const typeMapping = {
        'therapy-session': 'fine-motor-skills',   // Pink
        'consultation': 'consultation',           // Orange  
        'assessment': 'sensory-assessment',       // Green
        'follow-up': 'coordination-training',     // Yellow
        'emergency': 'emergency-care'             // Red
      };
      
      const calendarType = typeMapping[appointment.type] || 'fine-motor-skills';


    return {
        id: appointment.id,
        title: `${formatTime12Hour(appointment.time)} - ${appointment.patientName} - ${appointment.type}`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        priority: priority,
        color: color,
      extendedProps: {
          type: calendarType, 
          therapist: appointment.therapistName, 
          patient: appointment.patientName,
          reason: appointment.reason,
          notes: appointment.notes,
          status: appointment.status,
          duration: appointment.duration,
          time: appointment.time,
          time12Hour: formatTime12Hour(appointment.time),
          isUpcoming: appointment.isUpcoming,
          isToday: appointment.isToday
      }
    };
  });

    return events;
  }, [allAppointments]);

  // Handler functions for new functionality (same as admin appointments)
  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
  };

  // Edit appointment handlers
  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setEditFormData({
      appointmentDate: appointment.appointmentDate || '',
      startTime: appointment.startTime || '',
      endTime: appointment.endTime || '',
      duration: appointment.duration || '',
      type: appointment.type || '',
      status: appointment.status || '',
      notes: appointment.notes || ''
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedAppointment(null);
    setEditFormData({
      appointmentDate: '',
      startTime: '',
      endTime: '',
      duration: '',
      type: '',
      status: '',
      notes: ''
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    // Basic form validation
    if (!editFormData.appointmentDate || !editFormData.startTime || !editFormData.type) {
      toast.error('Please fill in all required fields (Date, Start Time, and Type)');
      return;
    }

    setIsSubmitting(true);
    try {
      await therapistAPI.updateAppointment(selectedAppointment.id, editFormData);
      toast.success('Appointment updated successfully');
      handleCloseEditModal();
      // Refetch schedule data
      await refetch();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error(error.response?.data?.error || 'Failed to update appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'session':
        return <Stethoscope className="h-4 w-4 text-blue-600" />;
      case 'consultation':
        return <User className="h-4 w-4 text-purple-600" />;
      case 'assessment':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'follow-up':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'emergency':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Schedule Management</h1>
              <p className="text-gray-600 mt-1">Manage your therapy sessions and patient appointments</p>
        </div>
            <div className="flex items-center gap-3">
          <button
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            onClick={() => setShowSessionModal(true)}
          >
                <Plus size={20} />
            Create Appointment
          </button>
            </div>
        </div>
      </div>

        {/* View Toggle and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    currentView === 'calendar' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 size={16} />
                  Calendar View
                </button>
                <button
                  onClick={() => setCurrentView('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                    currentView === 'list' 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List size={16} />
                  List View
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="therapy-session">Therapy Session</option>
                <option value="consultation">Consultation</option>
                <option value="assessment">Assessment</option>
                <option value="follow-up">Follow-up</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Status & Color Coding Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Type Colors</h3>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-sm text-gray-600">Loading appointments...</span>
                </>
              ) : error ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm text-red-600">Error loading appointments</span>
                </>
              ) : (
                <>
                  <div className={`w-3 h-3 rounded-full ${allAppointments.length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {allAppointments.length > 0 
                      ? `${allAppointments.length} appointments from API` 
                      : 'No appointments found'
                    }
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-pink-200 border border-pink-300 rounded"></div>
              <span className="text-sm text-gray-700">Therapy Session</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-orange-200 border border-orange-300 rounded"></div>
              <span className="text-sm text-gray-700">Consultation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-200 border border-green-300 rounded"></div>
              <span className="text-sm text-gray-700">Assessment</span>
              </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded"></div>
              <span className="text-sm text-gray-700">Follow-up</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-200 border border-yellow-300 rounded"></div>
              <span className="text-sm text-gray-700">Emergency</span>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error.message || 'Failed to load appointments'}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Retry
              </button>
        </div>
          )}
          
          {!error && allAppointments.length === 0 && !isLoading && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> No appointments found in the database. The calendar will be empty until appointments are created.
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-3 text-gray-600">Loading appointments...</span>
            </div>
          </div>
        ) : currentView === 'list' ? (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Scrollable Table Container */}
            <div className="therapist-schedule-table-container overflow-x-auto overflow-y-visible">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 min-w-[800px]">
                  <div className="col-span-4 flex items-center gap-2">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Date & Time
                      {sortBy === 'date' && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <button
                      onClick={() => handleSort('patient')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Patient
                      {sortBy === 'patient' && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <button
                      onClick={() => handleSort('type')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Type
                      {sortBy === 'type' && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Status
                      {sortBy === 'status' && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 min-w-[800px]">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by creating a new appointment.'}
                  </p>
                </div>
              ) : (
                currentAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    onClick={() => handleViewAppointment(appointment)}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    title="Click to view appointment details"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Date & Time */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.date}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTime12Hour(appointment.time)} ({appointment.duration} min)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Patient */}
                      <div className="col-span-3">
                        <div className="text-sm text-gray-900">
                          {appointment.patientName}
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(appointment.type)}
                          <span className="text-sm text-gray-900 capitalize">
                            {appointment.type.replace('-', ' ')}
                          </span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(appointment.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>

            {/* Pagination Controls */}
            {filteredAppointments.length > 0 && (
              <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredAppointments.length)} of {filteredAppointments.length} appointments
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                    }`}
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            currentPage === pageNum
                              ? 'bg-green-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                        : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <UltraModernCalendar 
              events={calendarEvents} 
              onEventClick={(event) => {
                const appointment = allAppointments.find(apt => apt.id === event.id);
                if (appointment) {
                  handleViewAppointment(appointment);
                }
              }}
              onDateClick={(date) => {
                // Could open a modal to add appointment for this date
                // For now, just log the date
                console.log(`Date clicked: ${date.toDateString()}`);
              }}
              onAddEvent={() => {
                setShowSessionModal(true);
              }}
              showQuickActions={false}
              showSearch={false}
              showFilters={false}
              className="border-0"
            />
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

        {/* Appointment Details Modal */}
        {showAppointmentModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                        <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Appointment Details</h2>
                    <p className="text-blue-100 mt-1">View complete appointment information</p>
                  </div>
              <button
                    onClick={handleCloseAppointmentModal}
                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Basic Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                      Basic Information
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {selectedAppointment.dateTime.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>
                            {formatTime12Hour(selectedAppointment.time)} ({selectedAppointment.duration} minutes)
                          </span>
                        </div>
                      </div>
                
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{selectedAppointment.patientName}</span>
                        </div>
                      </div>
                
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Therapist</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <span>{selectedAppointment.therapistName}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Details */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Info className="h-5 w-5 text-green-600" />
                      </div>
                      Appointment Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(selectedAppointment.type)}
                          <span className="text-gray-900 capitalize">
                            {selectedAppointment.type.replace('-', ' ')}
                  </span>
                        </div>
                      </div>
                
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedAppointment.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                            {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                          </span>
                        </div>
                </div>

                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                          {selectedAppointment.reason || 'No reason provided'}
                        </p>
                </div>

                      {selectedAppointment.notes && (
                <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                            {selectedAppointment.notes}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Timing</label>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Created: {formatDate(selectedAppointment.createdAt)}</div>
                          {selectedAppointment.updatedAt && (
                            <div>Updated: {formatDate(selectedAppointment.updatedAt)}</div>
                          )}
                          <div className={`font-medium ${
                            selectedAppointment.isToday ? 'text-blue-600' :
                            selectedAppointment.isUpcoming ? 'text-green-600' :
                            'text-gray-500'
                          }`}>
                            {selectedAppointment.isToday && 'Today'}
                            {selectedAppointment.isUpcoming && !selectedAppointment.isToday && 'Upcoming'}
                            {selectedAppointment.isPast && 'Past'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-wrap gap-3 justify-end">
                <button
                    onClick={handleCloseAppointmentModal}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Close
                </button>
                  {/* Only show edit button if appointment was not created by admin */}
                  {!selectedAppointment.approvedBy || selectedAppointment.approvedBy === selectedAppointment.therapistId ? (
                    <button
                      onClick={() => handleEditAppointment(selectedAppointment)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Appointment
                    </button>
                  ) : (
                    <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm">Cannot edit admin-created appointments</span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Edit Appointment Modal */}
        {showEditModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Edit Appointment</h2>
                    <p className="text-blue-100 mt-1">
                      Update appointment details for {selectedAppointment.patientName}
                    </p>
                  </div>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-white hover:text-blue-200 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editFormData.appointmentDate}
                      onChange={(e) => handleEditFormChange('appointmentDate', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={editFormData.duration}
                      onChange={(e) => handleEditFormChange('duration', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="15"
                      max="180"
                      step="15"
                    />
                  </div>

                  {/* Start Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={editFormData.startTime}
                      onChange={(e) => handleEditFormChange('startTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* End Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={editFormData.endTime}
                      onChange={(e) => handleEditFormChange('endTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Appointment Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editFormData.type}
                      onChange={(e) => handleEditFormChange('type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select type</option>
                      <option value="individual">Individual Therapy</option>
                      <option value="group">Group Therapy</option>
                      <option value="assessment">Assessment</option>
                      <option value="consultation">Consultation</option>
                      <option value="follow-up">Follow-up</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => handleEditFormChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => handleEditFormChange('notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any additional notes about this appointment..."
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-xl">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEditModal}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAppointment}
                    disabled={isSubmitting}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        Update Appointment
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TherapistSchedule;