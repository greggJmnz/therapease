import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from 'react-query';
import { 
  Plus, 
  Clock, 
  MapPin, 
  Calendar,
  X,
  User,
  Stethoscope,
  Calendar as CalendarIcon,
  Save,
  AlertCircle,
  List,
  Grid3X3,
  Filter,
  Search,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  SortAsc,
  SortDesc,
  MoreVertical
} from 'lucide-react';
import { UltraModernCalendar } from '../../components';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import './AdminAppointments.css';

const AdminAppointments = () => {
  // State for appointment scheduling modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    therapistId: '',
    patientId: '',
    date: '',
    time: '',
    duration: '60',
    reason: '',
    type: 'session',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // State for view management
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'calendar'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [therapistFilter, setTherapistFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // State for dropdown management
  const [actionDropdowns, setActionDropdowns] = useState({});
  const dropdownRefs = useRef({});
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch appointments data from API
  const { data: appointmentsData, isLoading, error, refetch, isFetching } = useQuery(
    'adminAppointments',
      async () => {
        try {
          const response = await adminAPI.getAppointments();
          return response;
        } catch (error) {
          console.error('Error fetching appointments:', error);
          throw error;
        }
      },
    {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30000, // 30 seconds - data is fresh for 30 seconds
      cacheTime: 300000, // 5 minutes - keep in cache for 5 minutes
      onError: (error) => {
        console.error('React Query error:', error);
      }
    }
  );

  // Fetch therapists data
  const { data: therapistsData, isLoading: therapistsLoading, error: therapistsError } = useQuery(
    'adminTherapists',
    adminAPI.getTherapists,
    {
      onError: (error) => {
        console.error('Error fetching therapists:', error);
      }
    }
  );

  // Fetch patients data with therapist assignments
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'adminPatientsWithAssignments',
    adminAPI.getPatientsWithAssignments,
    {
      onError: (error) => {
        console.error('Error fetching patients:', error);
      }
    }
  );

  // Extract and enhance appointments from API response
  const allAppointments = useMemo(() => {
    const rawAppointments = appointmentsData?.data?.data?.appointments || [];
    
    return rawAppointments
      .filter(appointment => {
        // Show appointments from the last 90 days and future appointments
        const appointmentDate = new Date(appointment.appointmentDate || new Date());
        const today = new Date();
        const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
        return appointmentDate >= ninetyDaysAgo;
      })
      .map(appointment => {
      const appointmentDate = new Date(appointment.appointmentDate || new Date());
      const appointmentTime = appointment.appointmentTime || '09:00';
      
      // Combine date and time to create proper dateTime object
      const [hours, minutes] = appointmentTime.split(':');
      const dateTime = new Date(appointmentDate);
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const processedAppointment = {
    id: appointment.id,
    patientName: appointment.patientName || 'Unknown Patient',
    therapistName: appointment.therapistName || 'Unassigned',
        patientId: appointment.patientId,
        therapistId: appointment.therapistId,
        date: appointmentDate.toISOString().split('T')[0],
        time: appointmentTime,
        duration: appointment.duration || 60,
        type: appointment.type || 'session',
    status: appointment.status || 'scheduled',
        reason: appointment.reason || 'No reason provided',
        notes: appointment.notes || '',
        createdAt: appointment.createdAt,
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
  }, [appointmentsData]);

  // Filtered and sorted appointments
  const filteredAppointments = useMemo(() => {
    let filtered = allAppointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.therapistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

    // Therapist filter
    if (therapistFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.therapistId === parseInt(therapistFilter));
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
        case 'therapist':
          comparison = a.therapistName.localeCompare(b.therapistName);
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
  }, [allAppointments, searchTerm, statusFilter, typeFilter, therapistFilter, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAppointments = filteredAppointments.slice(startIndex, endIndex);

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, therapistFilter, sortBy, sortOrder]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    const tableContainer = document.querySelector('.appointments-table-container');
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

  // Fallback for old appointments reference (for hot reload compatibility)
  const appointments = allAppointments; // Legacy support

  // Extract therapists from API response
  const therapists = React.useMemo(() => {
    if (!therapistsData?.data?.data?.users) {
      return [];
    }
    
    const filteredTherapists = therapistsData.data.data.users
      .filter(user => user.role === 'therapist')
      .map(therapist => ({
        id: therapist.id,
        name: `${therapist.firstName} ${therapist.lastName}`,
        specialization: therapist.therapist?.specialization || 'General Therapy',
        email: therapist.email
      }));
    
    return filteredTherapists;
  }, [therapistsData]);


  // Extract patients from API response
  const allPatients = React.useMemo(() => {
    if (!patientsData?.data?.data?.patients) {
      return [];
    }
    
    const filteredPatients = patientsData.data.data.patients.map(patient => ({
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      email: patient.email,
      diagnosis: patient.diagnosis || 'N/A',
      primaryTherapistId: patient.primaryTherapistId || null,
      therapistAssignments: patient.therapistAssignments || []
    }));
    
    return filteredPatients;
  }, [patientsData]);

  // Filter patients based on selected therapist (including secondary/collaborative assignments)
  const patients = newAppointment.therapistId 
    ? allPatients.filter(patient => {
        const selectedTherapistId = parseInt(newAppointment.therapistId);
        
        // Check if patient has this therapist as primary therapist
        if (patient.primaryTherapistId === selectedTherapistId) {
          return true;
        }
        
        // Check if patient has this therapist as secondary/collaborative therapist
        const hasSecondaryAssignment = patient.therapistAssignments.some(assignment => 
          assignment.therapistId === selectedTherapistId && 
          assignment.assignmentStatus === 'active'
        );
        
        return hasSecondaryAssignment;
      })
    : allPatients;

  // Convert appointments to calendar events with color coding
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
        'session': 'fine-motor-skills',           // Pink
        'Regular Session': 'fine-motor-skills',   // Pink
        'consultation': 'consultation',           // Orange  
        'assessment': 'sensory-assessment',       // Green
        'follow-up': 'coordination-training',     // Yellow
        'emergency': 'emergency-care',            // Red
        'therapy': 'fine-motor-skills',           // Pink
        'evaluation': 'sensory-assessment',       // Green
        'checkup': 'coordination-training'        // Yellow
      };
      
      const calendarType = typeMapping[appointment.type] || 'fine-motor-skills';
      
      console.log(`Processing appointment: ${appointment.patientName} - ${appointment.type} (${appointment.status}) -> ${calendarType}`);
    
    return {
        id: appointment.id,
        title: `${appointment.patientName} - ${appointment.type}`,
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
          isUpcoming: appointment.isUpcoming,
          isToday: appointment.isToday
      }
    };
  });
    
    return events;
  }, [allAppointments]);

  // Form handling functions
  const handleInputChange = (field, value) => {
    setNewAppointment(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Clear patient selection when therapist changes
      if (field === 'therapistId') {
        updated.patientId = '';
      }
      
      return updated;
    });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Validate time if it's being changed
    if (field === 'time' && value) {
      const [hours, minutes] = value.split(':').map(Number);
      const selectedDateTime = new Date();
      selectedDateTime.setHours(hours, minutes, 0, 0);
      
      // Check if time is in the past (for today's date)
      const now = new Date();
      const today = new Date().toISOString().split('T')[0];
      if (newAppointment.date === today && selectedDateTime <= now) {
        setFormErrors(prev => ({
          ...prev,
          time: 'Cannot select a time in the past'
        }));
      } else {
        setFormErrors(prev => ({
          ...prev,
          time: ''
        }));
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!newAppointment.therapistId) {
      errors.therapistId = 'Please select a therapist';
    }
    if (!newAppointment.patientId) {
      errors.patientId = 'Please select a patient';
    }
    if (!newAppointment.date) {
      errors.date = 'Please select a date';
    }
    if (!newAppointment.time) {
      errors.time = 'Please select a time';
    }
    if (!newAppointment.reason || !newAppointment.reason.trim()) {
      errors.reason = 'Please provide a reason for the appointment';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Double-check reason field before validation
    if (!newAppointment.reason || !newAppointment.reason.trim()) {
      setFormErrors(prev => ({
        ...prev,
        reason: 'Please provide a reason for the appointment'
      }));
      toast.error('Please provide a reason for the appointment');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Find selected therapist and patient names
      const selectedTherapist = therapists.find(t => t.id === newAppointment.therapistId);
      const selectedPatient = patients.find(p => p.id === newAppointment.patientId);
      
      const appointmentData = {
        ...newAppointment,
        therapistName: selectedTherapist?.name || 'Unknown',
        patientName: selectedPatient?.name || 'Unknown',
        status: 'scheduled'
      };

      // Ensure reason is not empty
      if (!appointmentData.reason || !appointmentData.reason.trim()) {
        toast.error('Please provide a reason for the appointment');
        return;
      }

      // Call the actual API
      const response = await adminAPI.createAppointment(appointmentData);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create appointment');
      }
      
      toast.success('Appointment scheduled successfully!');
      setShowScheduleModal(false);
      setNewAppointment({
        therapistId: '',
        patientId: '',
        date: '',
        time: '',
        duration: '60',
        reason: '',
        type: 'session',
        notes: ''
      });
      refetch(); // Refresh appointments list
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to schedule appointment. Please try again.');
    }
  };

  const closeModal = () => {
    setShowScheduleModal(false);
    setNewAppointment({
      therapistId: '',
      patientId: '',
      date: '',
      time: '',
      duration: '60',
      reason: '',
      type: 'session',
      notes: ''
    });
    setFormErrors({});
  };

  // Handler functions for new functionality
  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const handleCloseAppointmentModal = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(false);
  };

  const handleEditAppointment = (appointment) => {
    setEditingAppointment({ ...appointment });
    setShowEditModal(true);
    setShowAppointmentModal(false);
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;

    try {
      const updateData = {
        appointmentDate: editingAppointment.date,
        startTime: editingAppointment.time,
        duration: editingAppointment.duration,
        type: editingAppointment.type,
        status: editingAppointment.status,
        notes: editingAppointment.notes
      };

      await adminAPI.updateAppointment(editingAppointment.id, updateData);
      toast.success('Appointment updated successfully!');
      setShowEditModal(false);
      setEditingAppointment(null);
      refetch();
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingAppointment(null);
    setShowEditModal(false);
  };

  // Dropdown management functions
  const toggleDropdown = (appointmentId) => {
    setActionDropdowns(prev => ({
      ...prev,
      [appointmentId]: !prev[appointmentId]
    }));
  };

  const closeAllDropdowns = () => {
    setActionDropdowns({});
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.appointment-action-dropdown') && !event.target.closest('.dropdown-trigger')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check if dropdown should open upward
  const shouldOpenUpward = (appointmentId) => {
    const button = dropdownRefs.current[appointmentId];
    if (!button) return false;
    
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // Approximate dropdown height
    const spaceBelow = viewportHeight - rect.bottom;
    
    return spaceBelow < dropdownHeight && rect.top > dropdownHeight;
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to delete this appointment? This action cannot be undone.')) {
      try {
        await adminAPI.deleteAppointment(appointmentId);
        toast.success('Appointment deleted successfully!');
        refetch();
      } catch (error) {
        console.error('Error deleting appointment:', error);
        toast.error('Failed to delete appointment. Please try again.');
      }
    }
  };

  const handleEditInputChange = (field, value) => {
    setEditingAppointment(prev => ({
      ...prev,
      [field]: value
    }));
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

  const getTypeColor = (type) => {
    switch (type) {
      case 'session':
      case 'therapy':
      case 'Regular Session':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'consultation':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'assessment':
      case 'evaluation':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'follow-up':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a moment on first load</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load appointments</div>
          <p className="text-gray-600">Please try refreshing the page</p>
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
              <h1 className="text-3xl font-bold text-gray-900">Appointment Management</h1>
              <p className="text-gray-600 mt-1">Manage all scheduled and upcoming appointments</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                className="btn-primary"
                onClick={() => setShowScheduleModal(true)}
              >
                <Plus size={20} />
                Schedule Appointment
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
              <div className="w-4 h-4 bg-red-200 border border-red-300 rounded"></div>
              <span className="text-sm text-gray-700">Emergency</span>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Error:</strong> {error.message || 'Failed to load appointments'}
              </p>
              <button 
                onClick={() => refetch()}
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
            <div className="appointments-table-container overflow-x-auto overflow-y-visible">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 min-w-[800px]">
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
                  <div className="col-span-2 flex items-center gap-2">
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
                  <div className="col-span-2 flex items-center gap-2">
                    <button
                      onClick={() => handleSort('therapist')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Therapist
                      {sortBy === 'therapist' && (
                        sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                      )}
                    </button>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
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
                  <div className="col-span-1 text-center">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 min-w-[800px]">
              {filteredAppointments.length === 0 ? (
                <div className="p-12 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                currentAppointments.map((appointment) => {
                  const typeColor = getTypeColor(appointment.type);
                  const borderColor = typeColor.includes('pink') ? 'border-l-pink-400' :
                                    typeColor.includes('orange') ? 'border-l-orange-400' :
                                    typeColor.includes('green') ? 'border-l-green-400' :
                                    typeColor.includes('yellow') ? 'border-l-yellow-400' :
                                    typeColor.includes('red') ? 'border-l-red-400' :
                                    'border-l-gray-400';
                  
                  return (
                  <div 
                    key={appointment.id} 
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${borderColor}`}
                    onClick={() => handleViewAppointment(appointment)}
                  >
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
                              {appointment.time}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Patient */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              {appointment.isToday && 'Today'}
                              {appointment.isUpcoming && !appointment.isToday && 'Upcoming'}
                              {appointment.isPast && 'Past'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Therapist */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-900">
                            {appointment.therapistName}
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(appointment.type)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(appointment.type)}`}>
                            {appointment.type.replace('-', ' ')}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${getTypeColor(appointment.type).split(' ')[0]}`}></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {appointment.duration} min
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

                      {/* Actions */}
                      <div className="col-span-1 flex justify-center">
                        <div className="appointment-actions">
                          <button 
                            className="dropdown-trigger" 
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(appointment.id);
                            }}
                            title="Actions"
                            ref={el => dropdownRefs.current[appointment.id] = el}
                            data-appointment-id={appointment.id}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {actionDropdowns[appointment.id] && (
                            <div className={`appointment-action-dropdown ${shouldOpenUpward(appointment.id) ? 'dropdown-up' : ''}`}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewAppointment(appointment);
                                  closeAllDropdowns();
                                }}
                                className="dropdown-item"
                              >
                                <Eye size={16} />
                                View Details
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditAppointment(appointment);
                                  closeAllDropdowns();
                                }}
                                className="dropdown-item"
                              >
                                <Edit size={16} />
                                Edit Appointment
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAppointment(appointment.id);
                                  closeAllDropdowns();
                                }}
                                className="dropdown-item danger"
                              >
                                <Trash2 size={16} />
                                Delete Appointment
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
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
                              ? 'bg-blue-600 text-white'
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
              console.log('Date clicked:', date);
                // Could open a modal to add appointment for this date
            }}
            onAddEvent={() => {
                setShowScheduleModal(true);
            }}
            showQuickActions={false}
            showSearch={false}
            showFilters={false}
              className="border-0"
          />
        </div>
        )}

      {/* Schedule Appointment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-6 w-6 text-blue-600" />
                  Schedule New Appointment
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Therapist Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Stethoscope className="h-4 w-4 inline mr-2" />
                    Select Therapist *
                  </label>
                  <select
                    value={newAppointment.therapistId}
                    onChange={(e) => handleInputChange('therapistId', e.target.value)}
                    disabled={therapistsLoading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.therapistId ? 'border-red-500' : 'border-gray-300'
                    } ${therapistsLoading ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {therapistsLoading ? 'Loading therapists...' : 'Choose a therapist...'}
                    </option>
                    {therapistsLoading && <option>Loading...</option>}
                    {therapistsError && <option>Error loading therapists</option>}
                    {therapists.length === 0 && !therapistsLoading && <option>No therapists found</option>}
                    {therapists.map(therapist => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.name} - {therapist.specialization}
                      </option>
                    ))}
                  </select>
                  {formErrors.therapistId && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.therapistId}
                    </p>
                  )}
                </div>

                {/* Patient Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    Select Patient *
                  </label>
                  <select
                    value={newAppointment.patientId}
                    onChange={(e) => handleInputChange('patientId', e.target.value)}
                    disabled={!newAppointment.therapistId}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.patientId ? 'border-red-500' : 'border-gray-300'
                    } ${!newAppointment.therapistId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {!newAppointment.therapistId 
                        ? 'Please select a therapist first...' 
                        : 'Choose a patient...'}
                    </option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} - {patient.diagnosis}
                      </option>
                    ))}
                  </select>
                  {!newAppointment.therapistId && (
                    <p className="text-gray-500 text-sm mt-1">
                      Select a therapist to see their assigned patients
                    </p>
                  )}
                  {formErrors.patientId && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.patientId}
                    </p>
                  )}
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.date && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.date}
                    </p>
                  )}
                </div>

                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="h-4 w-4 inline mr-2" />
                    Appointment Time *
                  </label>
                  <input
                    type="time"
                    step="300"
                    value={newAppointment.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select exact time (5-minute intervals)
                  </p>
                  {formErrors.time && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.time}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes)
                  </label>
                  <select
                    value={newAppointment.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="120">120 minutes</option>
                  </select>
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Type
                  </label>
                  <select
                    value={newAppointment.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="session">Therapy Session</option>
                    <option value="consultation">Consultation</option>
                    <option value="assessment">Assessment</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Reason */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Appointment *
                  </label>
                  <textarea
                    value={newAppointment.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    placeholder="Please describe the reason for this appointment..."
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                      formErrors.reason ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.reason && (
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {formErrors.reason}
                    </p>
                  )}
                </div>

                {/* Additional Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={newAppointment.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any additional information or special requirements..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <Save className="h-4 w-4" />
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
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
                          {selectedAppointment.time} - {(() => {
                            const [hours, minutes] = selectedAppointment.time.split(':');
                            const startTime = new Date();
                            startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                            const endTime = new Date(startTime.getTime() + (selectedAppointment.duration * 60000));
                            return endTime.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            });
                          })()} ({selectedAppointment.duration} minutes)
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
                        <div>Created: {new Date(selectedAppointment.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
                        {selectedAppointment.updatedAt && (
                          <div>Updated: {new Date(selectedAppointment.updatedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}</div>
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
                <button
                  onClick={() => handleEditAppointment(selectedAppointment)}
                  className="btn-primary"
                >
                  <Edit className="h-4 w-4" />
                  Edit Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && editingAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Appointment</h2>
                  <p className="text-green-100 mt-1">Update appointment information</p>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={editingAppointment.date}
                      onChange={(e) => handleEditInputChange('date', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time *
                    </label>
                    <input
                      type="time"
                      step="300"
                      value={editingAppointment.time}
                      onChange={(e) => handleEditInputChange('time', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select exact time (5-minute intervals)
                    </p>
                  </div>
                </div>

                {/* Duration and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration (minutes) *
                    </label>
                    <select
                      value={editingAppointment.duration}
                      onChange={(e) => handleEditInputChange('duration', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                      <option value="90">90 minutes</option>
                      <option value="120">120 minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={editingAppointment.type}
                      onChange={(e) => handleEditInputChange('type', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="session">Therapy Session</option>
                      <option value="Regular Session">Regular Session</option>
                      <option value="consultation">Consultation</option>
                      <option value="assessment">Assessment</option>
                      <option value="follow-up">Follow-up</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={editingAppointment.status}
                    onChange={(e) => handleEditInputChange('status', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={editingAppointment.notes || ''}
                    onChange={(e) => handleEditInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add any additional notes..."
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
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

export default AdminAppointments;
