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
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { patientAPI } from '../../services/api';
import ModernInput from '../../components/ModernInput';
import ModernButton from '../../components/ModernButton';
import { useNavigationState } from '../../hooks/useNavigationState';

const PatientOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [onboardingData, setOnboardingData] = useState({});
  const [hipaaAcknowledged, setHipaaAcknowledged] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
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
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      city: '',
      state: '',
      zipCode: ''
    }
  });

  const totalSteps = 4;

  // Step configuration
  const steps = [
    {
      id: 1,
      title: 'Patient Information',
      description: 'Complete the patient\'s basic profile details',
      icon: User,
      color: 'blue'
    },
    {
      id: 2,
      title: 'Medical Information',
      description: 'Share your medical history and therapy goals',
      icon: Heart,
      color: 'red'
    },
    {
      id: 3,
      title: 'Privacy & Compliance',
      description: 'Review and accept our privacy policies',
      icon: Shield,
      color: 'green'
    },
    {
      id: 4,
      title: 'Welcome & Setup',
      description: 'Complete your account setup',
      icon: CheckCircle,
      color: 'purple'
    }
  ];

  // Note: Onboarding status check and navigation is now handled in PatientLayout
  // Just set checking status to false since navigation is handled centrally
  useEffect(() => {
    if (user) {
      setIsCheckingStatus(false);
    } else {
      setIsCheckingStatus(false);
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

  const saveStepData = (stepData) => {
    setOnboardingData(prev => ({ ...prev, ...stepData }));
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
        diagnosis: obj.diagnosis || null,
        medicalHistory: obj.medicalHistory || null,
        goals: obj.goals || null,
        emergencyContact: obj.emergencyContact || null,
        insuranceInfo: obj.insuranceInfo || null
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

      const response = await patientAPI.completeOnboarding(sanitizedData);
      
      if (response.data.success) {
        toast.success('Welcome to TherapEase! Your account is now fully set up.');
        updateUser({ onboardingCompleted: true });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries('patientOnboardingStatus');
        queryClient.invalidateQueries('patientDashboard');
        
        // Set redirecting state to prevent rapid switching
        setIsRedirecting(true);
        
        // Add small delay to show success message
        if (canNavigate() && startNavigation('/patient/dashboard')) {
          setTimeout(() => {
            navigate('/patient/dashboard');
            completeNavigation();
          }, 150); // Brief delay to show success message
        }
      } else {
        toast.error('Failed to complete onboarding. Please try again.');
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('An error occurred during setup. Please try again.');
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
        return <MedicalInfoStep 
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
          onSubmit={onSubmit}
          isLoading={isLoading}
          onPrev={prevStep}
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome to TherapEase</h1>
              <p className="text-gray-600 mt-1">Let's get your account set up in just a few steps</p>
            </div>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
        </div>
      </div>

      {/* Occupational Therapy Referral Form Requirement Notice */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Important: Occupational Therapy Referral Form Required
              </h3>
              <p className="text-amber-800 text-sm">
                To be eligible for assessment and to become a patient at TherapEase, you must have or present your 
                <strong> Occupational Therapy Referral Form</strong> from a qualified healthcare provider. 
                This form is required to ensure proper medical oversight and to provide you with the most appropriate 
                occupational therapy services.
              </p>
              <p className="text-amber-800 text-sm mt-2">
                Please ensure you have this referral form available before proceeding with the onboarding process.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isCurrent 
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle size={20} />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`hidden sm:block w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
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
  );
};

// Step 1: Personal Information
const PersonalInfoStep = ({ register, errors, watch, onNext, onSave, getValues }) => {
  const handleNext = () => {
    const data = getValues();
    onSave(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Information</h2>
        <p className="text-gray-600">Please provide the patient's basic information (not parent/guardian information)</p>
      </div>

      {/* Important Notice for Patient Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 mb-1">
              Important: Patient Information Only
            </h4>
            <p className="text-blue-800 text-sm">
              Please enter the <strong>patient's information</strong> in all fields below. If you are a parent or guardian 
              filling out this form for a child, please enter the child's details, not your own. This ensures accurate 
              medical records and proper care coordination.
            </p>
          </div>
        </div>
      </div>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModernInput
            label="First Name"
            type="text"
            leftIcon={User}
            error={errors.firstName?.message}
            name="firstName"
            register={register}
            required
          />

          <ModernInput
            label="Last Name"
            type="text"
            leftIcon={User}
            error={errors.lastName?.message}
            name="lastName"
            register={register}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ModernInput
            label="Phone Number"
            type="tel"
            leftIcon={Phone}
            placeholder="+63 912 345 6789"
            error={errors.phone?.message}
            name="phone"
            register={register}
            required
          />

          <ModernInput
            label="Date of Birth"
            type="date"
            leftIcon={Calendar}
            error={errors.dateOfBirth?.message}
            name="dateOfBirth"
            register={register}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender
            </label>
            <select
              {...register('gender', { required: 'Gender is required' })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            type="text"
            leftIcon={MapPin}
            placeholder="Street address"
            error={errors.address?.message}
            name="address"
            register={register}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ModernInput
            label="City"
            type="text"
            error={errors.city?.message}
            name="city"
            register={register}
            required
          />

          <ModernInput
            label="State/Province"
            type="text"
            error={errors.state?.message}
            name="state"
            register={register}
            required
          />

          <ModernInput
            label="ZIP Code"
            type="text"
            error={errors.zipCode?.message}
            name="zipCode"
            register={register}
            required
          />
        </div>

        <div className="flex justify-end pt-6">
          <ModernButton
            type="button"
            variant="primary"
            size="lg"
            icon={ArrowRight}
            onClick={handleNext}
          >
            Continue
          </ModernButton>
        </div>
      </form>
    </div>
  );
};

// Step 2: Medical Information
const MedicalInfoStep = ({ register, errors, watch, onNext, onPrev, onSave, getValues }) => {
  const handleNext = () => {
    const data = getValues();
    onSave(data);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Medical Information</h2>
        <p className="text-gray-600">Help us understand your therapy needs</p>
      </div>

      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Diagnosis <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('diagnosis', { required: 'Primary diagnosis is required' })}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Please describe your primary diagnosis or condition..."
          />
          {errors.diagnosis && (
            <p className="mt-1 text-sm text-red-600">{errors.diagnosis.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical History
          </label>
          <textarea
            {...register('medicalHistory')}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Please provide relevant medical history, previous treatments, medications, etc..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Therapy Goals <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('goals', { required: 'Therapy goals are required' })}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="What would you like to achieve through occupational therapy? What are your main goals?"
          />
          {errors.goals && (
            <p className="mt-1 text-sm text-red-600">{errors.goals.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Emergency Contact Information
          </label>
          <textarea
            {...register('emergencyContact')}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Name, relationship, phone number, and any other relevant emergency contact details..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Insurance Information
          </label>
          <textarea
            {...register('insuranceInfo')}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Insurance provider, policy number, coverage details, etc..."
          />
        </div>

        <div className="flex justify-between pt-6">
          <ModernButton
            type="button"
            variant="secondary"
            size="lg"
            icon={ArrowLeft}
            onClick={onPrev}
          >
            Back
          </ModernButton>
          <ModernButton
            type="button"
            variant="primary"
            size="lg"
            icon={ArrowRight}
            onClick={handleNext}
          >
            Continue
          </ModernButton>
        </div>
      </form>
    </div>
  );
};

// Step 3: Compliance
const ComplianceStep = ({ 
  hipaaAcknowledged, 
  setHipaaAcknowledged, 
  termsAccepted, 
  setTermsAccepted, 
  onNext, 
  onPrev 
}) => {
  const handleNext = () => {
    if (!hipaaAcknowledged || !termsAccepted) {
      toast.error('Please acknowledge all required agreements to continue');
      return;
    }
    onNext();
  };

  const complianceFeatures = [
    {
      icon: Lock,
      title: 'Data Encryption',
      description: 'All health information is encrypted using AES-256 encryption both at rest and in transit.'
    },
    {
      icon: Shield,
      title: 'Access Controls',
      description: 'Multi-factor authentication and role-based access controls protect your information.'
    },
    {
      icon: Eye,
      title: 'Audit Logging',
      description: 'All access to your health information is logged and monitored for security.'
    },
    {
      icon: Database,
      title: 'Secure Storage',
      description: 'Your data is stored in HIPAA-compliant data centers with physical security measures.'
    }
  ];

  const patientRights = [
    'Access your health information',
    'Request amendments to your records',
    'Request restrictions on use and disclosure',
    'Receive confidential communications',
    'File complaints about privacy violations'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={32} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy & Compliance</h2>
        <p className="text-gray-600">Your privacy and data security are our top priorities</p>
      </div>

      {/* HIPAA Compliance Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <Shield className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              HIPAA Compliance & Data Protection
            </h3>
            <p className="text-green-800 text-sm">
              TherapEase is fully compliant with HIPAA (Health Insurance Portability and Accountability Act) 
              and the Philippine Data Privacy Act of 2012. We implement comprehensive security measures to 
              protect your health information.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {complianceFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex items-start space-x-3">
                <Icon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">{feature.title}</h4>
                  <p className="text-xs text-green-700">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-green-900 mb-2">Your Rights as a Patient:</h4>
          <ul className="text-xs text-green-700 space-y-1">
            {patientRights.map((right, index) => (
              <li key={index} className="flex items-center space-x-2">
                <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                <span>{right}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-green-200">
          <input
            type="checkbox"
            id="hipaa-acknowledgment"
            checked={hipaaAcknowledged}
            onChange={(e) => setHipaaAcknowledged(e.target.checked)}
            className="w-4 h-4 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2 mt-1"
          />
          <label htmlFor="hipaa-acknowledgment" className="text-sm text-green-800">
            I acknowledge that I have read and understand the HIPAA compliance notice and my rights as a patient. 
            I consent to the collection, use, and disclosure of my health information as described in the 
            privacy policy for the purpose of providing occupational therapy services.
          </label>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Terms of Service & Privacy Policy
            </h3>
            <p className="text-blue-800 text-sm">
              By using TherapEase, you agree to our Terms of Service and Privacy Policy. 
              These documents outline how we collect, use, and protect your information.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3 p-4 bg-white rounded-lg border border-blue-200">
          <input
            type="checkbox"
            id="terms-acceptance"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mt-1"
          />
          <label htmlFor="terms-acceptance" className="text-sm text-blue-800">
            I have read and agree to the Terms of Service, Privacy Policy, and Data Privacy Act 2012 
            compliance requirements. I understand that my information will be used to provide 
            occupational therapy services and improve my care experience.
          </label>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <ModernButton
          type="button"
          variant="secondary"
          size="lg"
          icon={ArrowLeft}
          onClick={onPrev}
        >
          Back
        </ModernButton>
        <ModernButton
          type="button"
          variant="primary"
          size="lg"
          icon={ArrowRight}
          onClick={handleNext}
          disabled={!hipaaAcknowledged || !termsAccepted}
        >
          Continue
        </ModernButton>
      </div>
    </div>
  );
};

// Step 4: Welcome & Setup Complete
const WelcomeStep = ({ user, onboardingData, onSubmit, isLoading, onPrev }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TherapEase!</h2>
        <p className="text-gray-600">Your account setup is complete. Let's get started!</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <UserCheck className="h-6 w-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-purple-900">Account Setup Complete</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-purple-800">Personal information verified</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-purple-800">Medical information recorded</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-purple-800">Privacy policies acknowledged</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-purple-800">Account security configured</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-600">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Meet Your Therapist</h4>
              <p className="text-sm text-gray-600">Your therapist will review your information and contact you to schedule your first session.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-green-600">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Access Your Dashboard</h4>
              <p className="text-sm text-gray-600">View your appointments, track progress, and communicate with your therapist.</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-purple-600">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Start Your Journey</h4>
              <p className="text-sm text-gray-600">Begin your occupational therapy journey with personalized care and support.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <ModernButton
          type="button"
          variant="secondary"
          size="lg"
          icon={ArrowLeft}
          onClick={onPrev}
        >
          Back
        </ModernButton>
        <ModernButton
          type="button"
          variant="primary"
          size="lg"
          icon={CheckCircle}
          onClick={onSubmit}
          loading={isLoading}
        >
          Complete Setup
        </ModernButton>
      </div>
    </div>
  );
};

export default PatientOnboarding;
