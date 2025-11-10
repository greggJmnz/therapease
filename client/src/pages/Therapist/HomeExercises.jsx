import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Dumbbell,
  User,
  Calendar,
  Target,
  FileText,
  Image,
  Video,
  File,
  MessageSquare,
  Send,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeData } from '../../hooks/useWebSocket';
import FullScreenImageViewer from '../../components/FullScreenImageViewer';
import ExerciseDetailsModal from '../../components/ExerciseDetailsModal';
import ConfirmationModal from '../../components/ConfirmationModal';
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
  const fullUrl = fileUrl.startsWith('/') 
    ? `${serverBaseUrl}${fileUrl}` 
    : `${serverBaseUrl}/${fileUrl}`;
  
  // Only log in development
  if (import.meta.env.DEV) {
    console.log('📸 Proof image URL:', { 
      originalFileUrl: fileUrl, 
      serverBaseUrl, 
      fullUrl,
      apiBaseUrl,
      isProduction: import.meta.env.PROD,
      hostname: window.location.hostname
    });
  }
  
  return fullUrl;
};

const HomeExercises = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedProofs, setSelectedProofs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [patientFilter, setPatientFilter] = useState('all');
  const [patients, setPatients] = useState([]);
  const [expandedExercises, setExpandedExercises] = useState(new Set());
  const [fullScreenImage, setFullScreenImage] = useState({ isOpen: false, url: '', fileName: '' });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionProofId, setRevisionProofId] = useState(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [videoErrors, setVideoErrors] = useState({});
  const [formData, setFormData] = useState({
    patientId: '',
    title: '',
    description: '',
    instructions: '',
    frequency: '',
    difficulty: 'Beginner',
    equipment: '',
    dueDate: ''
  });

  // Fetch exercises
  const { data: exercisesData, isLoading, error, refetch } = useQuery(
    'therapistHomeExercises',
    () => therapistAPI.getHomeExercises(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        console.error('Error fetching exercises:', error);
        toast.error('Failed to load exercises');
      }
    }
  );

  // Fetch proofs
  const { data: proofsData, refetch: refetchProofs } = useQuery(
    'therapistHomeExerciseProofs',
    () => therapistAPI.getHomeExerciseProofs(user?.id),
    {
      enabled: !!user?.id,
      onError: (error) => {
        console.error('Error fetching proofs:', error);
      }
    }
  );

  // Fetch patients for dropdown
  const { data: patientsData } = useQuery(
    'therapistPatients',
    () => therapistAPI.getPatients(user?.id),
    {
      enabled: !!user?.id,
      onSuccess: (data) => {
        const transformedPatients = data?.data?.data?.patients?.map(patient => ({
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`,
          userId: patient.userId
        })) || [];
        setPatients(transformedPatients);
      }
    }
  );

  // Enable real-time updates
  const { isRefreshing } = useRealtimeData('therapistHomeExercises', refetch);
  const { isRefreshing: isRefreshingProofs } = useRealtimeData('therapistHomeExerciseProofs', refetchProofs);

  // Create exercise mutation
  const createExerciseMutation = useMutation(
    therapistAPI.createHomeExercise,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistHomeExercises');
        queryClient.invalidateQueries('therapistHomeExerciseProofs');
        toast.success('Exercise created successfully!');
        setShowCreateForm(false);
        resetForm();
      },
      onError: (error) => {
        console.error('Error creating exercise:', error);
        toast.error(`Failed to create exercise: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Update exercise mutation
  const updateExerciseMutation = useMutation(
    ({ id, exerciseData }) => therapistAPI.updateHomeExercise(id, exerciseData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistHomeExercises');
        toast.success('Exercise updated successfully!');
        setShowCreateForm(false);
        resetForm();
      },
      onError: (error) => {
        console.error('Error updating exercise:', error);
        toast.error(`Failed to update exercise: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Delete exercise mutation
  const deleteExerciseMutation = useMutation(
    therapistAPI.deleteHomeExercise,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistHomeExercises');
        toast.success('Exercise deleted successfully!');
      },
      onError: (error) => {
        console.error('Error deleting exercise:', error);
        toast.error(`Failed to delete exercise: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Review proof mutation
  const reviewProofMutation = useMutation(
    ({ proofId, reviewData }) => therapistAPI.reviewHomeExerciseProof(proofId, reviewData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistHomeExerciseProofs');
        queryClient.invalidateQueries('therapistHomeExercises');
        toast.success('Proof reviewed successfully!');
        setShowProofModal(false);
      },
      onError: (error) => {
        console.error('Error reviewing proof:', error);
        toast.error(`Failed to review proof: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  const exercises = Array.isArray(exercisesData?.data?.data) ? exercisesData.data.data : [];
  const proofs = Array.isArray(proofsData?.data?.data) ? proofsData.data.data : [];

  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exercise.patientFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exercise.patientLastName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exercise.status === statusFilter;
    const matchesPatient = patientFilter === 'all' || exercise.patientId.toString() === patientFilter;
    
    return matchesSearch && matchesStatus && matchesPatient;
  });

  const resetForm = () => {
    setFormData({
      patientId: '',
      title: '',
      description: '',
      instructions: '',
      frequency: '',
      difficulty: 'Beginner',
      equipment: '',
      dueDate: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const exerciseData = {
      ...formData,
      therapistId: user.id,
      instructions: formData.instructions.split('\n').filter(instruction => instruction.trim()),
      equipment: formData.equipment ? formData.equipment.split(',').map(item => item.trim()) : []
    };

    if (selectedExercise) {
      updateExerciseMutation.mutate({ id: selectedExercise.id, exerciseData });
    } else {
      createExerciseMutation.mutate(exerciseData);
    }
  };

  const handleEdit = (exercise) => {
    setSelectedExercise(exercise);
    
    // Format due date for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error formatting date:', error);
        return '';
      }
    };
    
    setFormData({
      patientId: exercise.patientId.toString(),
      title: exercise.title,
      description: exercise.description,
      instructions: Array.isArray(exercise.instructions) ? exercise.instructions.join('\n') : exercise.instructions,
      frequency: exercise.frequency,
      difficulty: exercise.difficulty,
      equipment: Array.isArray(exercise.equipment) ? exercise.equipment.join(', ') : exercise.equipment || '',
      dueDate: formatDateForInput(exercise.dueDate)
    });
    setShowCreateForm(true);
  };

  const handleDelete = (exerciseId) => {
    setExerciseToDelete(exerciseId);
    setShowDeleteModal(true);
  };

  const confirmDeleteExercise = () => {
    if (exerciseToDelete) {
      deleteExerciseMutation.mutate(exerciseToDelete);
      setShowDeleteModal(false);
      setExerciseToDelete(null);
    }
  };

  const handleViewProofs = (exercise) => {
    const exerciseProofs = proofs.filter(proof => proof.exerciseId === exercise.id);
    setSelectedProofs(exerciseProofs);
    setSelectedExercise(exercise);
    setShowProofModal(true);
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

  const handleReviewProof = (proofId, status, feedback) => {
    reviewProofMutation.mutate({
      proofId,
      reviewData: { status, therapistFeedback: feedback }
    });
  };

  const handleRequestRevision = (proofId) => {
    setRevisionProofId(proofId);
    setRevisionFeedback('');
    setShowRevisionModal(true);
  };

  const confirmRequestRevision = () => {
    if (revisionProofId && revisionFeedback.trim()) {
      handleReviewProof(revisionProofId, 'needs_revision', revisionFeedback.trim());
      setShowRevisionModal(false);
      setRevisionProofId(null);
      setRevisionFeedback('');
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-green-100">
                <Dumbbell className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Home Exercises</h1>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Assign and manage home exercises for your patients
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedExercise(null);
                resetForm();
                setShowCreateForm(true);
              }}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105 w-full sm:w-auto touch-target"
            >
              <Plus className="h-5 w-5 mr-2" />
              Assign Exercise
            </button>
          </div>
        </div>

        <div className="space-y-8">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Dumbbell className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total</p>
                  <p className="text-lg font-bold text-gray-900">{exercises.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Completed</p>
                  <p className="text-lg font-bold text-gray-900">
                    {exercises.filter(e => e.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">In Progress</p>
                  <p className="text-lg font-bold text-gray-900">
                    {exercises.filter(e => e.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Overdue</p>
                  <p className="text-lg font-bold text-gray-900">
                    {exercises.filter(e => e.status === 'overdue').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search exercises or patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
            >
              <option value="all">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id.toString()}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

          {/* Exercises List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Target className="h-5 w-5 text-green-600 mr-2" />
                Assigned Exercises
              </h3>
            </div>
        <div className="divide-y divide-gray-200">
          {filteredExercises.map((exercise) => (
            <div key={exercise.id} className="p-3 sm:p-6 hover:bg-gray-50 transition-colors duration-200">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center shadow-sm">
                    <Dumbbell className="h-5 w-5 sm:h-7 sm:w-7 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h3 className="text-base sm:text-xl font-bold text-gray-900 truncate tracking-wide">
                        {exercise.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium self-start ${getStatusColor(exercise.status)}`}>
                        {exercise.status.replace('_', ' ')}
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
                      <span className="truncate">{exercise.patientFirstName} {exercise.patientLastName}</span>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                      <span>{exercise.frequency}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                      {exercise.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4 leading-relaxed font-medium line-clamp-2">
                    {exercise.description}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons - Mobile optimized */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-4">
                <button
                  onClick={() => handleViewProofs(exercise)}
                  className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 touch-target w-full sm:w-auto"
                >
                  <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">View Proofs ({exercise.proofCount})</span>
                  <span className="sm:hidden">Proofs ({exercise.proofCount})</span>
                </button>
                
                <button
                  onClick={() => handleEdit(exercise)}
                  className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors duration-200 touch-target w-full sm:w-auto"
                >
                  <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Edit
                </button>
                
                <button
                  onClick={() => handleDelete(exercise.id)}
                  className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-transparent shadow-sm text-xs sm:text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 touch-target w-full sm:w-auto"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Delete
                </button>
              </div>

            </div>
          ))}
          </div>
        </div>
        </div>
      </div>

      {/* Create/Edit Exercise Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Dumbbell className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedExercise ? 'Edit Exercise' : 'Assign New Exercise'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedExercise ? 'Update exercise details' : 'Create a new home exercise for your patient'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 touch-target"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient and Title */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Patient *
                    </label>
                    <select
                      value={formData.patientId}
                      onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                      required
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                    >
                      <option value="">Select a patient</option>
                      {patients.map(patient => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Exercise Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="e.g., Morning Stretches"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    rows={3}
                    placeholder="Describe the exercise and its benefits..."
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200 resize-none"
                  />
                </div>

                {/* Frequency and Difficulty */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Frequency
                    </label>
                    <input
                      type="text"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      placeholder="e.g., Daily, 3x/week, Every other day"
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Difficulty Level
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                  />
                </div>

                {/* Instructions */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Step-by-Step Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={5}
                    placeholder="Enter detailed instructions, one step per line..."
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200 resize-none"
                  />
                  <p className="text-xs text-gray-500">Enter each instruction on a new line</p>
                </div>

                {/* Equipment */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Required Equipment
                  </label>
                  <input
                    type="text"
                    value={formData.equipment}
                    onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                    placeholder="e.g., Resistance band, Yoga mat, Water bottle"
                    className="block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500">Separate multiple items with commas</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-xl shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 touch-target"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createExerciseMutation.isLoading || updateExerciseMutation.isLoading}
                    className="flex-1 px-6 py-3 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-target"
                  >
                    {createExerciseMutation.isLoading || updateExerciseMutation.isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      selectedExercise ? 'Update Exercise' : 'Create Exercise'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Proof Review Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 sm:top-20 mx-auto p-4 sm:p-5 border w-11/12 md:w-4/5 lg:w-3/4 max-w-4xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">
                Proof Submissions - {selectedExercise?.title}
              </h3>
              <button
                onClick={() => setShowProofModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {selectedProofs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No proof submissions yet.</p>
              ) : (
                selectedProofs.map((proof) => (
                  <div key={proof.id} className="border rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {getProofIcon(proof.submissionType)}
                          <span className="text-sm font-medium text-gray-900">
                            {proof.patientFirstName} {proof.patientLastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(proof.submittedAt).toLocaleDateString()}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
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
                            {proof.submissionType === 'image' && proof.fileUrl && (
                              <div className="mt-2">
                                <img 
                                  src={getProofImageUrl(proof.fileUrl)}
                                  alt="Submitted proof"
                                  className="max-w-full h-auto max-h-48 sm:max-h-64 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setFullScreenImage({
                                    isOpen: true,
                                    url: getProofImageUrl(proof.fileUrl),
                                    fileName: proof.fileName || 'Exercise Proof'
                                  })}
                                  onError={(e) => {
                                    console.error('Image load error for:', e.target.src);
                                    e.target.style.display = 'none';
                                  }}
                                  onLoad={(e) => {
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Display video */}
                            {proof.submissionType === 'video' && proof.fileUrl && (
                              <div className="mt-2">
                                <video 
                                  src={getProofImageUrl(proof.fileUrl)}
                                  controls 
                                  preload="metadata"
                                  crossOrigin="anonymous"
                                  className="max-w-full h-auto max-h-48 sm:max-h-64 rounded-lg border"
                                  onLoadStart={() => {
                                    const videoUrl = getProofImageUrl(proof.fileUrl);
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
                                    const isFormatError = error?.code === 4 || error?.message?.includes('Format error') || error?.message?.includes('MEDIA_ELEMENT_ERROR');
                                    const isMovFile = proof.fileName?.toLowerCase().endsWith('.mov');
                                    
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
                                      constructedUrl: getProofImageUrl(proof.fileUrl),
                                      isFormatError,
                                      isMovFile
                                    });
                                    
                                    // Set error state for this video
                                    setVideoErrors(prev => ({
                                      ...prev,
                                      [proof.id]: {
                                        error: error?.message || 'Unknown error',
                                        isFormatError,
                                        isMovFile
                                      }
                                    }));
                                    
                                    // Hide the video element
                                    if (video) {
                                      video.style.display = 'none';
                                    }
                                  }}
                                >
                                  Your browser does not support the video tag.
                                </video>
                                {videoErrors[proof.id] && (
                                  <div className="text-sm text-red-500 mt-2 video-error-message">
                                    <div className="mb-2">
                                      {videoErrors[proof.id].isMovFile 
                                        ? 'QuickTime (.mov) format may not be supported by your browser.' 
                                        : videoErrors[proof.id].isFormatError
                                        ? 'Video format not supported by your browser.'
                                        : `Failed to load video (${videoErrors[proof.id].error}).`}
                                    </div>
                                    <a 
                                      href={getProofImageUrl(proof.fileUrl)} 
                                      download={proof.fileName || 'video.mov'} 
                                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm underline"
                                    >
                                      <File className="h-4 w-4" />
                                      <span>Download video to play in external player</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Display file download link for other file types */}
                            {proof.submissionType === 'file' && proof.fileUrl && (
                              <div className="mt-2">
                                <a 
                                  href={getProofImageUrl(proof.fileUrl)}
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
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="text-sm text-gray-700">
                              <strong>Your feedback:</strong> {proof.therapistFeedback}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {proof.status === 'submitted' && (
                        <div className="flex flex-col gap-2 sm:mt-0 flex-shrink-0 sm:w-40">
                          <button
                            onClick={() => handleReviewProof(proof.id, 'approved', '')}
                            className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 touch-target w-full"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRequestRevision(proof.id)}
                            className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-yellow-700 bg-yellow-100 hover:bg-yellow-200 touch-target w-full"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            <span>Request Revision</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  ))
                )}
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
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setExerciseToDelete(null);
        }}
        onConfirm={confirmDeleteExercise}
        title="Delete Exercise"
        message="Are you sure you want to delete this exercise?"
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Request Revision Modal */}
      {showRevisionModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-full bg-yellow-50">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Request Revision</h3>
                </div>
                <button
                  onClick={() => {
                    setShowRevisionModal(false);
                    setRevisionProofId(null);
                    setRevisionFeedback('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <label htmlFor="revision-feedback" className="block text-sm font-medium text-gray-700 mb-2">
                  Please provide feedback for revision:
                </label>
                <textarea
                  id="revision-feedback"
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Enter your feedback here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-sm sm:text-base resize-none"
                  autoFocus
                />
              </div>
              
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowRevisionModal(false);
                    setRevisionProofId(null);
                    setRevisionFeedback('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRequestRevision}
                  disabled={!revisionFeedback.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                >
                  Submit Revision Request
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HomeExercises;
