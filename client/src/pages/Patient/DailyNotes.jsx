import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FileText, Calendar, User, MessageSquare, Image, Video, Send, Plus, Edit, Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
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
      staleTime: 0, // Data becomes stale immediately
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
    toast.info('File upload functionality will be implemented');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Daily Notes</h1>
        <p className="mt-2 text-sm text-gray-700">
          View your therapy session notes and communicate with your therapist
        </p>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {Array.isArray(notes) && notes.length > 0 ? notes.map((note) => (
          <div key={note.id} className="bg-white shadow rounded-lg overflow-hidden">
            {/* Note Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Session on {new Date(note.sessionDate).toLocaleDateString()}
                    </h3>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <User className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      Therapist
                      <Calendar className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      {new Date(note.sessionDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  {selectedNote?.id === note.id ? 'Hide Details' : 'View Details'}
                </button>
              </div>
            </div>

            {/* Note Content - Only show when details are expanded */}
            {selectedNote?.id === note.id && (
            <div className="px-6 py-4">
                    <div className="prose max-w-none">
                      {note.content && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Summary:</h4>
                          <p className="text-sm text-gray-600">{note.content}</p>
                        </div>
                      )}
                      
                      {note.observations && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Session Observations:</h4>
                          <p className="text-sm text-gray-600">{note.observations}</p>
                        </div>
                      )}
                
                {note.activities && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Activities Performed:</h4>
                    <p className="text-sm text-gray-600">{note.activities}</p>
                  </div>
                )}

                  {note.progress && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Progress Made:</h4>
                      <p className="text-sm text-gray-600">{note.progress}</p>
                    </div>
                  )}

                  {note.challenges && (
                  <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Challenges:</h4>
                      <p className="text-sm text-gray-600">{note.challenges}</p>
                  </div>
                )}

                  {note.goals && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Goals Addressed:</h4>
                      <p className="text-sm text-gray-600">{note.goals}</p>
                    </div>
                  )}

                  {note.nextSteps && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Next Steps:</h4>
                      <p className="text-sm text-gray-600">{note.nextSteps}</p>
                    </div>
                  )}

                  {(note.mood || note.engagement) && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Session Details:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {note.mood && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Mood:</span>
                            <p className="text-sm text-gray-600">{note.mood}</p>
                          </div>
                        )}
                        {note.engagement && (
                          <div>
                            <span className="text-xs font-medium text-gray-500">Engagement:</span>
                            <p className="text-sm text-gray-600">{note.engagement}</p>
                          </div>
                        )}
                      </div>
                  </div>
                )}
              </div>

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
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showCommentForm && selectedNote?.id === note.id ? 'Cancel' : 'Add Comment'}
                    </button>
                  </div>

                  {/* Comments List - Collapsible */}
                  {showComments[note.id] && note.comments && Array.isArray(note.comments) && note.comments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {note.comments.map((comment) => (
                        <div key={comment.id} className="flex items-start space-x-2 group">
                          <div className="flex-shrink-0">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="h-3 w-3 text-blue-600" />
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
                                  className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                  rows={2}
                                  autoFocus
                                />
                                <div className="flex items-center space-x-2 mt-1">
                                  <button
                                    type="submit"
                                    className="text-xs text-blue-600 hover:text-blue-800"
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
                          {comment.author === 'Patient' && (
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
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <form onSubmit={handleCommentSubmit}>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Write a comment..."
                            rows={2}
                            autoFocus
                          />
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleAttachmentUpload(note.id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                <Image className="h-3 w-3 inline mr-1" />
                                Photo
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttachmentUpload(note.id)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                <Video className="h-3 w-3 inline mr-1" />
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
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                disabled={addCommentMutation.isLoading || !comment.trim()}
                              >
                                <Send className="h-3 w-3 mr-1" />
                                {addCommentMutation.isLoading ? 'Sending...' : 'Post'}
                              </button>
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
            </div>
            )}
          </div>
        )) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
          <p className="text-sm text-gray-500">
            Your therapist will add session notes here after each appointment.
          </p>
        </div>
      )}
      </div>


      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Ask Questions</h4>
                <p className="text-xs text-gray-500">Comment on notes to ask questions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Image className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Share Progress</h4>
                <p className="text-xs text-gray-500">Upload photos/videos of home practice</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Track Sessions</h4>
                <p className="text-xs text-gray-500">Review your therapy journey</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyNotes;
