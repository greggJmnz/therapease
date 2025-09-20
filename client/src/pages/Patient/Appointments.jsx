import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Calendar, Clock, User, MapPin, Plus, Edit, X } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const Appointments = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [assignedTherapist, setAssignedTherapist] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  // Fetch appointments data from API
  const { data: appointmentsData, isLoading: appointmentsLoading, error: appointmentsError } = useQuery(
    'patientAppointments',
    patientAPI.getAppointments,
    {
      onError: (error) => {
        toast.error('Failed to load appointments');
        console.error('Error fetching appointments:', error);
      }
    }
  );

  // Fetch patient profile to get assigned therapist
  const { data: profileData, isLoading: profileLoading } = useQuery(
    'patientProfile',
    patientAPI.getProfile,
    {
      onSuccess: (data) => {
        if (data?.data?.therapistId) {
          setAssignedTherapist({
            id: data.data.therapistId,
            name: data.data.therapistName || 'Your Therapist',
            specialization: data.data.therapistSpecialization || 'Occupational Therapy'
          });
        }
      },
      onError: (error) => {
        console.error('Error fetching patient profile:', error);
      }
    }
  );

  // Update state with API data
  React.useEffect(() => {
    if (appointmentsData?.data?.appointments) {
      setAppointments(appointmentsData.data.appointments);
    }
    setIsLoading(appointmentsLoading || profileLoading);
  }, [appointmentsData, appointmentsLoading, profileLoading]);

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
      // This will be implemented with actual API call
      const newAppointment = {
        id: Date.now(),
        date: selectedDate,
        time: selectedTime,
        therapist: assignedTherapist.name,
        type: 'Regular Session',
        status: 'pending',
        location: 'Main Clinic - Room 3',
        reason
      };

      setAppointments([newAppointment, ...appointments]);
      setShowBookingForm(false);
      resetForm();
      toast.success('Appointment booked successfully!');
    } catch (error) {
      toast.error('Failed to book appointment');
    }
  };

  const resetForm = () => {
    setSelectedDate('');
    setSelectedTime('');
    setReason('');
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      await patientAPI.cancelAppointment(appointmentId);
      setAppointments(appointments.filter(apt => apt.id !== appointmentId));
      toast.success('Appointment cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel appointment');
      console.error('Cancel appointment error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="mt-2 text-sm text-gray-700">
            Book and manage your therapy appointments
          </p>
        </div>
        <button
          onClick={() => setShowBookingForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Book Appointment
        </button>
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

      {/* Appointments List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.therapist}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {appointment.date}
                        <Clock className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {appointment.time}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {appointment.type}
                        <MapPin className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {appointment.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {appointment.status === 'confirmed' && (
                      <button
                        onClick={() => cancelAppointment(appointment.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-red-700 bg-red-100 hover:bg-red-200"
                      >
                        Cancel
                      </button>
                    )}
                    {appointment.status === 'pending' && (
                      <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-full text-blue-700 bg-blue-100 hover:bg-blue-200">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* No Appointments Message */}
      {appointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by booking your first appointment.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowBookingForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
