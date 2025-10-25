import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { 
  Target, 
  Calendar, 
  Award, 
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  User,
  BarChart3,
  Download,
  File,
  FolderOpen
} from 'lucide-react';
import { patientAPI } from '../../services/api';
import InitialsAvatar from '../../components/InitialsAvatar';
import TreatmentPlanModal from '../../components/TreatmentPlanModal';

const ProgressView = () => {
  const [expandedObjectives, setExpandedObjectives] = useState({});
  const [expandedPlans, setExpandedPlans] = useState(new Set());
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState(null);
  const [showTreatmentPlanModal, setShowTreatmentPlanModal] = useState(false);
  const queryClient = useQueryClient();

  // Clear any cached data when component mounts
  useEffect(() => {
    queryClient.invalidateQueries('patient-treatment-plan');
  }, [queryClient]);

  // Fetch treatment plan
  const { data: treatmentPlanData, isLoading, error } = useQuery(
    'patient-treatment-plan',
    () => patientAPI.getTreatmentPlan(),
    {
      onError: (error) => {
        console.error('Error fetching treatment plan:', error);
      },
      refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    }
  );

  // Fetch progress reports
  const { data: progressReportsData, isLoading: reportsLoading } = useQuery(
    'patient-progress-reports',
    () => patientAPI.getMyProgressReports(),
    {
      onSuccess: (response) => {
        // Patient progress reports loaded successfully
      },
      onError: (error) => {
        console.error('Error fetching progress reports:', error);
      },
    }
  );


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

  const handleTreatmentPlanClick = (treatmentPlan) => {
    setSelectedTreatmentPlan(treatmentPlan);
    setShowTreatmentPlanModal(true);
  };

  const handleCloseTreatmentPlanModal = () => {
    setShowTreatmentPlanModal(false);
    setSelectedTreatmentPlan(null);
  };

  const handleDownloadReport = async (reportId, fileName) => {
    try {
      const response = await patientAPI.downloadProgressReport(reportId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };


  const getProgressColor = (progress) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-yellow-600';
    if (progress >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (isCompleted) => {
    return (isCompleted === 1 || isCompleted === true) ? 'text-green-600' : 'text-gray-500';
  };

  const getStatusIcon = (isCompleted) => {
    return (isCompleted === 1 || isCompleted === true) ? (
      <CheckCircle size={20} className="text-green-600" />
    ) : (
      <Circle size={20} className="text-gray-400" />
    );
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Your Progress</h3>
          <p className="text-gray-600">Please wait while we fetch your treatment plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-red-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Progress</h3>
          <p className="text-gray-600 mb-6">
            There was an error loading your treatment plan: {error.message}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!treatmentPlanData?.data?.data || !Array.isArray(treatmentPlanData.data.data) || treatmentPlanData.data.data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No Treatment Plans</h3>
          <p className="text-gray-600 text-lg">
            Your therapist hasn't created any treatment plans for you yet. Please contact your therapist for more information.
          </p>
        </div>
      </div>
    );
  }

  // Ensure data is properly loaded before processing
  // The API now returns an array of treatment plans
  const treatmentPlans = treatmentPlanData?.data?.data || [];

  // Calculate overall statistics across all treatment plans
  const calculateOverallStats = () => {
    // Safety check - ensure we have valid data
    if (!treatmentPlans || !Array.isArray(treatmentPlans) || treatmentPlans.length === 0) {
      return {
        totalMainObjectives: 0,
        totalSpecificObjectives: 0,
        totalCompletedObjectives: 0,
        averageProgress: 0,
        activePlans: 0
      };
    }

    let totalMainObjectives = 0;
    let totalSpecificObjectives = 0;
    let totalCompletedObjectives = 0;
    let totalProgress = 0;
    let activePlans = 0;

    treatmentPlans.forEach((plan) => {
      if (plan.status === 'active') {
        activePlans++;
        totalProgress += parseFloat(plan.overallProgress) || 0;
      }
      
      if (plan.mainObjectives && Array.isArray(plan.mainObjectives)) {
        totalMainObjectives += plan.mainObjectives.length;
        plan.mainObjectives.forEach((mainObj) => {
          if (mainObj.specificObjectives && Array.isArray(mainObj.specificObjectives)) {
            totalSpecificObjectives += mainObj.specificObjectives.length;
            const completedCount = mainObj.specificObjectives.filter(so => so.isCompleted === 1 || so.isCompleted === true).length;
            totalCompletedObjectives += completedCount;
          }
        });
      }
    });

    const averageProgress = activePlans > 0 ? totalProgress / activePlans : 0;

    return {
      totalMainObjectives,
      totalSpecificObjectives,
      totalCompletedObjectives,
      averageProgress,
      activePlans
    };
  };

  const overallStats = calculateOverallStats();

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="p-3 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">My Progress</h1>
                  <p className="text-sm text-gray-600">Track your therapy progress and objectives</p>
                </div>
              </div>
              <div className="mt-6 lg:mt-0 lg:ml-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
                  <div className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${getProgressColor(overallStats.averageProgress)}`}>
                    {overallStats.averageProgress?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Overall Progress</div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Treatment Plans Overview */}
        <div className="mb-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-6">Your Treatment Plans</h2>
          <div className="space-y-6">
            {treatmentPlans.map((treatmentPlan, index) => (
              <div key={treatmentPlan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                  onClick={() => handleTreatmentPlanClick(treatmentPlan)}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{treatmentPlan.title}</h3>
                          <p className="text-blue-100 text-sm sm:text-base lg:text-lg">{treatmentPlan.description}</p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-xs sm:text-sm text-blue-100">
                            <span className="flex-shrink-0">Status: <span className="font-semibold capitalize">{treatmentPlan.status}</span></span>
                            <span className="flex-shrink-0">Created: {new Date(treatmentPlan.createdAt).toLocaleDateString()}</span>
                            {treatmentPlan.endDate && (
                              <span className="flex-shrink-0">End: {new Date(treatmentPlan.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 p-2">
                          <ChevronRight size={24} className="text-white" />
                        </div>
                      </div>
                    </div>

                    {/* Therapist Info */}
                    {(treatmentPlan.therapistFirstName && treatmentPlan.therapistLastName) && (
                      <div className="flex items-center space-x-3 mt-4 lg:mt-0 lg:ml-6">
                        <InitialsAvatar 
                          name={`${treatmentPlan.therapistFirstName} ${treatmentPlan.therapistLastName}`}
                          size="lg"
                          className="shadow-lg border-2 border-white"
                        />
                        <div className="text-right">
                          <div className="text-lg font-semibold text-white">
                            {treatmentPlan.therapistFirstName} {treatmentPlan.therapistLastName}
                          </div>
                          <div className="text-blue-100 text-sm">Your Therapist</div>
                        </div>
                      </div>
                    )}
        </div>
      </div>

                {/* Expanded content removed - now using modal */}
              </div>
            ))}
          </div>
        </div>

        {/* Overall Progress Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Overall Progress Visualization</h3>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
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
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - (overallStats.averageProgress || 0) / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${getProgressColor(overallStats.averageProgress)}`}>
                    {overallStats.averageProgress?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs font-medium text-gray-600">Complete</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overall Stats Summary */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-blue-600 mb-1">
                {overallStats.totalMainObjectives}
              </div>
              <div className="text-xs font-medium text-blue-800 leading-tight">Total Main Objectives</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-green-600 mb-1">
                {overallStats.totalSpecificObjectives}
              </div>
              <div className="text-xs font-medium text-green-800 leading-tight">Total Specific Objectives</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-emerald-600 mb-1">
                {overallStats.totalCompletedObjectives}
              </div>
              <div className="text-xs font-medium text-emerald-800 leading-tight">Completed Objectives</div>
            </div>
            <div className="text-center p-3 sm:p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="text-base sm:text-lg lg:text-xl font-bold text-purple-600 mb-1">
                {overallStats.activePlans}
              </div>
              <div className="text-xs font-medium text-purple-800 leading-tight">Active Plans</div>
        </div>
      </div>
        </div>

        {/* Progress Reports Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Reports</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              {reportsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading progress reports...</p>
                </div>
              ) : progressReportsData?.data?.data?.reports?.length > 0 ? (
                <div className="space-y-4">
                  {progressReportsData.data.data.reports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{report.title}</h4>
                          {report.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{report.description}</p>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1 truncate">
                              <File className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{report.originalFileName}</span>
                            </span>
                            <span className="flex-shrink-0">{(report.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="truncate">Uploaded by {report.therapistName}</span>
                            <span className="flex-shrink-0">{new Date(report.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleDownloadReport(report.id, report.originalFileName)}
                            className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                          >
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">Download</span>
                            <span className="sm:hidden">↓</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Reports</h3>
                  <p className="text-gray-600">Your therapist hasn't uploaded any progress reports yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>

    {/* Treatment Plan Modal */}
    <TreatmentPlanModal
      isOpen={showTreatmentPlanModal}
      onClose={handleCloseTreatmentPlanModal}
      treatmentPlan={selectedTreatmentPlan}
    />
    </>
  );
};

export default ProgressView;
