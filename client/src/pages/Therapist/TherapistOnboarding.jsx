import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQueryClient } from 'react-query';
import { 
  User, 
  FileText, 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Calendar,
  Phone,
  MapPin,
  Heart,
  AlertTriangle,
  Lock,
  Eye,
  Database,
  UserCheck,
  ClipboardList,
  Star,
  GraduationCap,
  Award,
  Briefcase,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { therapistAPI } from '../../services/api';
import ModernInput from '../../components/ModernInput';
import ModernButton from '../../components/ModernButton';
import { useNavigationState } from '../../hooks/useNavigationState';

const TherapistOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [onboardingData, setOnboardingData] = useState({});
  const [currentUserData, setCurrentUserData] = useState(null);
  const [hipaaAcknowledged, setHipaaAcknowledged] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const { startNavigation, completeNavigation, canNavigate } = useNavigationState();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
    getValues
  } = useForm();

  const totalSteps = 4;

  // Step configuration
  const steps = [
    {
      id: 1,
      title: 'Personal Information',
      description: 'Complete your basic profile details',
      icon: User,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Professional Information',
      description: 'Share your credentials and experience',
      icon: GraduationCap,
      color: 'green'
    },
    {
      id: 3,
      title: 'Privacy & Compliance',
      description: 'Review and accept our privacy policies',
      icon: Shield,
      color: 'purple'
    },
    {
      id: 4,
      title: 'Welcome & Setup',
      description: 'Complete your account setup and change password',
      icon: CheckCircle,
      color: 'indigo'
    }
  ];

  // Note: Onboarding status check and navigation is now handled in TherapistLayout
  // Just set checking status to false since navigation is handled centrally
  useEffect(() => {
    if (user) {
      setIsCheckingStatus(false);
    } else {
      setIsCheckingStatus(false);
    }
  }, [user]);

  // Load current user data for account summary
  useEffect(() => {
    const loadCurrentUserData = async () => {
      try {
        const response = await therapistAPI.getProfile();
        if (response.data.success) {
          setCurrentUserData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    if (user?.role === 'therapist') {
      loadCurrentUserData();
    }
  }, [user]);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveStepData = async (stepData) => {
    // Update local state
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    
    // Also save to server to persist data as user progresses
    try {
      const completeData = { ...onboardingData, ...stepData };
      await therapistAPI.updateOnboardingData(completeData);
      
      // Refresh current user data to update account summary
      const response = await therapistAPI.getProfile();
      if (response.data.success) {
        setCurrentUserData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to save step data to server:', error);
      // Don't show error to user as this is background saving
    }
  };

  // Helper function to sanitize data and remove circular references
  const sanitizeData = (obj) => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to sanitize data, using fallback:', error);
      // Fallback: manually extract only the expected fields
      return {
        firstName: obj.firstName || null,
        lastName: obj.lastName || null,
        phone: obj.phone || null,
        dateOfBirth: obj.dateOfBirth || null,
        gender: obj.gender || null,
        address: obj.address || null,
        city: obj.city || null,
        state: obj.state || null,
        zipCode: obj.zipCode || null,
        licenseNumber: obj.licenseNumber || null,
        specialization: obj.specialization || null,
        yearsOfExperience: obj.yearsOfExperience || null,
        education: obj.education || null,
        certifications: obj.certifications || null,
        availability: obj.availability || null,
        maxPatients: obj.maxPatients || 20,
        isAcceptingPatients: obj.isAcceptingPatients !== undefined ? obj.isAcceptingPatients : true
      };
    }
  };

  const onSubmit = async (data = {}) => {
    setLoading(true);
    try {
      // Ensure we only send serializable data
      const completeData = {
        ...onboardingData,
        ...data,
        hipaaAcknowledged,
        termsAccepted,
        acceptedAt: new Date().toISOString()
      };

      // Remove any non-serializable properties
      const sanitizedData = sanitizeData(completeData);

      const response = await therapistAPI.completeOnboarding(sanitizedData);
      
      if (response.data.success) {
        toast.success('Welcome to TherapEase! Your therapist account is now fully set up.');
        updateUser({ onboardingCompleted: true });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries('therapistOnboardingStatus');
        queryClient.invalidateQueries('therapistDashboard');
        
        // Set redirecting state to prevent rapid switching
        setIsRedirecting(true);
        
        // Add small delay to show success message
        if (canNavigate() && startNavigation('/therapist/dashboard')) {
          setTimeout(() => {
            navigate('/therapist/dashboard');
            completeNavigation();
          }, 150); // Brief delay to show success message
        }
      } else {
        toast.error('Failed to complete onboarding. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'An error occurred during setup. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep 
          register={register} 
          errors={errors} 
          watch={watch}
          onNext={nextStep}
          onSave={saveStepData}
          getValues={getValues}
        />;
      case 2:
        return <ProfessionalInfoStep 
          register={register} 
          errors={errors} 
          watch={watch}
          onNext={nextStep}
          onPrev={prevStep}
          onSave={saveStepData}
          getValues={getValues}
        />;
      case 3:
        return <ComplianceStep 
          hipaaAcknowledged={hipaaAcknowledged}
          setHipaaAcknowledged={setHipaaAcknowledged}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          onNext={nextStep}
          onPrev={prevStep}
        />;
      case 4:
        return <WelcomeStep 
          user={user}
          onboardingData={onboardingData}
          currentUserData={currentUserData}
          onSubmit={onSubmit}
          isLoading={isLoading}
          onPrev={prevStep}
          showCurrentPassword={showCurrentPassword}
          setShowCurrentPassword={setShowCurrentPassword}
          showNewPassword={showNewPassword}
          setShowNewPassword={setShowNewPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          register={register}
          errors={errors}
          watch={watch}
        />;
      default:
        return null;
    }
  };

  const getStepColor = (stepId) => {
    if (stepId < currentStep) return 'text-green-600 bg-green-100';
    if (stepId === currentStep) return 'text-blue-600 bg-blue-100';
    return 'text-gray-400 bg-gray-100';
  };

  // Show loading state while checking onboarding status
  if (isCheckingStatus || isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isRedirecting ? 'Redirecting to dashboard...' : 'Checking your account status...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to TherapEase
            </h1>
            <p className="text-lg text-gray-600">
              Let's set up your therapist account
            </p>
          </div>

          {/* Progress Steps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isActive 
                          ? 'bg-blue-500 border-blue-500 text-white' 
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </h3>
                      <p className={`text-xs ${
                        isActive ? 'text-blue-500' : isCompleted ? 'text-green-500' : 'text-gray-400'
                      }`}>
                        {step.description}
                      </p>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            {renderStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Personal Information Step Component
const PersonalInfoStep = ({ register, errors, watch, onNext, onSave, getValues }) => {
  const handleNext = async () => {
    const data = getValues();
    await onSave(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">Let's start with your basic information</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernInput
          label="First Name"
          name="firstName"
          register={register}
          error={errors.firstName}
          required
          placeholder="Enter your first name"
        />

        <ModernInput
          label="Last Name"
          name="lastName"
          register={register}
          error={errors.lastName}
          required
          placeholder="Enter your last name"
        />

        <ModernInput
          label="Phone Number"
          name="phone"
          type="tel"
          register={register}
          error={errors.phone}
          required
          placeholder="09XXXXXXXXX"
        />

        <ModernInput
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          register={register}
          error={errors.dateOfBirth}
          required
        />

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gender
          </label>
          <select
            {...register('gender', { required: 'Gender is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
          )}
        </div>

        <ModernInput
          label="Address"
          name="address"
          register={register}
          error={errors.address}
          required
          placeholder="Enter your address"
        />

        <ModernInput
          label="City"
          name="city"
          register={register}
          error={errors.city}
          required
          placeholder="Enter your city"
        />

        <ModernInput
          label="State/Province"
          name="state"
          register={register}
          error={errors.state}
          required
          placeholder="Enter your state or province"
        />

        <ModernInput
          label="ZIP/Postal Code"
          name="zipCode"
          register={register}
          error={errors.zipCode}
          required
          placeholder="Enter your ZIP or postal code"
        />
      </div>

      <div className="flex justify-end pt-6">
        <ModernButton
          type="button"
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </ModernButton>
      </div>
    </div>
  );
};

// Professional Information Step Component
const ProfessionalInfoStep = ({ register, errors, watch, onNext, onPrev, onSave, getValues }) => {
  const handleNext = async () => {
    const data = getValues();
    await onSave(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <GraduationCap className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Professional Information</h2>
        <p className="text-gray-600">Tell us about your professional background</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ModernInput
          label="License Number"
          name="licenseNumber"
          register={register}
          error={errors.licenseNumber}
          required
          placeholder="Enter your professional license number"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specialization
          </label>
          <select
            {...register('specialization', { required: 'Specialization is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select your specialization</option>
            <option value="Pediatric Occupational Therapy">Pediatric Occupational Therapy</option>
            <option value="Adult Occupational Therapy">Adult Occupational Therapy</option>
            <option value="Physical Therapy">Physical Therapy</option>
            <option value="Speech Therapy">Speech Therapy</option>
            <option value="Behavioral Therapy">Behavioral Therapy</option>
            <option value="Mental Health Counseling">Mental Health Counseling</option>
            <option value="Other">Other</option>
          </select>
          {errors.specialization && (
            <p className="mt-1 text-sm text-red-600">{errors.specialization.message}</p>
          )}
        </div>

        <ModernInput
          label="Years of Experience"
          name="yearsOfExperience"
          type="number"
          register={register}
          error={errors.yearsOfExperience}
          required
          placeholder="Enter years of experience"
          min="0"
          max="50"
        />

        <ModernInput
          label="Max Patients"
          name="maxPatients"
          type="number"
          register={register}
          error={errors.maxPatients}
          placeholder="Maximum patients (default: 20)"
          min="1"
          max="100"
        />

        <div className="md:col-span-2">
          <ModernInput
            label="Education"
            name="education"
            register={register}
            error={errors.education}
            required
            placeholder="Enter your educational background (e.g., Bachelor's in Occupational Therapy)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Certifications
          </label>
          <textarea
            {...register('certifications')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="List your certifications and additional qualifications"
          />
          {errors.certifications && (
            <p className="mt-1 text-sm text-red-600">{errors.certifications.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Availability
          </label>
          <textarea
            {...register('availability')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Describe your availability (e.g., Monday-Friday 9AM-5PM)"
          />
          {errors.availability && (
            <p className="mt-1 text-sm text-red-600">{errors.availability.message}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center">
            <input
              {...register('isAcceptingPatients')}
              type="checkbox"
              id="isAcceptingPatients"
              defaultChecked={true}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <label htmlFor="isAcceptingPatients" className="ml-2 block text-sm text-gray-700">
              I am currently accepting new patients
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <ModernButton
          type="button"
          onClick={onPrev}
          variant="outline"
          className="px-8 py-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </ModernButton>
        
        <ModernButton
          type="button"
          onClick={handleNext}
          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </ModernButton>
      </div>
    </div>
  );
};

// Compliance Step Component
const ComplianceStep = ({ hipaaAcknowledged, setHipaaAcknowledged, termsAccepted, setTermsAccepted, onNext, onPrev }) => {
  const handleNext = () => {
    if (hipaaAcknowledged && termsAccepted) {
      onNext();
    } else {
      toast.error('Please accept all terms and conditions to continue');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Shield className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Compliance</h2>
        <p className="text-gray-600">Review and accept our privacy policies</p>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HIPAA Compliance</h3>
          <p className="text-gray-700 mb-4">
            As a healthcare provider, you are required to comply with HIPAA regulations. 
            This includes protecting patient privacy, maintaining secure records, and 
            following proper data handling procedures.
          </p>
          <div className="flex items-start">
            <input
              type="checkbox"
              id="hipaaAcknowledged"
              checked={hipaaAcknowledged}
              onChange={(e) => setHipaaAcknowledged(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="hipaaAcknowledged" className="ml-3 block text-sm text-gray-700">
              I acknowledge that I understand and will comply with HIPAA regulations
            </label>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms of Service</h3>
          <p className="text-gray-700 mb-4">
            By using TherapEase, you agree to our terms of service, including 
            professional conduct standards, data usage policies, and platform guidelines.
          </p>
          <div className="flex items-start">
            <input
              type="checkbox"
              id="termsAccepted"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="termsAccepted" className="ml-3 block text-sm text-gray-700">
              I accept the Terms of Service and agree to comply with all platform guidelines
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <ModernButton
          type="button"
          onClick={onPrev}
          variant="outline"
          className="px-8 py-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </ModernButton>
        
        <ModernButton
          type="button"
          onClick={handleNext}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </ModernButton>
      </div>
    </div>
  );
};

// Welcome Step Component with Password Change
const WelcomeStep = ({ 
  user, 
  onboardingData, 
  currentUserData,
  onSubmit, 
  isLoading, 
  onPrev,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  register,
  errors,
  watch
}) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  
  const newPassword = watch('newPassword');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    
    try {
      const currentPassword = watch('currentPassword');
      const confirmPassword = watch('confirmPassword');
      
      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }
      
      const response = await therapistAPI.changePassword({
        currentPassword,
        newPassword
      });
      
      if (response.data.success) {
        setPasswordChangeSuccess(true);
        toast.success('Password changed successfully');
      } else {
        toast.error('Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCompleteOnboarding = () => {
    if (!passwordChangeSuccess) {
      toast.error('Please change your password before completing onboarding');
      return;
    }
    onSubmit();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <CheckCircle className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TherapEase!</h2>
        <p className="text-gray-600">Complete your setup and change your temporary password</p>
      </div>

      {/* Account Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Account Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-blue-700"><strong>Name:</strong> {currentUserData?.firstName || 'Not set'} {currentUserData?.lastName || ''}</p>
            <p className="text-sm text-blue-700"><strong>Email:</strong> {user?.email}</p>
            <p className="text-sm text-blue-700"><strong>Specialization:</strong> {currentUserData?.specialization || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-blue-700"><strong>License:</strong> {currentUserData?.licenseNumber || 'Not set'}</p>
            <p className="text-sm text-blue-700"><strong>Experience:</strong> {currentUserData?.yearsOfExperience || 0} years</p>
            <p className="text-sm text-blue-700"><strong>Max Patients:</strong> {currentUserData?.maxPatients || 20}</p>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Change Your Password
        </h3>
        <p className="text-gray-600 mb-4">
          For security reasons, you must change your temporary password before completing setup.
        </p>
        
        {!passwordChangeSuccess ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password (Temporary)
              </label>
              <div className="relative">
                <input
                  {...register('currentPassword', { required: 'Current password is required' })}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  placeholder="Enter your current temporary password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register('newPassword', { 
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                  type={showNewPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  placeholder="Enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', { 
                    required: 'Please confirm your new password',
                    validate: value => value === newPassword || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <Eye className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <ModernButton
                type="submit"
                disabled={isChangingPassword}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2"
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </ModernButton>
            </div>
          </form>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <p className="text-green-700 font-medium">Password changed successfully!</p>
            </div>
          </div>
        )}
      </div>

      {/* What's Next */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Access Your Dashboard</h4>
              <p className="text-sm text-gray-600">View your patients, schedule appointments, and manage your practice.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-green-600">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Start Treating Patients</h4>
              <p className="text-sm text-gray-600">Begin providing occupational therapy services with our comprehensive tools.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-purple-600">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Track Progress</h4>
              <p className="text-sm text-gray-600">Monitor patient progress and generate detailed reports.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <ModernButton
          type="button"
          onClick={onPrev}
          variant="outline"
          className="px-8 py-3"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </ModernButton>
        
        <ModernButton
          type="button"
          onClick={handleCompleteOnboarding}
          disabled={!passwordChangeSuccess || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
        >
          {isLoading ? 'Completing Setup...' : 'Complete Setup'}
          <CheckCircle className="w-4 h-4 ml-2" />
        </ModernButton>
      </div>
    </div>
  );
};

export default TherapistOnboarding;

