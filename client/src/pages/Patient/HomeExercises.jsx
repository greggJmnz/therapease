import React, { useState, useEffect } from 'react';
import { Target, Calendar, Clock, CheckCircle, Play, Pause, RotateCcw, TrendingUp, Award, Timer } from 'lucide-react';
import { useQuery } from 'react-query';
import { patientAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HomeExercises = () => {
  const { user } = useAuth();
  const [activeExercise, setActiveExercise] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Get patient ID from user data
  const patientId = user?.id;

  // Fetch home exercises data from API
  const { data: exercisesData, isLoading, error } = useQuery(
    'patientExercises',
    () => patientAPI.getHomeExercises(patientId),
    {
      enabled: !!patientId,
      onError: (error) => {
        console.error('Error fetching exercises:', error);
      }
    }
  );

  const exercises = Array.isArray(exercisesData?.data) ? exercisesData.data : [];

  useEffect(() => {
    let interval;
    if (isTimerRunning && activeExercise) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev >= activeExercise.duration * 60) {
            setIsTimerRunning(false);
            completeExercise(activeExercise.id);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, activeExercise]);

  const startExercise = (exercise) => {
    setActiveExercise(exercise);
    setTimer(0);
    setIsTimerRunning(true);
  };

  const pauseExercise = () => {
    setIsTimerRunning(false);
  };

  const resumeExercise = () => {
    setIsTimerRunning(true);
  };

  const stopExercise = () => {
    setIsTimerRunning(false);
    setTimer(0);
    setActiveExercise(null);
  };

  const completeExercise = (exerciseId) => {
    // TODO: Implement API call to update exercise completion
    console.log('Exercise completed:', exerciseId);
    setActiveExercise(null);
    setTimer(0);
    setIsTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'Advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-blue-600';
    if (progress >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Home Exercise Program</h1>
        <p className="mt-2 text-xs sm:text-sm text-gray-700">
          Complete your daily exercises to support your therapy progress
        </p>
      </div>

      {/* Exercise Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
              <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                <Target className="h-4 w-4 sm:h-6 sm:w-6 text-blue-400" />
              </div>
              <div className="sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">{exercises.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
              <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-green-400" />
              </div>
              <div className="sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">
                    {exercises.filter(e => e.isCompleted).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
              <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-orange-400" />
              </div>
              <div className="sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Progress</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">
                    {Math.round(exercises.reduce((sum, e) => sum + e.progress, 0) / exercises.length)}%
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
              <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                <Award className="h-4 w-4 sm:h-6 sm:w-6 text-purple-400" />
              </div>
              <div className="sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Streak</dt>
                  <dd className="text-sm sm:text-lg font-medium text-gray-900">
                    {Math.max(...exercises.map(e => e.streak))}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Exercise Timer */}
      {activeExercise && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Currently: {activeExercise.name}
            </h2>
            <div className="text-4xl font-bold text-blue-600 mb-4">
              {formatTime(timer)} / {formatTime(activeExercise.duration * 60)}
            </div>
            <div className="flex justify-center space-x-3">
              {!isTimerRunning ? (
                <button
                  onClick={resumeExercise}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseExercise}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </button>
              )}
              <button
                onClick={stopExercise}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercises List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Daily Exercises</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
                    exercise.isCompleted ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {exercise.isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <Target className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {exercise.name}
                    </h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                        {exercise.difficulty}
                      </span>
                      <span className="ml-2">• {exercise.category}</span>
                      <Clock className="ml-2 h-4 w-4" />
                      <span className="ml-1">{exercise.duration} min</span>
                      <span className="ml-2">• {exercise.frequency}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {exercise.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getProgressColor(exercise.progress)}`}>
                      {exercise.progress}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {exercise.streak} day streak
                    </div>
                  </div>
                  
                  {!exercise.isCompleted && !activeExercise && (
                    <button
                      onClick={() => startExercise(exercise)}
                      className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </button>
                  )}
                  
                  {exercise.isCompleted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Completed
                    </span>
                  )}
                </div>
              </div>

              {/* Exercise Details */}
              <div className="mt-4 ml-16">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                      {exercise.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Equipment Needed:</h4>
                    <div className="flex flex-wrap gap-2">
                      {exercise.equipment.map((item, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Progress:</h4>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getProgressColor(exercise.progress).replace('text-', 'bg-')}`}
                          style={{ width: `${exercise.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercise Tips */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Exercise Tips</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <Timer className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Be Consistent</h4>
                <p className="text-xs text-gray-500">Complete exercises daily for best results</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Track Progress</h4>
                <p className="text-xs text-gray-500">Monitor improvements over time</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <Award className="h-6 w-6 text-green-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Celebrate Success</h4>
                <p className="text-xs text-gray-500">Acknowledge your achievements</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeExercises;
