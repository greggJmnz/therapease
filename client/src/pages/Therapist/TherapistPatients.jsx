import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  MessageSquare, 
  Calendar,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import InitialsAvatar from '../../components/InitialsAvatar';

const TherapistPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch patients data from API
  const { data: patientsData, isLoading, error, refetch } = useQuery(
    'therapistPatients',
    therapistAPI.getPatients,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );


  // Transform API data to match component expectations (double nesting)
  const patients = (patientsData?.data?.data?.patients || []).map(patient => ({
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A',
    gender: patient.gender || 'Not specified',
    status: patient.status || 'active',
    progress: 75, // This would come from progress tracking data - using consistent value
    lastSession: 'No recent session', // This would come from session data
    nextSession: 'No upcoming session', // This would come from appointment data
    diagnosis: patient.diagnosis || 'Not specified',
    therapist: 'Dr. Sarah Wilson',
    phone: patient.phone || 'Not provided',
    email: patient.email || 'Not provided',
    address: patient.address || 'Not provided',
    goals: patient.goals ? [patient.goals] : ['No goals set'],
    notes: 'Patient data loaded from database.'
  }));

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
                <div className="text-sm font-medium text-gray-900">{patient.progress}%</div>
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
          <div key={patient.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <InitialsAvatar 
                    name={patient.name} 
                    size="lg" 
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{patient.name}</h3>
                    <p className="text-sm text-gray-600">{patient.age} years old • {patient.gender}</p>
                  </div>
                </div>

              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Diagnosis</p>
                  <p className="text-sm text-gray-600">{patient.diagnosis}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${patient.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{patient.progress}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Next: {patient.nextSession}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  patient.status === 'active' ? 'bg-green-100 text-green-700' :
                  patient.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {patient.status}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  View Details
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Message
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Management</h1>
        <p className="text-gray-600">
          Manage your patients, track progress, and coordinate care effectively
        </p>
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
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Patient Details</h3>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Patient Info */}
                <div className="lg:col-span-1">
                  <div className="text-center mb-6">
                    <InitialsAvatar 
                      name={selectedPatient.name} 
                      size="3xl" 
                      className="mx-auto mb-4"
                    />
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">{selectedPatient.name}</h4>
                    <p className="text-gray-600">{selectedPatient.age} years old • {selectedPatient.gender}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedPatient.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedPatient.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700">{selectedPatient.address}</span>
                    </div>
                  </div>
                </div>

                {/* Patient Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Diagnosis</h5>
                    <p className="text-gray-700">{selectedPatient.diagnosis}</p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Therapy Goals</h5>
                    <ul className="space-y-1">
                      {selectedPatient.goals.map((goal, index) => (
                        <li key={index} className="flex items-center gap-2 text-gray-700">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Progress</h5>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                          style={{ width: `${selectedPatient.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-lg font-bold text-gray-900">{selectedPatient.progress}%</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">Notes</h5>
                    <p className="text-gray-700">{selectedPatient.notes}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Last Session</h5>
                      <p className="text-gray-700">{selectedPatient.lastSession}</p>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 mb-2">Next Session</h5>
                      <p className="text-gray-700">{selectedPatient.nextSession}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 mt-8">
                <div className="flex gap-3">
                  <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl hover:bg-blue-700 transition-colors font-medium">
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Patient
                  </button>
                  <button className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors font-medium">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Schedule Session
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors font-medium">
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TherapistPatients;
