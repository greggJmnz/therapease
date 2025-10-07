import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowRight, User, Heart, Shield, GraduationCap } from 'lucide-react';

const OnboardingStatus = ({ onboardingStatus, isCompact = false, userRole = 'patient' }) => {
  if (!onboardingStatus || onboardingStatus.isComplete) {
    return null;
  }

  const getSteps = () => {
    if (userRole === 'therapist') {
      return [
        {
          id: 'personalInfo',
          title: 'Personal Information',
          icon: User,
          completed: onboardingStatus.steps?.personalInfo?.completed || false
        },
        {
          id: 'professionalInfo',
          title: 'Professional Information',
          icon: GraduationCap,
          completed: onboardingStatus.steps?.professionalInfo?.completed || false
        },
        {
          id: 'compliance',
          title: 'Privacy & Compliance',
          icon: Shield,
          completed: onboardingStatus.steps?.compliance?.completed || false
        }
      ];
    } else {
      return [
        {
          id: 'personalInfo',
          title: 'Personal Information',
          icon: User,
          completed: onboardingStatus.steps?.personalInfo?.completed || false
        },
        {
          id: 'medicalInfo',
          title: 'Medical Information',
          icon: Heart,
          completed: onboardingStatus.steps?.medicalInfo?.completed || false
        },
        {
          id: 'compliance',
          title: 'Privacy & Compliance',
          icon: Shield,
          completed: onboardingStatus.steps?.compliance?.completed || false
        }
      ];
    }
  };

  const steps = getSteps();

  const completedSteps = steps.filter(step => step.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  if (isCompact) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Complete your profile ({completedSteps}/{totalSteps} steps)
            </span>
          </div>
          <Link
            to={userRole === 'therapist' ? "/therapist/onboarding" : "/patient/onboarding"}
            className="text-sm text-yellow-700 hover:text-yellow-800 font-medium flex items-center"
          >
            Continue
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
        <div className="mt-2 w-full bg-yellow-200 rounded-full h-1.5">
          <div
            className="bg-yellow-600 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Complete Your Profile</h3>
        </div>
        <Link
          to={userRole === 'therapist' ? "/therapist/onboarding" : "/patient/onboarding"}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <span>Continue Setup</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      
      <p className="text-blue-800 text-sm mb-4">
        Complete your profile setup to unlock all features of your {userRole === 'therapist' ? 'therapist' : 'patient'} portal.
      </p>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center space-x-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step.completed 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.completed ? 'text-green-800' : 'text-gray-700'
                }`}>
                  {step.title}
                </p>
                <p className={`text-xs ${
                  step.completed ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.completed ? 'Completed' : 'Pending'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-blue-700 mb-1">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStatus;




