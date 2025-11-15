import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  X,
  Save
} from 'lucide-react';
import { ModernCard, ModernButton, ModernInput, ModernSelect } from './index';
import { therapistAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SessionCreator = ({ 
  patientId, 
  patientName, 
  onSessionCreated, 
  onClose,
  initialDate = null,
  initialTime = null,
  initialSessionType = null
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    sessionDate: initialDate || new Date().toISOString().split('T')[0],
    startTime: initialTime || '09:00',
    endTime: '10:00',
    duration: 60,
    sessionType: initialSessionType || 'session',
    reason: '',
    notes: ''
  });

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});


  const sessionTypes = [
    { value: 'session', label: 'Therapy Session' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'emergency', label: 'Emergency' }
  ];

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '60 minutes' },
    { value: 90, label: '90 minutes' },
    { value: 120, label: '120 minutes' }
  ];



  // Calculate end time based on duration
  const calculateEndTime = (startTime, duration) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  // Update end time when start time or duration changes
  useEffect(() => {
    const endTime = calculateEndTime(formData.startTime, formData.duration);
    setFormData(prev => ({ ...prev, endTime }));
  }, [formData.startTime, formData.duration]);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await therapistAPI.getPatients(user?.id);
      if (response.data.success) {
        const patientsList = response.data.data.patients || [];
        setPatients(patientsList);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  }, [user?.id]);

  // Fetch patients if not provided
  useEffect(() => {
    if (!patientId) {
      fetchPatients();
    }
  }, [patientId, fetchPatients]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.patientId) {
      newErrors.patientId = 'Patient is required';
    }
    if (!formData.sessionDate) {
      newErrors.sessionDate = 'Session date is required';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.sessionType) {
      newErrors.sessionType = 'Appointment type is required';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Please provide a reason for the appointment';
    }
    if (!formData.duration || formData.duration < 15) {
      newErrors.duration = 'Duration must be at least 15 minutes';
    }

    // Check if session date is in the past
    const sessionDateTime = new Date(`${formData.sessionDate}T${formData.startTime}`);
    if (sessionDateTime < new Date()) {
      newErrors.sessionDate = 'Session date cannot be in the past';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      // Map form data to API expected format
      const sessionData = {
        patientId: formData.patientId,
        appointmentDate: formData.sessionDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: formData.duration,
        type: formData.sessionType,
        reason: formData.reason,
        notes: formData.notes || ''
      };
      
      const response = await therapistAPI.createAppointment(sessionData);
      
      if (response.data.success) {
        toast.success('Appointment created successfully!');
        if (onSessionCreated) {
          onSessionCreated(response.data.data);
        }
        if (onClose) {
          onClose();
        }
        // Reset form
        setFormData({
          patientId: patientId || '',
          sessionDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          sessionType: 'session',
          reason: '',
          notes: ''
        });
      } else {
        toast.error(response.data.error || 'Failed to create appointment');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-green-600" />
              Create New Appointment
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <ModernCard className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Session Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient *
                  </label>
                  {patientId ? (
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <User className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900">{patientName}</span>
                    </div>
                  ) : (
                    <select
                      value={formData.patientId}
                      onChange={(e) => handleInputChange('patientId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        errors.patientId ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a patient</option>
                      {patients.length > 0 ? (
                        patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>Loading patients...</option>
                      )}
                    </select>
                  )}
                  {errors.patientId && (
                    <p className="text-red-500 text-sm mt-1">{errors.patientId}</p>
                  )}
                </div>

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Type *
                  </label>
                  <select
                    value={formData.sessionType}
                    onChange={(e) => handleInputChange('sessionType', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.sessionType ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {sessionTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {errors.sessionType && (
                    <p className="text-red-500 text-sm mt-1">{errors.sessionType}</p>
                  )}
                </div>

                {/* Session Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Date *
                  </label>
                  <input
                    type="date"
                    value={formData.sessionDate}
                    onChange={(e) => handleInputChange('sessionDate', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.sessionDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.sessionDate && (
                    <p className="text-red-500 text-sm mt-1">{errors.sessionDate}</p>
                  )}
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    step="300"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.startTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select exact start time (5-minute intervals)
                  </p>
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration *
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.duration ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {durationOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
                  )}
                </div>

                {/* End Time (calculated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-md">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900">
                          {formData.endTime} ({(() => {
                            const [hours, minutes] = formData.endTime.split(':');
                            const endTime = new Date();
                            endTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                            return endTime.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            });
                          })()})
                        </span>
                  </div>
                </div>
              </div>

              {/* Reason for Appointment */}
              <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Appointment *
                  </label>
                  <textarea
                  value={formData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Please describe the reason for this appointment..."
                    rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.reason && (
                  <p className="text-red-500 text-sm mt-1">{errors.reason}</p>
                )}
                </div>

                {/* Additional Notes */}
              <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional information or special requirements..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </ModernCard>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <ModernButton
                type="button"
                onClick={onClose}
                variant="secondary"
                className="px-6 py-2"
              >
                Cancel
              </ModernButton>
              <ModernButton
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Create Appointment
                  </div>
                )}
              </ModernButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SessionCreator;
