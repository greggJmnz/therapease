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
import toast from 'react-hot-toast';

const HomeExercisesNew = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [submissionType, setSubmissionType] = useState('text');
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [exerciseProofs, setExerciseProofs] = useState([]);
  const [expandedExercises, setExpandedExercises] = useState(new Set());

  // Get patient ID from user data
  const patientId = user?.id;

  // Fetch exercises
  const { data: exercisesData, isLoading, error, refetch } = useQuery(
    'patientHomeExercisesNew',
    () => patientAPI.getHomeExercisesNew(patientId),
    {
      enabled: !!patientId,
      onError: (error) => {
        console.error('Error fetching exercises:', error);
        toast.error('Failed to load exercises');
      }
    }
  );

  // Fetch proofs
  const { data: proofsData, refetch: refetchProofs } = useQuery(
    'patientHomeExerciseProofs',
    () => patientAPI.getHomeExerciseProofs(patientId),
    {
      enabled: !!patientId,
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

  const exercises = Array.isArray(exercisesData?.data?.data) ? exercisesData.data.data : [];
  const proofs = Array.isArray(proofsData?.data?.data) ? proofsData.data.data : [];

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
    formData.append('patientId', patientId);
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
              <h1 className="text-3xl font-bold text-gray-900">Home Exercises</h1>
              <p className="text-gray-600 mt-1">
                Complete your assigned exercises and submit proof of completion
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Dumbbell className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Exercises</p>
                  <p className="text-2xl font-bold text-gray-900">{exercises.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {exercises.filter(e => e.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {exercises.filter(e => e.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
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
              <div key={exercise.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                        <Dumbbell className="h-7 w-7 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {exercise.title}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(exercise.status)}`}>
                            {exercise.status.replace('_', ' ')}
                          </span>
                        </div>
                        <button
                          onClick={() => toggleExerciseExpansion(exercise.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          {expandedExercises.has(exercise.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-1.5 text-gray-400" />
                          <span>Dr. {exercise.therapistFirstName} {exercise.therapistLastName}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1.5 text-gray-400" />
                          <span>{exercise.duration} min</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                          <span>{exercise.frequency}</span>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                          {exercise.difficulty}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {exercise.description}
                      </p>
                      
                      {exercise.dueDate && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1.5 text-gray-400" />
                          <span>Due: {new Date(exercise.dueDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewProofs(exercise)}
                        className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Proofs ({exercise.proofCount || 0})
                      </button>
                      
                      {exercise.status !== 'completed' && (
                        <button
                          onClick={() => {
                            setSelectedExercise(exercise);
                            setShowSubmitModal(true);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Proof
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedExercises.has(exercise.id) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Exercise Instructions */}
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
                            <Target className="h-4 w-4 mr-2 text-green-600" />
                            Equipment Needed
                          </h4>
                          <div className="flex flex-wrap gap-2 bg-gray-50 p-4 rounded-lg">
                            {exercise.equipment.map((item, index) => (
                              <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Details */}
                      <div className="md:col-span-2">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                          Exercise Details
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">Category:</span>
                              <span className="ml-2 text-gray-600">{exercise.category || 'General'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">Assigned Date:</span>
                              <span className="ml-2 text-gray-600">
                                {new Date(exercise.assignedDate).toLocaleDateString()}
                              </span>
                            </div>
                            {exercise.streak > 0 && (
                              <div>
                                <span className="font-medium text-gray-700">Streak:</span>
                                <span className="ml-2 text-gray-600">{exercise.streak} days</span>
                              </div>
                            )}
                            {exercise.lastCompleted && (
                              <div>
                                <span className="font-medium text-gray-700">Last Completed:</span>
                                <span className="ml-2 text-gray-600">
                                  {new Date(exercise.lastCompleted).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                              
                              {/* Display image */}
                              {proof.submissionType === 'image' && proof.filePath && (
                                <div className="mt-2">
                                  {(() => {
                                    const fileName = proof.filePath.split('/').pop();
                                    const imageUrl = `http://localhost:5000/uploads/exercise-proofs/${fileName}`;
                                    console.log('Proof filePath:', proof.filePath);
                                    console.log('Extracted fileName:', fileName);
                                    console.log('Image URL:', imageUrl);
                                    return (
                                      <img 
                                        src={imageUrl}
                                        alt="Submitted proof"
                                        className="max-w-full h-auto max-h-64 rounded-lg border"
                                        onError={(e) => {
                                          console.error('Image load error:', e.target.src);
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'block';
                                        }}
                                        onLoad={() => {
                                          console.log('Image loaded successfully:', imageUrl);
                                        }}
                                      />
                                    );
                                  })()}
                                  <div className="hidden text-sm text-red-500">
                                    Failed to load image: {proof.filePath}
                                  </div>
                                </div>
                              )}
                              
                              {/* Display video */}
                              {proof.submissionType === 'video' && proof.filePath && (
                                <div className="mt-2">
                                  <video 
                                    controls 
                                    className="max-w-full h-auto max-h-64 rounded-lg border"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'block';
                                    }}
                                  >
                                    <source 
                                      src={`http://localhost:5000/uploads/exercise-proofs/${proof.filePath.split('/').pop()}`}
                                      type={proof.mimeType || 'video/mp4'}
                                    />
                                    Your browser does not support the video tag.
                                  </video>
                                  <div className="hidden text-sm text-red-500">
                                    Failed to load video
                                  </div>
                                </div>
                              )}
                              
                              {/* Display file download link for other file types */}
                              {proof.submissionType === 'file' && proof.filePath && (
                                <div className="mt-2">
                                  <a 
                                    href={`http://localhost:5000/uploads/exercise-proofs/${proof.filePath.split('/').pop()}`}
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
    </div>
  );
};

export default HomeExercisesNew;
