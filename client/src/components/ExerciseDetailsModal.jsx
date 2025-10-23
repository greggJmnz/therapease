import React from 'react';
import { 
  X, 
  FileText, 
  Dumbbell, 
  Calendar, 
  Clock, 
  User, 
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ExerciseDetailsModal = ({ isOpen, onClose, exercise }) => {
  if (!isOpen || !exercise) return null;

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-2xl px-6 pt-6 pb-6 text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Dumbbell className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{exercise.title}</h3>
                <p className="text-sm text-gray-600">Exercise Details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <User className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Patient</span>
                </div>
                <p className="text-sm text-gray-900">{exercise.patientFirstName} {exercise.patientLastName}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Frequency</span>
                </div>
                <p className="text-sm text-gray-900">{exercise.frequency}</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Target className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Difficulty</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(exercise.difficulty)}`}>
                  {exercise.difficulty}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircle className="h-4 w-4 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Status</span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(exercise.status)}`}>
                  {exercise.status?.replace('_', ' ') || 'Pending'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2 text-blue-600" />
                Description
              </h4>
              <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg leading-relaxed">
                {exercise.description}
              </p>
            </div>

            {/* Instructions */}
            {exercise.instructions && Array.isArray(exercise.instructions) && exercise.instructions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  {exercise.instructions.map((instruction, index) => (
                    <li key={index} className="leading-relaxed">{instruction}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Equipment */}
            {exercise.equipment && Array.isArray(exercise.equipment) && exercise.equipment.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Dumbbell className="h-4 w-4 mr-2 text-green-600" />
                  Required Equipment
                </h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.equipment.map((item, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Due Date */}
            {exercise.dueDate && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-orange-600" />
                  Due Date
                </h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {new Date(exercise.dueDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC'
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailsModal;
