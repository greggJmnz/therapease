import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Upload,
  FileText,
  Image,
  Video,
  File,
  Send,
  Eye,
  MessageSquare,
  Target,
  User,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { patientAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeData } from '../../hooks/useWebSocket';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';
import ExerciseDetailsModal from '../../components/ExerciseDetailsModal';
import toast from 'react-hot-toast';

// Helper function to get the correct file URL for proof images
// Static files are served from the backend server, not the frontend
const getProofImageUrl = (fileUrl) => {
  if (!fileUrl) return '';
  
  // If it's already a full URL (data URL or http/https), return as is
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('data:')) {
    return fileUrl;
  }
  
  // Get the server URL from API base URL
  // We need to use the API server URL, not the frontend URL
  const apiBaseUrl = import.meta.env.VITE_API_URL || '';
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isProduction = window.location.protocol === 'https:';
  let serverBaseUrl;
  
  if (apiBaseUrl) {
    // Extract server URL from API URL (remove /api suffix)
    // Example: https://api.therapease.site/api -> https://api.therapease.site
    serverBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    
    // Ensure HTTPS in production (fix mixed content errors)
    if (isProduction && serverBaseUrl.startsWith('http://')) {
      serverBaseUrl = serverBaseUrl.replace('http://', 'https://');
      console.warn('⚠️ Upgraded HTTP to HTTPS for production:', serverBaseUrl);
    }
  } else {
    // IMPORTANT: In production, VITE_API_URL MUST be set!
    if (isDevelopment) {
      // In development, API is typically on localhost:5000
      serverBaseUrl = 'http://localhost:5000';
      console.warn('⚠️ VITE_API_URL not set in development, using http://localhost:5000');
    } else {
      // In production without VITE_API_URL, infer from hostname
      // For TherapEase, API is at api.therapease.site
      const hostname = window.location.hostname;
      if (hostname.includes('therapease.site')) {
        // Always use HTTPS in production
        serverBaseUrl = 'https://api.therapease.site';
        console.warn('⚠️ VITE_API_URL not set, inferred from hostname:', serverBaseUrl);
        console.warn('💡 Set VITE_API_URL=https://api.therapease.site/api in Vercel environment variables');
      } else {
        // Fallback: use current origin but ensure HTTPS
        serverBaseUrl = window.location.origin;
        if (isProduction && serverBaseUrl.startsWith('http://')) {
          serverBaseUrl = serverBaseUrl.replace('http://', 'https://');
        }
        console.error('❌ VITE_API_URL not set and cannot infer server URL. Using:', serverBaseUrl);
        console.error('💡 Set VITE_API_URL=https://api.therapease.site/api in Vercel environment variables');
      }
    }
  }
  
  // Construct full URL
  let fullUrl;
  if (fileUrl.startsWith('/')) {
    // Already has leading slash, use as-is
    fullUrl = `${serverBaseUrl}${fileUrl}`;
  } else if (fileUrl.startsWith('uploads/')) {
    // Has uploads/ prefix but no leading slash
    fullUrl = `${serverBaseUrl}/${fileUrl}`;
  } else {
    // Relative path, add /uploads/ prefix
    fullUrl = `${serverBaseUrl}/uploads/${fileUrl}`;
  }
  
  // Always log in production to help debug image loading issues
  console.log('📸 Proof file URL:', { 
    originalFileUrl: fileUrl, 
    serverBaseUrl, 
    fullUrl,
    apiBaseUrl,
    isProduction: import.meta.env.PROD,
    hostname: window.location.hostname,
    protocol: window.location.protocol
  });
  
  return fullUrl;
};

const HomeExercisesNew = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [submissionType, setSubmissionType] = useState('text');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [exerciseProofs, setExerciseProofs] = useState([]);
  const [expandedExercises, setExpandedExercises] = useState(new Set());
  const [fullScreenImage, setFullScreenImage] = useState({ isOpen: false, url: '', fileName: '' });

  // Fetch exercises (patient ID is automatically determined from authenticated user)
  const { data: exercisesData, isLoading, error, refetch } = useQuery(
    'patientHomeExercisesNew',
    () => patientAPI.getHomeExercises(),
    {
      enabled: !!user?.id,
      onError: (error) => {
        console.error('Error fetching exercises:', error);
        toast.error('Failed to load exercises');
      }
    }
  );

  // Fetch proofs (patient ID is automatically determined from authenticated user)
  const { data: proofsData, refetch: refetchProofs } = useQuery(
    'patientHomeExerciseProofs',
    () => patientAPI.getHomeExerciseProofs(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        console.error('Error fetching proofs:', error);
      }
    }
  );

  // Enable real-time updates
  const { isRefreshing } = useRealtimeData('patientHomeExercisesNew', refetch);
  const { isRefreshing: isRefreshingProofs } = useRealtimeData('patientHomeExerciseProofs', refetchProofs);

  // Submit proof mutation
  const submitProofMutation = useMutation(
    ({ exerciseId, formData }) => patientAPI.submitHomeExerciseProof(exerciseId, formData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patientHomeExercisesNew');
        queryClient.invalidateQueries('patientHomeExerciseProofs');
        toast.success('Proof submitted successfully!');
        setShowSubmitModal(false);
        resetSubmissionForm();
      },
      onError: (error) => {
        console.error('Error submitting proof:', error);
        toast.error(`Failed to submit proof: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Extract exercises from API response - handle both response structures
  const exercises = Array.isArray(exercisesData?.data?.data) 
    ? exercisesData.data.data 
    : Array.isArray(exercisesData?.data) 
      ? exercisesData.data 
      : [];
  const proofs = Array.isArray(proofsData?.data?.data) 
    ? proofsData.data.data 
    : Array.isArray(proofsData?.data) 
      ? proofsData.data 
      : [];

  const resetSubmissionForm = () => {
    setSubmissionType('text');
    setSubmissionContent('');
    setSubmissionFile(null);
  };

  const handleSubmitProof = (e) => {
    e.preventDefault();
    
    if (!selectedExercise) {
      toast.error('Please select an exercise');
      return;
    }

    if (submissionType === 'text' && !submissionContent.trim()) {
      toast.error('Please enter your submission text');
      return;
    }

    if (submissionType !== 'text' && !submissionFile) {
      toast.error('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('exerciseId', selectedExercise.id);
    // patientId will be determined from authenticated user on backend
    formData.append('therapistId', selectedExercise.therapistId);
    formData.append('submissionType', submissionType);
    
    if (submissionType === 'text') {
      formData.append('content', submissionContent);
    } else if (submissionFile) {
      formData.append('file', submissionFile);
    }

    submitProofMutation.mutate({
      exerciseId: selectedExercise.id,
      formData
    });
  };

  const handleViewProofs = async (exercise) => {
    try {
      const response = await patientAPI.getExerciseProofs(exercise.id);
      setExerciseProofs(Array.isArray(response.data?.data) ? response.data.data : []);
      setSelectedExercise(exercise);
      setShowProofsModal(true);
    } catch (error) {
      console.error('Error fetching exercise proofs:', error);
      toast.error('Failed to load proofs');
    }
  };

  const toggleExerciseExpansion = (exerciseId) => {
    const newExpanded = new Set(expandedExercises);
    if (newExpanded.has(exerciseId)) {
      newExpanded.delete(exerciseId);
    } else {
      newExpanded.add(exerciseId);
    }
    setExpandedExercises(newExpanded);
  };

  const handleViewDetails = (exercise) => {
    setSelectedExercise(exercise);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProofIcon = (type) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'file': return <File className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getProofStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'needs_revision': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-blue-100">
              <Dumbbell className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 tracking-tight">Home Exercises</h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 mt-2 font-medium">
                Complete your assigned exercises and submit proof of completion
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                  <div className="p-1 sm:p-2 bg-blue-100 rounded-lg">
                    <Dumbbell className="h-3 w-3 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
                  </div>
                </div>
                <div className="sm:ml-3 lg:ml-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Total</p>
                  <p className="text-sm sm:text-xl lg:text-3xl font-extrabold text-gray-900">{exercises.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                  <div className="p-1 sm:p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-3 w-3 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
                  </div>
                </div>
                <div className="sm:ml-3 lg:ml-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Completed</p>
                  <p className="text-sm sm:text-xl lg:text-3xl font-extrabold text-gray-900">
                    {exercises.filter(e => e.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                  <div className="p-1 sm:p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-3 w-3 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="sm:ml-3 lg:ml-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">In Progress</p>
                  <p className="text-sm sm:text-xl lg:text-3xl font-extrabold text-gray-900">
                    {exercises.filter(e => e.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center text-center sm:text-left">
                <div className="flex-shrink-0 mx-auto sm:mx-0 mb-1 sm:mb-0">
                  <div className="p-1 sm:p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-3 w-3 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-red-600" />
                  </div>
                </div>
                <div className="sm:ml-3 lg:ml-4">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Overdue</p>
                  <p className="text-sm sm:text-xl lg:text-3xl font-extrabold text-gray-900">
                    {exercises.filter(e => e.status === 'overdue').length}
                  </p>
                </div>
              </div>
            </div>
      </div>

          {/* Exercises List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 text-blue-600 mr-2" />
                Assigned Exercises
              </h3>
            </div>
        <div className="divide-y divide-gray-200">
          {exercises.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Dumbbell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No exercises assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                Your therapist hasn't assigned any exercises yet.
              </p>
            </div>
          ) : (
            exercises.map((exercise) => (
              <div key={exercise.id} className="p-3 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  <div className="flex-shrink-0 mx-auto sm:mx-0">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                      <Dumbbell className="h-5 w-5 sm:h-7 sm:w-7 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate tracking-wide">
                          {exercise.title}
                        </h3>
                        <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium self-start ${getStatusColor(exercise.status || 'assigned')}`}>
                          {(exercise.status || 'assigned').replace('_', ' ')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewDetails(exercise)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 touch-target"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                        <span className="truncate">Dr. {exercise.therapistFirstName} {exercise.therapistLastName}</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                        <span>{exercise.duration} min</span>
                      </div>
                      <div className="flex items-center text-xs sm:text-sm text-gray-600">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                        <span>{exercise.frequency}</span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                        {exercise.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 leading-relaxed font-medium line-clamp-2">
                      {exercise.description}
                    </p>
                    
                    {exercise.dueDate && (
                      <div className="flex items-center text-xs sm:text-sm text-gray-500 mb-2">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                        <span>Due: {new Date(exercise.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-4">
                  <button
                    onClick={() => handleViewProofs(exercise)}
                    className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 touch-target w-full sm:w-auto"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">View Proofs ({exercise.proofCount || 0})</span>
                    <span className="sm:hidden">Proofs ({exercise.proofCount || 0})</span>
                  </button>
                  
                  {exercise.status !== 'completed' && (
                    <button
                      onClick={() => {
                        setSelectedExercise(exercise);
                        setShowSubmitModal(true);
                      }}
                      className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 touch-target w-full sm:w-auto"
                    >
                      <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Submit Proof</span>
                      <span className="sm:hidden">Submit</span>
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
          </div>
        </div>
        </div>
      </div>

      {/* Submit Proof Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Submit Proof - {selectedExercise?.title}
                </h3>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitProof} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submission Type
                  </label>
                  <select
                    value={submissionType}
                    onChange={(e) => setSubmissionType(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  >
                    <option value="text">Text Description</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="file">File</option>
                  </select>
                </div>

                {submissionType === 'text' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={submissionContent}
                      onChange={(e) => setSubmissionContent(e.target.value)}
                      required
                      rows={4}
                      placeholder="Describe how you completed the exercise..."
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File *
                    </label>
                    <input
                      type="file"
                      accept={submissionType === 'image' ? 'image/*' : submissionType === 'video' ? 'video/*' : '*'}
                      onChange={(e) => setSubmissionFile(e.target.files[0])}
                      required
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum file size: 50MB
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitProofMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {submitProofMutation.isLoading ? 'Submitting...' : 'Submit Proof'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Proofs Modal */}
      {showProofsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Proof Submissions - {selectedExercise?.title}
                </h3>
                <button
                  onClick={() => setShowProofsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {!Array.isArray(exerciseProofs) || exerciseProofs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No proof submissions yet.</p>
                ) : (
                  exerciseProofs.map((proof) => (
                    <div key={proof.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getProofIcon(proof.submissionType)}
                            <span className="text-sm font-medium text-gray-900">
                              Submitted on {new Date(proof.submittedAt).toLocaleDateString()}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getProofStatusColor(proof.status)}`}>
                              {proof.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          {proof.content && (
                            <p className="text-sm text-gray-700 mb-2">{proof.content}</p>
                          )}
                          
                          {proof.fileName && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                {getProofIcon(proof.submissionType)}
                                <span>{proof.fileName}</span>
                                <span className="text-xs text-gray-500">
                                  ({proof.fileSize ? Math.round(proof.fileSize / 1024) : 0} KB)
                                </span>
                              </div>
                              
                              {/* Display image - check for image submission type or image file extension */}
                              {((proof.submissionType === 'image' || (proof.fileName && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(proof.fileName))) && (proof.fileUrl || proof.filePath)) && (
                                <div className="mt-2">
                                  <img 
                                    src={getProofImageUrl(proof.fileUrl || proof.filePath)}
                                    alt="Submitted proof"
                                    className="max-w-full h-auto max-h-64 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setFullScreenImage({
                                      isOpen: true,
                                      url: getProofImageUrl(proof.fileUrl || proof.filePath),
                                      fileName: proof.fileName || 'Exercise Proof'
                                    })}
                                    onError={(e) => {
                                      console.error('❌ Image load error for:', e.target.src);
                                      console.error('Proof data:', { 
                                        fileUrl: proof.fileUrl, 
                                        filePath: proof.filePath, 
                                        submissionType: proof.submissionType,
                                        fileName: proof.fileName,
                                        constructedUrl: getProofImageUrl(proof.fileUrl || proof.filePath)
                                      });
                                      // Don't hide the image, show error message instead
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'text-sm text-red-500 mt-2';
                                      errorDiv.textContent = `Failed to load image. URL: ${e.target.src}`;
                                      e.target.parentElement.appendChild(errorDiv);
                                    }}
                                    onLoad={(e) => {
                                      console.log('Image loaded successfully:', e.target.src);
                                    }}
                                  />
                                </div>
                              )}
                              
                              {/* Display video - check for video submission type or video file extension */}
                              {((proof.submissionType === 'video' || (proof.fileName && /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i.test(proof.fileName))) && (proof.fileUrl || proof.filePath)) && (
                                <div className="mt-2">
                                  <video 
                                    src={getProofImageUrl(proof.fileUrl || proof.filePath)}
                                    controls 
                                    preload="metadata"
                                    crossOrigin="anonymous"
                                    className="max-w-full h-auto max-h-64 rounded-lg border"
                                    onLoadStart={() => {
                                      const videoUrl = getProofImageUrl(proof.fileUrl || proof.filePath);
                                      console.log('🎬 Video load started:', {
                                        url: videoUrl,
                                        fileUrl: proof.fileUrl,
                                        filePath: proof.filePath,
                                        mimeType: proof.mimeType,
                                        fileName: proof.fileName
                                      });
                                    }}
                                    onLoadedMetadata={(e) => {
                                      console.log('✅ Video metadata loaded:', {
                                        duration: e.target.duration,
                                        videoWidth: e.target.videoWidth,
                                        videoHeight: e.target.videoHeight,
                                        readyState: e.target.readyState,
                                        src: e.target.src,
                                        currentSrc: e.target.currentSrc
                                      });
                                    }}
                                    onCanPlay={() => {
                                      console.log('✅ Video can play');
                                    }}
                                    onError={(e) => {
                                      const video = e.target;
                                      const error = video.error;
                                      console.error('❌ Video load error:', {
                                        code: error?.code,
                                        message: error?.message,
                                        src: video.src,
                                        currentSrc: video.currentSrc,
                                        networkState: video.networkState,
                                        readyState: video.readyState,
                                        fileUrl: proof.fileUrl,
                                        filePath: proof.filePath,
                                        mimeType: proof.mimeType,
                                        fileName: proof.fileName,
                                        constructedUrl: getProofImageUrl(proof.fileUrl || proof.filePath)
                                      });
                                      
                                      // Hide the video element
                                      if (video) {
                                        video.style.display = 'none';
                                      }
                                      
                                      // Find the error div
                                      const parentDiv = video?.parentElement;
                                      if (parentDiv) {
                                        const errorDiv = parentDiv.querySelector('.video-error-message');
                                        if (errorDiv) {
                                          errorDiv.style.display = 'block';
                                          errorDiv.classList.remove('hidden');
                                          // Update error message with more details
                                          const errorMsg = error?.message || 'Unknown error';
                                          errorDiv.textContent = `Failed to load video (${errorMsg}). URL: ${video.currentSrc || video.src}`;
                                        } else {
                                          // Create error message if it doesn't exist
                                          const errorMsg = document.createElement('div');
                                          errorMsg.className = 'text-sm text-red-500 mt-2 video-error-message';
                                          const errorText = error?.message || 'Unknown error';
                                          errorMsg.textContent = `Failed to load video (${errorText}). URL: ${video.currentSrc || video.src}`;
                                          parentDiv.appendChild(errorMsg);
                                        }
                                      }
                                    }}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="hidden text-sm text-red-500 video-error-message">
                                    Failed to load video
                                  </div>
                                </div>
                              )}
                              
                              {/* Display file download link for other file types */}
                              {proof.submissionType === 'file' && (proof.fileUrl || proof.filePath) && (
                                <div className="mt-2">
                                  <a 
                                    href={getProofImageUrl(proof.fileUrl || proof.filePath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    <File className="h-4 w-4" />
                                    <span>Download file</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {proof.therapistFeedback && (
                            <div className="mt-2 p-2 bg-blue-50 rounded">
                              <p className="text-sm text-gray-700">
                                <strong>Therapist feedback:</strong> {proof.therapistFeedback}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      <ExerciseDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        exercise={selectedExercise}
      />

      <FullScreenImageViewer
        isOpen={fullScreenImage.isOpen}
        onClose={() => setFullScreenImage({ isOpen: false, url: '', fileName: '' })}
        imageUrl={fullScreenImage.url}
        imageAlt="Exercise proof submission"
        fileName={fullScreenImage.fileName}
      />
    </div>
  );
};

export default HomeExercisesNew;
