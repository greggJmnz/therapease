import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Lock, Mail, LogIn, Shield, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import ModernInput from '../../components/ModernInput';
import ModernButton from '../../components/ModernButton';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [emailValid, setEmailValid] = useState(null);
  const [passwordValid, setPasswordValid] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(null);
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  // Watch form values for real-time validation
  const watchedEmail = watch('email', '');
  const watchedPassword = watch('password', '');

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

  // Copy to clipboard function
  const copyToClipboard = async (text, accountType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAccount(accountType);
      toast.success(`${accountType} credentials copied!`);
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch (err) {
      toast.error('Failed to copy credentials');
    }
  };

  const onSubmit = async (data) => {
    console.log('Login attempt with:', { email: data.email, password: data.password });
    setIsLoading(true);
    setLoginError(''); // Clear any previous errors
    
    try {
      console.log('Calling login function...');
      const result = await login(data.email, data.password);
      console.log('Login result:', result);
      
      if (result.success) {
        toast.success('Login successful!');
        console.log('Login successful, redirecting to:', result.user.role);
        
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
        const errorMessage = result.message || 'Login failed. Please check your credentials.';
        setLoginError(errorMessage);
        toast.error(errorMessage);
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
          
          {/* Login Form */}
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Login Error Display */}
            {loginError && (
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
                  type="email"
                  autoComplete="email"
                  leftIcon={Mail}
                  error={errors.email?.message}
                  success={emailValid === true ? 'Valid email address' : undefined}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address',
                    },
                  })}
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
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  leftIcon={Lock}
                  error={errors.password?.message}
                  success={passwordValid === true ? 'Password looks good' : undefined}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
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

            {/* Submit Button */}
            <ModernButton
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              icon={LogIn}
              className="w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </ModernButton>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-100">
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
        </div>

        {/* Demo Account Information */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold text-blue-900">Demo Accounts</h3>
          </div>
          <div className="space-y-3">
            {/* Admin Account */}
            <div 
              className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-blue-100 hover:bg-white/80 hover:border-blue-200 transition-all duration-200 cursor-pointer group"
              onClick={() => copyToClipboard('admin@therapease.com', 'Admin')}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                <span className="text-sm font-medium text-gray-700">Admin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600 font-mono whitespace-nowrap">
                  admin@therapease.com / Admin123!@#
                </div>
                <div className="p-1 rounded-md bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  {copiedAccount === 'Admin' ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-blue-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Therapist Account */}
            <div 
              className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-blue-100 hover:bg-white/80 hover:border-blue-200 transition-all duration-200 cursor-pointer group"
              onClick={() => copyToClipboard('therapist@therapease.com', 'Therapist')}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                <span className="text-sm font-medium text-gray-700">Therapist</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600 font-mono whitespace-nowrap">
                  therapist@therapease.com / Therapist123!@#
                </div>
                <div className="p-1 rounded-md bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  {copiedAccount === 'Therapist' ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-blue-600" />
                  )}
                </div>
              </div>
            </div>

            {/* Patient Account */}
            <div 
              className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-blue-100 hover:bg-white/80 hover:border-blue-200 transition-all duration-200 cursor-pointer group"
              onClick={() => copyToClipboard('emma@example.com', 'Patient')}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform duration-200"></div>
                <span className="text-sm font-medium text-gray-700">Patient</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600 font-mono whitespace-nowrap">
                  emma@example.com / Patient123!@#
                </div>
                <div className="p-1 rounded-md bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  {copiedAccount === 'Patient' ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-blue-600" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
