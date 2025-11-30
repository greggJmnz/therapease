import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import ConfirmationModal from '../../components/ConfirmationModal';
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
  MoreVertical,
  Clock
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import InitialsAvatar from '../../components/InitialsAvatar';
import './AdminTherapists.css';

const AdminTherapists = () => {
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [showGenerateAccountModal, setShowGenerateAccountModal] = useState(false);
  const [showPendingTherapistsModal, setShowPendingTherapistsModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [capacityTherapist, setCapacityTherapist] = useState(null);
  const [workingHoursTherapist, setWorkingHoursTherapist] = useState(null);
  const [workingHoursData, setWorkingHoursData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed viewMode state - only using list view now
  const [activeDropdown, setActiveDropdown] = useState(null); // Track which dropdown is open
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [newTherapist, setNewTherapist] = useState({
    name: '',
    email: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [therapistToDelete, setTherapistToDelete] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [therapistToReject, setTherapistToReject] = useState(null);

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

  // Fetch pending therapists data
  const { data: pendingTherapistsData, isLoading: pendingLoading, refetch: refetchPending } = useQuery(
    'pendingTherapists',
    adminAPI.getPendingTherapists,
    {
      enabled: showPendingTherapistsModal, // Only fetch when modal is open
      staleTime: 0, // Always consider data stale to avoid 304 caching issues
      cacheTime: 0, // Don't cache to ensure fresh data
      refetchOnMount: true, // Always refetch when modal opens
      onSuccess: (data) => {
        console.log('[AdminTherapists] Pending therapists query success:', data);
        console.log('[AdminTherapists] Full response structure:', JSON.stringify(data, null, 2));
      },
      onError: (error) => {
        toast.error('Failed to load pending therapists');
        console.error('Error fetching pending therapists:', error);
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
      status: therapist.status || 'active',
      patientsCount: therapist.patientCount || 0, // Count of assigned patients
      maxPatients: therapist.therapist?.maxPatients || 20, // Maximum patients capacity
      isAcceptingPatients: therapist.therapist?.isAcceptingPatients !== false, // Default to true
      availableSlots: (therapist.therapist?.maxPatients || 20) - (therapist.patientCount || 0),
      address: therapist.address || 'Not provided',
      city: therapist.city || 'Not provided',
      state: therapist.state || 'Not provided',
      zipCode: therapist.zipCode || 'Not provided',
      createdAt: therapist.createdAt,
      updatedAt: therapist.updatedAt
    }));

  // Filter therapists based on search term
  const therapists = allTherapists.filter(therapist => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase().trim();
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

  // Pagination logic
  const totalPages = Math.ceil(therapists.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTherapists = therapists.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top of table when page changes
    const tableContainer = document.querySelector('.therapists-table-container');
    if (tableContainer) {
      tableContainer.scrollTop = 0;
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

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

  const handleManageCapacity = (therapist) => {
    setCapacityTherapist(therapist);
    setShowCapacityModal(true);
  };

  const handleViewWorkingHours = async (therapist) => {
    try {
      setWorkingHoursTherapist(therapist);
      setShowWorkingHoursModal(true);
      
      const response = await adminAPI.getTherapistWorkingHours(therapist.id);
      setWorkingHoursData(response.data.data);
    } catch (error) {
      toast.error('Failed to load working hours');
      console.error('Error fetching working hours:', error);
    }
  };

  const closeModal = () => {
    setSelectedTherapist(null);
    setEditingTherapist(null);
    setShowGenerateAccountModal(false);
    setShowCapacityModal(false);
    setShowWorkingHoursModal(false);
    setCapacityTherapist(null);
    setWorkingHoursTherapist(null);
    setWorkingHoursData(null);
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

  const handleDelete = (therapistId) => {
    setTherapistToDelete(therapistId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!therapistToDelete) return;
    
    try {
      await adminAPI.deleteUser(therapistToDelete);
      toast.success('Therapist deleted successfully');
      refetch(); // Refresh data from API
      setShowDeleteModal(false);
      setTherapistToDelete(null);
    } catch (error) {
      console.error('Error deleting therapist:', error);
      toast.error('Failed to delete therapist');
    }
  };

  const confirmReject = async () => {
    if (!therapistToReject) return;
    
    try {
      await adminAPI.rejectPendingTherapist(therapistToReject.id);
      toast.success('Therapist rejected and account deleted');
      refetchPending();
      refetch(); // Refresh main list
      setShowRejectModal(false);
      setTherapistToReject(null);
    } catch (error) {
      console.error('Error rejecting therapist:', error);
      toast.error('Failed to reject therapist');
    }
  };

  const generateCredentials = async () => {
    if (newTherapist.name && newTherapist.email) {
      try {
        // Generate a secure password that meets complexity requirements
        const generateSecurePassword = () => {
          const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const lowercase = 'abcdefghijklmnopqrstuvwxyz';
          const numbers = '0123456789';
          const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
          
          let password = '';
          password += uppercase[Math.floor(Math.random() * uppercase.length)];
          password += lowercase[Math.floor(Math.random() * lowercase.length)];
          password += numbers[Math.floor(Math.random() * numbers.length)];
          password += special[Math.floor(Math.random() * special.length)];
          
          // Fill the rest with random characters
          const allChars = uppercase + lowercase + numbers + special;
          for (let i = 4; i < 12; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
          }
          
          // Shuffle the password
          return password.split('').sort(() => Math.random() - 0.5).join('');
        };
        
        const password = generateSecurePassword();
        
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

  // Get dropdown position for fixed positioning
  const getDropdownPosition = (therapistId) => {
    const button = document.querySelector(`[data-therapist-id="${therapistId}"]`);
    if (!button) return { top: 0, right: 0 };
    
    const rect = button.getBoundingClientRect();
    const dropdownWidth = 160; // Approximate dropdown width
    const dropdownHeight = 200; // Approximate dropdown height
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Calculate horizontal position (right-aligned to button)
    let right = viewportWidth - rect.right;
    
    // Calculate vertical position (always open downward by default)
    let top = rect.bottom + 4; // 4px margin from button
    
    // If dropdown would go off screen, adjust position
    if (right < 0) {
      right = 8; // 8px from right edge
    }
    if (top + dropdownHeight > viewportHeight) {
      top = rect.top - dropdownHeight - 4; // Open upward if no space below
    }
    
    return { top, right };
  };

  return (
    <>
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
              <button className="therapist-btn-secondary" onClick={() => setShowPendingTherapistsModal(true)}>
                <Clock size={16} />
                Pending Therapists
              </button>
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

      {/* Therapists List View */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="therapists-table-container">
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
                    Capacity
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
                {currentTherapists.map((therapist) => (
                  <tr 
                    key={therapist.id} 
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTherapist(therapist)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <InitialsAvatar 
                          name={therapist.name} 
                          size="md" 
                        />
                        <div className="ml-4 min-w-0 flex-1">
                          <div 
                            className="text-sm font-medium text-gray-900 truncate"
                            title={therapist.name}
                          >
                            {therapist.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 contact-cell">
                      <div className="flex items-center text-sm text-gray-900">
                        <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span 
                          className="truncate"
                          title={therapist.phone || 'Not provided'}
                        >
                          {therapist.phone || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <Mail className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span 
                          className="truncate"
                          title={therapist.email}
                        >
                          {therapist.email}
                        </span>
                      </div>
                    </td>
                    <td 
                      className="px-6 py-4 license-cell text-sm text-gray-900"
                      title={therapist.licenseNumber || 'Not provided'}
                    >
                      {therapist.licenseNumber || 'Not provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Users className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                        <span>{therapist.patientsCount || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 capacity-cell">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{therapist.patientsCount}/{therapist.maxPatients}</span>
                          <span className={`text-xs flex-shrink-0 ml-2 ${therapist.availableSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {therapist.availableSlots} available
                          </span>
                        </div>
                        <div className={`text-xs ${therapist.isAcceptingPatients ? 'text-green-600' : 'text-red-600'}`}>
                          {therapist.isAcceptingPatients ? 'Accepting patients' : 'Not accepting'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 status-cell">
                      <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        therapist.status === 'active'
                          ? 'bg-green-500'
                          : therapist.status === 'inactive'
                          ? 'bg-red-500'
                          : therapist.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                      }`}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 actions-cell text-right text-sm font-medium">
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
                          <div 
                            className="dropdown-menu"
                            style={{
                              top: `${getDropdownPosition(therapist.id).top}px`,
                              right: `${getDropdownPosition(therapist.id).right}px`
                            }}
                          >
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
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleManageCapacity(therapist);
                                closeDropdownWithDelay();
                              }}
                            >
                              <Users size={16} />
                              Manage Capacity
                            </button>
                            <button 
                              className="dropdown-item" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewWorkingHours(therapist);
                                closeDropdownWithDelay();
                              }}
                            >
                              <Clock size={16} />
                              View Working Hours
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

          {/* Pagination Controls */}
          {therapists.length > 0 && (
            <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {startIndex + 1} to {Math.min(endIndex, therapists.length)} of {therapists.length} therapists
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Previous Button */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                  }`}
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-green-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                      : 'text-gray-700 hover:bg-gray-100 bg-white border border-gray-300'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

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
              <div className="therapist-profile-container">
                {/* Hero Header Section */}
                <div className="therapist-hero">
                  <div className="hero-background"></div>
                  <div className="hero-content">
                    <div className="therapist-avatar-section">
                      <div className="avatar-wrapper">
                        <InitialsAvatar 
                          name={selectedTherapist.name} 
                          size="4xl" 
                          className="therapist-avatar-large"
                        />
                      </div>
                    </div>
                    <div className="therapist-info-section">
                      <h1 className="therapist-name">{selectedTherapist.name}</h1>
                      <p className="therapist-specialization">{selectedTherapist.specialization || 'Specialization not specified'}</p>
                      <div className="therapist-meta">
                        <div className="meta-item">
                          <Users size={18} />
                          <span>{selectedTherapist.patientsCount || 0} Patients</span>
                        </div>
                        <div className="meta-item">
                          <Calendar size={18} />
                          <span>{selectedTherapist.experience || 0} Years Experience</span>
                        </div>
                        <div className="meta-item">
                          <Key size={18} />
                          <span>{selectedTherapist.licenseNumber ? 'Licensed' : 'Not Licensed'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Grid */}
                <div className="therapist-content-grid">
                  {/* Left Column */}
                  <div className="content-left">
                    {/* Contact Information */}
                    <div className="info-card">
                      <div className="card-header">
                        <div className="card-icon">
                          <Mail size={20} />
                        </div>
                        <h3>Contact Information</h3>
                      </div>
                      <div className="card-content">
                        <div className="contact-item">
                          <div className="contact-icon">
                            <Mail size={16} />
                          </div>
                          <div className="contact-details">
                            <span className="contact-label">Email</span>
                            <span className="contact-value">{selectedTherapist.email}</span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <div className="contact-icon">
                            <Phone size={16} />
                          </div>
                          <div className="contact-details">
                            <span className="contact-label">Phone</span>
                            <span className="contact-value">{selectedTherapist.phone || 'Not provided'}</span>
                          </div>
                        </div>
                        <div className="contact-item">
                          <div className="contact-icon">
                            <MapPin size={16} />
                          </div>
                          <div className="contact-details">
                            <span className="contact-label">Location</span>
                            <span className="contact-value">
                              {selectedTherapist.address ? `${selectedTherapist.city}, ${selectedTherapist.state}` : 'Not provided'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Professional Details */}
                    <div className="info-card">
                      <div className="card-header">
                        <div className="card-icon">
                          <Briefcase size={20} />
                        </div>
                        <h3>Professional Details</h3>
                      </div>
                      <div className="card-content">
                        <div className="detail-row">
                          <span className="detail-label">License Number</span>
                          <span className="detail-value">{selectedTherapist.licenseNumber || 'Not provided'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Experience</span>
                          <span className="detail-value">{selectedTherapist.experience || 'Not specified'} years</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Current Patients</span>
                          <span className="detail-value">{selectedTherapist.patientsCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="content-right">
                    {/* Education & Certifications */}
                    <div className="info-card">
                      <div className="card-header">
                        <div className="card-icon">
                          <Shield size={20} />
                        </div>
                        <h3>Education & Certifications</h3>
                      </div>
                      <div className="card-content">
                        <div className="education-section">
                          <h4 className="subsection-title">Education</h4>
                          <p className="education-text">{selectedTherapist.education || 'Not provided'}</p>
                        </div>
                        <div className="certifications-section">
                          <h4 className="subsection-title">Certifications</h4>
                          <p className="certifications-text">{selectedTherapist.certifications || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>


                    {/* Account Status */}
                    <div className="info-card status-card">
                      <div className="card-header">
                        <div className="card-icon">
                          <Shield size={20} />
                        </div>
                        <h3>Account Status</h3>
                      </div>
                      <div className="card-content">
                        <div className="status-info">
                          <p className="status-description">
                            {selectedTherapist.status === 'active' ? 'This therapist is currently active and can accept new patients.' :
                             selectedTherapist.status === 'pending' ? 'This therapist account is pending approval from administration.' :
                             'This therapist account is currently inactive.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="action-bar">
                  <div className="action-buttons">
                    <button className="action-btn primary" onClick={() => handleEdit(selectedTherapist)}>
                      <Edit size={18} />
                      Edit Profile
                    </button>
                    {selectedTherapist.status === 'pending' && (
                      <button className="action-btn success" onClick={() => handleApprove(selectedTherapist.id)}>
                        <UserCheck size={18} />
                        Approve Account
                      </button>
                    )}
                    <button className="action-btn danger" onClick={() => handleDelete(selectedTherapist.id)}>
                      <Trash2 size={18} />
                      Delete Account
                    </button>
                  </div>
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

      {/* Pending Therapists Modal */}
      {showPendingTherapistsModal && (
        <div className="modal-overlay" onClick={() => setShowPendingTherapistsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3>Pending Therapists</h3>
              <button className="close-btn" onClick={() => setShowPendingTherapistsModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {pendingLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading pending therapists...</p>
                </div>
              ) : (() => {
                // Debug logging - comprehensive structure inspection
                console.log('[Modal] Full pendingTherapistsData:', pendingTherapistsData);
                console.log('[Modal] pendingTherapistsData.data:', pendingTherapistsData?.data);
                console.log('[Modal] pendingTherapistsData.data?.data:', pendingTherapistsData?.data?.data);
                console.log('[Modal] pendingTherapistsData.data?.data?.therapists:', pendingTherapistsData?.data?.data?.therapists);
                console.log('[Modal] pendingTherapistsData.data?.therapists:', pendingTherapistsData?.data?.therapists);
                
                // Try multiple possible response structures
                let therapists = [];
                if (pendingTherapistsData) {
                  // Structure 1: response.data.data.therapists (double nesting like getTherapists)
                  if (pendingTherapistsData.data?.data?.therapists) {
                    therapists = pendingTherapistsData.data.data.therapists;
                    console.log('[Modal] Using structure: data.data.therapists');
                  }
                  // Structure 2: response.data.therapists (single nesting)
                  else if (pendingTherapistsData.data?.therapists) {
                    therapists = pendingTherapistsData.data.therapists;
                    console.log('[Modal] Using structure: data.therapists');
                  }
                  // Structure 3: response.therapists (direct)
                  else if (pendingTherapistsData.therapists) {
                    therapists = pendingTherapistsData.therapists;
                    console.log('[Modal] Using structure: therapists (direct)');
                  }
                  // Structure 4: response.data is the therapists array
                  else if (Array.isArray(pendingTherapistsData.data)) {
                    therapists = pendingTherapistsData.data;
                    console.log('[Modal] Using structure: data (array)');
                  }
                }
                
                console.log('[Modal] Final therapists array:', therapists);
                console.log('[Modal] Therapists length:', therapists.length);
                return therapists.length > 0 ? (
                <div className="space-y-4">
                  {therapists.map((therapist) => (
                    <div key={therapist.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <InitialsAvatar name={`${therapist.firstName} ${therapist.lastName}`} size={40} />
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {therapist.firstName} {therapist.lastName}
                              </h4>
                              <p className="text-sm text-gray-600">{therapist.email}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            {therapist.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone size={16} />
                                <span>{therapist.phone}</span>
                              </div>
                            )}
                            {therapist.therapist?.specialization && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Briefcase size={16} />
                                <span>{therapist.therapist.specialization}</span>
                              </div>
                            )}
                            {therapist.therapist?.licenseNumber && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Shield size={16} />
                                <span>License: {therapist.therapist.licenseNumber}</span>
                              </div>
                            )}
                            {therapist.therapist?.yearsOfExperience !== null && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock size={16} />
                                <span>{therapist.therapist.yearsOfExperience} years experience</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            Registered: {new Date(therapist.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            className="therapist-btn-secondary text-sm px-3 py-2"
                            onClick={() => {
                              setTherapistToReject(therapist);
                              setShowRejectModal(true);
                            }}
                          >
                            Reject
                          </button>
                          <button
                            className="therapist-btn-primary text-sm px-3 py-2"
                            onClick={async () => {
                              try {
                                await adminAPI.approvePendingTherapist(therapist.id);
                                toast.success('Therapist approved successfully');
                                refetchPending();
                                refetch(); // Refresh main list
                              } catch (error) {
                                toast.error('Failed to approve therapist');
                                console.error('Error approving therapist:', error);
                              }
                            }}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending therapists</p>
                  {pendingTherapistsData && (
                    <p className="text-xs text-gray-500 mt-2">
                      Debug: Response received but no therapists found
                    </p>
                  )}
                </div>
              );
            })()}
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
            <div className="modal-body" style={{ padding: '24px' }}>
              {!generatedCredentials ? (
                <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                  <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ marginBottom: '0.75rem', display: 'block' }}>Name *</label>
                    <input
                      type="text"
                      value={newTherapist.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="form-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                    <label style={{ marginBottom: '0.75rem', display: 'block' }}>Email *</label>
                    <input
                      type="email"
                      value={newTherapist.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="form-input"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div className="info-note" style={{ marginBottom: '2rem' }}>
                    <p><strong>Note:</strong> Only name and email are required to generate an account. The therapist will complete their profile information after logging in.</p>
                  </div>
                  
                  <div className="modal-actions">
                    <button className="therapist-btn-secondary" onClick={closeGenerateModal}>Cancel</button>
                    <button className="therapist-btn-primary" onClick={generateCredentials}>
                      <Key size={16} />
                      Generate Account
                    </button>
                  </div>
                </div>
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

    {/* Capacity Management Modal - Outside main container for proper positioning */}
    {showCapacityModal && capacityTherapist && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Manage Therapist Capacity</h2>
                <p className="text-green-100 mt-1">
                  Set patient capacity limits for {capacityTherapist.name}
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
            <TherapistCapacityContent 
              therapist={capacityTherapist} 
              onCapacityUpdate={() => {
                closeModal();
                refetch();
                toast.success('Therapist capacity updated successfully');
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

    {/* Working Hours Modal */}
    {showWorkingHoursModal && workingHoursTherapist && workingHoursData && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Modal Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Therapist Working Hours</h2>
                <p className="text-blue-100 mt-1">
                  View working hours for {workingHoursData.therapist.name}
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
            <WorkingHoursDisplay workingHours={workingHoursData.workingHours} />
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
    
    {/* Confirmation Modal */}
    <ConfirmationModal
      isOpen={showDeleteModal}
      onClose={() => {
        setShowDeleteModal(false);
        setTherapistToDelete(null);
      }}
      onConfirm={confirmDelete}
      title="Delete Therapist"
      message="Are you sure you want to delete this therapist? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      type="danger"
    />

    <ConfirmationModal
      isOpen={showRejectModal}
      onClose={() => {
        setShowRejectModal(false);
        setTherapistToReject(null);
      }}
      onConfirm={confirmReject}
      title="Reject Pending Therapist"
      message={`Are you sure you want to reject ${therapistToReject ? `${therapistToReject.firstName} ${therapistToReject.lastName}` : 'this therapist'}? This will permanently delete their account and cannot be undone.`}
      confirmText="Reject & Delete"
      cancelText="Cancel"
      type="danger"
    />
    </>
  );
};

// Therapist Capacity Management Content Component
const TherapistCapacityContent = ({ therapist, onCapacityUpdate }) => {
  const [formData, setFormData] = useState({
    maxPatients: therapist.maxPatients || 20,
    isAcceptingPatients: therapist.isAcceptingPatients !== false
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.maxPatients < therapist.patientsCount) {
      toast.error(`Cannot set max patients to ${formData.maxPatients}. Therapist currently has ${therapist.patientsCount} patients assigned.`);
      return;
    }

    try {
      setLoading(true);
      const response = await adminAPI.updateTherapistAvailability(therapist.id, {
        maxPatients: parseInt(formData.maxPatients),
        isAcceptingPatients: formData.isAcceptingPatients
      });

      if (response.data.success) {
        toast.success('Therapist capacity updated successfully');
        onCapacityUpdate();
      } else {
        toast.error(response.data.error || 'Failed to update therapist capacity');
      }
    } catch (error) {
      console.error('Error updating therapist capacity:', error);
      toast.error('Failed to update therapist capacity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Therapist Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Therapist Information</h3>
        <div className="flex items-center gap-4">
          <InitialsAvatar 
            name={therapist.name} 
            size="lg" 
          />
          <div>
            <p className="text-gray-900 font-medium">{therapist.name}</p>
            <p className="text-sm text-gray-600">{therapist.specialization}</p>
            <p className="text-sm text-gray-500">Currently has {therapist.patientsCount} patients assigned</p>
          </div>
        </div>
      </div>

      {/* Capacity Settings */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximum Patients *
          </label>
          <input
            type="number"
            min={therapist.patientsCount}
            max={100}
            value={formData.maxPatients}
            onChange={(e) => handleInputChange('maxPatients', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Minimum: {therapist.patientsCount} (current patient count)
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={formData.isAcceptingPatients}
              onChange={(e) => handleInputChange('isAcceptingPatients', e.target.checked)}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Accepting new patients
            </span>
          </label>
          <p className="text-sm text-gray-500 mt-1">
            When unchecked, this therapist will not appear in available therapists for new patient assignments
          </p>
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Current Status</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Current Patients:</span>
            <span className="ml-2 font-medium">{therapist.patientsCount}</span>
          </div>
          <div>
            <span className="text-blue-700">Available Slots:</span>
            <span className={`ml-2 font-medium ${therapist.availableSlots > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {therapist.availableSlots}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Max Capacity:</span>
            <span className="ml-2 font-medium">{therapist.maxPatients}</span>
          </div>
          <div>
            <span className="text-blue-700">Accepting Patients:</span>
            <span className={`ml-2 font-medium ${therapist.isAcceptingPatients ? 'text-green-600' : 'text-red-600'}`}>
              {therapist.isAcceptingPatients ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Updating...
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Update Capacity
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// Working Hours Display Component
const WorkingHoursDisplay = ({ workingHours }) => {
  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((day) => {
          const dayHours = workingHours[day.key];
          return (
            <div key={day.key} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{day.label}</h3>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  dayHours?.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {dayHours?.enabled ? 'Available' : 'Unavailable'}
                </div>
              </div>
              
              {dayHours?.enabled ? (
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">Start:</span>
                    <span className="ml-2">{formatTime(dayHours.start)}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">End:</span>
                    <span className="ml-2">{formatTime(dayHours.end)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Not available on this day
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-700">Available Days:</span>
            <span className="ml-2 text-blue-900">
              {Object.values(workingHours).filter(day => day.enabled).length} / 7
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Total Hours/Week:</span>
            <span className="ml-2 text-blue-900">
              {Object.values(workingHours)
                .filter(day => day.enabled)
                .reduce((total, day) => {
                  const start = new Date(`2000-01-01T${day.start}`);
                  const end = new Date(`2000-01-01T${day.end}`);
                  const hours = (end - start) / (1000 * 60 * 60);
                  return total + hours;
                }, 0).toFixed(1)} hours
            </span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Weekend Availability:</span>
            <span className="ml-2 text-blue-900">
              {workingHours.saturday?.enabled || workingHours.sunday?.enabled ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTherapists;
