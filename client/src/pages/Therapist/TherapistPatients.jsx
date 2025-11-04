import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  X,
  FileText,
  BarChart3,
  Save,
  Trash2
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import InitialsAvatar from '../../components/InitialsAvatar';

const TherapistPatients = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingGoals, setEditingGoals] = useState(false);
  const [editedGoals, setEditedGoals] = useState([]);

  // Fetch patients data from API
  const { data: patientsData, isLoading, error, refetch } = useQuery(
    'therapistPatients',
    () => therapistAPI.getPatients(user?.id),
    {
      enabled: !!user?.id, // Only run query when user ID is available
      refetchInterval: 60000, // Refetch every 1 minute (reduced frequency)
    }
  );


  // Transform API data to match component expectations
  const patients = (patientsData?.data?.data?.patients || []).map(patient => {
    // Calculate age from date of birth
    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return 'N/A';
      const today = new Date();
      const birthDate = new Date(dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    };

    // Format goals as array
    const formatGoals = (goals) => {
      if (!goals) return ['No goals set'];
      try {
        // If goals is a JSON string, parse it
        if (typeof goals === 'string') {
          const parsed = JSON.parse(goals);
          return Array.isArray(parsed) ? parsed : [parsed];
        }
        // If goals is already an array, return it
        if (Array.isArray(goals)) return goals;
        // Otherwise, wrap in array
        return [goals];
      } catch {
        return [goals];
      }
    };

    return {
      id: patient.id,
      name: `${patient.firstName} ${patient.lastName}`,
      age: calculateAge(patient.dateOfBirth),
      gender: patient.gender || 'Not specified',
      status: patient.status || 'active',
      progress: parseFloat(patient.progress?.overallProgress || 0),
      lastSession: 'No recent session', // TODO: Get from session data
      nextSession: 'No upcoming session', // TODO: Get from appointment data
      diagnosis: patient.diagnosis || 'Not specified',
      therapist: 'Current Therapist', // TODO: Get therapist name from API
      phone: patient.phone || 'Not provided',
      email: patient.email || 'Not provided',
      address: patient.address || 'Not provided',
      city: patient.city || '',
      state: patient.state || '',
      zipCode: patient.zipCode || '',
      goals: formatGoals(patient.goals),
      medicalHistory: patient.medicalHistory || 'No medical history provided',
      emergencyContact: patient.emergencyContact || 'Not provided',
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
      // Include full progress data
      progressData: patient.progress || {
        overallProgress: 0,
        sessionsCompleted: 0,
        goalsAchieved: 0,
        activeTreatmentPlans: 0,
        assessmentsCompleted: 0
      }
    };
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: patients.length,
    active: patients.filter(p => p.status === 'active').length,
    pending: patients.filter(p => p.status === 'pending').length,
    completed: patients.filter(p => p.status === 'completed').length,
    averageProgress: Math.round(patients.reduce((acc, p) => acc + p.progress, 0) / patients.length)
  };

  // Handle schedule session navigation
  const handleScheduleSession = (patient) => {
    setSelectedPatient(null);
    navigate('/therapist/schedule', { 
      state: { 
        selectedPatient: patient,
        mode: 'schedule'
      } 
    });
  };

  // Handle therapy goals editing
  const handleEditGoals = () => {
    setEditingGoals(true);
    setEditedGoals([...selectedPatient.goals]);
  };

  const handleSaveGoals = async () => {
    try {
      // Call API to update patient goals
      await therapistAPI.updatePatientGoals(selectedPatient.id, editedGoals);
      
      // Update local state
      setSelectedPatient({
        ...selectedPatient,
        goals: editedGoals
      });
      setEditingGoals(false);
      
      // Refetch patients data to ensure consistency
      refetch();
    } catch (error) {
      // Show error message to user
      alert('Failed to update goals. Please try again.');
    }
  };

  const handleCancelEditGoals = () => {
    setEditingGoals(false);
    setEditedGoals([]);
  };

  const handleAddGoal = () => {
    setEditedGoals([...editedGoals, '']);
  };

  const handleRemoveGoal = (index) => {
    setEditedGoals(editedGoals.filter((_, i) => i !== index));
  };

  const handleGoalChange = (index, value) => {
    const newGoals = [...editedGoals];
    newGoals[index] = value;
    setEditedGoals(newGoals);
  };

  // Loading state
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

  // Error state
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

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {patients.slice(0, 3).map(patient => (
            <div key={patient.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <InitialsAvatar 
                name={patient.name} 
                size="md" 
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{patient.name}</h4>
                <p className="text-sm text-gray-600">Last session: {patient.lastSession}</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{patient.progressData?.overallProgress || '0.0'}%</div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPatientList = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search patients by name or diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(patient => (
          <div key={patient.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col h-full">
            <div className="p-6 flex flex-col h-full">
              {/* Patient Header */}
              <div className="flex items-center gap-4 mb-6">
                <InitialsAvatar 
                  name={patient.name} 
                  size="lg" 
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">{patient.name}</h3>
                  <p className="text-sm text-gray-600">{patient.age} years old • {patient.gender}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  patient.status === 'active' ? 'bg-green-100 text-green-700' :
                  patient.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {patient.status}
                </span>
              </div>

              {/* Patient Information */}
              <div className="space-y-4 mb-6 flex-1">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Diagnosis</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{patient.diagnosis}</p>
                </div>

                {/* Therapist Assignments */}
                {patient.therapistAssignments && patient.therapistAssignments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Therapist Team</p>
                    <div className="space-y-1">
                      {patient.therapistAssignments.slice(0, 2).map((assignment, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="text-sm text-gray-900">{assignment.therapistName}</div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            assignment.assignmentType === 'primary' ? 'bg-blue-100 text-blue-800' :
                            assignment.assignmentType === 'secondary' ? 'bg-gray-100 text-gray-800' :
                            assignment.assignmentType === 'collaborative' ? 'bg-green-100 text-green-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {assignment.assignmentType}
                          </span>
                        </div>
                      ))}
                      {patient.therapistAssignments.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{patient.therapistAssignments.length - 2} more therapist{patient.therapistAssignments.length - 2 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Progress</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${patient.progressData?.overallProgress || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 min-w-[3rem]">{patient.progressData?.overallProgress || '0.0'}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 truncate">Next: {patient.nextSession}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-auto">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button 
                  onClick={() => handleScheduleSession(patient)}
                  className="flex-1 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'patients':
        return renderPatientList();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="therapist-patients p-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Patient Management</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your patients, track progress, and coordinate care effectively
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('patients')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'patients'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              All Patients
            </button>
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modern Header Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-t-2xl">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <InitialsAvatar 
                    name={selectedPatient.name} 
                    size="3xl" 
                    className="border-4 border-white/30 shadow-lg"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white ${
                    selectedPatient.status === 'active' 
                      ? 'bg-green-500' 
                      : selectedPatient.status === 'pending'
                      ? 'bg-yellow-500'
                      : selectedPatient.status === 'inactive'
                      ? 'bg-red-500'
                      : 'bg-gray-500'
                  }`}></div>
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">
                    {selectedPatient.name}
                  </h2>
                  <p className="text-blue-100 text-lg">
                    {selectedPatient.gender} • {selectedPatient.age} years old
                  </p>
                  <div className="mt-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30`}>
                      {selectedPatient.status}
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
                      <p className="text-gray-900 font-medium">{selectedPatient.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-gray-900 font-medium">{selectedPatient.email}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                      <p className="text-gray-900 font-medium">{selectedPatient.phone}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Gender</label>
                      <p className="text-gray-900 font-medium">{selectedPatient.gender}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</label>
                      <p className="text-gray-900 font-medium">
                        {selectedPatient.address}
                        {selectedPatient.city && `, ${selectedPatient.city}`}
                        {selectedPatient.state && `, ${selectedPatient.state}`}
                        {selectedPatient.zipCode && ` ${selectedPatient.zipCode}`}
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
                      <p className="text-gray-900 font-medium">{selectedPatient.diagnosis}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Medical History</label>
                      <p className="text-gray-900 font-medium">{selectedPatient.medicalHistory}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Treatment Status</label>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedPatient.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedPatient.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : selectedPatient.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPatient.status}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Emergency Contact</label>
                      <p className="text-gray-900 font-medium">{selectedPatient.emergencyContact}</p>
                    </div>
                  </div>
                </div>

                {/* Therapy Goals */}
                <div className="bg-gray-50 rounded-xl p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Target className="h-5 w-5 text-purple-600" />
                      </div>
                      Therapy Goals
                    </h3>
                    {!editingGoals && (
                      <button
                        onClick={handleEditGoals}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Goals
                      </button>
                    )}
                  </div>
                  
                  {editingGoals ? (
                    <div className="space-y-4">
                      {editedGoals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <input
                            type="text"
                            value={goal}
                            onChange={(e) => handleGoalChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
                            placeholder="Enter therapy goal..."
                          />
                          <button
                            onClick={() => handleRemoveGoal(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove goal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      
                      <div className="flex gap-3">
                        <button
                          onClick={handleAddGoal}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          Add Goal
                        </button>
                        <button
                          onClick={handleSaveGoals}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 text-sm"
                        >
                          <Save className="h-4 w-4" />
                          Save Goals
                        </button>
                        <button
                          onClick={handleCancelEditGoals}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedPatient.goals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="text-gray-900 font-medium">{goal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Progress Tracking */}
                <div className="bg-gray-50 rounded-xl p-6 lg:col-span-2">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    Progress Tracking
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900">{selectedPatient.progressData?.overallProgress || '0.0'}%</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Overall Progress</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900">{selectedPatient.progressData?.sessionsCompleted || 0}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Sessions Completed</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900">{selectedPatient.progressData?.goalsAchieved || 0}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Goals Achieved</div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-4 border border-gray-200">
                      <div className="text-2xl font-bold text-gray-900">{selectedPatient.progressData?.assessmentsCompleted || 0}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wide">Assessments Done</div>
                    </div>
                  </div>
                  
                  {/* Additional Progress Information */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Active Treatment Plans</h4>
                      <div className="text-2xl font-bold text-blue-600">{selectedPatient.progressData?.activeTreatmentPlans || 0}</div>
                      <div className="text-xs text-gray-500">Currently in progress</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Progress Status</h4>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          parseFloat(selectedPatient.progressData?.overallProgress || 0) >= 80 ? 'bg-green-500' :
                          parseFloat(selectedPatient.progressData?.overallProgress || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-900">
                          {parseFloat(selectedPatient.progressData?.overallProgress || 0) >= 80 ? 'Excellent' :
                           parseFloat(selectedPatient.progressData?.overallProgress || 0) >= 50 ? 'Good' : 'Needs Attention'}
                        </span>
                      </div>
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
                  onClick={() => handleScheduleSession(selectedPatient)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistPatients;
