import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, FileText, Calendar, User, Edit, Eye, Trash2, MessageSquare, Send, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { therapistAPI } from '../../services/api';
import { useRealtimeData } from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DailyNotes = () => {
  const { user, isAuthenticated } = useAuth();
  
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [therapistComment, setTherapistComment] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showComments, setShowComments] = useState({});
  const [showCommentMenu, setShowCommentMenu] = useState(null);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    patientId: '',
    sessionDate: '',
    sessionDuration: '',
    content: '',
    activities: '',
    observations: '',
    progress: '',
    challenges: '',
    nextSteps: '',
    goals: '',
    mood: '',
    engagement: ''
  });

  // Fetch daily notes data from API
  const { data: notesData, isLoading: notesLoading, error: notesError, refetch: refetchNotes } = useQuery(
    'therapistDailyNotes',
    () => therapistAPI.getDailyNotes(user?.id),
    {
      enabled: !!user?.id, // Only run query when user ID is available
      onError: (error) => {
        toast.error('Failed to load daily notes');
        console.error('Error fetching daily notes:', error);
      }
    }
  );

  // Fetch patients data from API
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'therapistPatients',
    () => therapistAPI.getPatients(user?.id),
    {
      enabled: !!user?.id, // Only run query when user ID is available
      onError: (error) => {
        toast.error('Failed to load patients data');
        console.error('Error fetching patients:', error);
      }
    }
  );

  // Enable real-time updates
  const { isRefreshing } = useRealtimeData('therapistDailyNotes', refetchNotes);

  // Create daily note mutation
  const createNoteMutation = useMutation(
    therapistAPI.createDailyNote,
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Daily note created successfully!');
        setShowForm(false);
        setFormData({
          patientId: '',
          sessionDate: '',
          sessionDuration: '',
          content: '',
          activities: '',
          observations: '',
          progress: '',
          challenges: '',
          nextSteps: '',
          goals: '',
          mood: '',
          engagement: ''
        });
      },
      onError: (error) => {
        console.error('Error creating daily note:', error);
        toast.error(`Failed to create daily note: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Add therapist comment mutation
  const addCommentMutation = useMutation(
    ({ noteId, comment }) => therapistAPI.addNoteComment(noteId, comment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Comment added successfully!');
        setTherapistComment('');
        setShowCommentForm(false);
      },
      onError: (error) => {
        console.error('Error adding comment:', error);
        toast.error(`Failed to add comment: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Edit comment mutation
  const editCommentMutation = useMutation(
    ({ noteId, commentId, comment }) => therapistAPI.editNoteComment(noteId, commentId, comment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Comment updated successfully!');
        setEditingComment(null);
        setEditCommentText('');
      },
      onError: (error) => {
        toast.error('Failed to update comment');
        console.error('Error updating comment:', error);
      }
    }
  );

  // Delete comment mutation
  const deleteCommentMutation = useMutation(
    ({ noteId, commentId }) => therapistAPI.deleteNoteComment(noteId, commentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Comment deleted successfully!');
        setShowCommentMenu(null);
      },
      onError: (error) => {
        toast.error('Failed to delete comment');
        console.error('Error deleting comment:', error);
      }
    }
  );

  // Update daily note mutation
  const updateNoteMutation = useMutation(
    ({ id, noteData }) => therapistAPI.updateDailyNote(id, noteData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Daily note updated successfully!');
        setShowForm(false);
        setEditingNote(null);
        resetForm();
      },
      onError: (error) => {
        console.error('Error updating daily note:', error);
        toast.error(`Failed to update daily note: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Delete daily note mutation
  const deleteNoteMutation = useMutation(
    (id) => therapistAPI.deleteDailyNote(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('therapistDailyNotes');
        toast.success('Daily note deleted successfully!');
      },
      onError: (error) => {
        console.error('Error deleting daily note:', error);
        toast.error(`Failed to delete daily note: ${error.response?.data?.error || error.message}`);
      }
    }
  );

  // Transform data
  const allNotes = (notesData?.data?.data?.dailyNotes || []).map(note => ({
    ...note,
    comments: Array.isArray(note.comments) ? note.comments : 
              (typeof note.comments === 'string' ? 
                (() => {
                  try {
                    return JSON.parse(note.comments || '[]');
                  } catch (e) {
                    console.error('Error parsing comments:', e);
                    return [];
                  }
                })() : [])
  }));

  // Filter notes based on selected patient
  const notes = selectedPatientId ? 
    allNotes.filter(note => note.patientId === parseInt(selectedPatientId)) : 
    allNotes;

  const isLoading = notesLoading || patientsLoading;



  React.useEffect(() => {
    if (patientsData?.data?.data?.patients) {
      const transformedPatients = patientsData.data.data.patients.map(patient => ({
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        age: patient.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : 'N/A',
        diagnosis: patient.diagnosis || 'Not specified'
      }));
      setPatients(transformedPatients);
    }
  }, [patientsData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.patientId || !formData.sessionDate) {
      toast.error('Please fill in all required fields');
      return;
    }

      if (editingNote) {
        // Update existing note
      updateNoteMutation.mutate({ 
        id: editingNote.id, 
        noteData: formData 
      });
      } else {
        // Create new note
      createNoteMutation.mutate(formData);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!therapistComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!selectedNote?.id) {
      toast.error('Please select a note to comment on');
      return;
    }

    addCommentMutation.mutate({ 
      noteId: selectedNote.id, 
      comment: therapistComment.trim() 
    });
  };

  const handleEditComment = (noteId, comment) => {
    setSelectedNote(notes.find(note => note.id === noteId));
    setEditingComment(comment.id);
    setEditCommentText(comment.content);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editCommentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    editCommentMutation.mutate({
      noteId: selectedNote.id,
      commentId: editingComment,
      comment: editCommentText.trim()
    });
  };

  const handleDeleteComment = (noteId, commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate({
        noteId: noteId,
        commentId: commentId
      });
    }
  };

  const toggleComments = (noteId) => {
    setShowComments(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      patientId: note.patientId.toString(),
      sessionDate: note.sessionDate,
      content: note.content,
      activities: note.activities || '',
      goals: note.goals || '',
      nextSteps: note.nextSteps || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      sessionDate: '',
      sessionDuration: '',
      content: '',
      activities: '',
      observations: '',
      progress: '',
      challenges: '',
      nextSteps: '',
      goals: '',
      mood: '',
      engagement: ''
    });
    setEditingNote(null);
  };

  const cancelForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handlePatientSelect = (patientId) => {
    setSelectedPatientId(patientId);
    const patient = patients.find(p => p.id === parseInt(patientId));
    setSelectedPatient(patient);
    setShowForm(false);
    setEditingNote(null);
    resetForm();
  };

  const handleCreateNote = () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient first');
      return;
    }
    setFormData(prev => ({ ...prev, patientId: selectedPatientId }));
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Daily Notes</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Document therapy sessions and track patient progress
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedPatient ? selectedPatient.name : 'No patient selected'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedPatient ? `${notes.length} notes` : 'Select a patient to begin'}
                  </p>
                </div>
                <button
                  onClick={handleCreateNote}
                  disabled={!selectedPatientId}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Patient Selection Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Patient
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handlePatientSelect(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                >
                  <option value="">Choose a patient to view their notes...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} (Age: {patient.age}) - {patient.diagnosis}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {selectedPatient && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Viewing notes for {selectedPatient.name}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedPatient.diagnosis} • {notes.length} note{notes.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Note Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingNote ? 'Edit Note' : 'Create New Note'}
                </h2>
                <button
                  onClick={cancelForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selected Patient Display */}
                {selectedPatient && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-semibold text-blue-900">
                          Creating note for {selectedPatient.name}
                        </p>
                        <p className="text-sm text-blue-700">
                          {selectedPatient.diagnosis}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Session Date *
                    </label>
                    <input
                      type="date"
                      value={formData.sessionDate}
                      onChange={(e) => setFormData({...formData, sessionDate: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Session Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={formData.sessionDuration}
                      onChange={(e) => setFormData({...formData, sessionDuration: e.target.value})}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                      placeholder="45"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Session Summary *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={4}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                    placeholder="Describe what was accomplished during the session..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Activities Performed
                    </label>
                    <textarea
                      value={formData.activities}
                      onChange={(e) => setFormData({...formData, activities: e.target.value})}
                      rows={3}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                      placeholder="List the specific activities and exercises..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Goals Addressed
                    </label>
                    <textarea
                      value={formData.goals}
                      onChange={(e) => setFormData({...formData, goals: e.target.value})}
                      rows={3}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                      placeholder="What therapy goals were worked on today?"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Next Steps
                  </label>
                  <textarea
                    value={formData.nextSteps}
                    onChange={(e) => setFormData({...formData, nextSteps: e.target.value})}
                    rows={3}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-200"
                    placeholder="What should be done next? Home exercises? Follow-up plans?"
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    {editingNote ? 'Update Note' : 'Create Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Notes List */}
        {!selectedPatientId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Patient</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Choose a patient from the dropdown above to view their daily notes and create new ones.
              </p>
            </div>
          </div>
        ) : notes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes yet for {selectedPatient?.name}</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Start documenting therapy sessions by creating your first daily note.
              </p>
              <button
                onClick={handleCreateNote}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Note
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {note.patientName}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {note.sessionDate}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          {note.sessionDate}
                          {note.sessionDuration && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{note.sessionDuration} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {selectedNote?.id === note.id ? 'Hide' : 'View Note'}
                      </button>
                      <button
                        onClick={() => handleEdit(note)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Note Details */}
                {selectedNote?.id === note.id && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-6 space-y-4">
                      {note.content && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Session Summary</h4>
                          <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-lg border">{note.content}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {note.activities && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Activities Performed</h4>
                            <p className="text-sm text-gray-600">{note.activities}</p>
                          </div>
                        )}

                        {note.goals && (
                          <div className="bg-white p-4 rounded-lg border">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Goals Addressed</h4>
                            <p className="text-sm text-gray-600">{note.goals}</p>
                          </div>
                        )}
                      </div>

                      {note.nextSteps && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-semibold text-blue-700 mb-2">Next Steps</h4>
                          <p className="text-sm text-blue-600">{note.nextSteps}</p>
                        </div>
                      )}

                      {(note.observations || note.progress || note.challenges || note.mood || note.engagement) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {note.observations && (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Observations</h4>
                              <p className="text-sm text-gray-600">{note.observations}</p>
                            </div>
                          )}

                          {note.progress && (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Progress</h4>
                              <p className="text-sm text-gray-600">{note.progress}</p>
                            </div>
                          )}

                          {note.challenges && (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Challenges</h4>
                              <p className="text-sm text-gray-600">{note.challenges}</p>
                            </div>
                          )}

                          {(note.mood || note.engagement) && (
                            <div className="bg-white p-4 rounded-lg border">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Session Metrics</h4>
                              <div className="space-y-2">
                                {note.mood && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Mood:</span>
                                    <span className="text-sm font-medium text-gray-900">{note.mood}</span>
                                  </div>
                                )}
                                {note.engagement && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Engagement:</span>
                                    <span className="text-sm font-medium text-gray-900">{note.engagement}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                        {/* Comments Section */}
                        <div className="mt-6 border-t border-gray-200 pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <button
                              onClick={() => toggleComments(note.id)}
                              className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              {note.comments?.length || 0} comments
                              {showComments[note.id] ? (
                                <ChevronUp className="h-4 w-4 ml-1" />
                              ) : (
                                <ChevronDown className="h-4 w-4 ml-1" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedNote(note);
                                setShowCommentForm(!showCommentForm);
                              }}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
                            >
                              {showCommentForm && selectedNote?.id === note.id ? 'Cancel' : 'Add Comment'}
                            </button>
                          </div>

                          {/* Comments List */}
                          {showComments[note.id] && note.comments && Array.isArray(note.comments) && note.comments.length > 0 && (
                            <div className="space-y-4 mb-4">
                              {note.comments.map((comment) => (
                                <div key={comment.id} className="flex items-start space-x-3 group">
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <User className="h-4 w-4 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900">{comment.author}</span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(comment.timestamp).toLocaleString()}
                                      </span>
                                      {comment.edited && (
                                        <span className="text-xs text-gray-400">(edited)</span>
                                      )}
                                    </div>
                                    {editingComment === comment.id ? (
                                      <form onSubmit={handleEditSubmit} className="mt-2">
                                        <textarea
                                          value={editCommentText}
                                          onChange={(e) => setEditCommentText(e.target.value)}
                                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                          rows={2}
                                          autoFocus
                                        />
                                        <div className="flex items-center space-x-3 mt-2">
                                          <button
                                            type="submit"
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                                            disabled={editCommentMutation.isLoading}
                                          >
                                            Save
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingComment(null);
                                              setEditCommentText('');
                                            }}
                                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </form>
                                    ) : (
                                      <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                                    )}
                                  </div>
                                  {comment.author === 'Therapist' && (
                                    <div className="relative">
                                      <button
                                        onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full transition-opacity duration-200"
                                      >
                                        <MoreVertical className="h-4 w-4 text-gray-400" />
                                      </button>
                                      {showCommentMenu === comment.id && (
                                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                          <button
                                            onClick={() => {
                                              handleEditComment(note.id, comment);
                                              setShowCommentMenu(null);
                                            }}
                                            className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors duration-200"
                                          >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleDeleteComment(note.id, comment.id);
                                              setShowCommentMenu(null);
                                            }}
                                            className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors duration-200"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment Form */}
                          {showCommentForm && selectedNote?.id === note.id && (
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1">
                                <form onSubmit={handleCommentSubmit}>
                                  <textarea
                                    value={therapistComment}
                                    onChange={(e) => setTherapistComment(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                                    placeholder="Write a comment..."
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex items-center justify-end mt-3 space-x-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowCommentForm(false);
                                        setTherapistComment('');
                                      }}
                                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                      disabled={addCommentMutation.isLoading || !therapistComment.trim()}
                                    >
                                      <Send className="h-4 w-4 mr-2" />
                                      {addCommentMutation.isLoading ? 'Sending...' : 'Post Comment'}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyNotes;
