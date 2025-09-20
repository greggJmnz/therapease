import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Target, 
  Activity, 
  Eye, 
  TrendingUp, 
  AlertTriangle, 
  ArrowRight, 
  Heart, 
  Smile, 
  X,
  Save,
  Plus
} from 'lucide-react';
import { ModernCard, ModernButton, ModernInput, ModernSelect } from './index';
import { therapistAPI } from '../services/api';
import toast from 'react-hot-toast';

const SessionCreator = ({ 
  patientId, 
  patientName, 
  onSessionCreated, 
  onClose,
  initialDate = null,
  initialTime = null 
}) => {
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    sessionDate: initialDate || new Date().toISOString().split('T')[0],
    startTime: initialTime || '09:00',
    endTime: '10:00',
    duration: 60,
    sessionType: 'therapy',
    objectives: '',
    activities: '',
    observations: '',
    progress: '',
    challenges: '',
    nextSteps: '',
    goals: '',
    mood: '',
    engagement: '',
    notes: ''
  });

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});


  const sessionTypes = [
    { value: 'therapy', label: 'Therapy Session' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'evaluation', label: 'Evaluation' },
    { value: 'group', label: 'Group Session' }
  ];

  const moodOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'poor', label: 'Poor' },
    { value: 'very-poor', label: 'Very Poor' }
  ];

  const engagementOptions = [
    { value: 'high', label: 'High' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'low', label: 'Low' },
    { value: 'minimal', label: 'Minimal' }
  ];

  // Generate time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push({ value: time, label: time });
    }
  }

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
      const response = await therapistAPI.getPatients();
      if (response.data.success) {
        const patientsList = response.data.data.patients || [];
        setPatients(patientsList);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to load patients');
    }
  }, []);

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
      newErrors.sessionType = 'Session type is required';
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
      const response = await fetch('/api/therapist/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Session created successfully!');
        if (onSessionCreated) {
          onSessionCreated(data.data);
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
          sessionType: 'therapy',
          objectives: '',
          activities: '',
          observations: '',
          progress: '',
          challenges: '',
          nextSteps: '',
          goals: '',
          mood: '',
          engagement: '',
          notes: ''
        });
      } else {
        toast.error(data.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
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
              Create New Therapy Session
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

                {/* Session Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Type *
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
                  <select
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.startTime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {timeSlots.map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  {errors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    min="15"
                    max="240"
                    step="15"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.duration ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
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
                    <span className="text-gray-900">{formData.endTime}</span>
                  </div>
                </div>
              </div>
            </ModernCard>

            {/* Session Content */}
            <ModernCard className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-purple-600" />
                Session Content
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Objectives */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objectives
                  </label>
                  <textarea
                    value={formData.objectives}
                    onChange={(e) => handleInputChange('objectives', e.target.value)}
                    rows={3}
                    placeholder="What are the main objectives for this session?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Activities */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Planned Activities
                  </label>
                  <textarea
                    value={formData.activities}
                    onChange={(e) => handleInputChange('activities', e.target.value)}
                    rows={3}
                    placeholder="What activities will be conducted during this session?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Goals */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goals
                  </label>
                  <textarea
                    value={formData.goals}
                    onChange={(e) => handleInputChange('goals', e.target.value)}
                    rows={2}
                    placeholder="What are the specific goals for this session?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </ModernCard>

            {/* Session Assessment */}
            <ModernCard className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-orange-600" />
                Session Assessment
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mood */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Mood
                  </label>
                  <select
                    value={formData.mood}
                    onChange={(e) => handleInputChange('mood', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select mood</option>
                    {moodOptions.map(mood => (
                      <option key={mood.value} value={mood.value}>
                        {mood.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Engagement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Engagement Level
                  </label>
                  <select
                    value={formData.engagement}
                    onChange={(e) => handleInputChange('engagement', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select engagement</option>
                    {engagementOptions.map(engagement => (
                      <option key={engagement.value} value={engagement.value}>
                        {engagement.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Observations */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observations
                  </label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => handleInputChange('observations', e.target.value)}
                    rows={3}
                    placeholder="Record any observations during the session"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Progress */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress Notes
                  </label>
                  <textarea
                    value={formData.progress}
                    onChange={(e) => handleInputChange('progress', e.target.value)}
                    rows={3}
                    placeholder="Document progress made during this session"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Challenges */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Challenges
                  </label>
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => handleInputChange('challenges', e.target.value)}
                    rows={2}
                    placeholder="Note any challenges encountered"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Next Steps */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Next Steps
                  </label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                    rows={2}
                    placeholder="What are the next steps for the patient?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Additional Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Any additional notes or comments"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
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
                    Create Session
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
