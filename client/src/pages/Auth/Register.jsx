import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, User, Phone, Calendar, UserPlus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import ModernInput from '../../components/ModernInput';
import ModernButton from '../../components/ModernButton';
import TermsAndConditions from '../../components/TermsAndConditions';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');
  const phonePattern = /^(09\d{9}|\+639\d{9})$/;
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

  const onSubmit = async (data) => {
    // Check if terms and conditions are accepted
    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions to continue.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerUser({
        ...data,
        role: 'patient',
        termsAccepted: true,
        hipaaAcknowledged: true,
        acceptedAt: new Date().toISOString()
      });

      if (result.success) {
        toast.success('Registration successful! Please complete your profile setup.');
        navigate('/patient/onboarding');
      } else {
        toast.error(result.message || 'Registration failed');
        if (result.details && Array.isArray(result.details)) {
          result.details.forEach(detail => {
            toast.error(detail);
          });
        }
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    toast.success('Terms and conditions accepted');
  };

  const handleTermsDecline = () => {
    setTermsAccepted(false);
    setShowTermsModal(false);
    toast.error('You must accept the terms and conditions to register');
  };


  return (
    <div className="min-h-screen flex items-center justify-center relative py-12 px-4 sm:px-6 lg:px-8">
      {/* Modern Background with Healthcare Theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100"></div>
      
      {/* Enhanced Background Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.3) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.25) 0%, transparent 60%),
            radial-gradient(circle at 50% 10%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 10% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 40%)
          `,
          backgroundSize: '600px 600px, 800px 800px, 500px 500px, 700px 700px',
          backgroundPosition: '0 0, 300px 300px, 200px 100px, 100px 400px'
        }}
      ></div>
      
      {/* Enhanced Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      ></div>
      
      {/* More Visible Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-16 left-16 w-40 h-40 bg-blue-300/30 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute top-32 right-24 w-32 h-32 bg-indigo-300/25 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-24 left-24 w-48 h-48 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-16 right-16 w-36 h-36 bg-slate-300/25 rounded-full blur-2xl animate-pulse delay-500"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-200/30 rounded-full blur-lg animate-pulse delay-1500"></div>
        <div className="absolute top-1/3 right-1/3 w-28 h-28 bg-indigo-200/25 rounded-full blur-xl animate-pulse delay-3000"></div>
      </div>
      
      <div className="relative max-w-md w-full z-10">
        {/* Main Registration Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                <i className="fas fa-heart-pulse text-white text-2xl"></i>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Create your account
              </h1>
              <p className="text-gray-600 text-sm">
                Join TherapEase as a patient
              </p>
            </div>
          </div>
          
          {/* Registration Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <ModernInput
                  label="First Name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  leftIcon={User}
                  register={register}
                  rules={{ required: 'First name is required' }}
                  error={errors.firstName?.message}
                  required
                />

                <ModernInput
                  label="Last Name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  register={register}
                  rules={{ required: 'Last name is required' }}
                  error={errors.lastName?.message}
                  required
                />
              </div>

              {/* Email */}
              <ModernInput
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                leftIcon={Mail}
                register={register}
                rules={{
                  required: 'Email address is required',
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: 'Please enter a valid email address'
                  }
                }}
                error={errors.email?.message}
                required
              />

              {/* Phone */}
              <ModernInput
                label="Phone Number"
                name="phone"
                type="tel"
                autoComplete="tel"
                leftIcon={Phone}
                register={register}
                rules={{
                  required: 'Phone number is required',
                  pattern: {
                    value: phonePattern,
                    message: 'Phone number must be 09XXXXXXXXX or +639XXXXXXXXX'
                  }
                }}
                error={errors.phone?.message}
                required
              />

              {/* Date of Birth */}
              <ModernInput
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                leftIcon={Calendar}
                register={register}
                rules={{ required: 'Date of birth is required' }}
                error={errors.dateOfBirth?.message}
                required
              />

              {/* Password */}
              <div className="relative">
                <ModernInput
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  leftIcon={Lock}
                  register={register}
                  rules={{
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters long'
                    },
                    pattern: {
                      value: passwordPattern,
                      message: 'Password must include uppercase, lowercase, number, and special character'
                    }
                  }}
                  error={errors.password?.message}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                <div className="mt-1 text-xs text-gray-500">
                  Password must contain: uppercase letter, lowercase letter, number, and special character
                </div>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <ModernInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  leftIcon={Lock}
                  register={register}
                  rules={{
                    required: 'Please confirm your password',
                    validate: (value) => value === password || 'Passwords do not match'
                  }}
                  error={errors.confirmPassword?.message}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>



            {/* Terms and Conditions Checkbox */}
            <div className="mt-6">
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="terms-checkbox"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                </div>
                <div className="text-sm leading-relaxed">
                  <label htmlFor="terms-checkbox" className="text-gray-700 cursor-pointer block">
                    <span className="text-gray-700">I have read and agree to the </span>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
                    >
                      Terms of Service, Privacy Policy, and Data Privacy Act 2012 compliance requirements
                    </button>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <ModernButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              icon={UserPlus}
              className="w-full mt-6"
              disabled={!termsAccepted}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </ModernButton>

            {/* Sign In Link */}
            <div className="text-center pt-4 border-t border-gray-100 mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/auth/login"
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>

      </div>

      {/* Terms and Conditions Modal */}
      <TermsAndConditions
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={handleTermsAccept}
        onDecline={handleTermsDecline}
      />

    </div>
  );
};

export default Register;
