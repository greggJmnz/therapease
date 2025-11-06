import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  X,
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
import './PatientAppointments.css';

const Appointments = () => {
  const { user } = useAuth();
  const [assignedTherapist, setAssignedTherapist] = useState(null);
  const [availableTherapists, setAvailableTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  // State for view management (same as therapist/admin appointments)
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'calendar'
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

  // Generate more precise time slots (5-minute intervals)
  const timeSlots = (() => {
    const slots = [];
    // Morning slots: 8:00 AM to 12:00 PM
    for (let hour = 8; hour < 12; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        const timeString = time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        slots.push(timeString);
      }
    }
    // Afternoon slots: 1:00 PM to 6:00 PM
    for (let hour = 13; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 5) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        const timeString = time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        slots.push(timeString);
      }
    }
    return slots;
  })();

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
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
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

      const processedAppointment = {
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
      
      return processedAppointment;
    });
  }, [appointmentsData, assignedTherapist]);

  // Sorted appointments (removed search and filter functionality)
  const filteredAppointments = useMemo(() => {
    let filtered = allAppointments;

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
  }, [allAppointments, sortBy, sortOrder]);

  // Convert appointments to calendar events
  const calendarEvents = useMemo(() => {
    return allAppointments.map(appointment => {
      const startTime = appointment.dateTime;
      const endTime = appointment.endTime;
      
      // Determine color based on status
      let color = 'blue';
      if (appointment.status === 'scheduled' || appointment.status === 'completed') {
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

  // Fetch patient's assigned therapists
  const { data: therapistsData, isLoading: therapistsLoading, error: therapistsError } = useQuery(
    'patientTherapists',
    patientAPI.getTherapists,
    {
      onSuccess: (response) => {
        if (response?.data?.data && Array.isArray(response.data.data)) {
          setAvailableTherapists(response.data.data);
          // Set default to primary therapist if available
          const primaryTherapist = response.data.data.find(t => t.assignmentType === 'primary');
          if (primaryTherapist) {
            setSelectedTherapist(primaryTherapist.therapistId.toString());
          }
        } else {
          console.error('Invalid therapists data structure:', response);
          setAvailableTherapists([]);
        }
      },
      onError: (error) => {
        console.error('Error fetching patient therapists:', error);
        console.error('Error details:', error.response?.data);
        console.error('Error status:', error.response?.status);
        setAvailableTherapists([]);
      },
      retry: 1,
      staleTime: 30000
    }
  );

  // Process therapists data when it changes
  useEffect(() => {
    if (therapistsData?.data?.data && Array.isArray(therapistsData.data.data)) {
      setAvailableTherapists(therapistsData.data.data);
      // Set default to primary therapist if available
      const primaryTherapist = therapistsData.data.data.find(t => t.assignmentType === 'primary');
      if (primaryTherapist) {
        setSelectedTherapist(primaryTherapist.therapistId.toString());
      }
    }
  }, [therapistsData]);


  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedTime || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!selectedTherapist) {
      toast.error('Please select a therapist');
      return;
    }

    try {
      // Convert time to 24-hour format for API
      let time24;
      try {
        // Check if time already has seconds
        if (selectedTime.includes(':') && selectedTime.split(':').length === 3) {
          time24 = selectedTime; // Already in HH:MM:SS format
        } else if (selectedTime.includes('AM') || selectedTime.includes('PM')) {
          // Convert 12-hour format to 24-hour format
          const timeMatch = selectedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (timeMatch) {
            let [, hours, minutes, period] = timeMatch;
            let hour24 = parseInt(hours);
            if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
            if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
            time24 = `${hour24.toString().padStart(2, '0')}:${minutes}:00`;
          } else {
            throw new Error('Invalid time format');
          }
        } else {
          // Assume it's already in 24-hour format, just add seconds if needed
          time24 = selectedTime.includes(':') ? selectedTime + ':00' : selectedTime;
        }
      } catch (error) {
        console.error('Time conversion error:', error);
        // Fallback: use the original time
        time24 = selectedTime;
      }


      const appointmentData = {
        date: selectedDate,
        time: time24,
        duration: 60, // Default duration
        type: 'session',
        reason: reason,
        notes: reason,
        therapistId: parseInt(selectedTherapist)
      };

      const response = await patientAPI.bookAppointment(appointmentData);
      
      refetchAppointments(); // Refresh appointments from API
      setShowBookingForm(false);
      resetForm();
      toast.success('Appointment booked successfully!');
    } catch (error) {
      console.error('Booking error:', error);
      
      // Show specific error message
      if (error.response?.data?.error) {
        toast.error(`Failed to book appointment: ${error.response.data.error}`);
      } else if (error.response?.status === 400) {
        toast.error('Invalid appointment data. Please check all fields.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to book appointment. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
    // Reset to primary therapist
    if (Array.isArray(availableTherapists)) {
      const primaryTherapist = availableTherapists.find(t => t.assignmentType === 'primary');
      if (primaryTherapist) {
        setSelectedTherapist(primaryTherapist.therapistId.toString());
      }
    }
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
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">My Schedule</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Book and manage your therapy sessions</p>
          </div>
        </div>
            <div className="flex items-center gap-3">
        <button
          onClick={() => setShowBookingForm(true)}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all font-medium flex items-center gap-2 shadow-sm hover:shadow-md text-sm sm:text-base"
        >
          <Plus size={18} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Book Session</span>
          <span className="sm:hidden">Book</span>
        </button>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('calendar')}
                className={`px-3 py-2 sm:px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  currentView === 'calendar' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid3X3 size={16} />
                <span className="hidden sm:inline">Calendar View</span>
                <span className="sm:hidden">Calendar</span>
              </button>
              <button
                onClick={() => setCurrentView('list')}
                className={`px-3 py-2 sm:px-4 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  currentView === 'list' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={16} />
                <span className="hidden sm:inline">List View</span>
                <span className="sm:hidden">List</span>
              </button>
            </div>
          </div>
        </div>

      {/* Enhanced Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" 
              onClick={() => setShowBookingForm(false)}
            ></div>
            
            {/* Modal Container */}
            <div className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-xl">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Book New Appointment
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Schedule your therapy session
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              
              {/* Form */}
              <form onSubmit={handleBooking} className="space-y-6">
                {/* Therapist Selection */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <User className="h-4 w-4 text-blue-600" />
                    Select Therapist
                  </label>
                  {therapistsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Loading therapists...
                    </div>
                  ) : therapistsError ? (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertCircle className="h-4 w-4" />
                      Error loading therapists. Please try again.
                    </div>
                  ) : Array.isArray(availableTherapists) && availableTherapists.length > 0 ? (
                    <select
                      value={selectedTherapist}
                      onChange={(e) => setSelectedTherapist(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                      required
                    >
                      {availableTherapists.map((therapist) => (
                        <option key={therapist.therapistId} value={therapist.therapistId}>
                          {therapist.therapistName} - {therapist.specialization} 
                          {therapist.assignmentType === 'primary' ? ' (Primary)' : ' (Secondary)'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                      No therapists assigned. Please contact support.
                    </div>
                  )}
                </div>

                {/* Date and Time Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Selection */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                      required
                    />
                  </div>

                  {/* Time Selection */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Preferred Time
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all"
                      required
                    >
                      <option value="">Choose a time</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Select exact time (5-minute intervals)
                    </p>
                  </div>
                </div>

                {/* Reason for Visit */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    Reason for Visit
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all resize-none"
                    placeholder="Please describe the reason for your appointment, any specific concerns, or goals you'd like to work on..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This helps your therapist prepare for your session
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Book Appointment
                    </div>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

        {/* Main Content */}
        {currentView === 'list' ? (
          /* List View */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Scrollable Table Container */}
            <div className="patient-appointments-table-container overflow-x-auto overflow-y-visible">
              {/* Table Header */}
              <div className="bg-gray-50 px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
                <div className="grid grid-cols-9 gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-gray-700 min-w-[400px] sm:min-w-[600px]">
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
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 min-w-[400px] sm:min-w-[600px]">
              {filteredAppointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by booking your first appointment.
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div 
                    key={appointment.id} 
                    className="px-3 py-3 sm:px-6 sm:py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleViewAppointment(appointment)}
                  >
                    <div className="grid grid-cols-9 gap-2 sm:gap-4 items-center">
                      {/* Date & Time */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <div>
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {appointment.dateTime.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-1">
                              <Clock className="h-2 w-2 sm:h-3 sm:w-3" />
                              {formatTime12Hour(appointment.time)} ({appointment.duration} min)
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Therapist & Type */}
                      <div className="col-span-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                          <div>
                            <div className="text-xs sm:text-sm font-medium text-gray-900">
                              {appointment.therapist}
                    </div>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600">
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
                        <div className="flex items-center gap-1 sm:gap-2">
                          {getStatusIcon(appointment.status)}
                          <span className={`px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                          {appointment.isToday && 'Today'}
                          {appointment.isUpcoming && !appointment.isToday && 'Upcoming'}
                          {appointment.isPast && 'Past'}
                        </div>
                      </div>
                </div>
              </div>
                ))
              )}
              </div>
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
              className="border-0 mobile-compact-calendar"
            />
          </div>
        )}

        {/* Appointment Details Modal */}
        {showAppointmentModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden my-4">
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
              <div className="p-8 max-h-[calc(90vh-200px)] overflow-y-auto pb-20">
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
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusIcon(selectedAppointment.status)}
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border whitespace-nowrap ${getStatusColor(selectedAppointment.status)}`}>
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
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 sticky bottom-0">
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  <button
                    onClick={handleCloseAppointmentModal}
                    className="w-full sm:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Close
                  </button>
                  {(selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'pending' || selectedAppointment.status === 'confirmed') && (
                    <>
                      <button
                        onClick={() => {
                          setShowAppointmentModal(false);
                          setShowCancelModal(true);
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
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
                        className="w-full sm:w-auto px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium"
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
                  <p className="text-xs text-gray-500 mt-1">
                    Select exact time (5-minute intervals)
                  </p>
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
