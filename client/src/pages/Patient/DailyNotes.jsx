import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FileText, Calendar, User, MessageSquare, Image, Video, Send, Plus, Edit, Trash2, MoreVertical, ChevronDown, ChevronUp, Eye, Clock } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { useRealtimeData } from '../../hooks/useWebSocket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DailyNotes = () => {
  const { user, isAuthenticated } = useAuth();
  
  
  
  const [selectedNote, setSelectedNote] = useState(null);
  const [comment, setComment] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [showComments, setShowComments] = useState({});
  const [showCommentMenu, setShowCommentMenu] = useState(null);
  const queryClient = useQueryClient();

    // Fetch daily notes data
  const { data: notesData, isLoading, error, refetch } = useQuery(
    'patientDailyNotes',
    patientAPI.getDailyNotes,
    {
      enabled: isAuthenticated, // Only fetch if user is authenticated
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: true, // Refetch when window gains focus
      refetchOnMount: true, // Refetch when component mounts
      refetchOnReconnect: true, // Refetch when network reconnects
      onSuccess: (data) => {
        console.log('🔍 Query Success:', data);
      },
      onError: (error) => {
        toast.error('Failed to load daily notes');
        console.error('Error fetching daily notes:', error);
      }
    }
  );
  


  // Enable real-time updates
  useRealtimeData('patientDailyNotes', refetch);

  // Add comment mutation
  const addCommentMutation = useMutation(
    async ({ noteId, comment }) => {
      const response = await fetch(`/api/patient/daily-notes/${noteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ comment })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add comment');
      }
      
      return response.json();
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patientDailyNotes');
        toast.success('Comment added successfully!');
        setComment('');
        setShowCommentForm(false);
      },
      onError: (error) => {
        toast.error('Failed to add comment');
        console.error('Error adding comment:', error);
      }
    }
  );

  // Edit comment mutation
  const editCommentMutation = useMutation(
    ({ noteId, commentId, comment }) => patientAPI.editNoteComment(noteId, commentId, comment),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patientDailyNotes');
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
    ({ noteId, commentId }) => patientAPI.deleteNoteComment(noteId, commentId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('patientDailyNotes');
        toast.success('Comment deleted successfully!');
        setShowCommentMenu(null);
      },
      onError: (error) => {
        toast.error('Failed to delete comment');
        console.error('Error deleting comment:', error);
      }
    }
  );

  // Transform notes data - using correct nested structure
  const notesArray = Array.isArray(notesData?.data?.data) ? notesData.data.data : [];
  
  const notes = notesArray.map(note => ({
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

  

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!selectedNote?.id) {
      toast.error('Please select a note to comment on');
      return;
    }

    addCommentMutation.mutate({ 
      noteId: selectedNote.id, 
      comment: comment.trim() 
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

  const handleAttachmentUpload = (noteId) => {
    // This will be implemented with actual file upload functionality
    toast('File upload functionality will be implemented');
  };

  if (!isAuthenticated) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Please log in</h3>
        <p className="text-sm text-gray-500">You need to be logged in to view your daily notes.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading notes</h3>
        <p className="text-sm text-gray-500 mb-4">There was a problem loading your daily notes.</p>
        <p className="text-xs text-gray-400 mb-4">Error: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modern Header */}
      <div className="bg-white shadow-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Daily Notes
                </h1>
                <p className="mt-3 text-sm sm:text-base lg:text-lg text-gray-600">
                  View your therapy session notes and communicate with your therapist
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {notes.length} note{notes.length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Classic Notes List */}
        <div className="space-y-4">
          {Array.isArray(notes) && notes.length > 0 ? (
            notes.map((note) => (
            <div key={note.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          Session on {new Date(note.sessionDate).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            timeZone: 'UTC'
                          })}
                        </h3>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 self-start">
                          {new Date(note.sessionDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-1 sm:gap-4">
                        <div className="flex items-center">
                          <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-500" />
                          {note.therapistName || 'Therapist'}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-500" />
                          {new Date(note.sessionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC'
                          })}
                        </div>
                        {note.sessionDuration && (
                          <div className="flex items-center">
                            <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-500" />
                            {note.sessionDuration} min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
                      className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {selectedNote?.id === note.id ? 'Hide' : 'View Note'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Classic Expanded Note Details */}
              {selectedNote?.id === note.id && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-6 space-y-4">
                    {note.content && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          Session Summary
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed bg-white p-4 rounded border border-gray-200">{note.content}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {note.activities && (
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-green-600" />
                            Activities Performed
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed">{note.activities}</p>
                        </div>
                      )}

                      {note.goals && (
                        <div className="bg-white p-4 rounded border border-gray-200">
                          <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <User className="h-4 w-4 text-purple-600" />
                            Goals Addressed
                          </h4>
                          <p className="text-sm text-gray-700 leading-relaxed">{note.goals}</p>
                        </div>
                      )}
                    </div>

                    {note.nextSteps && (
                      <div className="bg-blue-50 p-4 rounded border border-blue-200">
                        <h4 className="text-base font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <Plus className="h-4 w-4 text-blue-600" />
                          Next Steps
                        </h4>
                        <p className="text-sm text-blue-800 leading-relaxed">{note.nextSteps}</p>
                      </div>
                    )}

                    {(note.observations || note.progress || note.challenges || note.mood || note.engagement) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {note.observations && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Eye className="h-5 w-5 text-orange-600" />
                              Observations
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{note.observations}</p>
                          </div>
                        )}

                        {note.progress && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Plus className="h-5 w-5 text-green-600" />
                              Progress
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{note.progress}</p>
                          </div>
                        )}

                        {note.challenges && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Trash2 className="h-5 w-5 text-red-600" />
                              Challenges
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{note.challenges}</p>
                          </div>
                        )}

                        {(note.mood || note.engagement) && (
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <User className="h-5 w-5 text-indigo-600" />
                              Session Metrics
                            </h4>
                            <div className="space-y-3">
                              {note.mood && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium text-gray-600">Mood:</span>
                                  <span className="text-sm font-semibold text-gray-900 bg-blue-100 text-blue-800 px-3 py-1 rounded-full">{note.mood}</span>
                                </div>
                              )}
                              {note.engagement && (
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                  <span className="text-sm font-medium text-gray-600">Engagement:</span>
                                  <span className="text-sm font-semibold text-gray-900 bg-green-100 text-green-800 px-3 py-1 rounded-full">{note.engagement}</span>
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
                                      className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3"
                                      rows={3}
                                      autoFocus
                                    />
                                    <div className="flex items-center space-x-2 mt-2">
                                      <button
                                        type="submit"
                                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-200"
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
                                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </form>
                                ) : (
                                  <p className="text-sm text-gray-600">{comment.content}</p>
                                )}
                              </div>
                              {comment.author === 'Patient' && (
                                <div className="relative">
                                  <button
                                    onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-lg transition-all duration-200"
                                  >
                                    <MoreVertical className="h-4 w-4 text-gray-500" />
                                  </button>
                                  {showCommentMenu === comment.id && (
                                    <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                                      <button
                                        onClick={() => {
                                          handleEditComment(note.id, comment);
                                          setShowCommentMenu(null);
                                        }}
                                        className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full rounded-t-lg touch-target"
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          handleDeleteComment(note.id, comment.id);
                                          setShowCommentMenu(null);
                                        }}
                                        className="flex items-center px-3 py-2 text-sm text-red-700 hover:bg-red-50 w-full rounded-b-lg touch-target"
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
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <form onSubmit={handleCommentSubmit}>
                                <textarea
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 resize-none"
                                  placeholder="Write a comment..."
                                  rows={3}
                                  autoFocus
                                />
                                <div className="flex items-center justify-between mt-3">
                                  <div className="flex items-center space-x-3">
                                    <button
                                      type="button"
                                      onClick={() => handleAttachmentUpload(note.id)}
                                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                    >
                                      <Image className="h-3 w-3 mr-1" />
                                      Photo
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAttachmentUpload(note.id)}
                                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                    >
                                      <Video className="h-3 w-3 mr-1" />
                                      Video
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowCommentForm(false);
                                        setComment('');
                                      }}
                                      className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                      disabled={addCommentMutation.isLoading || !comment.trim()}
                                    >
                                      <Send className="h-4 w-4 mr-1" />
                                      {addCommentMutation.isLoading ? 'Sending...' : 'Post Comment'}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                </div>
            </div>
            )}
          </div>
          ))
          ) : (
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">No notes yet</h3>
                <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
                  Your therapist will add session notes here after each appointment. Check back after your next session!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyNotes;
