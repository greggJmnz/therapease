import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import ConfirmationModal from '../../components/ConfirmationModal';
import { 
  Search, 
  MoreVertical, 
  Trash2, 
  UserCheck, 
  UserX,
  Mail, 
  Phone, 
  Calendar,
  Shield,
  User,
  Stethoscope,
  Heart,
  Key,
  AlertTriangle,
  CheckCircle,
  X,
  TrendingUp
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import InitialsAvatar from '../../components/InitialsAvatar';
import './AdminUserManagement.css';

const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionDropdowns, setActionDropdowns] = useState({});
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetType, setPasswordResetType] = useState('reset'); // 'reset' or 'sendLink'
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [passwordResetResult, setPasswordResetResult] = useState(null);
  const dropdownRefs = useRef({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Fetch all users
  const { data: usersData, isLoading, error, refetch } = useQuery(
    'adminUsers',
    adminAPI.getAllUsers,
    {
      refetchOnWindowFocus: false,
      retry: 1
    }
  );

  const users = Array.isArray(usersData?.data?.data?.users) ? usersData.data.data.users
    .filter(user => user && user.id && user.firstName && user.lastName) // Filter out null/invalid users
    .map(user => ({
      ...user,
      status: user.status || 'active' // Default to active if no status field
    })) : 
                Array.isArray(usersData?.data?.users) ? usersData.data.users
                  .filter(user => user && user.id && user.firstName && user.lastName)
                  .map(user => ({
                    ...user,
                    status: user.status || 'active'
                  })) : 
                Array.isArray(usersData?.data) ? usersData.data
                  .filter(user => user && user.id && user.firstName && user.lastName)
                  .map(user => ({
                    ...user,
                    status: user.status || 'active'
                  })) : 
                Array.isArray(usersData) ? usersData
                  .filter(user => user && user.id && user.firstName && user.lastName)
                  .map(user => ({
                    ...user,
                    status: user.status || 'active'
                  })) : 
                [];

  // Filter and search functionality
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
      return matchesRole && matchesStatus;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().trim();
    
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (user.status || 'active') === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Update user status mutation
  const updateStatusMutation = useMutation(
    ({ userId, status }) => adminAPI.updateUserStatus(userId, status),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['adminUsers']);
        // Also invalidate patient management if this is a patient
        if (variables.userRole === 'patient') {
          queryClient.invalidateQueries('adminPatients');
        }
        // Also invalidate therapist management if this is a therapist
        if (variables.userRole === 'therapist') {
          queryClient.invalidateQueries('adminTherapists');
        }
        setActionDropdowns({});
        setNotification({
          show: true,
          message: `User ${variables.status === 'active' ? 'activated' : 'deactivated'} successfully`,
          type: 'success'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      },
      onError: (error) => {
        setNotification({
          show: true,
          message: `Failed to update user status: ${error.response?.data?.error || error.message}`,
          type: 'error'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      }
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    ({ userId, userRole }) => adminAPI.deleteUser(userId),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['adminUsers']);
        // Also invalidate patient management if this is a patient
        if (variables.userRole === 'patient') {
          queryClient.invalidateQueries('adminPatients');
        }
        // Also invalidate therapist management if this is a therapist
        if (variables.userRole === 'therapist') {
          queryClient.invalidateQueries('adminTherapists');
        }
        setActionDropdowns({});
        setNotification({
          show: true,
          message: 'User deleted successfully',
          type: 'success'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      },
      onError: (error) => {
        setNotification({
          show: true,
          message: `Failed to delete user: ${error.response?.data?.error || error.message}`,
          type: 'error'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      }
    }
  );

  // Reset password mutation
  const resetPasswordMutation = useMutation(
    ({ userId, type }) => {
      if (type === 'reset') {
        return adminAPI.resetUserPassword(userId);
      } else {
        return adminAPI.sendPasswordResetLink(userId);
      }
    },
    {
      onSuccess: (data, variables) => {
        setShowPasswordReset(false);
        setActionDropdowns({});
        
        // Store the password reset result if it contains a temporary password
        // Axios wraps the response in a 'data' property, so we need data.data
        const responseData = data?.data;
        
        // Check if responseData has a nested data property
        const nestedData = responseData?.data;
        
        // Try both possible structures
        const finalData = nestedData || responseData;
        
        if (variables.type === 'reset' && finalData?.tempPassword) {
          setPasswordResetResult({
            userEmail: finalData.email,
            tempPassword: finalData.tempPassword,
            userId: finalData.userId
          });
        }
        
        const action = variables.type === 'reset' ? 'reset' : 'reset link sent';
        setNotification({
          show: true,
          message: `Password ${action} successfully`,
          type: 'success'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
      },
      onError: (error, variables) => {
        console.error('❌ resetPasswordMutation error:', error);
        setNotification({
          show: true,
          message: `Failed to ${variables.type === 'reset' ? 'reset password' : 'send reset link'}: ${error.response?.data?.error || error.message}`,
          type: 'error'
        });
        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
      }
    }
  );

  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle role filter
  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value);
  };

  // Handle status filter
  const handleStatusFilter = (e) => {
    setStatusFilter(e.target.value);
  };

  // Handle action dropdown toggle
  const toggleActionDropdown = (userId, e) => {
    e.stopPropagation();
    setActionDropdowns(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setActionDropdowns({});
  };

  // Get dropdown position for fixed positioning
  const getDropdownPosition = (userId) => {
    const button = dropdownRefs.current[userId];
    if (!button) return { top: 0, right: 0 };
    
    const rect = button.getBoundingClientRect();
    const dropdownWidth = 180; // Approximate dropdown width
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

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on dropdown items
      if (event.target.closest('.user-action-dropdown')) {
        return;
      }
      
      Object.keys(dropdownRefs.current).forEach(userId => {
        if (dropdownRefs.current[userId] && !dropdownRefs.current[userId].contains(event.target)) {
          setActionDropdowns(prev => ({
            ...prev,
            [userId]: false
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle delete user
  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    // Find the user to get their role
    const user = users.find(u => u.id === userToDelete);
    deleteUserMutation.mutate({ userId: userToDelete, userRole: user?.role });
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  // Handle status toggle
  const handleStatusToggle = (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    // Find the user to get their role
    const user = users.find(u => u.id === userId);
    updateStatusMutation.mutate({ userId, status: newStatus, userRole: user?.role });
  };

  // Handle password reset
  const handlePasswordReset = (userId, type) => {
    setSelectedUser({ id: userId });
    setPasswordResetType(type);
    setShowPasswordReset(true);
    setActionDropdowns({});
  };

  // Confirm password reset
  const confirmPasswordReset = () => {
    resetPasswordMutation.mutate({ 
      userId: selectedUser.id, 
      type: passwordResetType 
    });
  };

  // Get role icon
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'therapist':
        return <Stethoscope className="w-4 h-4" />;
      case 'patient':
        return <Heart className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    return status === 'active' ? 'status-badge active' : 'status-badge inactive';
  };

  // Get role badge class
  const getRoleBadgeClass = (role) => {
    return `role-badge ${role}`;
  };

  // Check if user is authenticated
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || userRole !== 'admin') {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <div className="error-icon">🔐</div>
          <h3>Authentication Required</h3>
          <p>You need to be logged in as an admin to access this page.</p>
          <div style={{ marginTop: '1rem' }}>
            <button 
              onClick={() => {
                // Auto-login as admin for testing
                const loginData = {
                  email: 'admin@therapease.com',
                  password: 'SecureAdmin2024!@#$'
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
              className="user-btn-primary"
            >
              Login as Admin (Test)
            </button>
            <button 
              onClick={() => window.location.href = '/auth/login'}
              className="user-btn-secondary"
              style={{ marginLeft: '1rem' }}
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Users</h3>
          <p>There was an error loading the user data. Please try again.</p>
          <button onClick={() => refetch()} className="user-btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
            <button
              className="notification-close"
              onClick={() => setNotification({ show: false, message: '', type: 'success' })}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="welcome-section">
        <div className="welcome-content">
          <div className="welcome-text">
            <h1 className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-purple-600" />
              </div>
              User Management
            </h1>
            <p>Manage all users, roles, and account settings across the platform</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon users">
            <User className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <h3>Total Users</h3>
            <p className="stat-number">{users.length}</p>
            <span className="stat-change positive">
              <TrendingUp className="w-4 h-4" />
              All Users
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon admins">
            <Shield className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <h3>Administrators</h3>
            <p className="stat-number">{users.filter(u => u.role === 'admin').length}</p>
            <span className="stat-change positive">
              <TrendingUp className="w-4 h-4" />
              Active
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon therapists">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <h3>Therapists</h3>
            <p className="stat-number">{users.filter(u => u.role === 'therapist').length}</p>
            <span className="stat-change positive">
              <TrendingUp className="w-4 h-4" />
              Active
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon patients">
            <Heart className="w-6 h-6" />
          </div>
          <div className="stat-content">
            <h3>Patients</h3>
            <p className="stat-number">{users.filter(u => u.role === 'patient').length}</p>
            <span className="stat-change positive">
              <TrendingUp className="w-4 h-4" />
              Active
            </span>
          </div>
        </div>
      </div>



      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex flex-col">
              <select
                value={roleFilter}
                onChange={handleRoleFilter}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admins</option>
                <option value="therapist">Therapists</option>
                <option value="patient">Patients</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <select
                value={statusFilter}
                onChange={handleStatusFilter}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="users-table-container">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">
              <User className="w-12 h-12 text-gray-400" />
              <h3>No Users Found</h3>
              <p>{searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                ? 'No users match your current search or filter criteria.' 
                : 'No users found in the system.'}</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(filteredUsers) && filteredUsers.length > 0 ? filteredUsers.map((user) => (
                  <tr key={user.id} className="user-row">
                    <td>
                      <div className="user-info">
                        <InitialsAvatar 
                          name={`${user.firstName || 'Unknown'} ${user.lastName || 'User'}`}
                          size="md"
                          className="user-avatar"
                        />
                        <div className="user-details">
                          <div className="user-name">
                            {user.firstName || 'Unknown'} {user.lastName || 'User'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-role">
                        <span className={getRoleBadgeClass(user.role || 'user')}>
                          {getRoleIcon(user.role || 'user')}
                          {(user.role || 'user').charAt(0).toUpperCase() + (user.role || 'user').slice(1)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="user-contact">
                        <div className="contact-info">
                          {user.phone ? (
                            <div className="contact-item">
                              <Phone className="contact-icon" />
                              {user.phone}
                            </div>
                          ) : (
                            <div className="contact-item no-phone">
                              No phone provided
                            </div>
                          )}
                          <div className="contact-item">
                            <Mail className="contact-icon" />
                            {user.email || 'No email provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="user-status">
                        <span className={getStatusBadgeClass(user.status || 'active')}>
                          {(user.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="user-created">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
                      </div>
                    </td>
                    <td className="user-actions-cell">
                      <div className="user-action-menu">
                        <button
                          className="user-action-btn dropdown-trigger"
                          onClick={(e) => toggleActionDropdown(user.id, e)}
                          ref={el => dropdownRefs.current[user.id] = el}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionDropdowns[user.id] && (
                          <div 
                            className="user-action-dropdown"
                            style={{
                              top: `${getDropdownPosition(user.id).top}px`,
                              right: `${getDropdownPosition(user.id).right}px`
                            }}
                          >
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusToggle(user.id, user.status || 'active');
                                closeAllDropdowns();
                              }}
                            >
                              {(user.status || 'active') === 'active' ? (
                                <>
                                  <UserX className="w-4 h-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  Activate
                                </>
                              )}
                            </button>
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePasswordReset(user.id, 'reset');
                                closeAllDropdowns();
                              }}
                            >
                              <Key className="w-4 h-4" />
                              Reset Password
                            </button>
                            <button
                              className="dropdown-item"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePasswordReset(user.id, 'sendLink');
                                closeAllDropdowns();
                              }}
                            >
                              <Mail className="w-4 h-4" />
                              Send Reset Link
                            </button>
                            <button
                              className="dropdown-item danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUser(user.id);
                                closeAllDropdowns();
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete User
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordReset && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordReset(false)}>
          <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {passwordResetType === 'reset' ? 'Reset Password' : 'Send Reset Link'}
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowPasswordReset(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div className="info-message">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <strong>
                    {passwordResetType === 'reset' 
                      ? 'Password Reset Confirmation' 
                      : 'Reset Link Confirmation'
                    }
                  </strong>
                  <p>
                    {passwordResetType === 'reset'
                      ? 'Are you sure you want to reset this user\'s password? A new temporary password will be generated and sent to their email.'
                      : 'Are you sure you want to send a password reset link to this user\'s email?'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="user-btn-secondary"
                onClick={() => setShowPasswordReset(false)}
              >
                Cancel
              </button>
              <button
                className="user-btn-primary"
                onClick={confirmPasswordReset}
                disabled={resetPasswordMutation.isLoading}
              >
                {resetPasswordMutation.isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Result Modal */}
      {passwordResetResult && (
        <div className="modal-overlay" onClick={() => setPasswordResetResult(null)}>
          <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Password Reset Successful</h2>
              <button
                className="close-btn"
                onClick={() => setPasswordResetResult(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body">
              <div className="success-message">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <strong>Password Reset Complete</strong>
                  <p>The user's password has been successfully reset.</p>
                </div>
              </div>
              
              <div className="password-info">
                <div className="info-item">
                  <label>User Email:</label>
                  <span>{passwordResetResult.userEmail}</span>
                </div>
                <div className="info-item">
                  <label>User ID:</label>
                  <span>{passwordResetResult.userId}</span>
                </div>
                <div className="info-item password-item">
                  <label>New Temporary Password:</label>
                  <div className="password-display">
                    <code className="temp-password">{passwordResetResult.tempPassword}</code>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(passwordResetResult.tempPassword);
                        setNotification({
                          show: true,
                          message: 'Password copied to clipboard!',
                          type: 'success'
                        });
                        setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 2000);
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="warning-message">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <strong>Important:</strong>
                  <p>Please provide this temporary password to the user securely. They should change it on their first login.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="user-btn-primary"
                onClick={() => setPasswordResetResult(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

export default AdminUserManagement;