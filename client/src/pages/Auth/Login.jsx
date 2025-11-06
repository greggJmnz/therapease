import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, LogIn, CheckCircle, AlertCircle, Clock, UserCheck, FileText, KeyRound, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ModernInput from '../../components/ModernInput';
import ModernButton from '../../components/ModernButton';
import TermsAndConditions from '../../components/TermsAndConditions';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [emailValid, setEmailValid] = useState(null);
  const [passwordValid, setPasswordValid] = useState(null);
  const [loginError, setLoginError] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const navigate = useNavigate();
  const { login, loginWith2FA, send2FACode, isAuthenticated, user, isLoading: authLoading } = useAuth();

  // Redirect authenticated users away from login page
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // User is already authenticated - redirect to their dashboard
      switch (user.role) {
        case 'admin':
          navigate('/admin/dashboard', { replace: true });
          break;
        case 'therapist':
          navigate('/therapist/dashboard', { replace: true });
          break;
        case 'patient':
          navigate('/patient/dashboard', { replace: true });
          break;
        default:
          navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // Watch form values for real-time validation
  const watchedEmail = watch('email', '');
  const watchedPassword = watch('password', '');

  // Terms acceptance is now always unchecked by default
  // Removed automatic checking from localStorage to ensure user must explicitly accept each time

  // Check for account lockout
  useEffect(() => {
    const lockoutData = localStorage.getItem('loginLockout');
    if (lockoutData) {
      const { attempts, timestamp } = JSON.parse(lockoutData);
      const now = Date.now();
      const lockoutDuration = 5 * 60 * 1000; // 5 minutes
      
      if (now - timestamp < lockoutDuration) {
        setIsLocked(true);
        setLoginAttempts(attempts);
        setLockoutTime(new Date(timestamp + lockoutDuration));
      } else {
        localStorage.removeItem('loginLockout');
      }
    }
  }, []);

  // Real-time validation effects
  useEffect(() => {
    if (watchedEmail) {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      setEmailValid(emailRegex.test(watchedEmail));
      // Clear login error when user starts typing
      if (loginError) {
        setLoginError('');
      }
    } else {
      setEmailValid(null);
    }
  }, [watchedEmail, loginError]);

  useEffect(() => {
    if (watchedPassword) {
      setPasswordValid(watchedPassword.length >= 6);
      // Clear login error when user starts typing
      if (loginError) {
        setLoginError('');
      }
    } else {
      setPasswordValid(null);
    }
  }, [watchedPassword, loginError]);

  const onSubmit = async (data) => {
    // Check if account is locked
    if (isLocked) {
      toast.error('Account is temporarily locked due to multiple failed login attempts. Please try again later.');
      return;
    }

    // Check terms acceptance for first-time users
    if (!termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    setIsLoading(true);
    setLoginError(''); // Clear any previous errors
    
    try {
      const result = await login(data.email, data.password);
      
      if (result.success) {
        // Check if 2FA is required
        if (result.requires2FA) {
          setTwoFactorEmail(result.email);
          setShow2FA(true);
          
          // Automatically send 2FA code
          try {
            const sendResult = await send2FACode({ email: result.email });
            if (sendResult.success) {
              toast.success('Verification code sent to your email. Please check your inbox.');
            } else {
              toast.error(sendResult.message || 'Failed to send verification code');
            }
          } catch (error) {
            console.error('Error sending 2FA code:', error);
            toast.error('Failed to send verification code. Please try again.');
          }
          
          setIsLoading(false);
          return;
        }

        // Clear any lockout data on successful login
        localStorage.removeItem('loginLockout');
        setLoginAttempts(0);
        setIsLocked(false);
        
        toast.success('Login successful!');
        
        // Redirect based on role
        switch (result.user.role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'therapist':
            navigate('/therapist/dashboard');
            break;
          case 'patient':
            navigate('/patient/dashboard');
            break;
          default:
            navigate('/');
        }
      } else {
        console.error('Login failed:', result.message);
        
        // Handle failed login attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= 5) {
          // Lock account for 5 minutes (reduced from 15)
          const lockoutData = {
            attempts: newAttempts,
            timestamp: Date.now()
          };
          localStorage.setItem('loginLockout', JSON.stringify(lockoutData));
          setIsLocked(true);
          setLockoutTime(new Date(Date.now() + 5 * 60 * 1000));
          
          const errorMessage = 'Too many failed login attempts. Account locked for 5 minutes.';
          setLoginError(errorMessage);
          toast.error(errorMessage);
        } else {
          const errorMessage = result.message || 'Login failed. Please check your credentials.';
          setLoginError(errorMessage);
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setLoginError(errorMessage);
      toast.error(errorMessage);
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
    toast.error('You must accept the terms and conditions to continue');
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIs2FALoading(true);
    setLoginError('');

    try {
      const result = await loginWith2FA(twoFactorEmail, twoFactorCode);
      
      if (result.success) {
        // Clear any lockout data on successful login
        localStorage.removeItem('loginLockout');
        setLoginAttempts(0);
        setIsLocked(false);
        
        toast.success('Login successful!');
        
        // Redirect based on role
        switch (result.user.role) {
          case 'admin':
            navigate('/admin/dashboard');
            break;
          case 'therapist':
            navigate('/therapist/dashboard');
            break;
          case 'patient':
            navigate('/patient/dashboard');
            break;
          default:
            navigate('/');
        }
      } else {
        const errorMessage = result.message || 'Invalid verification code. Please try again.';
        setLoginError(errorMessage);
        toast.error(errorMessage);
        setTwoFactorCode(''); // Clear the code input
      }
    } catch (error) {
      console.error('2FA login error:', error);
      const errorMessage = 'Network error. Please check your connection and try again.';
      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIs2FALoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);
    
    try {
      const result = await send2FACode({ email: twoFactorEmail });
      
      if (result.success) {
        toast.success('Verification code sent to your email');
        setTwoFactorCode(''); // Clear the current code
      } else {
        toast.error(result.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error('Failed to resend code. Please try again.');
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleBackToLogin = () => {
    setShow2FA(false);
    setTwoFactorEmail('');
    setTwoFactorCode('');
    setLoginError('');
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
      <div className="relative max-w-md w-full animate-in fade-in-0 slide-in-from-bottom-4 duration-700 z-10">
        {/* Main Login Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8 space-y-8 hover:shadow-3xl transition-all duration-300">
          {/* Header Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg hover:scale-105 transition-transform duration-200">
                <i className="fas fa-heart-pulse text-white text-2xl"></i>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to TherapEase
              </h1>
              <p className="text-gray-600 text-sm">
                Sign in to continue your therapeutic journey
              </p>
            </div>
          </div>
          
          {/* 2FA Form */}
          {show2FA ? (
            <div className="space-y-6">
              {/* 2FA Header */}
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                    <KeyRound className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Enter the 6-digit code sent to your email
                  </p>
                  <p className="text-blue-600 text-sm font-medium mt-1">
                    {twoFactorEmail}
                  </p>
                </div>
              </div>

              {/* 2FA Error Display */}
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Verification Failed
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{loginError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2FA Code Form */}
              <form onSubmit={handle2FASubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <div className="relative">
                      <input
                        id="twoFactorCode"
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setTwoFactorCode(value);
                        }}
                        placeholder="000000"
                        className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        maxLength={6}
                        autoComplete="one-time-code"
                        required
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the 6-digit code from your email
                    </p>
                  </div>
                </div>

                {/* 2FA Action Buttons */}
                <div className="space-y-3">
                  <ModernButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={is2FALoading}
                    icon={KeyRound}
                    className="w-full"
                  >
                    {is2FALoading ? 'Verifying...' : 'Verify Code'}
                  </ModernButton>

                  <div className="flex space-x-3">
                    <ModernButton
                      type="button"
                      variant="secondary"
                      size="md"
                      loading={isResendingCode}
                      onClick={handleResendCode}
                      className="flex-1"
                    >
                      {isResendingCode ? 'Sending...' : 'Resend Code'}
                    </ModernButton>

                    <ModernButton
                      type="button"
                      variant="outline"
                      size="md"
                      icon={ArrowLeft}
                      onClick={handleBackToLogin}
                      className="flex-1"
                    >
                      Back to Login
                    </ModernButton>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            /* Login Form */
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Account Lockout Notice */}
            {isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Account Temporarily Locked
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Too many failed login attempts. Please try again after {lockoutTime?.toLocaleTimeString()}.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Login Error Display */}
            {loginError && !isLocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Login Failed
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{loginError}</p>
                      {loginAttempts > 0 && loginAttempts < 5 && (
                        <p className="mt-1">Attempts remaining: {5 - loginAttempts}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            
            <div className="space-y-5">
              {/* Enhanced Email Field */}
              <div className="relative">
                <ModernInput
                  label="Email Address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  leftIcon={Mail}
                  register={register}
                  error={errors.email?.message}
                  success={emailValid === true ? 'Valid email address' : undefined}
                  required
                />
                {/* Real-time validation indicator */}
                {watchedEmail && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200">
                    {emailValid === true ? (
                      <CheckCircle className="h-5 w-5 text-green-500 animate-in zoom-in-50 duration-200" />
                    ) : emailValid === false ? (
                      <AlertCircle className="h-5 w-5 text-red-500 animate-in zoom-in-50 duration-200" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Enhanced Password Field */}
              <div className="relative">
                <ModernInput
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  leftIcon={Lock}
                  register={register}
                  error={errors.password?.message}
                  success={passwordValid === true ? 'Password looks good' : undefined}
                  required
                />
                
                {/* Password visibility toggle with enhanced styling */}
                <button
                  type="button"
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>

                {/* Real-time validation indicator */}
                {watchedPassword && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-200">
                    {passwordValid === true ? (
                      <CheckCircle className="h-5 w-5 text-green-500 animate-in zoom-in-50 duration-200" />
                    ) : passwordValid === false ? (
                      <AlertCircle className="h-5 w-5 text-red-500 animate-in zoom-in-50 duration-200" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Password strength indicator */}
              {watchedPassword && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          watchedPassword.length < 3 ? 'bg-red-500 w-1/4' :
                          watchedPassword.length < 6 ? 'bg-yellow-500 w-1/2' :
                          watchedPassword.length < 10 ? 'bg-blue-500 w-3/4' :
                          'bg-green-500 w-full'
                        }`}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">
                      {watchedPassword.length < 3 ? 'Weak' :
                       watchedPassword.length < 6 ? 'Fair' :
                       watchedPassword.length < 10 ? 'Good' : 'Strong'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {watchedPassword.length < 6 ? `${6 - watchedPassword.length} more characters needed` : 'Password meets requirements'}
                  </p>
                </div>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Forgot your password?
              </Link>
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
              icon={LogIn}
              className="w-full mt-6"
              disabled={isLocked || !termsAccepted}
            >
              {isLoading ? 'Signing in...' : isLocked ? 'Account Locked' : 'Sign in'}
            </ModernButton>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-100 mt-6">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/auth/register"
                  className="font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
          )}
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

export default Login;
