import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { UltraModernCalendar } from '../../components';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

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

  // Fetch appointments data from API
  const { data: appointmentsData, isLoading, error, refetch } = useQuery(
    'adminAppointments',
    adminAPI.getAppointments,
    {
      onError: (error) => {
        console.error('Error fetching appointments:', error);
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

  // Fetch patients data
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'adminPatients',
    adminAPI.getPatients,
    {
      onError: (error) => {
        console.error('Error fetching patients:', error);
      }
    }
  );

  // Extract appointments from API response
  const appointments = (appointmentsData?.data?.appointments || []).map(appointment => ({
    id: appointment.id,
    patientName: appointment.patientName || 'Unknown Patient',
    therapistName: appointment.therapistName || 'Unassigned',
    date: appointment.appointmentDate || new Date().toISOString().split('T')[0],
    time: appointment.appointmentTime || '09:00 AM',
    duration: appointment.duration || '1 hour',
    type: appointment.type || 'Session',
    status: appointment.status || 'scheduled',
    location: appointment.room || 'Room TBD'
  }));

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
    if (!patientsData?.data?.data?.users) {
      return [];
    }
    
    const filteredPatients = patientsData.data.data.users
      .filter(user => user.role === 'patient')
      .map(patient => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        diagnosis: patient.patient?.diagnosis || 'N/A',
        therapistId: patient.patient?.therapistId || null
      }));
    
    return filteredPatients;
  }, [patientsData]);

  // Filter patients based on selected therapist
  const patients = newAppointment.therapistId 
    ? allPatients.filter(patient => patient.therapistId === parseInt(newAppointment.therapistId))
    : allPatients;

  // Convert appointments to calendar events
  const calendarEvents = appointments.map(appointment => {
    const startTime = new Date(`${appointment.date}T${appointment.time}`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour
    
    return {
      title: `${appointment.therapistName} - ${appointment.type}`,
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      priority: appointment.status === 'confirmed' ? 'high' : 'medium',
      extendedProps: { 
        type: appointment.type, 
        therapist: appointment.therapistName, 
        patient: appointment.patientName,
        room: appointment.location
      }
    };
  });

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
    if (!newAppointment.reason.trim()) {
      errors.reason = 'Please provide a reason for the appointment';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointments...</p>
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
    <div className="appointments-section">
      <div className="section-header">
        <h2>Appointment Management</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowScheduleModal(true)}
        >
          <Plus size={16} />
          Schedule Appointment
        </button>
      </div>

      <div className="appointments-grid">
        <div className="appointments-list">
          <h3>Today's Appointments</h3>
          {appointments.map(appointment => (
            <div key={appointment.id} className="appointment-card">
              <div className="appointment-time">
                <Clock size={16} />
                <span>{appointment.time}</span>
              </div>
              <div className="appointment-details">
                <h4>{appointment.patientName}</h4>
                <p>with {appointment.therapistName}</p>
                <div className="appointment-meta">
                  <span className="type">{appointment.type}</span>
                  <span className="duration">{appointment.duration}</span>
                  <span className="location">
                    <MapPin size={14} />
                    {appointment.location}
                  </span>
                </div>
              </div>
              <div className="appointment-status">
                <span className={`status-badge ${appointment.status}`}>
                  {appointment.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="calendar-container">
          <h3>Schedule Overview</h3>
          <UltraModernCalendar
            events={calendarEvents}
            onEventClick={(event) => {
              console.log('Event clicked:', event);
            }}
            onDateClick={(date) => {
              console.log('Date clicked:', date);
            }}
            onAddEvent={() => {
              console.log('Add event clicked');
            }}
            showQuickActions={false}
            showSearch={false}
            showFilters={false}
          />
        </div>
      </div>

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
                    value={newAppointment.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      formErrors.time ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Schedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAppointments;
