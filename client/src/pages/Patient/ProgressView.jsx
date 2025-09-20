import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Award, Eye } from 'lucide-react';

const ProgressView = () => {
  const [progressData, setProgressData] = useState({});
  const [milestones, setMilestones] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch progress data
    const fetchProgressData = async () => {
      try {
        // This will be implemented with actual API calls
        // For now, using mock data
        setProgressData({
          fineMotor: { current: 85, target: 90, trend: 'up' },
          balance: { current: 72, target: 80, trend: 'up' },
          sensory: { current: 68, target: 75, trend: 'up' },
          communication: { current: 78, target: 85, trend: 'stable' },
          social: { current: 82, target: 88, trend: 'up' }
        });

        setMilestones([
          {
            id: 1,
            title: 'Improved Pencil Grip',
            description: 'Successfully holding pencil with proper grip for 10 minutes',
            date: '2024-01-15',
            category: 'Fine Motor',
            achieved: true
          },
          {
            id: 2,
            title: 'Balanced Walking',
            description: 'Walking on balance beam without assistance',
            date: '2024-01-10',
            category: 'Balance',
            achieved: true
          },
          {
            id: 3,
            title: 'Sensory Tolerance',
            description: 'Increased tolerance to loud sounds and bright lights',
            date: '2024-01-08',
            category: 'Sensory',
            achieved: true
          },
          {
            id: 4,
            title: 'Independent Dressing',
            description: 'Putting on shirt and pants without help',
            date: '2024-01-20',
            category: 'Daily Living',
            achieved: false
          }
        ]);

        setRecentAssessments([
          {
            id: 1,
            date: '2024-01-15',
            type: 'Fine Motor Assessment',
            score: '85%',
            therapist: 'Dr. Sarah Wilson',
            notes: 'Significant improvement in hand-eye coordination'
          },
          {
            id: 2,
            date: '2024-01-08',
            type: 'Sensory Processing Assessment',
            score: '68%',
            therapist: 'Dr. Sarah Wilson',
            notes: 'Good progress in auditory processing'
          },
          {
            id: 3,
            date: '2024-01-01',
            type: 'Balance Assessment',
            score: '72%',
            therapist: 'Dr. Sarah Wilson',
            notes: 'Improved static balance, dynamic balance needs work'
          }
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching progress data:', error);
        setIsLoading(false);
      }
    };

    fetchProgressData();
  }, []);

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
          {Object.entries(progressData).map(([skill, data]) => (
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
