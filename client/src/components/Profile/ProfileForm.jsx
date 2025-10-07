import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Mail, Phone, MapPin, Calendar, Edit, Save, X, Shield, GraduationCap, Award, AlertCircle, Eye, EyeOff, Camera, CheckCircle } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useWebSocket';
import toast from 'react-hot-toast';
import InitialsAvatar from '../InitialsAvatar';

const ProfileForm = ({ userRole, apiService }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Helper function to extract profile data from API response
  const extractProfileData = (data) => {
    if (!data) return {};
    
    if (data.data && data.data.success && data.data.data) {
      return data.data.data;
    } else if (data.success && data.data) {
      return data.data;
    } else if (data.data && typeof data.data === 'object' && !data.data.success) {
      return data.data;
    } else {
      return data;
    }
  };


  // Fetch profile data
  const { data: profileData, isLoading, error, refetch } = useQuery({
    queryKey: [`${userRole}Profile`],
    queryFn: () => apiService.getProfile(),
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: 1000,
    enabled: !!(apiService && apiService.getProfile) // Only run if apiService is valid
  });

  // Enable real-time updates
  useRealtimeData(`${userRole}Profile`, refetch);

  // Update form data when profile data changes
  useEffect(() => {
    const extractedData = extractProfileData(profileData);
    setFormData(extractedData);
    
    // Set profile image if available
    if (extractedData.profileImage) {
      setProfileImage(extractedData.profileImage);
    }
  }, [profileData, isLoading, error]);

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

  // Upload profile image mutation
  const uploadImageMutation = useMutation(
    (formData) => apiService.uploadProfileImage(formData),
    {
      onSuccess: (response) => {
        toast.success('Profile picture updated successfully');
        setProfileImage(response.data.imageUrl);
        // Update the form data with the new image URL
        setFormData(prev => ({ ...prev, profileImage: response.data.imageUrl }));
        // Refetch profile data to get updated information
        queryClient.invalidateQueries([`${userRole}Profile`]);
        setIsUploadingImage(false);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to upload profile picture');
        setIsUploadingImage(false);
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

    // Only validate email format if email is provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Only validate phone format if phone is provided
    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
      const phonePattern = /^(09\d{9}|\+639\d{9})$/;
      if (!phonePattern.test(cleanPhone)) {
        newErrors.phone = 'Phone number must be in format 09XXXXXXXXX or +639XXXXXXXXX';
      }
    }

    // Only validate therapist-specific fields if they are provided
    if (userRole === 'therapist') {
      if (formData.licenseNumber && formData.licenseNumber.trim() && formData.licenseNumber.length < 5) {
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
    // Reset form data to the original profile data
    const originalData = extractProfileData(profileData);
    setFormData(originalData);
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

  // Handle profile image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('profileImage', file);

    uploadImageMutation.mutate(formData);
  };

  // Handle camera button click
  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  // Check if apiService is valid (after all hooks)
  if (!apiService || !apiService.getProfile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Error</h3>
        <p className="text-sm text-gray-500">Profile service is not properly configured.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // If no profile data and not loading, show a message
  if (!profileData && !isLoading && !error) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Profile Data</h3>
        <p className="text-sm text-gray-500">Unable to load profile information. Please try refreshing the page.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (error) {
    console.log('ProfileForm render - error:', error);
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading profile</h3>
        <p className="text-sm text-gray-500">There was a problem loading your profile information.</p>
        <p className="text-xs text-red-500 mt-2">Error: {error.message}</p>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col space-y-6">
          {/* Profile Info Section */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <InitialsAvatar 
                  name={`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'User'} 
                  size="xl" 
                />
              )}
              <button 
                onClick={handleCameraClick}
                disabled={isUploadingImage}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingImage ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'User Profile'}
              </h2>
              <p className="text-gray-600 mt-1">
                {userRole === 'admin' && 'System Administrator'}
                {userRole === 'therapist' && 'Licensed Therapist'}
                {userRole === 'patient' && 'Patient'}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-3">
                <div className="flex items-center text-sm text-gray-500">
                  <Mail className="h-4 w-4 mr-1" />
                  {formData.email || 'No email'}
                </div>
                {formData.phone && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="h-4 w-4 mr-1" />
                    {formData.phone}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons Section */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isLoading}
                  className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfileMutation.isLoading ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

        {/* Profile Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
            {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <User className="h-5 w-5 mr-2 text-blue-600" />
            Basic Information
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                  placeholder="Enter first name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                  placeholder="Enter last name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                  placeholder="Enter email address"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                  } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                  placeholder="Enter phone number"
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      !isEditing ? 'bg-gray-50' : 'bg-white'
                    }`}
                    style={{ minWidth: '200px' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
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
              </div>
            </div>

            {/* Address Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-green-600" />
            Address Information
          </h3>
          
          <div className="space-y-6">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
                    }`}
                  placeholder="Enter street address"
                  />
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
                    }`}
                  placeholder="Enter city"
                  />
                </div>

                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
                    }`}
                  placeholder="Enter state"
                  />
                </div>
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
                  }`}
                  placeholder="Enter ZIP code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                    !isEditing ? 'bg-gray-50' : 'bg-white'
                  }`}
                  placeholder="Enter country"
                />
              </div>
            </div>
              </div>
            </div>
          </div>

      {/* Role-specific Information */}
          {userRole === 'therapist' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <GraduationCap className="h-5 w-5 mr-2 text-purple-600" />
            Professional Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number
              </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.licenseNumber ? 'border-red-300' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                placeholder="Enter license number"
                  />
                  {errors.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors.licenseNumber}</p>}
                </div>

                <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience
              </label>
                  <input
                    type="number"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.yearsOfExperience ? 'border-red-300' : 'border-gray-300'
                } ${!isEditing ? 'bg-gray-50' : 'bg-white'}`}
                placeholder="Enter years of experience"
                  />
                  {errors.yearsOfExperience && <p className="mt-1 text-sm text-red-600">{errors.yearsOfExperience}</p>}
                </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization
              </label>
                  <input
                    type="text"
                name="specialization"
                value={formData.specialization || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  !isEditing ? 'bg-gray-50' : 'bg-white'
                }`}
                placeholder="Enter specialization"
                  />
                </div>
              </div>
            </div>
          )}

      {/* Password Change Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Shield className="h-5 w-5 mr-2 text-red-600" />
          Change Password
        </h3>
        
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <div className="relative">
                <input
                type={showPassword ? 'text' : 'password'}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              </div>

              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePasswordMutation.isLoading}
              className="inline-flex items-center px-6 py-3 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isLoading ? (
                <>
                  <Shield className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </button>
            </div>
          </form>
      </div>
    </div>
  );
};

export default ProfileForm;