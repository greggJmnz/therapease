import React, { useState, useEffect } from 'react';
import { FileText, Calendar, User, TrendingUp, Target, CheckCircle, Clock, AlertTriangle, BarChart3 } from 'lucide-react';

const Assessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  useEffect(() => {
    // Fetch assessments data
    const fetchAssessments = async () => {
      try {
        // This will be implemented with actual API calls
        // For now, using mock data
        setAssessments([
          {
            id: 1,
            title: 'Fine Motor Skills Assessment',
            type: 'Comprehensive',
            date: '2024-01-15',
            therapist: 'Dr. Sarah Wilson',
            status: 'completed',
            score: 85,
            maxScore: 100,
            category: 'Fine Motor',
            summary: 'Good progress in hand-eye coordination and pencil grip. Areas for improvement in complex fine motor tasks.',
            recommendations: [
              'Continue bead threading exercises',
              'Practice writing with different sized pencils',
              'Work on buttoning and zipping activities'
            ],
            areas: [
              { name: 'Hand-Eye Coordination', score: 90, maxScore: 100 },
              { name: 'Pencil Grip', score: 85, maxScore: 100 },
              { name: 'Finger Dexterity', score: 80, maxScore: 100 },
              { name: 'Complex Tasks', score: 75, maxScore: 100 }
            ]
          },
          {
            id: 2,
            title: 'Balance & Coordination Evaluation',
            type: 'Screening',
            date: '2024-01-10',
            therapist: 'Dr. Sarah Wilson',
            status: 'completed',
            score: 78,
            maxScore: 100,
            category: 'Gross Motor',
            summary: 'Shows improvement in static balance. Dynamic balance and coordination need continued work.',
            recommendations: [
              'Continue balance beam exercises',
              'Practice hopping on one foot',
              'Work on obstacle course navigation'
            ],
            areas: [
              { name: 'Static Balance', score: 85, maxScore: 100 },
              { name: 'Dynamic Balance', score: 75, maxScore: 100 },
              { name: 'Coordination', score: 70, maxScore: 100 },
              { name: 'Postural Control', score: 80, maxScore: 100 }
            ]
          },
          {
            id: 3,
            title: 'Sensory Processing Assessment',
            type: 'Comprehensive',
            date: '2024-01-05',
            therapist: 'Dr. Sarah Wilson',
            status: 'completed',
            score: 82,
            maxScore: 100,
            category: 'Sensory',
            summary: 'Good sensory tolerance and processing. Some sensitivity to loud sounds and textures.',
            recommendations: [
              'Continue sensory integration activities',
              'Gradually expose to different textures',
              'Practice in various environments'
            ],
            areas: [
              { name: 'Tactile Processing', score: 80, maxScore: 100 },
              { name: 'Auditory Processing', score: 75, maxScore: 100 },
              { name: 'Visual Processing', score: 85, maxScore: 100 },
              { name: 'Proprioception', score: 85, maxScore: 100 }
            ]
          },
          {
            id: 4,
            title: 'Progress Review Assessment',
            type: 'Review',
            date: '2024-01-20',
            therapist: 'Dr. Sarah Wilson',
            status: 'scheduled',
            category: 'Progress Review',
            summary: 'Quarterly progress review to evaluate overall improvement and adjust treatment plan.',
            recommendations: [],
            areas: []
          }
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        setIsLoading(false);
      }
    };

    fetchAssessments();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'in-progress':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      default:
        return 'Unknown';
    }
  };

  const getScoreColor = (score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const completedAssessments = assessments.filter(a => a.status === 'completed');
  const scheduledAssessments = assessments.filter(a => a.status === 'scheduled');

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
        <h1 className="text-2xl font-bold text-gray-900">Assessments & Evaluations</h1>
        <p className="mt-2 text-sm text-gray-700">
          View your therapy assessments, progress evaluations, and recommendations
        </p>
      </div>

      {/* Assessment Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Assessments</dt>
                  <dd className="text-lg font-medium text-gray-900">{assessments.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{completedAssessments.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Scheduled</dt>
                  <dd className="text-lg font-medium text-gray-900">{scheduledAssessments.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Score</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {completedAssessments.length > 0 
                      ? Math.round(completedAssessments.reduce((sum, a) => sum + a.score, 0) / completedAssessments.length)
                      : 'N/A'
                    }
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Completed Assessments</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedAssessments.map((assessment) => (
              <div key={assessment.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      {getStatusIcon(assessment.status)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {assessment.title}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.date}
                        <User className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.therapist}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.type} • {assessment.category}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(assessment.score, assessment.maxScore)}`}>
                        {assessment.score}/{assessment.maxScore}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Math.round((assessment.score / assessment.maxScore) * 100)}%
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                      {getStatusLabel(assessment.status)}
                    </span>
                  </div>
                </div>

                {/* Assessment Summary */}
                <div className="mt-4 ml-16">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Summary:</h4>
                  <p className="text-sm text-gray-600 mb-4">{assessment.summary}</p>

                  {/* Area Scores */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Area Scores:</h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {assessment.areas.map((area, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{area.name}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getScoreColor(area.score, area.maxScore).replace('text-', 'bg-')}`}
                                style={{ width: `${(area.score / area.maxScore) * 100}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(area.score, area.maxScore)}`}>
                              {area.score}/{area.maxScore}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h4>
                    <ul className="space-y-1">
                      {assessment.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <Target className="flex-shrink-0 h-4 w-4 text-blue-500 mt-0.5 mr-2" />
                          <span className="text-sm text-gray-600">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Assessments */}
      {scheduledAssessments.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Scheduled Assessments</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {scheduledAssessments.map((assessment) => (
              <div key={assessment.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      {getStatusIcon(assessment.status)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {assessment.title}
                      </h3>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.date}
                        <User className="ml-4 flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.therapist}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {assessment.type} • {assessment.category}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                    {getStatusLabel(assessment.status)}
                  </span>
                </div>

                {/* Assessment Summary */}
                <div className="mt-4 ml-16">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Summary:</h4>
                  <p className="text-sm text-gray-600">{assessment.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Assessments Message */}
      {assessments.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments available</h3>
          <p className="text-sm text-gray-500">
            Your therapist will schedule assessments as needed to track your progress.
          </p>
        </div>
      )}

      {/* Assessment Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">About Assessments</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Progress Tracking</h4>
                <p className="text-xs text-gray-500">Regular assessments help track your improvement over time</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Target className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Goal Setting</h4>
                <p className="text-xs text-gray-500">Assessments help set realistic and achievable therapy goals</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Treatment Planning</h4>
                <p className="text-xs text-gray-500">Results guide your personalized treatment plan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessments;
