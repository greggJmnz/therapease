import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  X,
  Phone,
  User,
  FileText,
  MoreVertical,
  TrendingUp,
  UserCheck,
  CheckCircle,
  Clock,
  Calendar,
  BarChart3,
  AlertTriangle
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Avatar from '../../components/Avatar';
import './AdminPatients.css';

const AdminPatients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAddTherapistModal, setShowAddTherapistModal] = useState(false);
  const [reportsPatient, setReportsPatient] = useState(null);
  const [schedulePatient, setSchedulePatient] = useState(null);
  const [assignmentPatient, setAssignmentPatient] = useState(null);
  const [addTherapistPatient, setAddTherapistPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [actionDropdowns, setActionDropdowns] = useState({});
  const [patientTherapists, setPatientTherapists] = useState({});
  const dropdownRefs = useRef({});

  // Fetch patient therapists
  const fetchPatientTherapists = async (patientId) => {
    try {
      const response = await adminAPI.getPatientTherapists(patientId);
      if (response.data.success) {
        setPatientTherapists(prev => ({
          ...prev,
          [patientId]: response.data.data.therapists || []
        }));
      }
    } catch (error) {
      console.error('Error fetching patient therapists:', error);
    }
  };

  // Fetch patients data from API
  const { data: patientsData, isLoading, error, refetch } = useQuery(
    'adminPatients',
    adminAPI.getPatients,
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
      cacheTime: 0,
      onError: (error) => {
        toast.error('Failed to load patients data');
        console.error('Error fetching patients:', error);
      }
    }
  );

  // Load patient therapists when patients data is available
  useEffect(() => {
    if (patientsData?.data?.data?.users) {
      const patients = patientsData.data.data.users.filter(user => user.role === 'patient');
      patients.forEach(patient => {
        if (patient.patient?.id) {
          fetchPatientTherapists(patient.patient.id);
        }
      });
    }
  }, [patientsData]);

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setActionDropdowns({});
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.patient-action-dropdown') && !event.target.closest('.dropdown-trigger')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check authentication
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  // Check if user is authenticated
  if (!token || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Authentication Required</div>
          <p className="text-gray-600 mb-4">You need to be logged in as an admin to access this page.</p>
          <button 
            onClick={() => {
              // Auto-login as admin for testing
              const loginData = {
                email: 'admin@therapease.com',
                password: 'Admin123!@#'
              };
              
              fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  localStorage.setItem('token', data.data.token);
                  localStorage.setItem('user', JSON.stringify(data.data.user));
                  localStorage.setItem('userRole', data.data.user.role);
                  localStorage.setItem('userId', data.data.user.id);
                  window.location.reload();
                } else {
                  alert('Login failed: ' + data.error);
                }
              })
              .catch(error => {
                console.error('Login error:', error);
                alert('Login failed: ' + error.message);
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login as Admin (Test)
          </button>
        </div>
      </div>
    );
  }
  

  // Extract patients from API response (admin API has double nesting)
  const patients = (patientsData?.data?.data?.users || [])
    .filter(user => user.role === 'patient')
    .map(patient => {
      return {
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
        therapistId: patient.patient?.therapistId || null,
        therapistName: patient.therapistName || (patient.patient?.therapistId ? 'Assigned' : 'Not assigned'),
        status: patient.status || patient.patient?.status || 'active', // Use user status, fallback to patient status
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        patient: patient.patient || {}
      };
    });


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
            className="patient-btn-primary"
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
    
    const matchesStatus = filterStatus === 'all' || (patient.status || 'active') === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEditPatient = (patient) => {
    console.log('Edit patient clicked:', patient);
    setEditingPatient({ ...patient });
    setSelectedPatient(null);
    setActiveTab('personal'); // Reset to personal tab when opening edit modal
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
            status: editingPatient.status || 'active'
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
    console.log('Delete patient clicked:', patientId);
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
    console.log('View patient clicked:', patient);
    setSelectedPatient(patient);
  };

  const closeModal = () => {
    setSelectedPatient(null);
    setEditingPatient(null);
    setShowReportsModal(false);
    setShowScheduleModal(false);
    setShowAssignmentModal(false);
    setShowAddTherapistModal(false);
    setReportsPatient(null);
    setSchedulePatient(null);
    setAssignmentPatient(null);
    setAddTherapistPatient(null);
  };

  const handleViewReports = (patient) => {
    setReportsPatient(patient);
    setShowReportsModal(true);
    setSelectedPatient(null);
  };

  const handleScheduleSession = (patient) => {
    setSchedulePatient(patient);
    setShowScheduleModal(true);
    setSelectedPatient(null);
  };

  const handleAssignTherapist = (patient) => {
    setAssignmentPatient(patient);
    setShowAssignmentModal(true);
    setSelectedPatient(null);
  };

  const handleAddTherapist = (patient) => {
    setAddTherapistPatient(patient);
    setShowAddTherapistModal(true);
    setSelectedPatient(null);
  };

  // Dropdown functionality
  const toggleActionDropdown = (patientId) => {
    setActionDropdowns(prev => ({
      ...prev,
      [patientId]: !prev[patientId]
    }));
  };

  // Check if dropdown should open upward
  const shouldOpenUpward = (patientId) => {
    const button = dropdownRefs.current[patientId];
    if (!button) return false;
    
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // Approximate dropdown height
    const spaceBelow = viewportHeight - rect.bottom;
    
    return spaceBelow < dropdownHeight && rect.top > dropdownHeight;
  };

  return (
    <>
    <div className="admin-dashboard">
      {/* Header */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              Patient Management
            </h1>
            <p>Manage and monitor all patients in the system</p>
          </div>
        </div>
      </div>

        {/* Stats Cards */}
        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon patients">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Patients</h3>
              <p className="stat-number">{patients.length}</p>
              <span className="stat-change positive">
                <TrendingUp size={16} />
                Active
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon therapists">
              <UserCheck size={24} />
            </div>
            <div className="stat-content">
              <h3>Active Patients</h3>
              <p className="stat-number">
                {patients.filter(p => (p.status || 'active') === 'active').length}
              </p>
              <span className="stat-change positive">
                <CheckCircle size={16} />
                In Treatment
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon appointments">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>New This Month</h3>
              <p className="stat-number">
                {patients.filter(p => {
                  const createdDate = new Date(p.createdAt);
                  const now = new Date();
                  return createdDate.getMonth() === now.getMonth() && 
                         createdDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
              <span className="stat-change positive">
                <TrendingUp size={16} />
                Growth
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon revenue">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3>Pending Reviews</h3>
              <p className="stat-number">
                {patients.filter(p => (p.status || 'active') === 'pending').length}
              </p>
              <span className="stat-change neutral">
                <Clock size={16} />
                Awaiting
              </span>
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
              <button className="patient-btn-secondary">
                <Filter className="h-5 w-5" />
                Filter
              </button>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
          <div className="patients-table-container overflow-x-auto overflow-y-visible">
            <table className="patients-table w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Therapists
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
                        <Avatar 
                          name={`${patient.firstName} ${patient.lastName}`} 
                          profileImage={patient.profileImage}
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
                    <td className="px-6 py-4">
                      {(() => {
                        const patientId = patient.patient?.id;
                        const therapists = patientTherapists[patientId] || [];
                        if (therapists.length === 0) {
                          return (
                            <div>
                              <div className="text-sm text-gray-900">Not assigned</div>
                              <div className="text-sm text-gray-500">No therapists</div>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-1">
                            {therapists.slice(0, 2).map((therapist, index) => (
                              <div key={therapist.id} className="flex items-center gap-2">
                                <div className="text-sm text-gray-900">{therapist.name}</div>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  therapist.assignmentType === 'primary' ? 'bg-blue-100 text-blue-800' :
                                  therapist.assignmentType === 'secondary' ? 'bg-gray-100 text-gray-800' :
                                  therapist.assignmentType === 'collaborative' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {therapist.assignmentType}
                                </span>
                              </div>
                            ))}
                            {therapists.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{therapists.length - 2} more
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        (patient.status || 'active') === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : (patient.status || 'active') === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : (patient.status || 'active') === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : (patient.status || 'active') === 'discharged'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patient.status || 'active'}
                  </span>
                </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : 'N/A'}
                </td>
                         <td className="patient-actions-cell">
                           <div className="patient-actions">
                             <button 
                               className="dropdown-trigger" 
                               onClick={() => toggleActionDropdown(patient.id)}
                               title="Actions"
                               ref={el => dropdownRefs.current[patient.id] = el}
                               data-patient-id={patient.id}
                             >
                               <MoreVertical size={16} />
                             </button>
                             
                             {actionDropdowns[patient.id] && (
                               <div className={`patient-action-dropdown ${shouldOpenUpward(patient.id) ? 'dropdown-up' : ''}`}>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleViewPatient(patient);
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
                                     handleEditPatient(patient);
                                     closeAllDropdowns();
                                   }}
                                   className="dropdown-item"
                                 >
                                   <Edit size={16} />
                                   Edit Patient
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleAssignTherapist(patient);
                                     closeAllDropdowns();
                                   }}
                                   className="dropdown-item"
                                 >
                                   <UserCheck size={16} />
                                   Assign Therapist
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleAddTherapist(patient);
                                     closeAllDropdowns();
                                   }}
                                   className="dropdown-item"
                                 >
                                   <Users size={16} />
                                   Add Therapist
                                 </button>
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     handleDeletePatient(patient.id);
                                     closeAllDropdowns();
                                   }}
                                   className="dropdown-item danger"
                                 >
                                   <Trash2 size={16} />
                                   Delete Patient
                                 </button>
                               </div>
                             )}
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
           <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
             <div className="modal-content patient-detail-modal" onClick={e => e.stopPropagation()}>
               <div className="modal-header">
                 <h3>Patient Profile</h3>
                 <button className="close-btn" onClick={() => setSelectedPatient(null)}>
                   <X size={20} />
                 </button>
               </div>
               
               <div className="modal-body">
                 <div className="patient-detail-modern">
                   {/* Header Section */}
                   <div className="patient-header">
                     <div className="avatar-container">
                       <Avatar 
                         name={`${selectedPatient.firstName} ${selectedPatient.lastName}`} 
                         profileImage={selectedPatient.profileImage}
                         size="3xl" 
                         className="patient-avatar"
                       />
                       <div className={`status-indicator ${selectedPatient.status || 'active'}`}></div>
                     </div>
                     <div className="patient-basic-info">
                       <h2 className="patient-name">{selectedPatient.firstName} {selectedPatient.lastName}</h2>
                       <p className="patient-diagnosis">{selectedPatient.diagnosis || 'Diagnosis not set'}</p>
                       <div className="patient-stats">
                         <div className="stat-item">
                           <User size={16} className="stat-icon" />
                           <span className="stat-value">{selectedPatient.id}</span>
                           <span className="stat-label">Patient ID</span>
                         </div>
                         <div className="stat-item">
                           <Calendar size={16} className="stat-icon" />
                           <span className="stat-value">{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</span>
                           <span className="stat-label">Date of Birth</span>
                         </div>
                         <div className="stat-item">
                           <Clock size={16} className="stat-icon" />
                           <span className="stat-value">{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : 'N/A'}</span>
                           <span className="stat-label">Patient Since</span>
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* Information Sections */}
                   <div className="info-section">
                     <h3 className="section-title">
                       <User size={20} className="section-icon" />
                       Personal Information
                     </h3>
                     <div className="info-grid">
                       <div className="info-item">
                         <label>Email Address</label>
                         <span>{selectedPatient.email || 'Not provided'}</span>
                       </div>
                       <div className="info-item">
                         <label>Phone Number</label>
                         <span>{selectedPatient.phone || 'Not provided'}</span>
                       </div>
                       <div className="info-item">
                         <label>Date of Birth</label>
                         <span>{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'Not provided'}</span>
                       </div>
                       <div className="info-item">
                         <label>Gender</label>
                         <span>{selectedPatient.gender || 'Not provided'}</span>
                       </div>
                       <div className="info-item full-width">
                         <label>Full Address</label>
                         <span>{selectedPatient.address ? `${selectedPatient.address}, ${selectedPatient.city}, ${selectedPatient.state} ${selectedPatient.zipCode}, ${selectedPatient.country}` : 'Not provided'}</span>
                       </div>
                     </div>
                   </div>
                   
                   <div className="info-section">
                     <h3 className="section-title">
                       <FileText size={20} className="section-icon" />
                       Medical Information
                     </h3>
                     <div className="info-grid">
                       <div className="info-item">
                         <label>Primary Diagnosis</label>
                         <span>{selectedPatient.diagnosis || 'Not provided'}</span>
                       </div>
                       <div className="info-item">
                         <label>Treatment Status</label>
                         <span className={`status-badge ${selectedPatient.status || 'active'}`}>
                           {selectedPatient.status || 'active'}
                         </span>
                       </div>
                       <div className="info-item full-width">
                         <label>Medical History</label>
                         <span>{selectedPatient.patient?.medicalHistory || 'No medical history recorded'}</span>
                       </div>
                       <div className="info-item full-width">
                         <label>Treatment Goals</label>
                         <span>{selectedPatient.goals || 'No treatment goals set'}</span>
                       </div>
                     </div>
                   </div>

                   {/* Account Information */}
                   <div className="info-section">
                     <h3 className="section-title">
                       <Calendar size={20} className="section-icon" />
                       Account Information
                     </h3>
                     <div className="info-grid">
                       <div className="info-item">
                         <label>Patient Since</label>
                         <span>{selectedPatient.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString() : 'Unknown'}</span>
                       </div>
                       <div className="info-item">
                         <label>Last Updated</label>
                         <span>{selectedPatient.updatedAt ? new Date(selectedPatient.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                       </div>
                     </div>
                   </div>

                   {/* Action Buttons */}
                   <div className="quick-actions">
                     <button 
                       onClick={() => handleEditPatient(selectedPatient)}
                       className="patient-btn-primary"
                     >
                       <Edit size={16} />
                       Edit Patient
                     </button>
                     <button 
                       onClick={() => handleDeletePatient(selectedPatient.id)}
                       className="patient-btn-danger"
                     >
                       <Trash2 size={16} />
                       Delete Patient
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Edit Patient Modal */}
         {editingPatient && (
           <div className="modal-overlay" onClick={handleCancelEdit}>
             <div className="modal-content patient-detail-modal" onClick={e => e.stopPropagation()}>
               <div className="modal-header">
                 <h3>Edit Patient Profile</h3>
                 <button className="close-btn" onClick={handleCancelEdit}>
                   <X size={20} />
                 </button>
               </div>

               <div className="modal-body">
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
                       <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                       <select
                         value={editingPatient.gender || ''}
                         onChange={(e) => handleInputChange('gender', e.target.value)}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       >
                         <option value="">Select Gender</option>
                         <option value="male">Male</option>
                         <option value="female">Female</option>
                         <option value="other">Other</option>
                       </select>
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                       <input
                         type="date"
                         value={editingPatient.dateOfBirth ? editingPatient.dateOfBirth.split('T')[0] : ''}
                         onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                       <input
                         type="text"
                         value={editingPatient.country || ''}
                         onChange={(e) => handleInputChange('country', e.target.value)}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis *</label>
                       <input
                         type="text"
                         value={editingPatient.patient?.diagnosis || ''}
                         onChange={(e) => handleInputChange('patient.diagnosis', e.target.value)}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="e.g., Autism Spectrum Disorder"
                         required
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Medical History</label>
                       <textarea
                         value={editingPatient.patient?.medicalHistory || ''}
                         onChange={(e) => handleInputChange('patient.medicalHistory', e.target.value)}
                         rows={3}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter medical history and relevant information..."
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Treatment Goals</label>
                       <textarea
                         value={editingPatient.goals || ''}
                         onChange={(e) => handleInputChange('goals', e.target.value)}
                         rows={3}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                         placeholder="Enter treatment goals and objectives..."
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                       <select
                         value={editingPatient.status || 'active'}
                         onChange={(e) => handleInputChange('status', e.target.value)}
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

               <div className="modal-actions">
                 <button 
                   onClick={handleCancelEdit}
                   className="patient-btn-secondary"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSavePatient}
                   className="patient-btn-primary"
                 >
                   <Edit size={16} />
                   Save Changes
                 </button>
               </div>
             </div>
           </div>
         )}

        {/* Patient Reports Modal */}
        {showReportsModal && reportsPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Patient Reports</h2>
                    <p className="text-green-100 mt-1">
                      Comprehensive reports for {reportsPatient.firstName} {reportsPatient.lastName}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-green-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                <PatientReportsContent patient={reportsPatient} />
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Scheduling Modal */}
        {showScheduleModal && schedulePatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Schedule Session</h2>
                    <p className="text-purple-100 mt-1">
                      Schedule a new session for {schedulePatient.firstName} {schedulePatient.lastName}
                    </p>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-purple-200 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
                <SessionSchedulingContent 
                  patient={schedulePatient} 
                  onScheduleSuccess={() => {
                    closeModal();
                    toast.success('Session scheduled successfully');
                  }}
                />
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

    </div>

    {/* Therapist Assignment Modal - Outside main container for proper positioning */}
    {showAssignmentModal && assignmentPatient && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Assign Therapist</h2>
                <p className="text-blue-100 mt-1">
                  Assign a therapist to {assignmentPatient.firstName} {assignmentPatient.lastName}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:text-blue-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          {/* Modal Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            <TherapistAssignmentContent
              patient={assignmentPatient}
              onAssignmentSuccess={() => {
                closeModal();
                refetch();
                toast.success('Therapist assigned successfully');
              }}
            />
          </div>
          {/* Modal Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Add Therapist Modal */}
    {showAddTherapistModal && addTherapistPatient && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Add Additional Therapist</h2>
                <p className="text-green-100 mt-1">
                  Add another therapist to {addTherapistPatient.firstName} {addTherapistPatient.lastName}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-white hover:text-green-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          {/* Modal Content */}
          <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
            <AddTherapistContent
              patient={addTherapistPatient}
              onAssignmentSuccess={() => {
                closeModal();
                refetch();
                toast.success('Additional therapist added successfully');
              }}
            />
          </div>
          {/* Modal Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={closeModal}
                className="px-6 py-3 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

// Patient Reports Content Component
const PatientReportsContent = ({ patient }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch patient reports data
  React.useEffect(() => {
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        // Fetch patient-specific data using adminAPI service
        const [assessmentsRes, sessionsRes, progressRes] = await Promise.all([
          adminAPI.getPatientAssessments(patient.id),
          adminAPI.getPatientSessions(patient.id),
          adminAPI.getPatientProgress(patient.id)
        ]);

        console.log('Reports data fetched:', {
          assessments: assessmentsRes.data?.data,
          sessions: sessionsRes.data?.data,
          progress: progressRes.data?.data
        });

        // Use real data if available, otherwise show sample data for demonstration
        const assessments = assessmentsRes.data?.data || [];
        const sessions = sessionsRes.data?.data || [];
        const progress = progressRes.data?.data || [];

        // If no real data, show sample data for demonstration
        const sampleData = {
          assessments: assessments.length > 0 ? assessments : [
            {
              id: 1,
              title: 'Initial Assessment',
              type: 'Comprehensive',
              category: 'Motor Skills',
              assessmentDate: '2024-01-15',
              status: 'completed',
              score: 85,
              maxScore: 100,
              summary: 'Patient shows good progress in fine motor skills',
              therapistName: 'Dr. Sarah Wilson'
            },
            {
              id: 2,
              title: 'Follow-up Assessment',
              type: 'Progress',
              category: 'Cognitive',
              assessmentDate: '2024-02-01',
              status: 'in-progress',
              score: null,
              maxScore: 100,
              summary: 'Assessment in progress',
              therapistName: 'Dr. Sarah Wilson'
            }
          ],
          sessions: sessions.length > 0 ? sessions : [
            {
              id: 1,
              sessionDate: '2024-01-20',
              startTime: '10:00:00',
              endTime: '11:00:00',
              duration: 60,
              sessionType: 'therapy',
              status: 'completed',
              objectives: 'Improve fine motor skills',
              activities: 'Hand exercises, drawing activities',
              observations: 'Patient showed good engagement',
              progress: 'Steady improvement noted',
              therapistName: 'Dr. Sarah Wilson'
            },
            {
              id: 2,
              sessionDate: '2024-01-27',
              startTime: '10:00:00',
              endTime: '11:00:00',
              duration: 60,
              sessionType: 'therapy',
              status: 'completed',
              objectives: 'Continue motor skill development',
              activities: 'Sensory play, coordination exercises',
              observations: 'Patient was very focused today',
              progress: 'Excellent progress in coordination',
              therapistName: 'Dr. Sarah Wilson'
            }
          ],
          progress: progress.length > 0 ? progress : [
            {
              id: 1,
              area: 'Fine Motor Skills',
              baselineScore: 60,
              currentScore: 75,
              targetScore: 85,
              progressNotes: 'Significant improvement in hand-eye coordination',
              measurementDate: '2024-01-15',
              assessmentTitle: 'Initial Assessment'
            },
            {
              id: 2,
              area: 'Cognitive Development',
              baselineScore: 70,
              currentScore: 80,
              targetScore: 90,
              progressNotes: 'Good progress in attention and focus',
              measurementDate: '2024-02-01',
              assessmentTitle: 'Follow-up Assessment'
            }
          ]
        };

        setReportsData(sampleData);
      } catch (error) {
        console.error('Error fetching reports data:', error);
        toast.error('Failed to load patient reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [patient.id]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'assessments', label: 'Assessments', icon: FileText },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patient reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">Total Assessments</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {reportsData?.assessments?.length || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-green-900">
                    {reportsData?.sessions?.length || 0}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">Progress Areas</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {reportsData?.progress?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="space-y-4">
            {reportsData?.assessments?.length > 0 ? (
              reportsData.assessments.map((assessment) => (
                <div key={assessment.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                      <p className="text-sm text-gray-600">{assessment.type} • {assessment.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{assessment.assessmentDate}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        assessment.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assessment.status}
                      </span>
                    </div>
                  </div>
                  {assessment.score && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">Score: {assessment.score}/{assessment.maxScore}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No assessments found for this patient</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {reportsData?.sessions?.length > 0 ? (
              reportsData.sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{session.sessionType}</h3>
                      <p className="text-sm text-gray-600">
                        {session.sessionDate} • {session.startTime} - {session.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{session.duration} minutes</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        session.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{session.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No sessions found for this patient</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-4">
            {reportsData?.progress?.length > 0 ? (
              reportsData.progress.map((progress) => (
                <div key={progress.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900 capitalize">
                      {progress.area.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    <span className="text-sm text-gray-500">{progress.measurementDate}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Baseline</p>
                      <p className="text-lg font-semibold">{progress.baselineScore || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current</p>
                      <p className="text-lg font-semibold">{progress.currentScore || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Target</p>
                      <p className="text-lg font-semibold">{progress.targetScore || 'N/A'}</p>
                    </div>
                  </div>
                  {progress.progressNotes && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{progress.progressNotes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No progress data found for this patient</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Session Scheduling Content Component
const SessionSchedulingContent = ({ patient, onScheduleSuccess }) => {
  const [formData, setFormData] = useState({
    appointmentDate: '',
    startTime: '09:00',
    duration: 60,
    type: 'therapy',
    notes: ''
  });
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch therapists data
  React.useEffect(() => {
    const fetchTherapists = async () => {
      try {
        const response = await adminAPI.getTherapists();
        console.log('Therapists data fetched:', response.data);
        if (response.data.success) {
          const therapists = response.data.data.users || [];
          // If no therapists found, use sample data for demonstration
          if (therapists.length === 0) {
            setTherapists([
              {
                id: 1,
                firstName: 'Sarah',
                lastName: 'Wilson',
                email: 'sarah.wilson@therapease.com',
                therapist: {
                  specialization: 'Pediatric Occupational Therapy',
                  yearsOfExperience: 8,
                  licenseNumber: 'OT12345'
                }
              },
              {
                id: 2,
                firstName: 'Michael',
                lastName: 'Johnson',
                email: 'michael.johnson@therapease.com',
                therapist: {
                  specialization: 'Speech Therapy',
                  yearsOfExperience: 5,
                  licenseNumber: 'ST67890'
                }
              }
            ]);
          } else {
            setTherapists(therapists);
          }
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
        toast.error('Failed to load therapists');
      }
    };

    fetchTherapists();
  }, []);

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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedTherapist) {
      toast.error('Please select a therapist');
      return;
    }

    if (!formData.appointmentDate || !formData.startTime) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setLoading(true);
      
      // Calculate end time
      const startTime = new Date(`2000-01-01T${formData.startTime}`);
      const endTime = new Date(startTime.getTime() + formData.duration * 60000);
      const endTimeStr = endTime.toTimeString().slice(0, 8);

      const appointmentData = {
        therapistId: selectedTherapist,
        patientId: patient.id,
        date: formData.appointmentDate,
        time: formData.startTime,
        duration: formData.duration,
        reason: formData.type,
        type: formData.type,
        notes: formData.notes
      };

      const response = await adminAPI.createAppointment(appointmentData);
      
      if (response.data.success) {
        toast.success('Session scheduled successfully');
        onScheduleSuccess();
      } else {
        toast.error(response.data.error || 'Failed to schedule session');
      }
    } catch (error) {
      console.error('Error scheduling session:', error);
      toast.error('Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Information</h3>
          <p className="text-gray-600">{patient.firstName} {patient.lastName}</p>
          <p className="text-sm text-gray-500">{patient.email}</p>
        </div>

        {/* Therapist Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign Therapist *
          </label>
          <select
            value={selectedTherapist}
            onChange={(e) => setSelectedTherapist(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          >
            <option value="">Select a therapist</option>
            {therapists.map((therapist) => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.firstName} {therapist.lastName}
                {therapist.therapist?.specialization && ` - ${therapist.therapist.specialization}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Appointment Date *
          </label>
          <input
            type="date"
            value={formData.appointmentDate}
            onChange={(e) => handleInputChange('appointmentDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Time *
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => handleInputChange('startTime', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <select
            value={formData.duration}
            onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {durationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Session Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Session Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {sessionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          placeholder="Add any additional notes or special instructions..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="patient-btn-purple disabled:bg-purple-400 flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Scheduling...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4" />
              Schedule Session
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Therapist Assignment Content Component
const TherapistAssignmentContent = ({ patient, onAssignmentSuccess }) => {
  const [therapists, setTherapists] = useState([]);
  const [assignedTherapists, setAssignedTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [loading, setLoading] = useState(false);
  const [therapistsLoading, setTherapistsLoading] = useState(true);
  const [assignedLoading, setAssignedLoading] = useState(true);

  // Fetch assigned therapists
  React.useEffect(() => {
    const fetchAssignedTherapists = async () => {
      try {
        setAssignedLoading(true);
        const response = await adminAPI.getPatientTherapists(patient.patient?.id);
        
        if (response.data.success) {
          setAssignedTherapists(response.data.data.therapists || []);
        } else {
          console.error('Failed to load assigned therapists:', response.data.error);
        }
      } catch (error) {
        console.error('Error fetching assigned therapists:', error);
      } finally {
        setAssignedLoading(false);
      }
    };

    fetchAssignedTherapists();
  }, [patient.patient?.id]);

  // Fetch available therapists
  React.useEffect(() => {
    const fetchTherapists = async () => {
      try {
        setTherapistsLoading(true);
        const response = await adminAPI.getAvailableTherapists(patient.patient?.id);
        console.log('Available therapists:', response.data);
        
        if (response.data.success) {
          setTherapists(response.data.data.therapists || []);
        } else {
          toast.error('Failed to load available therapists');
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
        toast.error('Failed to load available therapists');
      } finally {
        setTherapistsLoading(false);
      }
    };

    fetchTherapists();
  }, [patient.id]);

  const handleAssign = async () => {
    if (!selectedTherapist) {
      toast.error('Please select a therapist');
      return;
    }

    try {
      setLoading(true);
      
      // Use the standard assignment for primary therapist
      const response = await adminAPI.assignTherapistToPatient({
        patientId: patient.id,
        therapistId: selectedTherapist
      });

      if (response.data.success) {
        onAssignmentSuccess();
      } else {
        toast.error(response.data.error || 'Failed to assign therapist');
      }
    } catch (error) {
      console.error('Error assigning therapist:', error);
      toast.error('Failed to assign therapist');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async (therapistId, therapistName) => {
    if (!window.confirm(`Are you sure you want to unassign ${therapistName} from this patient?`)) {
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.unassignTherapistFromPatient(patient.id);

      if (response.data.success) {
        toast.success(`${therapistName} has been unassigned successfully`);
        
        // Refresh the assigned therapists list
        const refreshResponse = await adminAPI.getPatientTherapists(patient.patient?.id);
        if (refreshResponse.data.success) {
          setAssignedTherapists(refreshResponse.data.data.therapists || []);
        }
        
        // Refresh the available therapists list
        const availableResponse = await adminAPI.getAvailableTherapists(patient.patient?.id);
        if (availableResponse.data.success) {
          setTherapists(availableResponse.data.data.therapists || []);
        }
        
        onAssignmentSuccess();
      } else {
        toast.error(response.data.error || 'Failed to unassign therapist');
      }
    } catch (error) {
      console.error('Error unassigning therapist:', error);
      toast.error('Failed to unassign therapist');
    } finally {
      setLoading(false);
    }
  };

  if (therapistsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available therapists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Information</h3>
        <div className="flex items-center gap-4">
          <Avatar 
            name={`${patient.firstName} ${patient.lastName}`} 
            profileImage={patient.profileImage}
            size="lg" 
          />
          <div>
            <p className="text-gray-900 font-medium">{patient.firstName} {patient.lastName}</p>
            <p className="text-sm text-gray-600">{patient.email}</p>
            <p className="text-sm text-gray-500">Diagnosis: {patient.diagnosis || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Currently Assigned Therapists */}
      {assignedTherapists.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Currently Assigned Therapists
          </label>
          
          {assignedLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading assigned therapists...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTherapists.map((therapist) => (
                <div
                  key={therapist.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-sm">
                        {therapist.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{therapist.name}</div>
                      <div className="text-xs text-gray-500">{therapist.specialization}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          therapist.assignmentType === 'primary' ? 'bg-blue-100 text-blue-800' :
                          therapist.assignmentType === 'secondary' ? 'bg-gray-100 text-gray-800' :
                          therapist.assignmentType === 'collaborative' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {therapist.assignmentType}
                        </span>
                        <span className="text-xs text-gray-400">
                          Assigned: {new Date(therapist.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnassign(therapist.therapistId, therapist.name)}
                    disabled={loading}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unassign
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Therapist Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Available Therapist *
        </label>
        
        {therapists.length === 0 ? (
          <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
            <UserCheck className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Available Therapists</h3>
            <p className="text-yellow-600">
              All therapists are currently at capacity or not accepting new patients.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {therapists.map((therapist) => (
              <div
                key={therapist.id}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  selectedTherapist === therapist.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTherapist(therapist.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="therapist"
                      value={therapist.id}
                      checked={selectedTherapist === therapist.id}
                      onChange={() => setSelectedTherapist(therapist.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <Avatar 
                      name={therapist.name} 
                      profileImage={therapist.profileImage}
                      size="md" 
                    />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{therapist.name}</h4>
                      <p className="text-sm text-gray-600">{therapist.specialization}</p>
                      <p className="text-sm text-gray-500">
                        {therapist.yearsOfExperience} years experience • {therapist.availableSlots} slots available
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {therapist.currentPatientCount}/{therapist.maxPatients} patients
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      Available
                    </div>
                  </div>
                </div>
                
                {therapist.availability && (
                  <div className="mt-3 ml-8">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Availability:</span> {therapist.availability}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Button */}
      {therapists.length > 0 && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleAssign}
            disabled={loading || !selectedTherapist}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                Assign Therapist
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Add Therapist Content Component
const AddTherapistContent = ({ patient, onAssignmentSuccess }) => {
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [assignmentType, setAssignmentType] = useState('secondary');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [therapistsLoading, setTherapistsLoading] = useState(true);
  const [hasPrimaryTherapist, setHasPrimaryTherapist] = useState(false);

  // Check if patient has a primary therapist
  React.useEffect(() => {
    const checkPrimaryTherapist = async () => {
      try {
        const response = await adminAPI.getPatientTherapists(patient.patient?.id);
        if (response.data.success) {
          const hasPrimary = response.data.data.therapists.some(t => t.assignmentType === 'primary');
          setHasPrimaryTherapist(hasPrimary);
        }
      } catch (error) {
        console.error('Error checking primary therapist:', error);
      }
    };

    if (patient.patient?.id) {
      checkPrimaryTherapist();
    }
  }, [patient.patient?.id]);

  // Fetch available therapists
  React.useEffect(() => {
    const fetchTherapists = async () => {
      try {
        setTherapistsLoading(true);
        const response = await adminAPI.getAvailableTherapists(patient.patient?.id);
        console.log('Available therapists:', response.data);
        
        if (response.data.success) {
          setTherapists(response.data.data.therapists || []);
        } else {
          toast.error('Failed to load available therapists');
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
        toast.error('Failed to load available therapists');
      } finally {
        setTherapistsLoading(false);
      }
    };

    fetchTherapists();
  }, [patient.patient?.id]);

  const handleAddTherapist = async () => {
    if (!selectedTherapist) {
      toast.error('Please select a therapist');
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.addTherapistToPatient({
        patientId: patient.patient?.id,
        therapistId: selectedTherapist,
        assignmentType,
        notes
      });

      if (response.data.success) {
        toast.success('Additional therapist added successfully');
        onAssignmentSuccess();
      } else {
        toast.error(response.data.error || 'Failed to add therapist');
      }
    } catch (error) {
      console.error('Error adding therapist:', error);
      toast.error('Failed to add therapist');
    } finally {
      setLoading(false);
    }
  };

  if (therapistsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading available therapists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Information</h3>
        <div className="flex items-center gap-4">
          <Avatar 
            name={`${patient.firstName} ${patient.lastName}`} 
            profileImage={patient.profileImage}
            size="lg" 
          />
          <div>
            <p className="text-gray-900 font-medium">{patient.firstName} {patient.lastName}</p>
            <p className="text-sm text-gray-600">{patient.email}</p>
            <p className="text-sm text-gray-500">Current Therapist: {patient.therapistName || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {/* Primary Therapist Warning */}
      {hasPrimaryTherapist && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Primary Therapist Already Assigned</h4>
              <p className="text-sm text-yellow-700 mt-1">
                This patient already has a primary therapist. You can only assign additional therapists as secondary or collaborative.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Assignment Type *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="assignmentType"
              value="secondary"
              checked={assignmentType === 'secondary'}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Secondary</div>
              <div className="text-sm text-gray-500">Supporting therapist</div>
            </div>
          </label>
          <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="assignmentType"
              value="collaborative"
              checked={assignmentType === 'collaborative'}
              onChange={(e) => setAssignmentType(e.target.value)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
            />
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">Collaborative</div>
              <div className="text-sm text-gray-500">Equal partnership</div>
            </div>
          </label>
        </div>
      </div>

      {/* Therapist Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Additional Therapist *
        </label>
        
        {therapists.length === 0 ? (
          <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
            <UserCheck className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Available Therapists</h3>
            <p className="text-yellow-600">
              All therapists are currently at capacity or not accepting new patients.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {therapists.map((therapist) => (
              <label key={therapist.id} className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="therapist"
                  value={therapist.id}
                  checked={selectedTherapist === therapist.id}
                  onChange={(e) => setSelectedTherapist(parseInt(e.target.value))}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                />
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{therapist.name}</div>
                      <div className="text-sm text-gray-500">{therapist.specialization}</div>
                      <div className="text-xs text-gray-400">
                        {therapist.yearsOfExperience} years experience • {therapist.availableSlots} slots available
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {therapist.currentPatientCount}/{therapist.maxPatients} patients
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assignment Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          placeholder="Add any notes about this assignment..."
        />
      </div>

      {/* Action Buttons */}
      {therapists.length > 0 && (
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleAddTherapist}
            disabled={loading || !selectedTherapist}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding...
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Add Therapist
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPatients;