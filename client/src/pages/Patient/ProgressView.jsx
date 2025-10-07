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

const ProgressView = () => {
  const [expandedObjectives, setExpandedObjectives] = useState({});
  const [expandedPlans, setExpandedPlans] = useState(new Set());
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

  // Download progress report handler
  const handleDownloadReport = async (reportId, fileName) => {
    try {
      const response = await patientAPI.downloadProgressReport(reportId);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    }
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
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Progress</h1>
                <p className="text-gray-600 text-lg">Track your therapy progress and objectives</p>
              </div>
              <div className="mt-6 lg:mt-0 lg:ml-8">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 text-center">
                  <div className={`text-4xl font-bold mb-1 ${getProgressColor(overallStats.averageProgress)}`}>
                    {overallStats.averageProgress?.toFixed(1) || 0}%
                  </div>
                  <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">Overall Progress</div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Treatment Plans Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Treatment Plans</h2>
          <div className="space-y-6">
            {treatmentPlans.map((treatmentPlan, index) => (
              <div key={treatmentPlan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{treatmentPlan.title}</h3>
                          <p className="text-blue-100 text-lg">{treatmentPlan.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-blue-100">
                            <span>Status: <span className="font-semibold capitalize">{treatmentPlan.status}</span></span>
                            <span>Created: {new Date(treatmentPlan.createdAt).toLocaleDateString()}</span>
                            {treatmentPlan.endDate && (
                              <span>End: {new Date(treatmentPlan.endDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => togglePlanExpansion(treatmentPlan.id)}
                          className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
                          title={expandedPlans.has(treatmentPlan.id) ? "Hide details" : "Show details"}
                        >
                          {expandedPlans.has(treatmentPlan.id) ? (
                            <ChevronUp size={24} className="text-white" />
                          ) : (
                            <ChevronDown size={24} className="text-white" />
                          )}
                        </button>
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

                {expandedPlans.has(treatmentPlan.id) && (
                  <div className="p-6 bg-gray-50 border-t border-gray-200">
                    {/* Plan Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Created</div>
                          <div className="text-sm text-gray-600">{new Date(treatmentPlan.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                        <Award className="w-5 h-5 text-green-600" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Status</div>
                          <div className="text-sm text-gray-600 capitalize">{treatmentPlan.status}</div>
                        </div>
                      </div>
                      {treatmentPlan.endDate && (
                        <div className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm">
                          <Clock className="w-5 h-5 text-purple-600" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">Target End</div>
                            <div className="text-sm text-gray-600">{new Date(treatmentPlan.endDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Plan Progress</span>
                        <span className="text-sm font-bold text-gray-900">{(parseFloat(treatmentPlan.overallProgress) || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${parseFloat(treatmentPlan.overallProgress) || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Progress Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <div className="text-3xl font-bold text-blue-600 mb-1">
                          {treatmentPlan.mainObjectives?.length || 0}
                        </div>
                        <div className="text-sm font-medium text-blue-800">Main Objectives</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {treatmentPlan.mainObjectives?.reduce((total, obj) => total + (obj.specificObjectives?.length || 0), 0) || 0}
                        </div>
                        <div className="text-sm font-medium text-green-800">Specific Objectives</div>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 rounded-xl">
                        <div className="text-3xl font-bold text-emerald-600 mb-1">
                          {treatmentPlan.mainObjectives?.reduce((total, obj) => 
                            total + (obj.specificObjectives?.filter(so => so.isCompleted).length || 0), 0) || 0}
                        </div>
                        <div className="text-sm font-medium text-emerald-800">Completed</div>
                      </div>
                    </div>

                    {/* Objectives Section */}
                    {treatmentPlan.mainObjectives && treatmentPlan.mainObjectives.length > 0 && (
                      <div className="mt-8">
                        <div className="flex items-center space-x-3 mb-6">
                          <Target className="w-6 h-6 text-blue-600" />
                          <h4 className="text-xl font-bold text-gray-900">Objectives</h4>
                        </div>
                        <div className="space-y-4">
                          {treatmentPlan.mainObjectives.map((mainObj) => (
                            <div key={mainObj.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-2">
                                      <h5 className="text-lg font-bold text-gray-900">{mainObj.title}</h5>
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                                        {mainObj.category}
                                      </span>
                                    </div>
                                    <p className="text-gray-600 text-base mb-3">{mainObj.description}</p>
                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        <span className="text-gray-600">
                                          {mainObj.specificObjectives?.filter(so => so.isCompleted === 1 || so.isCompleted === true).length || 0} / {mainObj.specificObjectives?.length || 0} completed
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className={`font-semibold ${getProgressColor(parseFloat(mainObj.progress) || 0)}`}>
                                          {(parseFloat(mainObj.progress) || 0).toFixed(1)}% complete
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleObjectiveExpansion(mainObj.id)}
                                    className="ml-4 p-3 hover:bg-white/50 rounded-xl transition-colors duration-200"
                                  >
                                    {expandedObjectives[mainObj.id] ? (
                                      <ChevronDown size={24} className="text-gray-600" />
                                    ) : (
                                      <ChevronRight size={24} className="text-gray-600" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {expandedObjectives[mainObj.id] && (
                                <div className="p-6 bg-gray-50">
                                  <div className="flex items-center space-x-2 mb-4">
                                    <h6 className="text-lg font-semibold text-gray-900">Specific Objectives</h6>
                                    <div className="flex-1 h-px bg-gray-300"></div>
                                  </div>
                                  <div className="space-y-4">
                                    {mainObj.specificObjectives?.map((specificObj) => (
                                      <div key={specificObj.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow duration-200">
                                        <div className="flex items-start space-x-4">
                                          <div className="flex-shrink-0 mt-1">
                                            {getStatusIcon(specificObj.isCompleted)}
                                          </div>
                                          <div className="flex-1">
                                            <h7 className="font-semibold text-gray-900 text-lg mb-2">{specificObj.title}</h7>
                                            <p className="text-gray-600 mb-3">{specificObj.description}</p>
                                            
                                            {specificObj.targetDate && (
                                              <div className="flex items-center space-x-2 mb-3 text-sm text-gray-500">
                                                <Clock size={16} />
                                                <span>Target: {new Date(specificObj.targetDate).toLocaleDateString()}</span>
                                              </div>
                                            )}

                                            {specificObj.remarks && (
                                              <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                                                <div className="flex items-center space-x-2 mb-1">
                                                  <User size={16} className="text-blue-600" />
                                                  <span className="text-sm font-semibold text-blue-800">Therapist Notes</span>
                                                </div>
                                                <p className="text-sm text-blue-700">{specificObj.remarks}</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
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
                  <div className={`text-2xl font-bold ${getProgressColor(overallStats.averageProgress)}`}>
                    {overallStats.averageProgress?.toFixed(1) || 0}%
                  </div>
                  <div className="text-xs font-medium text-gray-600">Complete</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Overall Stats Summary */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {overallStats.totalMainObjectives}
              </div>
              <div className="text-sm font-medium text-blue-800">Total Main Objectives</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {overallStats.totalSpecificObjectives}
              </div>
              <div className="text-sm font-medium text-green-800">Total Specific Objectives</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 rounded-xl">
              <div className="text-2xl font-bold text-emerald-600 mb-1">
                {overallStats.totalCompletedObjectives}
              </div>
              <div className="text-sm font-medium text-emerald-800">Completed Objectives</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {overallStats.activePlans}
              </div>
              <div className="text-sm font-medium text-purple-800">Active Plans</div>
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
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{report.title}</h4>
                          {report.description && (
                            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <File className="h-3 w-3" />
                              {report.originalFileName}
                            </span>
                            <span>{(report.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            <span>Uploaded by {report.therapistName}</span>
                            <span>{new Date(report.uploadedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadReport(report.id, report.originalFileName)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            Download
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
    </>
  );
};

export default ProgressView;
