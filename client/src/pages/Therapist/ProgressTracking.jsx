import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  TrendingUp, 
  Plus, 
  FileText,
  BarChart3,
  User,
  CheckCircle,
  Circle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Edit,
  Save,
  X,
  Trash2,
  Target
} from 'lucide-react';
import { therapistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import InitialsAvatar from '../../components/InitialsAvatar';

const ProgressTracking = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [showCreateMainObjective, setShowCreateMainObjective] = useState(false);
  const [showCreateSpecificObjective, setShowCreateSpecificObjective] = useState(false);
  const [expandedObjectives, setExpandedObjectives] = useState({});
  const [expandedPlans, setExpandedPlans] = useState(new Set());
  const [editingMainObjective, setEditingMainObjective] = useState(null);
  const [editingSpecificObjective, setEditingSpecificObjective] = useState(null);
  const [editingTreatmentPlan, setEditingTreatmentPlan] = useState(null);
  
  // Form states
  const [planForm, setPlanForm] = useState({
    patientId: '',
    title: '',
    description: '',
    startDate: '',
    endDate: ''
  });
  
  const [mainObjectiveForm, setMainObjectiveForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium'
  });
  
  const [specificObjectiveForm, setSpecificObjectiveForm] = useState({
    title: '',
    description: '',
    targetDate: ''
  });
  
  // Edit form states
  const [editMainObjectiveForm, setEditMainObjectiveForm] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    status: 'ongoing'
  });
  
  const [editSpecificObjectiveForm, setEditSpecificObjectiveForm] = useState({
    title: '',
    description: '',
    targetDate: '',
    remarks: ''
  });
  
  const [editTreatmentPlanForm, setEditTreatmentPlanForm] = useState({
    title: '',
    description: '',
    status: 'active',
    startDate: '',
    endDate: ''
  });

  const queryClient = useQueryClient();

  // Fetch patients using useEffect
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user?.id) return;
      
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        const response = await therapistAPI.getPatients(user.id);
        if (response.data?.data?.patients) {
          setPatients(response.data.data.patients);
        }
      } catch (error) {
        setPatientsError(error.message);
      } finally {
        setPatientsLoading(false);
      }
    };

    fetchPatients();
  }, [user?.id]);

  // Fetch treatment plans
  const { data: treatmentPlansData, refetch: refetchPlans } = useQuery(
    ['treatment-plans', selectedPatient?.id],
    () => therapistAPI.getTreatmentPlans({ patientId: selectedPatient?.id }),
    {
      enabled: !!selectedPatient,
      onSuccess: (data) => {
        if (data?.data?.data && Array.isArray(data.data.data)) {
          setTreatmentPlansList(data.data.data);
          setSelectedPlan(data.data.data[0] || null);
        }
      },
      onError: (error) => {
        console.error('Treatment Plans API Error:', error);
      }
    }
  );

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [treatmentPlansList, setTreatmentPlansList] = useState([]);

  // Fetch selected treatment plan details
  const { data: planDetails } = useQuery(
    ['treatment-plan', selectedPlan?.id],
    () => therapistAPI.getTreatmentPlan(selectedPlan.id),
    {
      enabled: !!selectedPlan,
      onSuccess: (data) => {
        // Treatment plan details loaded successfully
      },
      onError: (error) => {
        console.error('Treatment Plan Details API Error:', error);
      }
    }
  );

  // Mutations
  const createPlanMutation = useMutation(therapistAPI.createTreatmentPlan, {
    onSuccess: () => {
      toast.success('Treatment plan created successfully!');
      setShowCreatePlan(false);
      resetPlanForm();
      refetchPlans();
      },
      onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create treatment plan');
    }
  });

  const createMainObjectiveMutation = useMutation(
    ({ treatmentPlanId, data }) => therapistAPI.createMainObjective(treatmentPlanId, data),
    {
      onSuccess: () => {
        toast.success('Main objective created successfully!');
        setShowCreateMainObjective(false);
        resetMainObjectiveForm();
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        refetchPlans();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create main objective');
      }
    }
  );

  const createSpecificObjectiveMutation = useMutation(
    ({ mainObjectiveId, data }) => therapistAPI.createSpecificObjective(mainObjectiveId, data),
    {
      onSuccess: () => {
        toast.success('Specific objective created successfully!');
        setShowCreateSpecificObjective(false);
        resetSpecificObjectiveForm();
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        refetchPlans();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create specific objective');
      }
    }
  );

  const updateSpecificObjectiveMutation = useMutation(
    ({ id, data }) => therapistAPI.updateSpecificObjective(id, data),
    {
      onSuccess: () => {
        toast.success('Objective updated successfully!');
        // Invalidate both treatment plan details and treatment plans list
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        // Also refetch the plans list to update progress percentages
        refetchPlans();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update objective');
        // Revert optimistic update on error
        if (selectedPlan) {
          refetchPlans();
        }
      }
    }
  );

  // Update main objective mutation
  const updateMainObjectiveMutation = useMutation(
    ({ id, data }) => therapistAPI.updateMainObjective(id, data),
    {
      onSuccess: () => {
        toast.success('Main objective updated successfully!');
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        refetchPlans();
        setEditingMainObjective(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update main objective');
      }
    }
  );

  // Update treatment plan mutation
  const updateTreatmentPlanMutation = useMutation(
    ({ id, data }) => therapistAPI.updateTreatmentPlan(id, data),
    {
      onSuccess: () => {
        toast.success('Treatment plan updated successfully!');
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        refetchPlans();
        setEditingTreatmentPlan(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update treatment plan');
      }
    }
  );

  // Delete treatment plan mutation
  const deleteTreatmentPlanMutation = useMutation(
    (id) => therapistAPI.deleteTreatmentPlan(id),
    {
      onSuccess: () => {
        toast.success('Treatment plan deleted successfully!');
        queryClient.invalidateQueries(['treatment-plans', selectedPatient?.id]);
        refetchPlans();
        setSelectedPlan(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete treatment plan');
      }
    }
  );

  // Delete main objective mutation
  const deleteMainObjectiveMutation = useMutation(
    (id) => therapistAPI.deleteMainObjective(id),
    {
      onSuccess: () => {
        toast.success('Main objective deleted successfully!');
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        refetchPlans();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete main objective');
      }
    }
  );

  // Delete specific objective mutation
  const deleteSpecificObjectiveMutation = useMutation(
    (id) => therapistAPI.deleteSpecificObjective(id),
    {
      onSuccess: () => {
        toast.success('Specific objective deleted successfully!');
        queryClient.invalidateQueries(['treatment-plan', selectedPlan?.id]);
        refetchPlans();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete specific objective');
      }
    }
  );

  // Handlers
  const handleCreatePlan = () => {
    if (!planForm.patientId || !planForm.title || !planForm.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    createPlanMutation.mutate(planForm);
  };

  const handleCreateMainObjective = () => {
    if (!mainObjectiveForm.title) {
      toast.error('Please enter a title for the main objective');
      return;
    }
    createMainObjectiveMutation.mutate({
      treatmentPlanId: selectedPlan.id,
      data: mainObjectiveForm
    });
  };

  const handleCreateSpecificObjective = (mainObjectiveId) => {
    if (!specificObjectiveForm.title) {
      toast.error('Please enter a title for the specific objective');
      return;
    }
    createSpecificObjectiveMutation.mutate({
      mainObjectiveId,
      data: specificObjectiveForm
    });
  };

  const handleToggleSpecificObjective = (objectiveId, isCompleted) => {
    try {
      // Use planDetails for optimistic update since it has the detailed mainObjectives data
      if (planDetails?.data?.data?.mainObjectives && Array.isArray(planDetails.data.data.mainObjectives)) {
        const updatedMainObjectives = planDetails.data.data.mainObjectives.map(mainObj => {
          // Check if specificObjectives exists and is an array
          if (!mainObj.specificObjectives || !Array.isArray(mainObj.specificObjectives)) {
            return mainObj;
          }
          
          const updatedSpecificObjectives = mainObj.specificObjectives.map(specificObj => 
            specificObj.id === objectiveId 
              ? { ...specificObj, isCompleted: !isCompleted }
              : specificObj
          );
          
          // Recalculate progress for this main objective
          const completedCount = updatedSpecificObjectives.filter(obj => obj.isCompleted).length;
          const totalCount = updatedSpecificObjectives.length;
          const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
          
          return {
            ...mainObj,
            specificObjectives: updatedSpecificObjectives,
            progress: progress
          };
        });
        
        // Recalculate overall progress
        const totalMainProgress = updatedMainObjectives.reduce((sum, obj) => sum + (obj.progress || 0), 0);
        const avgMainProgress = updatedMainObjectives.length > 0 ? totalMainProgress / updatedMainObjectives.length : 0;
        
        // Update the selectedPlan with new progress
        if (selectedPlan) {
          const updatedPlan = {
            ...selectedPlan,
            overallProgress: avgMainProgress
          };
          setSelectedPlan(updatedPlan);
          
          // Also update the treatment plans list
          setTreatmentPlansList(prev => 
            prev.map(plan => 
              plan.id === updatedPlan.id ? updatedPlan : plan
            )
          );
        }
        
        // Update the planDetails query cache with the new data
        queryClient.setQueryData(['treatment-plan', selectedPlan?.id], {
          ...planDetails,
          data: {
            ...planDetails.data,
            data: {
              ...planDetails.data.data,
              mainObjectives: updatedMainObjectives,
              overallProgress: avgMainProgress
            }
          }
        });
      }
    } catch (error) {
      console.error('Error in optimistic update:', error);
      // If optimistic update fails, just proceed with server update
    }
    
    updateSpecificObjectiveMutation.mutate({
      id: objectiveId,
      data: { isCompleted: !isCompleted }
    });
  };

  const handleUpdateSpecificObjective = (objectiveId, remarks) => {
    updateSpecificObjectiveMutation.mutate({
      id: objectiveId,
      data: { remarks }
    });
  };

  // Edit handlers
  const handleEditMainObjective = (mainObjective) => {
    setEditingMainObjective(mainObjective.id);
    setEditMainObjectiveForm({
      title: mainObjective.title || '',
      description: mainObjective.description || '',
      category: mainObjective.category || 'General',
      priority: mainObjective.priority || 'medium',
      status: mainObjective.status || 'ongoing'
    });
  };

  const handleSaveMainObjective = () => {
    if (!editMainObjectiveForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    updateMainObjectiveMutation.mutate({
      id: editingMainObjective,
      data: editMainObjectiveForm
    });
  };

  const handleCancelEditMainObjective = () => {
    setEditingMainObjective(null);
    setEditMainObjectiveForm({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      status: 'ongoing'
    });
  };

  const handleEditSpecificObjective = (specificObjective) => {
    setEditingSpecificObjective(specificObjective.id);
    
    // Format date for HTML date input (YYYY-MM-DD)
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
    
    setEditSpecificObjectiveForm({
      title: specificObjective.title || '',
      description: specificObjective.description || '',
      targetDate: formatDateForInput(specificObjective.targetDate),
      remarks: specificObjective.remarks || ''
    });
  };

  const handleSaveSpecificObjective = () => {
    if (!editSpecificObjectiveForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    updateSpecificObjectiveMutation.mutate({
      id: editingSpecificObjective,
      data: editSpecificObjectiveForm
    });
    setEditingSpecificObjective(null);
  };

  const handleCancelEditSpecificObjective = () => {
    setEditingSpecificObjective(null);
    setEditSpecificObjectiveForm({
      title: '',
      description: '',
      targetDate: '',
      remarks: ''
    });
  };

  // Treatment plan edit handlers
  const handleEditTreatmentPlan = (treatmentPlan) => {
    setEditingTreatmentPlan(treatmentPlan.id);
    
    // Format dates for HTML date input (YYYY-MM-DD)
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
    
    setEditTreatmentPlanForm({
      title: treatmentPlan.title || '',
      description: treatmentPlan.description || '',
      status: treatmentPlan.status || 'active',
      startDate: formatDateForInput(treatmentPlan.startDate),
      endDate: formatDateForInput(treatmentPlan.endDate)
    });
  };

  const handleSaveTreatmentPlan = () => {
    if (!editTreatmentPlanForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    updateTreatmentPlanMutation.mutate({
      id: editingTreatmentPlan,
      data: editTreatmentPlanForm
    });
  };

  const handleCancelEditTreatmentPlan = () => {
    setEditingTreatmentPlan(null);
    setEditTreatmentPlanForm({
      title: '',
      description: '',
      status: 'active',
      startDate: '',
      endDate: ''
    });
  };

  const handleDeleteTreatmentPlan = (treatmentPlanId) => {
    if (window.confirm('Are you sure you want to delete this treatment plan? This action cannot be undone and will also delete all associated objectives.')) {
      deleteTreatmentPlanMutation.mutate(treatmentPlanId);
    }
  };

  const handleDeleteMainObjective = (mainObjectiveId) => {
    if (window.confirm('Are you sure you want to delete this main objective? This action cannot be undone and will also delete all associated specific objectives.')) {
      deleteMainObjectiveMutation.mutate(mainObjectiveId);
    }
  };

  const handleDeleteSpecificObjective = (specificObjectiveId) => {
    if (window.confirm('Are you sure you want to delete this specific objective? This action cannot be undone.')) {
      deleteSpecificObjectiveMutation.mutate(specificObjectiveId);
    }
  };

  const toggleObjectiveExpansion = (mainObjectiveId) => {
    setExpandedObjectives(prev => ({
      ...prev,
      [mainObjectiveId]: !prev[mainObjectiveId]
    }));
  };

  const togglePlanExpansion = (planId) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  // Reset functions
  const resetPlanForm = useCallback(() => {
    setPlanForm({
      patientId: selectedPatient?.id || '',
      title: '',
      description: '',
      startDate: '',
      endDate: ''
    });
  }, [selectedPatient?.id]);

  const resetMainObjectiveForm = () => {
    setMainObjectiveForm({
      title: '',
      description: '',
      category: '',
      priority: 'medium'
    });
  };

  const resetSpecificObjectiveForm = () => {
    setSpecificObjectiveForm({
      title: '',
      description: '',
      targetDate: ''
    });
  };

  // Helper functions
  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-yellow-600';
    if (progress >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const priorities = {
    low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
    medium: { color: 'bg-blue-100 text-blue-800', label: 'Medium' },
    high: { color: 'bg-red-100 text-red-800', label: 'High' }
  };

  useEffect(() => {
    if (selectedPatient) {
      resetPlanForm();
    }
  }, [selectedPatient, resetPlanForm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
          <p className="text-gray-600">Monitor and manage patient treatment plans and progress</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreatePlan(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>New Treatment Plan</span>
          </button>
        </div>
      </div>

      {/* Patient Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Select Patient</h2>
          <select
            value={selectedPatient?.id || ''}
            onChange={(e) => {
            const patient = patients.find(p => p.id === parseInt(e.target.value));
            setSelectedPatient(patient);
            setActiveTab('overview');
          }}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Choose a patient...</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
              {patient.firstName} {patient.lastName}
              </option>
            ))}
          </select>
      </div>

      {selectedPatient && (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'treatment-plans', name: 'Treatment Plans', icon: FileText },
                { id: 'charts', name: 'Progress Charts', icon: TrendingUp }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon size={20} />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
                    </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Patient Info */}
              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-4">
                <InitialsAvatar 
                  name={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
                  size="xl"
                  className="shadow-md"
                />
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </h2>
                  <p className="text-gray-600">{selectedPatient.email}</p>
                  <p className="text-sm text-gray-500">
                    Patient since {new Date(selectedPatient.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
          </div>

              {/* Treatment Plans Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Plans</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {treatmentPlansList?.length || 0}
                    </p>
                  </div>
                    <FileText className="h-8 w-8 text-blue-600" />
              </div>
              </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                          <div>
                      <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                      <p className={`text-2xl font-bold ${getProgressColor((() => {
                        // Calculate overall progress as average of all treatment plans for this patient
                        if (!treatmentPlansList || !Array.isArray(treatmentPlansList) || treatmentPlansList.length === 0) return 0;
                        const totalProgress = treatmentPlansList.reduce((sum, plan) => sum + parseFloat(plan.overallProgress || 0), 0);
                        return totalProgress / treatmentPlansList.length;
                      })())}`}>
                        {(() => {
                          // Calculate overall progress as average of all treatment plans for this patient
                          if (!treatmentPlansList || !Array.isArray(treatmentPlansList) || treatmentPlansList.length === 0) return '0.0';
                          const totalProgress = treatmentPlansList.reduce((sum, plan) => sum + parseFloat(plan.overallProgress || 0), 0);
                          return (totalProgress / treatmentPlansList.length).toFixed(1);
                        })()}%
                      </p>
                          </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
          </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                          <div>
                      <p className="text-sm font-medium text-gray-600">Completed Objectives</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {(() => {
                          // Calculate total completed objectives from planDetails if available, otherwise from treatmentPlansList
                          if (planDetails?.data?.data?.mainObjectives) {
                            // Use detailed plan data
                            const mainObjectives = planDetails.data.data.mainObjectives;
                            const totalCompleted = mainObjectives.reduce((sum, obj) => {
                              const completed = obj.specificObjectives?.filter(so => so.isCompleted === 1 || so.isCompleted === true).length || 0;
                              return sum + completed;
                            }, 0);
                            const totalObjectives = mainObjectives.reduce((sum, obj) => {
                              const total = obj.specificObjectives?.length || 0;
                              return sum + total;
                            }, 0);
                            return `${totalCompleted} / ${totalObjectives}`;
                          } else if (treatmentPlansList && Array.isArray(treatmentPlansList) && treatmentPlansList.length > 0) {
                            // Fallback to basic plan data
                            const totalCompleted = treatmentPlansList.reduce((sum, plan) => {
                              const completed = plan.mainObjectives?.reduce((objSum, obj) => {
                                return objSum + (obj.specificObjectives?.filter(so => so.isCompleted === 1 || so.isCompleted === true).length || 0);
                              }, 0) || 0;
                              return sum + completed;
                            }, 0);
                            const totalObjectives = treatmentPlansList.reduce((sum, plan) => {
                              const total = plan.mainObjectives?.reduce((objSum, obj) => {
                                return objSum + (obj.specificObjectives?.length || 0);
                              }, 0) || 0;
                              return sum + total;
                            }, 0);
                            return `${totalCompleted} / ${totalObjectives}`;
                          }
                          return '0 / 0';
                        })()}
                      </p>
                          </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                </div>
              </div>
            </div>
          )}


          {activeTab === 'treatment-plans' && (
            <div className="space-y-6">
              {/* Treatment Plans List */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Treatment Plans</h3>
              <button
                      onClick={() => setShowCreatePlan(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                      <Plus size={20} />
                      <span>New Plan</span>
              </button>
            </div>
              </div>

                <div className="divide-y divide-gray-200">
                  {Array.isArray(treatmentPlansList) && treatmentPlansList.length > 0 ? (
                    treatmentPlansList.map((plan) => (
                      <div key={plan.id} className="p-6 hover:bg-gray-50">
                        {editingTreatmentPlan === plan.id ? (
              <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                  type="text"
                                  value={editTreatmentPlanForm.title}
                                  onChange={(e) => setEditTreatmentPlanForm(prev => ({ ...prev, title: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Treatment plan title"
                                />
                        </div>
                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                  value={editTreatmentPlanForm.status}
                                  onChange={(e) => setEditTreatmentPlanForm(prev => ({ ...prev, status: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="active">Active</option>
                                  <option value="archived">Archived</option>
                                  <option value="completed">Completed</option>
                                </select>
                          </div>
                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                  type="date"
                                  value={editTreatmentPlanForm.startDate}
                                  onChange={(e) => setEditTreatmentPlanForm(prev => ({ ...prev, startDate: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                          </div>
                          <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Optional)</label>
                                <input
                                  type="date"
                                  value={editTreatmentPlanForm.endDate}
                                  onChange={(e) => setEditTreatmentPlanForm(prev => ({ ...prev, endDate: e.target.value }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                          </div>
                        </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                              <textarea
                                value={editTreatmentPlanForm.description}
                                onChange={(e) => setEditTreatmentPlanForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Treatment plan description"
                                rows={3}
                              />
                          </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSaveTreatmentPlan}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1"
                              >
                                <Save size={16} />
                                <span>Save</span>
                              </button>
                              <button
                                onClick={handleCancelEditTreatmentPlan}
                                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-1"
                              >
                                <X size={16} />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-lg font-semibold text-gray-900">{plan.title}</h4>
                              <p className="text-gray-600 mt-1">{plan.description}</p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>Status: <span className="font-medium">{plan.status}</span></span>
                                <span>Start: {new Date(plan.startDate).toLocaleDateString()}</span>
                                {plan.endDate && (
                                  <span>End: {new Date(plan.endDate).toLocaleDateString()}</span>
                          )}
                        </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${getProgressColor(parseFloat(plan.overallProgress || 0))}`}>
                                  {parseFloat(plan.overallProgress || 0).toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-500">Progress</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                                  onClick={() => handleEditTreatmentPlan(plan)}
                                  className="p-2 hover:bg-gray-100 rounded-lg"
                                  title="Edit treatment plan"
                        >
                                  <Edit size={16} className="text-gray-500" />
                        </button>
                        <button
                                  onClick={() => handleDeleteTreatmentPlan(plan.id)}
                                  className="p-2 hover:bg-red-100 rounded-lg"
                                  title="Delete treatment plan"
                                >
                                  <Trash2 size={16} className="text-red-500" />
                                </button>
                                <button
                                  onClick={() => setSelectedPlan(plan)}
                                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                  View Details
                        </button>
                      </div>
                    </div>
                  </div>
                        )}
              </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No treatment plans found for this patient.</p>
                      <p className="text-sm">Create a new treatment plan to get started.</p>
              </div>
            )}
                </div>
          </div>

              {/* Selected Plan Details */}
              {selectedPlan && planDetails && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">{selectedPlan.title}</h3>
                      <div className="flex items-center space-x-4">
              <button
                          onClick={() => setShowCreateMainObjective(true)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
              >
                          <Plus size={20} />
                          <span>Add Main Objective</span>
              </button>
                      </div>
                    </div>
            </div>

                  <div className="p-6">
                    {Array.isArray(planDetails?.data?.data?.mainObjectives) && planDetails.data.data.mainObjectives.map((mainObj) => (
                      <div key={mainObj.id} className="mb-6 border border-gray-200 rounded-lg">
                        <div className="p-4 bg-gray-50">
                          <div className="flex justify-between items-start">
                    <div className="flex-1">
                              {editingMainObjective === mainObj.id ? (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    value={editMainObjectiveForm.title}
                                    onChange={(e) => setEditMainObjectiveForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Objective title"
                                  />
                                  <textarea
                                    value={editMainObjectiveForm.description}
                                    onChange={(e) => setEditMainObjectiveForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Objective description"
                                    rows={2}
                                  />
                                  <div className="flex space-x-2">
                                    <select
                                      value={editMainObjectiveForm.category}
                                      onChange={(e) => setEditMainObjectiveForm(prev => ({ ...prev, category: e.target.value }))}
                                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="General">General</option>
                                      <option value="Fine Motor Skills">Fine Motor Skills</option>
                                      <option value="Gross Motor Skills">Gross Motor Skills</option>
                                      <option value="Sensory Processing">Sensory Processing</option>
                                      <option value="Cognitive">Cognitive</option>
                                      <option value="Communication">Communication</option>
                                    </select>
                                    <select
                                      value={editMainObjectiveForm.priority}
                                      onChange={(e) => setEditMainObjectiveForm(prev => ({ ...prev, priority: e.target.value }))}
                                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="low">Low Priority</option>
                                      <option value="medium">Medium Priority</option>
                                      <option value="high">High Priority</option>
                                    </select>
                                    <select
                                      value={editMainObjectiveForm.status}
                                      onChange={(e) => setEditMainObjectiveForm(prev => ({ ...prev, status: e.target.value }))}
                                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                      <option value="ongoing">Ongoing</option>
                                      <option value="completed">Completed</option>
                                      <option value="paused">Paused</option>
                                    </select>
                      </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={handleSaveMainObjective}
                                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1"
                                    >
                                      <Save size={16} />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={handleCancelEditMainObjective}
                                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-1"
                                    >
                                      <X size={16} />
                                      <span>Cancel</span>
                                    </button>
                        </div>
                        </div>
                              ) : (
                                <>
                                  <h4 className="text-lg font-semibold text-gray-900">{mainObj.title}</h4>
                                  <p className="text-gray-600 mt-1">{mainObj.description}</p>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorities[mainObj.priority].color}`}>
                                      {priorities[mainObj.priority].label} Priority
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {mainObj.completedSpecificObjectives} / {mainObj.totalSpecificObjectives} completed
                                    </span>
                                    <span className={`text-sm font-medium ${getProgressColor(parseFloat(mainObj.progress || 0))}`}>
                                      {parseFloat(mainObj.progress || 0).toFixed(1)}% complete
                                    </span>
                          </div>
                                </>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                              {editingMainObjective !== mainObj.id && (
                                <>
                                  <button
                                    onClick={() => handleEditMainObjective(mainObj)}
                                    className="p-2 hover:bg-gray-200 rounded-lg"
                                    title="Edit objective"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMainObjective(mainObj.id)}
                                    className="p-2 hover:bg-red-200 rounded-lg"
                                    title="Delete objective"
                                  >
                                    <Trash2 size={16} className="text-red-600" />
                                  </button>
                                </>
                              )}
                      <button
                                onClick={() => toggleObjectiveExpansion(mainObj.id)}
                                className="p-2 hover:bg-gray-200 rounded-lg"
                      >
                                {expandedObjectives[mainObj.id] ? (
                                  <ChevronDown size={20} />
                                ) : (
                                  <ChevronRight size={20} />
                                )}
                      </button>
                    </div>
                  </div>
            </div>

                        {expandedObjectives[mainObj.id] && (
                          <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                              <h5 className="font-medium text-gray-900">Specific Objectives</h5>
                <button
                  onClick={() => {
                                  setSpecificObjectiveForm({ ...specificObjectiveForm, mainObjectiveId: mainObj.id });
                                  setShowCreateSpecificObjective(true);
                  }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 flex items-center space-x-1 text-sm"
                >
                                <Plus size={16} />
                                <span>Add Objective</span>
                </button>
              </div>
              
                            <div className="space-y-3">
                              {Array.isArray(mainObj.specificObjectives) && mainObj.specificObjectives.map((specificObj) => (
                                <div key={specificObj.id} className="p-3 border border-gray-200 rounded-lg">
                                  {editingSpecificObjective === specificObj.id ? (
                                    <div className="space-y-3">
                  <input
                    type="text"
                                        value={editSpecificObjectiveForm.title}
                                        onChange={(e) => setEditSpecificObjectiveForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Objective title"
                                      />
                  <textarea
                                        value={editSpecificObjectiveForm.description}
                                        onChange={(e) => setEditSpecificObjectiveForm(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Objective description"
                                        rows={2}
                                      />
                  <input
                    type="date"
                                        value={editSpecificObjectiveForm.targetDate}
                                        onChange={(e) => setEditSpecificObjectiveForm(prev => ({ ...prev, targetDate: e.target.value }))}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      />
                                      <textarea
                                        value={editSpecificObjectiveForm.remarks}
                                        onChange={(e) => setEditSpecificObjectiveForm(prev => ({ ...prev, remarks: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Therapist remarks"
                                        rows={2}
                                      />
                                      <div className="flex space-x-2">
                  <button
                                          onClick={handleSaveSpecificObjective}
                                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1"
                                        >
                                          <Save size={16} />
                                          <span>Save</span>
                  </button>
                  <button
                                          onClick={handleCancelEditSpecificObjective}
                                          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center space-x-1"
                  >
                                          <X size={16} />
                                          <span>Cancel</span>
                  </button>
                </div>
            </div>
                                  ) : (
                                    <div className="flex items-center space-x-3">
                                      <button
                                        onClick={() => handleToggleSpecificObjective(specificObj.id, specificObj.isCompleted)}
                                        className="flex-shrink-0"
                                      >
                                        {specificObj.isCompleted ? (
                                          <CheckCircle size={20} className="text-green-600" />
                                        ) : (
                                          <Circle size={20} className="text-gray-400" />
                                        )}
                                      </button>
                                      <div className="flex-1">
                                        <h6 className="font-medium text-gray-900">{specificObj.title}</h6>
                                        <p className="text-sm text-gray-600">{specificObj.description}</p>
                                        {specificObj.targetDate && (
                                          <div className="flex items-center space-x-1 mt-1 text-xs text-gray-500">
                                            <Clock size={12} />
                                            <span>Target: {new Date(specificObj.targetDate).toLocaleDateString()}</span>
          </div>
                                        )}
                                        {specificObj.remarks && (
                                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                                            <strong>Therapist Notes:</strong> {specificObj.remarks}
        </div>
      )}
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <button
                                          onClick={() => handleEditSpecificObjective(specificObj)}
                                          className="p-2 hover:bg-gray-100 rounded-lg"
                                          title="Edit objective"
                                        >
                                          <Edit size={16} className="text-gray-500" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteSpecificObjective(specificObj.id)}
                                          className="p-2 hover:bg-red-100 rounded-lg"
                                          title="Delete objective"
                                        >
                                          <Trash2 size={16} className="text-red-500" />
                                        </button>
                <button
                  onClick={() => {
                                            const newRemarks = prompt('Enter remarks:', specificObj.remarks || '');
                                            if (newRemarks !== null) {
                                              handleUpdateSpecificObjective(specificObj.id, newRemarks);
                                            }
                                          }}
                                          className="p-2 hover:bg-gray-100 rounded-lg"
                                          title="Add remarks"
                                        >
                                          <MessageSquare size={16} className="text-gray-500" />
                </button>
              </div>
                                    </div>
                                  )}
                                </div>
              ))}
            </div>
              </div>
            )}
          </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              {!selectedPlan ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <BarChart3 size={64} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Treatment Plan Selected</h3>
                  <p className="text-gray-600 mb-4">Please select a treatment plan to view progress charts.</p>
                  <p className="text-sm text-gray-500">Go to the "Treatment Plans" tab to select a plan.</p>
                </div>
              ) : (
                <>
                  {/* Progress Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overall Progress Ring Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#3b82f6"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - (selectedPlan?.overallProgress || 0) / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className={`text-3xl font-bold ${getProgressColor(parseFloat(selectedPlan?.overallProgress || 0))}`}>
                            {parseFloat(selectedPlan?.overallProgress || 0).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-500">Complete</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objectives Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Objectives Breakdown</h3>
                  <div className="space-y-4">
                    {(() => {
                      // Calculate objectives from planDetails data
                      const mainObjectives = planDetails?.data?.data?.mainObjectives || [];
                      const totalMainObjectives = mainObjectives.length;
                      
                      // Calculate completed main objectives based on progress (100% = completed)
                      const completedMainObjectives = mainObjectives.filter(obj => 
                        parseFloat(obj.progress || 0) >= 100
                      ).length;
                      
                      const totalSpecificObjectives = mainObjectives.reduce((sum, obj) => 
                        sum + (obj.specificObjectives?.length || 0), 0
                      );
                      const completedSpecificObjectives = mainObjectives.reduce((sum, obj) => 
                        sum + (obj.specificObjectives?.filter(spec => spec.isCompleted).length || 0), 0
                      );

                      // Calculate average progress for main objectives
                      const avgMainProgress = totalMainObjectives > 0 
                        ? mainObjectives.reduce((sum, obj) => sum + parseFloat(obj.progress || 0), 0) / totalMainObjectives
                        : 0;

                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Main Objectives</span>
                            <span className="text-sm text-gray-500">
                              {completedMainObjectives} / {totalMainObjectives} completed
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${avgMainProgress}%`
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            {avgMainProgress.toFixed(1)}% average progress
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Specific Objectives</span>
                            <span className="text-sm text-gray-500">
                              {completedSpecificObjectives} / {totalSpecificObjectives} completed
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${totalSpecificObjectives > 0 
                                  ? (completedSpecificObjectives / totalSpecificObjectives) * 100 
                                  : 0}%`
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 text-center">
                            {totalSpecificObjectives > 0 
                              ? ((completedSpecificObjectives / totalSpecificObjectives) * 100).toFixed(1)
                              : 0}% completion rate
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Additional Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Main Objectives Progress by Category */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Progress by Category</h3>
                  <div className="space-y-3">
                    {(() => {
                      // Use planDetails for detailed main objectives data if available, otherwise show message
                      const mainObjectives = planDetails?.data?.data?.mainObjectives || [];
                      
                      if (mainObjectives.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="text-gray-400 mb-2">
                              <BarChart3 size={48} className="mx-auto" />
                            </div>
                            <p className="text-gray-500">No objectives data available</p>
                            <p className="text-sm text-gray-400">Select a treatment plan to view category progress</p>
                          </div>
                        );
                      }
                      
                      const categories = {};
                      
                      mainObjectives.forEach(obj => {
                        const category = obj.category || 'General';
                        if (!categories[category]) {
                          categories[category] = { total: 0, completed: 0, totalProgress: 0 };
                        }
                        categories[category].total++;
                        if (parseFloat(obj.progress || 0) >= 100) {
                          categories[category].completed++;
                        }
                        categories[category].totalProgress += parseFloat(obj.progress || 0);
                      });

                      return Object.entries(categories).map(([category, data]) => {
                        const avgProgress = data.total > 0 ? data.totalProgress / data.total : 0;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">{category}</span>
                              <span className="text-sm text-gray-500">
                                {data.completed} / {data.total}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${avgProgress}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-500 text-center">
                              {avgProgress.toFixed(1)}% average progress
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Progress Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Start Date</span>
                      <span className="text-sm font-medium">
                        {selectedPlan?.startDate ? new Date(selectedPlan.startDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">End Date</span>
                      <span className="text-sm font-medium">
                        {selectedPlan?.endDate ? new Date(selectedPlan.endDate).toLocaleDateString() : 'Ongoing'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Days Elapsed</span>
                      <span className="text-sm font-medium">
                        {selectedPlan?.startDate ? 
                          Math.ceil((new Date() - new Date(selectedPlan.startDate)) / (1000 * 60 * 60 * 24)) : 0} days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: selectedPlan?.startDate && selectedPlan?.endDate ? 
                            `${Math.min(100, Math.max(0, 
                              ((new Date() - new Date(selectedPlan.startDate)) / 
                              (new Date(selectedPlan.endDate) - new Date(selectedPlan.startDate))) * 100
                            ))}%` : '0%'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Treatment Plan Modal */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Treatment Plan</h3>
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                  <select
                  value={planForm.patientId}
                  onChange={(e) => setPlanForm({ ...planForm, patientId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </option>
                    ))}
                  </select>
                </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                    type="text"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter treatment plan title"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter treatment plan description"
                  />
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                    <input
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                    type="date"
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
                  <button
                onClick={() => setShowCreatePlan(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                onClick={handleCreatePlan}
                disabled={createPlanMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                {createPlanMutation.isLoading ? 'Creating...' : 'Create Plan'}
                  </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Main Objective Modal */}
      {showCreateMainObjective && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Main Objective</h3>
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                  type="text"
                  value={mainObjectiveForm.title}
                  onChange={(e) => setMainObjectiveForm({ ...mainObjectiveForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter main objective title"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                  value={mainObjectiveForm.description}
                  onChange={(e) => setMainObjectiveForm({ ...mainObjectiveForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter main objective description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <input
                    type="text"
                    value={mainObjectiveForm.category}
                    onChange={(e) => setMainObjectiveForm({ ...mainObjectiveForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Fine Motor Skills"
                    />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={mainObjectiveForm.priority}
                    onChange={(e) => setMainObjectiveForm({ ...mainObjectiveForm, priority: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateMainObjective(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMainObjective}
                disabled={createMainObjectiveMutation.isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {createMainObjectiveMutation.isLoading ? 'Creating...' : 'Create Objective'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Specific Objective Modal */}
      {showCreateSpecificObjective && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Specific Objective</h3>
            <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={specificObjectiveForm.title}
                  onChange={(e) => setSpecificObjectiveForm({ ...specificObjectiveForm, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter specific objective title"
                  />
                </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={specificObjectiveForm.description}
                  onChange={(e) => setSpecificObjectiveForm({ ...specificObjectiveForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter specific objective description"
                    />
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                  value={specificObjectiveForm.targetDate}
                  onChange={(e) => setSpecificObjectiveForm({ ...specificObjectiveForm, targetDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
            <div className="flex justify-end space-x-3 mt-6">
                  <button
                onClick={() => setShowCreateSpecificObjective(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                onClick={() => handleCreateSpecificObjective(specificObjectiveForm.mainObjectiveId)}
                disabled={createSpecificObjectiveMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                {createSpecificObjectiveMutation.isLoading ? 'Creating...' : 'Create Objective'}
                  </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTracking;
