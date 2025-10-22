import React from 'react';
import { X, Calendar, Award, Clock, Target, CheckCircle, Circle, User } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';

const TreatmentPlanModal = ({ isOpen, onClose, treatmentPlan }) => {
  if (!isOpen || !treatmentPlan) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{treatmentPlan.title}</h2>
              <p className="text-blue-100 text-sm sm:text-base">{treatmentPlan.description}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Plan Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Created</div>
                <div className="text-sm text-gray-600">{new Date(treatmentPlan.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Award className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">Status</div>
                <div className="text-sm text-gray-600 capitalize">{treatmentPlan.status}</div>
              </div>
            </div>
            {treatmentPlan.endDate && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Target End</div>
                  <div className="text-sm text-gray-600">{new Date(treatmentPlan.endDate).toLocaleDateString()}</div>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Plan Progress</span>
              <span className="text-sm font-bold text-gray-900">{(parseFloat(treatmentPlan.overallProgress) || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${parseFloat(treatmentPlan.overallProgress) || 0}%` }}
              ></div>
            </div>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">
                {treatmentPlan.mainObjectives?.length || 0}
              </div>
              <div className="text-xs sm:text-sm font-medium text-blue-800">Main Objectives</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1">
                {treatmentPlan.mainObjectives?.reduce((total, obj) => total + (obj.specificObjectives?.length || 0), 0) || 0}
              </div>
              <div className="text-xs sm:text-sm font-medium text-green-800">Specific Objectives</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 mb-1">
                {treatmentPlan.mainObjectives?.reduce((total, obj) => 
                  total + (obj.specificObjectives?.filter(so => so.isCompleted).length || 0), 0) || 0}
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-800">Completed</div>
            </div>
          </div>

          {/* Main Objectives */}
          {treatmentPlan.mainObjectives && treatmentPlan.mainObjectives.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Main Objectives</h3>
              {treatmentPlan.mainObjectives.map((mainObj, index) => (
                <div key={mainObj.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 mb-1">{mainObj.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{mainObj.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="capitalize">{mainObj.priority} Priority</span>
                        <span>{mainObj.completedSpecificObjectives || 0} / {mainObj.totalSpecificObjectives || 0} completed</span>
                        <span className="font-medium text-blue-600">
                          {parseFloat(mainObj.progress || 0).toFixed(1)}% complete
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specific Objectives */}
                  {mainObj.specificObjectives && mainObj.specificObjectives.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Specific Objectives:</h5>
                      {mainObj.specificObjectives.map((specificObj, specIndex) => (
                        <div key={specificObj.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                          <div className="flex-shrink-0">
                            {specificObj.isCompleted ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{specificObj.title}</p>
                            {specificObj.targetDate && (
                              <p className="text-xs text-gray-500">
                                Target: {new Date(specificObj.targetDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Therapist Info */}
          {(treatmentPlan.therapistFirstName && treatmentPlan.therapistLastName) && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <InitialsAvatar 
                  name={`${treatmentPlan.therapistFirstName} ${treatmentPlan.therapistLastName}`}
                  size="lg"
                  className="shadow-lg border-2 border-blue-200"
                />
                <div>
                  <div className="text-base font-semibold text-blue-900">
                    {treatmentPlan.therapistFirstName} {treatmentPlan.therapistLastName}
                  </div>
                  <div className="text-blue-700 text-sm">Your Therapist</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreatmentPlanModal;
