import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Award, Eye } from 'lucide-react';
import { useQuery } from 'react-query';
import { patientAPI } from '../../services/api';

const ProgressView = () => {
  const [milestones, setMilestones] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);

  // Fetch progress data from API
  const { data: progressData, isLoading: progressLoading, error: progressError } = useQuery(
    'patientProgress',
    patientAPI.getProgress,
    {
      onError: (error) => {
        console.error('Error fetching progress data:', error);
      }
    }
  );

  // Fetch assessments data for recent assessments
  const { data: assessmentsData, isLoading: assessmentsLoading } = useQuery(
    'patientAssessments',
    patientAPI.getAssessments,
    {
      onSuccess: (data) => {
        // Set recent assessments from API data
        const assessments = Array.isArray(data?.data) ? data.data : [];
        setRecentAssessments(assessments.slice(0, 3));
      },
      onError: (error) => {
        console.error('Error fetching assessments:', error);
      }
    }
  );

  const isLoading = progressLoading || assessmentsLoading;

  // Transform progress data from array to object format for display
  const progressDataObject = React.useMemo(() => {
    if (!Array.isArray(progressData?.data)) return {};
    
    const transformed = {};
    progressData.data.forEach(entry => {
      transformed[entry.area] = {
        current: entry.currentScore,
        target: entry.targetScore,
        trend: entry.currentScore > entry.baselineScore ? 'up' : 
               entry.currentScore < entry.baselineScore ? 'down' : 'stable'
      };
    });
    return transformed;
  }, [progressData]);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />;
      case 'stable':
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getProgressColor = (current, target) => {
    const percentage = (current / target) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Progress Tracking</h1>
        <p className="mt-2 text-sm text-gray-700">
          Monitor your therapy progress and celebrate achievements
        </p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(progressDataObject).map(([skill, data]) => (
            <div key={skill} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900 capitalize">
                  {skill.replace(/([A-Z])/g, ' $1').trim()}
                </h3>
                {getTrendIcon(data.trend)}
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl font-bold ${getProgressColor(data.current, data.target)}`}>
                  {data.current}%
                </span>
                <span className="text-sm text-gray-500">Target: {data.target}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.current >= data.target ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((data.current / data.target) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Milestones & Achievements</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {milestones.map((milestone) => (
            <div key={milestone.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    milestone.achieved ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {milestone.achieved ? (
                      <Award className="h-5 w-5 text-green-600" />
                    ) : (
                      <Target className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-4">
                    <h3 className={`text-sm font-medium ${
                      milestone.achieved ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-gray-500">{milestone.description}</p>
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {milestone.date}
                      <span className="mx-2">•</span>
                      {milestone.category}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {milestone.achieved ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Achieved
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Assessments</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentAssessments.map((assessment) => (
            <div key={assessment.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">{assessment.type}</h3>
                    <p className="text-sm text-gray-500">{assessment.notes}</p>
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <Calendar className="h-3 w-3 mr-1" />
                      {assessment.date}
                      <span className="mx-2">•</span>
                      {assessment.therapist}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {assessment.score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Chart Placeholder */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Progress Over Time</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <TrendingUp className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Progress chart will be displayed here</p>
            <p className="text-xs text-gray-400">Showing trends over the last 6 months</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <p className="ml-3 text-sm text-gray-700">
              Continue practicing fine motor activities at home for 15-20 minutes daily
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <p className="ml-3 text-sm text-gray-700">
              Work on balance exercises using household items like pillows and cushions
            </p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <p className="ml-3 text-sm text-gray-700">
              Practice dressing skills independently, starting with simple items
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressView;
