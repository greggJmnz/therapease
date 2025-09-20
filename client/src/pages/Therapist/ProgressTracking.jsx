import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { TrendingUp, Target, Calendar, Award, Eye, Plus, Edit, Trash2 } from 'lucide-react';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ProgressTracking = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [progressData, setProgressData] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: '',
    status: 'in-progress'
  });

  const categories = [
    'Fine Motor',
    'Gross Motor',
    'Sensory Processing',
    'Cognitive',
    'Social Skills',
    'Daily Living',
    'Communication',
    'Balance & Coordination'
  ];

  const statuses = [
    { value: 'not-started', label: 'Not Started', color: 'bg-gray-100 text-gray-800' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
    { value: 'achieved', label: 'Achieved', color: 'bg-green-100 text-green-800' },
    { value: 'needs-review', label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800' }
  ];

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

  useEffect(() => {
    // Transform API data to match component expectations (double nesting)
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

  // Fetch progress data for selected patient
  const { data: progressApiData, isLoading: progressLoading } = useQuery(
    ['patientProgress', selectedPatient?.id],
    () => {
      if (!selectedPatient) return null;
      return therapistAPI.getPatientProgressSummary(selectedPatient.id);
    },
    {
      enabled: !!selectedPatient,
      onSuccess: (data) => {
        if (data?.data) {
          setProgressData(data.data);
        }
      },
      onError: (error) => {
        console.error('Error fetching progress data:', error);
      }
    }
  );

  useEffect(() => {
    if (!selectedPatient) return;
    
    // Set mock milestones for now - this should be replaced with real API data
    setMilestones([
      {
        id: 1,
        title: 'Improved Pencil Grip',
        description: 'Successfully holding pencil with proper grip for 10 minutes',
        targetDate: '2024-02-01',
        category: 'Fine Motor',
        status: 'achieved',
        achievedDate: '2024-01-15'
      },
      {
        id: 2,
        title: 'Balanced Walking',
        description: 'Walking on balance beam without assistance',
        targetDate: '2024-02-15',
        category: 'Balance & Coordination',
        status: 'achieved',
        achievedDate: '2024-01-10'
      },
      {
        id: 3,
        title: 'Sensory Regulation',
        description: 'Using sensory tools independently for self-regulation',
        targetDate: '2024-03-01',
        category: 'Sensory Processing',
        status: 'in-progress'
      }
    ]);
  }, [selectedPatient]);

  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!milestoneForm.title || !milestoneForm.description || !milestoneForm.targetDate || !milestoneForm.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingMilestone) {
        // Update existing milestone
        const updatedMilestone = {
          ...editingMilestone,
          ...milestoneForm
        };
        
        setMilestones(milestones.map(m => m.id === editingMilestone.id ? updatedMilestone : m));
        toast.success('Milestone updated successfully!');
        setEditingMilestone(null);
      } else {
        // Create new milestone
        const newMilestone = {
          id: Date.now(),
          ...milestoneForm
        };
        
        setMilestones([...milestones, newMilestone]);
        toast.success('Milestone created successfully!');
      }
      
      setShowMilestoneForm(false);
      resetMilestoneForm();
    } catch (error) {
      toast.error('Failed to save milestone');
    }
  };

  const handleEditMilestone = (milestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description,
      targetDate: milestone.targetDate,
      category: milestone.category,
      status: milestone.status
    });
    setShowMilestoneForm(true);
  };

  const handleDeleteMilestone = async (milestoneId) => {
    try {
      setMilestones(milestones.filter(m => m.id !== milestoneId));
      toast.success('Milestone deleted successfully');
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const resetMilestoneForm = () => {
    setMilestoneForm({
      title: '',
      description: '',
      targetDate: '',
      category: '',
      status: 'in-progress'
    });
  };

  const getProgressPercentage = (current, target) => {
    return Math.round((current / target) * 100);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  // Loading state
  if (patientsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (patientsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Failed to load patients data</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="mt-2 text-sm text-gray-700">
            Monitor and track patient progress across different therapy areas.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowMilestoneForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </button>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Patient</h2>
        <div className="max-w-md">
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Choose a patient...</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} - Age: {patient.age} - {patient.diagnosis}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPatient && (
        <>
          {/* Progress Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Progress Overview</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(progressData).map(([area, data]) => (
                <div key={area} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 capitalize">
                      {area.replace(/([A-Z])/g, ' $1').trim()}
                    </h3>
                    {getTrendIcon(data.trend)}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-gray-900">{data.current}</span>
                    <span className="text-sm text-gray-500">/ {data.target}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${getProgressPercentage(data.current, data.target)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {getProgressPercentage(data.current, data.target)}% complete
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">Milestones</h2>
              <button
                onClick={() => setShowMilestoneForm(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{milestone.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statuses.find(s => s.value === milestone.status)?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {statuses.find(s => s.value === milestone.status)?.label || milestone.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{milestone.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Target className="h-4 w-4 mr-1" />
                          {milestone.category}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Target: {new Date(milestone.targetDate).toLocaleDateString()}
                        </div>
                        {milestone.achievedDate && (
                          <div className="flex items-center">
                            <Award className="h-4 w-4 mr-1" />
                            Achieved: {new Date(milestone.achievedDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditMilestone(milestone)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMilestone(milestone.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {milestones.length === 0 && (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No milestones</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new milestone.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}
                </h3>
                <button
                  onClick={() => {
                    setShowMilestoneForm(false);
                    setEditingMilestone(null);
                    resetMilestoneForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleMilestoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <input
                    type="text"
                    value={milestoneForm.title}
                    onChange={(e) => setMilestoneForm({...milestoneForm, title: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={milestoneForm.description}
                    onChange={(e) => setMilestoneForm({...milestoneForm, description: e.target.value})}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={milestoneForm.category}
                    onChange={(e) => setMilestoneForm({...milestoneForm, category: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Date</label>
                  <input
                    type="date"
                    value={milestoneForm.targetDate}
                    onChange={(e) => setMilestoneForm({...milestoneForm, targetDate: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({...milestoneForm, status: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMilestoneForm(false);
                      setEditingMilestone(null);
                      resetMilestoneForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    {editingMilestone ? 'Update' : 'Create'} Milestone
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracking;
