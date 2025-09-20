import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, GraduationCap, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';

const ProfileForm = ({ userRole, apiService }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const queryClient = useQueryClient();

  // Fetch profile data
  const { data: profileData, isLoading, error, refetch } = useQuery({
    queryKey: [`${userRole}Profile`],
    queryFn: apiService.getProfile,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the data
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Enable real-time updates
  useRealtimeData(`${userRole}Profile`, refetch);

  // Update form data when profile data changes
  useEffect(() => {
    console.log('useEffect triggered - profileData:', profileData);
    
    if (profileData) {
      // Check if profileData is the Axios response object
      if (profileData.data && profileData.data.success && profileData.data.data) {
        console.log('Setting form data from Axios response data.data:', profileData.data.data);
        setFormData(profileData.data.data);
      }
      // Check if profileData is the API response object with success and data properties
      else if (profileData.success && profileData.data) {
        console.log('Setting form data from API response data:', profileData.data);
        setFormData(profileData.data);
      } 
      // Check if profileData already has the data property
      else if (profileData.data) {
        console.log('Setting form data from profileData.data:', profileData.data);
        setFormData(profileData.data);
      } 
      // If profileData is the actual data object
      else {
        console.log('Setting form data directly from profileData:', profileData);
        setFormData(profileData);
      }
    } else {
      console.log('No profileData available');
    }
  }, [profileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation(
    (profileData) => apiService.updateProfile(profileData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(`${userRole}Profile`);
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        setErrors({});
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update profile');
        setErrors(error.response?.data?.errors || {});
      }
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    (passwordData) => apiService.changePassword(passwordData),
    {
      onSuccess: () => {
        toast.success('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to change password');
      }
    }
  );

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields validation
    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation
    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Role-specific validation
    if (userRole === 'therapist') {
      if (formData.licenseNumber && formData.licenseNumber.length < 5) {
        newErrors.licenseNumber = 'License number must be at least 5 characters';
      }
      if (formData.yearsOfExperience && (isNaN(formData.yearsOfExperience) || formData.yearsOfExperience < 0)) {
        newErrors.yearsOfExperience = 'Years of experience must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      updateProfileMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setFormData(profileData?.data || {});
    setIsEditing(false);
    setErrors({});
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    console.error('Profile loading error:', error);
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading profile</h3>
        <p className="text-sm text-gray-500">There was a problem loading your profile information.</p>
        <p className="text-xs text-red-500 mt-2">Error: {error.message}</p>
      </div>
    );
  }

  // Debug logging
  console.log('ProfileForm render - profileData:', profileData);
  console.log('ProfileForm render - formData:', formData);
  console.log('ProfileForm render - isLoading:', isLoading);
  console.log('ProfileForm render - error:', error);
  console.log('ProfileForm render - userRole:', userRole);
  console.log('ProfileForm render - formData keys:', Object.keys(formData));
  console.log('ProfileForm render - formData firstName:', formData.firstName);
  console.log('ProfileForm render - formData lastName:', formData.lastName);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
                <p className="text-sm text-gray-500">Manage your personal information and preferences</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : ''}`}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : ''}`}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`block w-full pl-10 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    !isEditing ? 'bg-gray-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Role-specific fields */}
          {userRole === 'therapist' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.licenseNumber ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                  {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Years of Experience</label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    min="0"
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      errors.yearsOfExperience ? 'border-red-300' : 'border-gray-300'
                    } ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                  {errors.yearsOfExperience && <p className="mt-1 text-sm text-red-600">{errors.yearsOfExperience}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Education</label>
                  <input
                    type="text"
                    name="education"
                    value={formData.education || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Certifications</label>
                  <textarea
                    name="certifications"
                    rows={3}
                    value={formData.certifications || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                    placeholder="List your professional certifications..."
                  />
                </div>
              </div>
            </div>
          )}

          {userRole === 'patient' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Medical Information</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={formData.diagnosis || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discharged">Discharged</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Medical History</label>
                  <textarea
                    name="medicalHistory"
                    rows={3}
                    value={formData.medicalHistory || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter relevant medical history..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Goals</label>
                  <textarea
                    name="goals"
                    rows={3}
                    value={formData.goals || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      !isEditing ? 'bg-gray-50' : 'border-gray-300'
                    }`}
                    placeholder="Enter therapy goals..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div className="px-6 py-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                  minLength={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {changePasswordMutation.isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileForm;
