import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  ChevronLeft
} from 'lucide-react';
import { ModernCard, ModernButton, ModernInput, ModernSelect } from './index';

const PatientSessionScheduler = ({ patientId, patientName, onScheduleUpdate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [sessionType, setSessionType] = useState('therapy');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const sessionTypes = [
    { value: 'therapy', label: 'Therapy Session' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'follow-up', label: 'Follow-up' },
    { value: 'evaluation', label: 'Evaluation' }
  ];

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  const recurringPatterns = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  // Generate time slots from 8 AM to 6 PM
  const timeSlots = [];
  for (let hour = 8; hour <= 18; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeSlots.push({ value: time, label: time });
    }
  }

  const fetchPatientSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/therapist/schedule?patientId=${patientId}&date=${selectedDate.toISOString().split('T')[0]}`);
      const data = await response.json();
      if (data.success) {
        setSessions(data.data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId, selectedDate]);

  useEffect(() => {
    if (patientId) {
      fetchPatientSessions();
    }
  }, [patientId, selectedDate, fetchPatientSessions]);

  const handleCreateSession = async () => {
    try {
      const sessionData = {
        patientId,
        appointmentDate: selectedDate.toISOString().split('T')[0],
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, duration),
        duration,
        type: sessionType,
        notes,
        recurring,
        recurringPattern,
        recurringEndDate: recurring ? recurringEndDate : null
      };

      const response = await fetch('/api/therapist/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        resetForm();
        fetchPatientSessions();
        onScheduleUpdate && onScheduleUpdate();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const calculateEndTime = (startTime, durationMinutes) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setSelectedTime('09:00');
    setDuration(60);
    setSessionType('therapy');
    setNotes('');
    setRecurring(false);
    setRecurringPattern('weekly');
    setRecurringEndDate('');
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setSelectedDate(new Date(session.appointmentDate));
    setSelectedTime(session.startTime);
    setDuration(session.duration);
    setSessionType(session.type);
    setNotes(session.notes || '');
    setShowAddModal(true);
  };

  const handleUpdateSession = async () => {
    try {
      const sessionData = {
        appointmentDate: selectedDate.toISOString().split('T')[0],
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, duration),
        duration,
        type: sessionType,
        notes
      };

      const response = await fetch(`/api/therapist/schedule/${editingSession.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddModal(false);
        setEditingSession(null);
        resetForm();
        fetchPatientSessions();
        onScheduleUpdate && onScheduleUpdate();
      }
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        const response = await fetch(`/api/therapist/schedule/${sessionId}`, {
          method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
          fetchPatientSessions();
          onScheduleUpdate && onScheduleUpdate();
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Schedule</h2>
          <p className="text-gray-600">Manage sessions for {patientName}</p>
        </div>
        <ModernButton
          onClick={() => setShowAddModal(true)}
          icon={Plus}
          variant="primary"
        >
          Add Session
        </ModernButton>
      </div>

      {/* Calendar View */}
      <ModernCard variant="elevated">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Calendar</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {formatDate(selectedDate)}
              </span>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>

          {/* Sessions for selected date */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Loading sessions...</p>
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </p>
                      <p className="text-sm text-gray-600">{session.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <button
                      onClick={() => handleEditSession(session)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No sessions scheduled for this date</p>
              </div>
            )}
          </div>
        </div>
      </ModernCard>

      {/* Add/Edit Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSession ? 'Edit Session' : 'Add New Session'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSession(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <ModernInput
                label="Date"
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
              />

              <ModernInput
                label="Start Time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />

              <ModernSelect
                label="Duration"
                options={durationOptions}
                value={duration}
                onChange={(value) => setDuration(value)}
              />

              <ModernSelect
                label="Session Type"
                options={sessionTypes}
                value={sessionType}
                onChange={(value) => setSessionType(value)}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                  Recurring Session
                </label>
              </div>

              {recurring && (
                <div className="space-y-3 pl-6 border-l-2 border-gray-200">
                  <ModernSelect
                    label="Pattern"
                    options={recurringPatterns}
                    value={recurringPattern}
                    onChange={(value) => setRecurringPattern(value)}
                  />
                  <ModernInput
                    label="End Date"
                    type="date"
                    value={recurringEndDate}
                    onChange={(e) => setRecurringEndDate(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Session notes, goals, or special instructions..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <ModernButton
                onClick={editingSession ? handleUpdateSession : handleCreateSession}
                variant="primary"
                className="flex-1"
              >
                {editingSession ? 'Update Session' : 'Create Session'}
              </ModernButton>
              <ModernButton
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSession(null);
                  resetForm();
                }}
                variant="secondary"
              >
                Cancel
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientSessionScheduler;
