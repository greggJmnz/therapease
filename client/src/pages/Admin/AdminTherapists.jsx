import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  UserCheck,
  Star,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Key,
  Copy,
  CheckCircle,
  Briefcase,
  Shield,
  Users,
  User,
  Search,
  Grid3X3,
  List,
  MoreVertical
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import InitialsAvatar from '../../components/InitialsAvatar';
import './AdminTherapists.css';

const AdminTherapists = () => {
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [showGenerateAccountModal, setShowGenerateAccountModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [activeDropdown, setActiveDropdown] = useState(null); // Track which dropdown is open
  const [newTherapist, setNewTherapist] = useState({
    name: '',
    email: ''
  });

  // Fetch therapists data from API
  const { data: therapistsData, isLoading, error, refetch } = useQuery(
    'adminTherapists',
    adminAPI.getTherapists,
    {
      onError: (error) => {
        toast.error('Failed to load therapists data');
        console.error('Error fetching therapists:', error);
      }
    }
  );

  // Extract therapists from API response (admin API has double nesting)
  const allTherapists = (therapistsData?.data?.data?.users || [])
    .filter(user => user.role === 'therapist')
    .map(therapist => ({
      id: therapist.id,
      name: `${therapist.firstName} ${therapist.lastName}`,
      email: therapist.email,
      phone: therapist.phone || 'N/A',
      dateOfBirth: therapist.dateOfBirth,
      gender: therapist.gender,
      specialization: therapist.therapist?.specialization || 'Specialization not set',
      licenseNumber: therapist.therapist?.licenseNumber || 'Not provided',
      experience: therapist.therapist?.yearsOfExperience ? `${therapist.therapist.yearsOfExperience} years` : 'Not specified',
      education: therapist.therapist?.education || 'Not provided',
      certifications: therapist.therapist?.certifications || 'Not provided',
      availability: therapist.therapist?.availability || 'Not specified',
      status: therapist.status || 'active',
      patientsCount: therapist.patientCount || 0, // Count of assigned patients
      address: therapist.address || 'Not provided',
      city: therapist.city || 'Not provided',
      state: therapist.state || 'Not provided',
      zipCode: therapist.zipCode || 'Not provided',
      createdAt: therapist.createdAt,
      updatedAt: therapist.updatedAt
    }));

  // Filter therapists based on search term
  const therapists = allTherapists.filter(therapist => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      therapist.name.toLowerCase().includes(searchLower) ||
      therapist.email.toLowerCase().includes(searchLower) ||
      therapist.phone.toLowerCase().includes(searchLower) ||
      therapist.licenseNumber.toLowerCase().includes(searchLower) ||
      therapist.education.toLowerCase().includes(searchLower) ||
      therapist.certifications.toLowerCase().includes(searchLower) ||
      therapist.city.toLowerCase().includes(searchLower) ||
      therapist.state.toLowerCase().includes(searchLower)
    );
  });


  // Loading and error states
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#10b981] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading therapists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load therapists</div>
          <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-[#10b981] text-white rounded-[25px] hover:bg-[#059669] transition-all duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleEdit = (therapist) => {
    console.log('Edit therapist clicked:', therapist);
    setEditingTherapist({ ...therapist });
    setSelectedTherapist(null);
  };

  const handleSave = async () => {
    if (editingTherapist) {
      try {
        // Prepare the data for the API call
        const updateData = {
          firstName: editingTherapist.name.split(' ')[0] || '',
          lastName: editingTherapist.name.split(' ').slice(1).join(' ') || '',
          email: editingTherapist.email,
          phone: editingTherapist.phone,
          address: editingTherapist.address,
          city: editingTherapist.city,
          state: editingTherapist.state,
          zipCode: editingTherapist.zipCode,
          // Therapist-specific data
          therapist: {
            specialization: editingTherapist.specialization,
            licenseNumber: editingTherapist.licenseNumber,
            yearsOfExperience: parseInt(editingTherapist.experience?.replace(' years', '') || '0'),
            education: editingTherapist.education,
            certifications: editingTherapist.certifications,
            availability: editingTherapist.availability
          }
        };

        await adminAPI.updateUser(editingTherapist.id, updateData);
        toast.success('Therapist updated successfully');
        setEditingTherapist(null);
        refetch(); // Refresh data from API
      } catch (error) {
        console.error('Error updating therapist:', error);
        toast.error('Failed to update therapist');
      }
    }
  };

  const handleCancel = () => {
    setEditingTherapist(null);
  };

  const handleApprove = async (therapistId) => {
    console.log('Approve therapist clicked:', therapistId);
    try {
      await adminAPI.updateUserStatus(therapistId, 'active');
      toast.success('Therapist approved successfully');
      refetch(); // Refresh data from API
    } catch (error) {
      console.error('Error approving therapist:', error);
      toast.error('Failed to approve therapist');
    }
  };

  const handleDelete = async (therapistId) => {
    console.log('Delete therapist clicked:', therapistId);
    if (window.confirm('Are you sure you want to delete this therapist?')) {
      try {
        await adminAPI.deleteUser(therapistId);
        toast.success('Therapist deleted successfully');
        refetch(); // Refresh data from API
      } catch (error) {
        console.error('Error deleting therapist:', error);
        toast.error('Failed to delete therapist');
      }
    }
  };

  const generateCredentials = async () => {
    if (newTherapist.name && newTherapist.email) {
      try {
        // Generate a random password
        const password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        
        // Prepare the data for the API call
        const userData = {
          firstName: newTherapist.name.split(' ')[0] || '',
          lastName: newTherapist.name.split(' ').slice(1).join(' ') || '',
          email: newTherapist.email,
          password: password,
          role: 'therapist',
          // Therapist-specific data
          therapist: {
            specialization: 'General Therapy',
            licenseNumber: '',
            yearsOfExperience: 0,
            education: '',
            certifications: '',
            availability: 'Monday-Friday 9AM-5PM'
          }
        };

        await adminAPI.createUser(userData);
        
        const credentials = {
          email: newTherapist.email,
          password: password,
          name: newTherapist.name
        };
        
        setGeneratedCredentials(credentials);
        toast.success('Therapist created successfully');
        refetch(); // Refresh data from API
      } catch (error) {
        console.error('Error creating therapist:', error);
        toast.error('Failed to create therapist');
      }
    }
  };

  const handleInputChange = (field, value) => {
    if (editingTherapist) {
      setEditingTherapist(prev => ({ ...prev, [field]: value }));
    } else if (showGenerateAccountModal) {
      setNewTherapist(prev => ({ ...prev, [field]: value }));
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const closeGenerateModal = () => {
    setShowGenerateAccountModal(false);
    setGeneratedCredentials(null);
    setNewTherapist({
      name: '',
      email: ''
    });
  };

  // Handle dropdown toggle
  const toggleDropdown = (therapistId) => {
    setActiveDropdown(activeDropdown === therapistId ? null : therapistId);
  };

  // Close dropdown when clicking outside
  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  // Close dropdown with a small delay to allow action to complete
  const closeDropdownWithDelay = () => {
    setTimeout(() => {
      setActiveDropdown(null);
    }, 100);
  };

  // Check if dropdown should open upward
  const shouldOpenUpward = (therapistId) => {
    const button = document.querySelector(`[data-therapist-id="${therapistId}"]`);
    if (!button) return false;
    
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // Approximate dropdown height
    const spaceBelow = viewportHeight - rect.bottom;
    
    return spaceBelow < dropdownHeight && rect.top > dropdownHeight;
  };

  return (
    <div className="admin-dashboard" onClick={(e) => {
      if (!e.target.closest('.dropdown-menu') && !e.target.closest('.dropdown-trigger')) {
        closeDropdown();
      }
    }}>
      {/* Header */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              Therapist Management
            </h1>
            <p>Manage therapist accounts and professional information</p>
          </div>
          <div className="welcome-actions">
            <div className="flex items-center gap-3">
              {/* View Toggle Buttons */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid3X3 size={16} />
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List size={16} />
                  List
                </button>
              </div>
              
              <button className="therapist-btn-primary" onClick={() => setShowGenerateAccountModal(true)}>
                <Key size={16} />
                Generate Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search therapists by name, email, phone, license, education, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {therapists.length} of {allTherapists.length} therapists
          </div>
        )}
      </div>

      {/* Therapists List/Grid View */}
      {viewMode === 'grid' ? (
        <div className="therapists-grid">
          {therapists.map(therapist => (
            <div key={therapist.id} className="therapist-card">
              <div className="therapist-header">
                <InitialsAvatar 
                  name={therapist.name} 
                  size="lg" 
                  className="therapist-avatar"
                />
                <div className="therapist-info">
                  <h3>{therapist.name}</h3>
                  <p className="specialization">
                    {therapist.specialization || 'Specialization not set'}
                  </p>
                </div>
                <span className={`status-badge ${therapist.status}`}>
                  {therapist.status}
                </span>
              </div>
              
              <div className="therapist-details">
                <div className="detail-item">
                  <span className="label">License:</span>
                  <span>{therapist.licenseNumber || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Experience:</span>
                  <span>{therapist.experience || 'Not provided'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Patients:</span>
                  <span>{therapist.patientsCount}</span>
                </div>
              </div>

              <div className="therapist-actions">
                <button className="therapist-action-btn" onClick={() => setSelectedTherapist(therapist)}>
                  <Eye size={16} />
                  View
                </button>
                <button className="therapist-action-btn" onClick={() => handleEdit(therapist)}>
                  <Edit size={16} />
                  Edit
                </button>
                {therapist.status === 'pending' && (
                  <button className="therapist-action-btn approve" onClick={() => handleApprove(therapist.id)}>
                    <UserCheck size={16} />
                    Approve
                  </button>
                )}
                <button className="therapist-action-btn danger" onClick={() => handleDelete(therapist.id)}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
          <div className="therapists-table-container overflow-x-auto overflow-y-visible">
            <table className="therapists-table w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Therapist
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    License
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patients
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {therapists.map((therapist) => (
                  <tr key={therapist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <InitialsAvatar 
                          name={therapist.name} 
                          size="md" 
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {therapist.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 text-gray-400 mr-2" />
                        {therapist.phone || 'Not provided'}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        {therapist.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {therapist.licenseNumber || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="h-4 w-4 text-gray-400 mr-2" />
                        {therapist.patientsCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        therapist.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : therapist.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : therapist.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {therapist.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="therapist-actions">
                        <button 
                          className="dropdown-trigger" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDropdown(therapist.id);
                          }}
                          title="Actions"
                          data-therapist-id={therapist.id}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {activeDropdown === therapist.id && (
                          <div className={`dropdown-menu ${shouldOpenUpward(therapist.id) ? 'dropdown-up' : ''}`}>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTherapist(therapist);
                                closeDropdownWithDelay();
                              }}
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(therapist);
                                closeDropdownWithDelay();
                              }}
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            {therapist.status === 'pending' && (
                              <button 
                                className="dropdown-item approve" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(therapist.id);
                                  closeDropdownWithDelay();
                                }}
                              >
                                <UserCheck size={16} />
                                Approve
                              </button>
                            )}
                            <button 
                              className="dropdown-item danger" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(therapist.id);
                                closeDropdownWithDelay();
                              }}
                            >
                              <Trash2 size={16} />
                              Delete
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
          
          {therapists.length === 0 && (
            <div className="text-center py-12">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No therapists found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating a new therapist account'}
              </p>
              {!searchTerm && (
                <button 
                  className="therapist-btn-primary" 
                  onClick={() => setShowGenerateAccountModal(true)}
                >
                  <Key size={16} />
                  Generate Account
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Therapist Detail Modal */}
      {selectedTherapist && (
        <div className="modal-overlay" onClick={() => setSelectedTherapist(null)}>
          <div className="modal-content therapist-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Therapist Profile</h3>
              <button className="close-btn" onClick={() => setSelectedTherapist(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="therapist-detail-modern">
                {/* Header Section */}
                <div className="therapist-header">
                  <div className="avatar-container">
                    <InitialsAvatar 
                      name={selectedTherapist.name} 
                      size="3xl" 
                      className="therapist-avatar"
                    />
                    <div className={`status-indicator ${selectedTherapist.status}`}></div>
                  </div>
                  <div className="therapist-basic-info">
                    <h2 className="therapist-name">{selectedTherapist.name}</h2>
                    <p className="therapist-specialization">{selectedTherapist.specialization || 'Specialization not set'}</p>
                    <div className="therapist-stats">
                      <div className="stat-item">
                        <UserCheck size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.patientsCount}</span>
                        <span className="stat-label">Patients</span>
                      </div>
                      <div className="stat-item">
                        <Calendar size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.experience}</span>
                        <span className="stat-label">Experience</span>
                      </div>
                      <div className="stat-item">
                        <Key size={16} className="stat-icon" />
                        <span className="stat-value">{selectedTherapist.licenseNumber || 'N/A'}</span>
                        <span className="stat-label">License</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Mail size={18} className="section-icon" />
                    Contact Information
                  </h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Mail size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Email Address</span>
                        <span className="info-value">{selectedTherapist.email}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Phone size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Phone Number</span>
                        <span className="info-value">{selectedTherapist.phone || 'Not provided'}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <MapPin size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Location</span>
                        <span className="info-value">
                          {selectedTherapist.address ? `${selectedTherapist.city}, ${selectedTherapist.state}` : 'Not provided'}
                    </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Briefcase size={18} className="section-icon" />
                    Professional Details
                  </h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Key size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">License Number</span>
                        <span className="info-value">{selectedTherapist.licenseNumber}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Years of Experience</span>
                        <span className="info-value">{selectedTherapist.experience}</span>
                      </div>
                    </div>
                    <div className="info-item">
                      <Users size={16} className="info-icon" />
                      <div className="info-content">
                        <span className="info-label">Current Patients</span>
                        <span className="info-value">{selectedTherapist.patientsCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Education & Certifications */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Shield size={18} className="section-icon" />
                    Education & Certifications
                  </h4>
                  <div className="info-grid">
                    <div className="info-item full-width">
                      <div className="info-content">
                        <span className="info-label">Education</span>
                        <span className="info-value education-text">{selectedTherapist.education}</span>
                      </div>
                    </div>
                    <div className="info-item full-width">
                      <div className="info-content">
                        <span className="info-label">Certifications</span>
                        <span className="info-value certifications-text">{selectedTherapist.certifications}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Availability */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Calendar size={18} className="section-icon" />
                    Availability
                  </h4>
                  <div className="info-grid">
                    <div className="info-item full-width">
                      <div className="info-content">
                        <span className="info-label">Schedule</span>
                        <span className="info-value availability-text">{selectedTherapist.availability}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="info-section">
                  <h4 className="section-title">
                    <Shield size={18} className="section-icon" />
                    Account Status
                  </h4>
                  <div className="status-section">
                    <div className={`status-badge-modern ${selectedTherapist.status}`}>
                      <span className="status-dot"></span>
                      {selectedTherapist.status.charAt(0).toUpperCase() + selectedTherapist.status.slice(1)}
                    </div>
                    <p className="status-description">
                      {selectedTherapist.status === 'active' ? 'This therapist is currently active and can accept new patients.' :
                       selectedTherapist.status === 'pending' ? 'This therapist account is pending approval from administration.' :
                       'This therapist account is currently inactive.'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                  <button className="therapist-action-btn" onClick={() => handleEdit(selectedTherapist)}>
                    <Edit size={16} />
                    Edit Profile
                  </button>
                  {selectedTherapist.status === 'pending' && (
                    <button className="therapist-action-btn approve" onClick={() => handleApprove(selectedTherapist.id)}>
                      <UserCheck size={16} />
                      Approve Account
                    </button>
                  )}
                  <button className="therapist-action-btn danger" onClick={() => handleDelete(selectedTherapist.id)}>
                    <Trash2 size={16} />
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Therapist Modal */}
      {editingTherapist && (
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-content therapist-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Therapist Profile</h3>
              <button className="close-btn" onClick={handleCancel}>
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
                        value={editingTherapist.name?.split(' ')[0] || ''}
                        onChange={(e) => {
                          const lastName = editingTherapist.name?.split(' ').slice(1).join(' ') || '';
                          handleInputChange('name', `${e.target.value} ${lastName}`.trim());
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                      <input
                        type="text"
                        value={editingTherapist.name?.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const firstName = editingTherapist.name?.split(' ')[0] || '';
                          handleInputChange('name', `${firstName} ${e.target.value}`.trim());
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={editingTherapist.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editingTherapist.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={editingTherapist.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={editingTherapist.city || ''}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      <input
                        type="text"
                        value={editingTherapist.state || ''}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      <input
                        type="text"
                        value={editingTherapist.zipCode || ''}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-green-600" />
                    </div>
                    Professional Information
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization *</label>
                    <input
                      type="text"
                      value={editingTherapist.specialization || ''}
                      onChange={(e) => handleInputChange('specialization', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Pediatric Occupational Therapy"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">License Number *</label>
                      <input
                        type="text"
                        value={editingTherapist.licenseNumber || ''}
                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., OT12345"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                      <input
                        type="number"
                        value={editingTherapist.experience?.replace(' years', '') || ''}
                        onChange={(e) => handleInputChange('experience', e.target.value + ' years')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        min="0"
                        max="50"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                    <textarea
                      value={editingTherapist.education || ''}
                      onChange={(e) => handleInputChange('education', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter educational background and degrees..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Certifications</label>
                    <textarea
                      value={editingTherapist.certifications || ''}
                      onChange={(e) => handleInputChange('certifications', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter certifications and professional credentials..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Availability</label>
                    <textarea
                      value={editingTherapist.availability || ''}
                      onChange={(e) => handleInputChange('availability', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Enter availability schedule and working hours..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                    <select
                      value={editingTherapist.status || 'active'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={handleCancel}
                className="therapist-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="therapist-btn-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Account Modal */}
      {showGenerateAccountModal && (
        <div className="modal-overlay" onClick={closeGenerateModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Therapist Account</h3>
              <button className="close-btn" onClick={closeGenerateModal}>×</button>
            </div>
            <div className="modal-body">
              {!generatedCredentials ? (
                <>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newTherapist.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="form-input"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={newTherapist.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="form-input"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="info-note">
                    <p><strong>Note:</strong> Only name and email are required to generate an account. The therapist will complete their profile information after logging in.</p>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="therapist-btn-secondary" onClick={closeGenerateModal}>Cancel</button>
                    <button className="therapist-btn-primary" onClick={generateCredentials}>
                      <Key size={16} />
                      Generate Account
                    </button>
                  </div>
                </>
              ) : (
                <div className="credentials-display">
                  <div className="success-message">
                    <CheckCircle size={48} className="success-icon" />
                    <h4>Account Generated Successfully!</h4>
                    <p>The therapist account has been created and added to the system.</p>
                  </div>
                  
                  <div className="credentials-box">
                    <h5>Login Credentials</h5>
                    <p><strong>Share these credentials with the therapist:</strong></p>
                    
                    <div className="credential-item">
                      <label>Email:</label>
                      <div className="credential-value">
                        <span>{generatedCredentials.email}</span>
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(generatedCredentials.email)}
                          title="Copy email"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="credential-item">
                      <label>Temporary Password:</label>
                      <div className="credential-value">
                        <span className="password-display">{generatedCredentials.password}</span>
                        <button 
                          className="copy-btn" 
                          onClick={() => copyToClipboard(generatedCredentials.password)}
                          title="Copy password"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="credential-note">
                      <p><strong>Important:</strong> The therapist should change their password upon first login.</p>
                      <p><strong>Next Steps:</strong> The therapist will complete their profile (specialization, license, experience, etc.) after logging in.</p>
                    </div>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="therapist-btn-primary" onClick={closeGenerateModal}>
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTherapists;
