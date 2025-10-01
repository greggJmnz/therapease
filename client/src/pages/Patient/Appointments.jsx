import React, { useState, useMemo } from 'react';
import { useQuery } from 'react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  X,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Info,
  SortAsc,
  SortDesc,
  List,
  Grid3X3,
  Stethoscope,
  AlertTriangle
} from 'lucide-react';
import { UltraModernCalendar } from '../../components';
import { patientAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Appointments = () => {
  const { user } = useAuth();
  const [assignedTherapist, setAssignedTherapist] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  // State for view management (same as therapist/admin appointments)
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [postponeReason, setPostponeReason] = useState('');
  const [newAppointmentDate, setNewAppointmentDate] = useState('');
  const [newAppointmentTime, setNewAppointmentTime] = useState('');

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  // Fetch appointments data from API
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError, refetch: refetchAppointments } = useQuery(
    'patientAppointments',
    patientAPI.getAppointments,
    {
      onError: (error) => {
        toast.error('Failed to load appointments');
        console.error('Error fetching appointments:', error);
      },
    }
  );

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
      return date.toLocaleDateString();
    } catch (error) {
      return 'Not available';
    }
  };

  // Transform API data to component format (enhanced like therapist/admin)
  const allAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    
    // Ensure data is an array
    const appointmentsArray = Array.isArray(appointmentsData.data) 
      ? appointmentsData.data 
      : [];
    
    return appointmentsArray.map(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate || new Date());
      const appointmentTime = appointment.startTime || '09:00';
      
      // Create proper dateTime by combining date and time
      let dateTime = new Date(appointmentDate);
      try {
        const [hours, minutes] = appointmentTime.split(':').map(Number);
        if (!isNaN(hours) && !isNaN(minutes)) {
          dateTime.setHours(hours, minutes, 0, 0);
        } else {
          dateTime.setHours(9, 0, 0, 0);
        }
      } catch (error) {
        dateTime.setHours(9, 0, 0, 0);
      }

      return {
      id: appointment.id,
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTime,
        duration: appointment.duration || 60,
        type: appointment.type || 'session',
        status: appointment.status || 'scheduled',
      therapist: appointment.therapistName || assignedTherapist?.name || 'Your Therapist',
        therapistSpecialization: appointment.therapistSpecialization || assignedTherapist?.specialization || 'Occupational Therapy',
      location: 'Therapy Center',
        notes: appointment.notes || '',
        reason: appointment.reason || '',
        createdAt: appointment.createdAt || appointment.appointmentDate || new Date().toISOString(),
        updatedAt: appointment.updatedAt,
        // Additional computed fields
        dateTime: dateTime,
        endTime: new Date(dateTime.getTime() + (appointment.duration || 60) * 60000),
        isUpcoming: dateTime > new Date(),
        isToday: dateTime.toDateString() === new Date().toDateString(),
        isPast: dateTime < new Date()
      };
    });
  }, [appointmentsData, assignedTherapist]);

  // Filtered and sorted appointments (same logic as therapist/admin)
  const filteredAppointments = useMemo(() => {
    let filtered = allAppointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.therapist.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Convert appointments to calendar events
  const calendarEvents = useMemo(() => {
    return allAppointments.map(appointment => {
      const startTime = appointment.dateTime;
      const endTime = appointment.endTime;
      
      // Determine color based on status
      let color = 'blue';
      if (appointment.status === 'confirmed' || appointment.status === 'completed') {
        color = 'green';
      } else if (appointment.status === 'cancelled') {
        color = 'red';
      } else if (appointment.status === 'pending') {
        color = 'yellow';
      }

      return {
        id: appointment.id,
        title: `${formatTime12Hour(appointment.time)} - ${appointment.therapist} - ${appointment.type}`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        color: color,
        extendedProps: {
          type: appointment.type,
          therapist: appointment.therapist,
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
  }, [allAppointments]);

  // Fetch patient profile to get assigned therapist
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'patientProfile',
    patientAPI.getProfile,
    {
      onSuccess: (data) => {
        if (data?.data?.therapistId) {
          setAssignedTherapist({
            id: data.data.therapistId,
            name: data.data.therapistName || data.data.therapist?.name || 'Your Therapist',
            specialization: data.data.therapistSpecialization || data.data.therapist?.specialization || 'Occupational Therapy'
          });
        }
      },
      onError: (error) => {
        console.error('Error fetching patient profile:', error);
      }
    }
  );


  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!assignedTherapist) {
      toast.error('No therapist assigned. Please contact support.');
      return;
    }

    try {
      // Convert time to 24-hour format for API
      const time24 = selectedTime.replace(/\s(AM|PM)/i, (match, period) => {
        const [hours, minutes] = match.replace(/\s(AM|PM)/i, '').split(':');
        let hour24 = parseInt(hours);
        if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
        if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
      });

      const appointmentData = {
        date: selectedDate,
        time: time24,
        duration: 60, // Default duration
        type: 'session',
        reason: reason,
        notes: reason
      };

      await patientAPI.bookAppointment(appointmentData);
      refetchAppointments(); // Refresh appointments from API
      setShowBookingForm(false);
      resetForm();
      toast.success('Appointment booked successfully!');
    } catch (error) {
      toast.error('Failed to book appointment');
      console.error('Booking error:', error);
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
  };

  // Handler functions for new functionality
  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
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

  const cancelAppointment = async (appointmentId, reason) => {
    try {
      await patientAPI.cancelAppointment(appointmentId, reason);
      refetchAppointments(); // Refresh appointments from API
      toast.success('Appointment cancelled successfully');
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      toast.error('Failed to cancel appointment');
      console.error('Cancel appointment error:', error);
    }
  };

  const postponeAppointment = async (appointmentId, newDate, newTime, reason) => {
    try {
      await patientAPI.postponeAppointment(appointmentId, newDate, newTime, reason);
      refetchAppointments(); // Refresh appointments from API
      toast.success('Appointment postponed successfully');
      setShowPostponeModal(false);
      setPostponeReason('');
      setNewAppointmentDate('');
      setNewAppointmentTime('');
    } catch (error) {
      toast.error('Failed to postpone appointment');
      console.error('Postpone appointment error:', error);
    }
  };

  if (appointmentsLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
              <p className="text-gray-600 mt-1">Book and manage your therapy sessions</p>
        </div>
            <div className="flex items-center gap-3">
        <button
          onClick={() => setShowBookingForm(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
                <Plus size={20} />
          Book Session
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
                <option value="session">Therapy Session</option>
                <option value="consultation">Consultation</option>
                <option value="assessment">Assessment</option>
                <option value="follow-up">Follow-up</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowBookingForm(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="bg-white rounded-md text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Book New Appointment
                  </h3>
                  
                  <form onSubmit={handleBooking} className="space-y-4">
                    {/* Display assigned therapist info */}
                    {assignedTherapist && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Your Assigned Therapist
                            </p>
                            <p className="text-sm text-blue-700">
                              {assignedTherapist.name} - {assignedTherapist.specialization}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Preferred Time
                      </label>
                      <select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        required
                      >
                        <option value="">Choose a time</option>
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason for Visit
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Describe the reason for your appointment..."
                        required
                      />
                    </div>

                    <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                      <button
                        type="submit"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Book Appointment
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBookingForm(false)}
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        {currentView === 'list' ? (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                <div className="col-span-3 flex items-center gap-2">
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
                    onClick={() => handleSort('type')}
                    className="flex items-center gap-1 hover:text-blue-600"
                  >
                    Therapist & Type
                    {sortBy === 'type' && (
                      sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                    )}
                  </button>
                </div>
                <div className="col-span-3 flex items-center gap-2">
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
                <div className="col-span-3 text-center">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Get started by booking your first appointment.'}
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Date & Time */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.dateTime.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime12Hour(appointment.time)} ({appointment.duration} min)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Therapist & Type */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.therapist}
                    </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getTypeIcon(appointment.type)}
                              <span className="capitalize">
                                {appointment.type.replace('-', ' ')}
                        </span>
                      </div>
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(appointment.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {appointment.isToday && 'Today'}
                          {appointment.isUpcoming && !appointment.isToday && 'Upcoming'}
                          {appointment.isPast && 'Past'}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-3 flex justify-center gap-2">
                        <button
                          onClick={() => handleViewAppointment(appointment)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                    {(appointment.status === 'confirmed' || appointment.status === 'pending' || appointment.status === 'scheduled') && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowCancelModal(true);
                          }}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setNewAppointmentDate(appointment.date);
                            setNewAppointmentTime(appointment.time);
                            setShowPostponeModal(true);
                          }}
                          className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors"
                        >
                          Postpone
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
                ))
              )}
            </div>
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
                console.log(`Date clicked: ${date.toDateString()}`);
              }}
              onAddEvent={() => {
                setShowBookingForm(true);
              }}
              showQuickActions={false}
              showSearch={false}
              showFilters={false}
              className="border-0"
            />
          </div>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Therapist</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <span>{selectedAppointment.therapist}</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {selectedAppointment.therapistSpecialization}
                        </div>
                      </div>
                
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{selectedAppointment.location}</span>
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

                      {selectedAppointment.reason && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg text-sm">
                            {selectedAppointment.reason}
                          </p>
                        </div>
                      )}

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
                  {(selectedAppointment.status === 'confirmed' || selectedAppointment.status === 'pending' || selectedAppointment.status === 'scheduled') && (
                    <>
                      <button
                        onClick={() => {
                          setShowAppointmentModal(false);
                          setShowCancelModal(true);
                        }}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                      >
                        Cancel Appointment
                      </button>
                      <button
                        onClick={() => {
                          setShowAppointmentModal(false);
                          setNewAppointmentDate(selectedAppointment.date);
                          setNewAppointmentTime(selectedAppointment.time);
                          setShowPostponeModal(true);
                        }}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
                      >
                        Postpone Appointment
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Appointment Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Cancel Appointment</h2>
                    <p className="text-red-100 text-sm mt-1">Please provide a reason for cancellation</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Cancellation
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Please explain why you need to cancel this appointment..."
                    required
                  />
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancelReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Keep Appointment
                  </button>
                  <button
                    onClick={() => cancelAppointment(selectedAppointment.id, cancelReason)}
                    disabled={!cancelReason.trim()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    Cancel Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Postpone Appointment Modal */}
        {showPostponeModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Postpone Appointment</h2>
                    <p className="text-orange-100 text-sm mt-1">Select a new date and time for your appointment</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowPostponeModal(false);
                      setPostponeReason('');
                      setNewAppointmentDate('');
                      setNewAppointmentTime('');
                    }}
                    className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Date
                  </label>
                  <input
                    type="date"
                    value={newAppointmentDate}
                    onChange={(e) => setNewAppointmentDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Time
                  </label>
                  <select
                    value={newAppointmentTime}
                    onChange={(e) => setNewAppointmentTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Choose a time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Postponement
                  </label>
                  <textarea
                    value={postponeReason}
                    onChange={(e) => setPostponeReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="Please explain why you need to postpone this appointment..."
                    required
                  />
                </div>
              </div>
              
              {/* Modal Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setShowPostponeModal(false);
                      setPostponeReason('');
                      setNewAppointmentDate('');
                      setNewAppointmentTime('');
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Keep Original Time
                  </button>
                  <button
                    onClick={() => postponeAppointment(selectedAppointment.id, newAppointmentDate, newAppointmentTime, postponeReason)}
                    disabled={!newAppointmentDate || !newAppointmentTime || !postponeReason.trim()}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    Postpone Appointment
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

export default Appointments;
