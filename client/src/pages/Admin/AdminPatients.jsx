import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  UserCheck,
  Calendar,
  X,
  Phone,
  User,
  FileText,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import InitialsAvatar from '../../components/InitialsAvatar';

const AdminPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Fetch patients data from API
  const { data: patientsData, isLoading, error, refetch } = useQuery(
    'adminPatients',
    adminAPI.getPatients,
    {
      onError: (error) => {
        toast.error('Failed to load patients data');
        console.error('Error fetching patients:', error);
      }
    }
  );

  // Extract patients from API response (admin API has double nesting)
  const patients = (patientsData?.data?.data?.users || [])
    .filter(user => user.role === 'patient')
    .map(patient => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone || 'N/A',
      gender: patient.gender || 'N/A',
      dateOfBirth: patient.dateOfBirth,
      address: patient.address || 'N/A',
      city: patient.city || 'N/A',
      state: patient.state || 'N/A',
      zipCode: patient.zipCode || 'N/A',
      diagnosis: patient.diagnosis || 'N/A',
      goals: patient.goals || 'N/A',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      patient: patient.patient || {}
    }));


  // Loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load patients</div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Filter and search functionality
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || (patient.patient?.status || 'active') === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEditPatient = (patient) => {
    setEditingPatient({ ...patient });
    setSelectedPatient(null);
  };

  const handleSavePatient = async () => {
    if (editingPatient) {
      try {
        // Prepare the data for the API call
        const updateData = {
          firstName: editingPatient.firstName,
          lastName: editingPatient.lastName,
          email: editingPatient.email,
          phone: editingPatient.phone,
          gender: editingPatient.gender,
          dateOfBirth: editingPatient.dateOfBirth,
          address: editingPatient.address,
          city: editingPatient.city,
          state: editingPatient.state,
          zipCode: editingPatient.zipCode,
          // Patient-specific data
          patient: {
            diagnosis: editingPatient.patient?.diagnosis || '',
            medicalHistory: editingPatient.patient?.medicalHistory || '',
            status: editingPatient.patient?.status || 'active'
          }
        };

        await adminAPI.updateUser(editingPatient.id, updateData);
        toast.success('Patient updated successfully');
        setEditingPatient(null);
        refetch(); // Refresh data from API
      } catch (error) {
        console.error('Error updating patient:', error);
        toast.error('Failed to update patient');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingPatient(null);
  };

  const handleInputChange = (field, value) => {
    if (editingPatient) {
      if (field.startsWith('patient.')) {
        const patientField = field.replace('patient.', '');
        setEditingPatient(prev => ({
          ...prev,
          patient: {
            ...prev.patient,
            [patientField]: value
          }
        }));
      } else {
        setEditingPatient(prev => ({ ...prev, [field]: value }));
      }
    }
  };

  const handleDeletePatient = async (patientId) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      try {
        await adminAPI.deleteUser(patientId);
        toast.success('Patient deleted successfully');
        refetch(); // Refresh data from API
      } catch (error) {
        console.error('Error deleting patient:', error);
        toast.error('Failed to delete patient');
      }
    }
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
  };

  const closeModal = () => {
    setSelectedPatient(null);
    setEditingPatient(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Patient Management
              </h1>
              <p className="text-gray-600 mt-2">
                Manage and monitor all patients in the system
              </p>
            </div>
      </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Patients</p>
                <p className="text-3xl font-bold text-gray-900">{patients.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
      </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Patients</p>
                <p className="text-3xl font-bold text-green-600">
                  {patients.filter(p => (p.patient?.status || 'active') === 'active').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
            </div>
      </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New This Month</p>
                <p className="text-3xl font-bold text-purple-600">
                  {patients.filter(p => {
                    const createdDate = new Date(p.createdAt);
                    const now = new Date();
                    return createdDate.getMonth() === now.getMonth() && 
                           createdDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
      </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                <p className="text-3xl font-bold text-orange-600">
                  {patients.filter(p => (p.patient?.status || 'active') === 'pending').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
      </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
                  placeholder="Search patients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
            </div>
            <div className="flex gap-2">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
                <option value="discharged">Discharged</option>
          </select>
              <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors">
                <Filter className="h-5 w-5" />
                Filter
              </button>
            </div>
        </div>
      </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diagnosis
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
            </tr>
          </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <InitialsAvatar 
                          name={`${patient.firstName} ${patient.lastName}`} 
                          size="md" 
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {patient.gender} • {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.email}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {patient.phone || 'N/A'}
                  </div>
                </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{patient.diagnosis || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{patient.goals || 'No goals set'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (patient.patient?.status || 'active') === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : (patient.patient?.status || 'active') === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : (patient.patient?.status || 'active') === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : (patient.patient?.status || 'active') === 'discharged'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.patient?.status || 'active'}
                  </span>
                </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewPatient(patient)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                  </button>
                        <button 
                          onClick={() => handleEditPatient(patient)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit Patient"
                        >
                          <Edit className="h-4 w-4" />
                  </button>
                        <button 
                          onClick={() => handleDeletePatient(patient.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Patient"
                        >
                          <Trash2 className="h-4 w-4" />
                  </button>
                      </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

          {filteredPatients.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first patient.'
                }
              </p>
            </div>
          )}
                </div>


        {/* View Patient Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modern Header Section */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-t-2xl">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <InitialsAvatar 
                      name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} 
                      size="3xl" 
                      className="border-4 border-white/30 shadow-lg"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                      (selectedPatient.patient?.status || 'active') === 'active' 
                        ? 'bg-green-500' 
                        : (selectedPatient.patient?.status || 'active') === 'pending'
                        ? 'bg-yellow-500'
                        : (selectedPatient.patient?.status || 'active') === 'inactive'
                        ? 'bg-red-500'
                        : 'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                    <p className="text-blue-100 text-lg">
                      {selectedPatient.gender || 'N/A'} • {selectedPatient.dateOfBirth ? 
                        new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear() + ' years old' 
                        : 'N/A'}
                    </p>
                    <div className="mt-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30`}>
                        {selectedPatient.patient?.status || 'active'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Profile Information Grid */}
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.gender || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date of Birth</label>
                        <p className="text-gray-900 font-medium">
                          {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      Medical Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnosis</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.patient?.diagnosis || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medical History</label>
                        <p className="text-gray-900 font-medium">{selectedPatient.patient?.medicalHistory || 'No significant medical history'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Treatment Status</label>
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          (selectedPatient.patient?.status || 'active') === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : (selectedPatient.patient?.status || 'active') === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : (selectedPatient.patient?.status || 'active') === 'inactive'
                            ? 'bg-red-100 text-red-800'
                            : (selectedPatient.patient?.status || 'active') === 'discharged'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedPatient.patient?.status || 'active'}
                        </span>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient Since</label>
                        <p className="text-gray-900 font-medium">
                          {selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Tracking */}
                  <div className="bg-gray-50 rounded-xl p-6 lg:col-span-2">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-purple-600" />
                      </div>
                      Progress Tracking
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-2xl font-bold text-gray-900">0%</div>
                        <div className="text-sm text-gray-500 uppercase tracking-wide">Overall Progress</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-2xl font-bold text-gray-900">0</div>
                        <div className="text-sm text-gray-500 uppercase tracking-wide">Sessions Completed</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                        <div className="text-2xl font-bold text-gray-900">0</div>
                        <div className="text-sm text-gray-500 uppercase tracking-wide">Goals Achieved</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 bg-gray-50 rounded-b-2xl border-t border-gray-200">
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPatient(null);
                      handleEditPatient(selectedPatient);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Patient
                  </button>
                  <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Reports
                  </button>
                  <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Patient Modal */}
        {editingPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Patient</h2>
                    <p className="text-blue-100 mt-1">Update patient information and medical details</p>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Personal Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      Personal Information
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                        <input
                          type="text"
                          value={editingPatient.firstName || ''}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                        <input
                          type="text"
                          value={editingPatient.lastName || ''}
                          onChange={(e) => handleInputChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        value={editingPatient.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={editingPatient.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        <select
                          value={editingPatient.gender || ''}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={editingPatient.dateOfBirth ? editingPatient.dateOfBirth.split('T')[0] : ''}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <input
                        type="text"
                        value={editingPatient.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                        <input
                          type="text"
                          value={editingPatient.city || ''}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                        <input
                          type="text"
                          value={editingPatient.state || ''}
                          onChange={(e) => handleInputChange('state', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                        <input
                          type="text"
                          value={editingPatient.zipCode || ''}
                          onChange={(e) => handleInputChange('zipCode', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Medical Information */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                      Medical Information
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis</label>
                      <textarea
                        value={editingPatient.patient?.diagnosis || ''}
                        onChange={(e) => handleInputChange('patient.diagnosis', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter primary diagnosis..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                      <textarea
                        value={editingPatient.patient?.medicalHistory || ''}
                        onChange={(e) => handleInputChange('patient.medicalHistory', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter medical history and relevant information..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Status</label>
                      <select
                        value={editingPatient.patient?.status || 'active'}
                        onChange={(e) => handleInputChange('patient.status', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="discharged">Discharged</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePatient}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
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

export default AdminPatients;