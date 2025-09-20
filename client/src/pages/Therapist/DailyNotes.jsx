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
    therapistAPI.getDailyNotes,
    {
      onError: (error) => {
        toast.error('Failed to load daily notes');
        console.error('Error fetching daily notes:', error);
      }
    }
  );

  // Fetch patients data from API
  const { data: patientsData, isLoading: patientsLoading, error: patientsError } = useQuery(
    'therapistPatients',
    therapistAPI.getPatients,
    {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Notes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Document therapy sessions and track patient progress
          </p>
        </div>

        {/* Patient Selection */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
              >
                <option value="">Choose a patient to view their notes...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} (Age: {patient.age}) - {patient.diagnosis}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-shrink-0">
              <button
                onClick={handleCreateNote}
                disabled={!selectedPatientId}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </button>
            </div>
          </div>
          
          {selectedPatient && (
            <div className="mt-3 p-3 bg-green-50 rounded-md">
              <div className="flex items-center">
                <User className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Viewing notes for {selectedPatient.name}
                  </p>
                  <p className="text-xs text-green-600">
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
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingNote ? 'Edit Note' : 'Create New Note'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selected Patient Display */}
            {selectedPatient && (
              <div className="bg-green-50 p-3 rounded-md">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Creating note for {selectedPatient.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {selectedPatient.diagnosis}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Date *
                </label>
                <input
                  type="date"
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({...formData, sessionDate: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.sessionDuration}
                  onChange={(e) => setFormData({...formData, sessionDuration: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="45"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Session Summary *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                rows={4}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Describe what was accomplished during the session..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Activities Performed
              </label>
              <textarea
                value={formData.activities}
                onChange={(e) => setFormData({...formData, activities: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="List the specific activities and exercises..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Goals Addressed
              </label>
              <textarea
                value={formData.goals}
                onChange={(e) => setFormData({...formData, goals: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="What therapy goals were worked on today?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Next Steps
              </label>
              <textarea
                value={formData.nextSteps}
                onChange={(e) => setFormData({...formData, nextSteps: e.target.value})}
                rows={2}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="What should be done next? Home exercises? Follow-up plans?"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {editingNote ? 'Update Note' : 'Create Note'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {!selectedPatientId ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Patient</h3>
            <p className="text-sm text-gray-500">
              Choose a patient from the dropdown above to view their daily notes and create new ones.
            </p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet for {selectedPatient?.name}</h3>
            <p className="text-sm text-gray-500 mb-4">
              Start documenting therapy sessions by creating your first daily note.
            </p>
            <button
              onClick={handleCreateNote}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Note
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {notes.map((note) => (
            <li key={note.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {note.patientName}
                          </h3>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {note.sessionDate}
                            <User className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {note.patientName}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(note)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      {note.content && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-700">{note.content}</p>
                        </div>
                      )}

                      {note.activities && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Activities:</p>
                          <p className="text-xs text-gray-600">{note.activities}</p>
                        </div>
                      )}

                      {note.goals && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Goals:</p>
                          <p className="text-xs text-gray-600">{note.goals}</p>
                        </div>
                      )}

                      {note.nextSteps && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500">Next Steps:</p>
                          <p className="text-xs text-gray-600">{note.nextSteps}</p>
                        </div>
                      )}

                      {/* Comments Section - Compact Facebook Style */}
                      <div className="mt-4 border-t border-gray-200 pt-3">
                        {/* Comments Header */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            onClick={() => toggleComments(note.id)}
                            className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
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
                            className="text-sm text-green-600 hover:text-green-800"
                          >
                            {showCommentForm && selectedNote?.id === note.id ? 'Cancel' : 'Reply'}
                          </button>
                        </div>

                        {/* Comments List - Collapsible */}
                        {showComments[note.id] && note.comments && Array.isArray(note.comments) && note.comments.length > 0 && (
                          <div className="space-y-2 mb-3">
                            {note.comments.map((comment) => (
                              <div key={comment.id} className="flex items-start space-x-2 group">
                                <div className="flex-shrink-0">
                                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                    <User className="h-3 w-3 text-green-600" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                                    <span className="text-xs text-gray-500">
                                      {new Date(comment.timestamp).toLocaleString()}
                                    </span>
                                    {comment.edited && (
                                      <span className="text-xs text-gray-400">(edited)</span>
                                    )}
                                  </div>
                                  {editingComment === comment.id ? (
                                    <form onSubmit={handleEditSubmit} className="mt-1">
                                      <textarea
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                        rows={2}
                                        autoFocus
                                      />
                                      <div className="flex items-center space-x-2 mt-1">
                                        <button
                                          type="submit"
                                          className="text-xs text-green-600 hover:text-green-800"
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
                                          className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                  )}
                                </div>
                                {comment.author === 'Therapist' && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full"
                                    >
                                      <MoreVertical className="h-4 w-4 text-gray-400" />
                                    </button>
                                    {showCommentMenu === comment.id && (
                                      <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                        <button
                                          onClick={() => {
                                            handleEditComment(note.id, comment);
                                            setShowCommentMenu(null);
                                          }}
                                          className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleDeleteComment(note.id, comment.id);
                                            setShowCommentMenu(null);
                                          }}
                                          className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
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

                        {/* Add Comment Form - Compact */}
                        {showCommentForm && selectedNote?.id === note.id && (
                          <div className="flex items-start space-x-2">
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="h-3 w-3 text-green-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <form onSubmit={handleCommentSubmit}>
                                <textarea
                                  value={therapistComment}
                                  onChange={(e) => setTherapistComment(e.target.value)}
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                                  placeholder="Write a reply..."
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex items-center justify-end mt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowCommentForm(false);
                                      setTherapistComment('');
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700 mr-3"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                                    disabled={addCommentMutation.isLoading || !therapistComment.trim()}
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    {addCommentMutation.isLoading ? 'Sending...' : 'Reply'}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DailyNotes;
