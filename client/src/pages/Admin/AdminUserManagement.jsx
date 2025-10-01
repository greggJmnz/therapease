import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
  const dropdownRefs = useRef({});

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
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
      console.log('🔑 resetPasswordMutation called with:', { userId, type });
      if (type === 'reset') {
        return adminAPI.resetUserPassword(userId);
      } else {
        return adminAPI.sendPasswordResetLink(userId);
      }
    },
    {
      onSuccess: (data, variables) => {
        console.log('✅ resetPasswordMutation success:', data);
        setShowPasswordReset(false);
        setActionDropdowns({});
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

  // Check if dropdown should open upward
  const shouldOpenUpward = (userId) => {
    const button = dropdownRefs.current[userId];
    if (!button) return false;
    
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 200; // Approximate dropdown height
    const spaceBelow = viewportHeight - rect.bottom;
    
    return spaceBelow < dropdownHeight && rect.top > dropdownHeight;
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
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      // Find the user to get their role
      const user = users.find(u => u.id === userId);
      deleteUserMutation.mutate({ userId, userRole: user?.role });
    }
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
      day: 'numeric'
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
                  password: 'admin123'
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



      {/* Content */}
      <div className="admin-content">
        {/* Search and Filter */}
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

        {/* Users Table */}
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
                          <div className={`user-action-dropdown ${shouldOpenUpward(user.id) ? 'dropdown-up' : ''}`}>
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
    </div>
  );
};

export default AdminUserManagement;