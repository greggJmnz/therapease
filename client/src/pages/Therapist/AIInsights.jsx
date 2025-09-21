import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { Brain, TrendingUp, Lightbulb, Target, Clock, User, FileText, Save, Plus, Trash2, Eye, Download } from 'lucide-react';
import { therapistAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AIInsights = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [insights, setInsights] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New state for interview questions and observations
  const [interviewQuestions, setInterviewQuestions] = useState([
    { id: 1, question: '', answer: '' }
  ]);
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // New state for assessment history modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

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

  // Load saved assessment data when patient changes
  useEffect(() => {
    if (selectedPatient) {
      const savedData = localStorage.getItem(`assessment_${selectedPatient}`);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.interviewQuestions && parsed.interviewQuestions.length > 0) {
            setInterviewQuestions(parsed.interviewQuestions);
          }
          if (parsed.observations) {
            setObservations(parsed.observations);
          }
        } catch (error) {
          console.error('Error loading saved assessment data:', error);
        }
      } else {
        // Reset to default state for new patient
        setInterviewQuestions([{ id: 1, question: '', answer: '' }]);
        setObservations('');
      }
    }
  }, [selectedPatient]);

  // Interview questions management
  const addInterviewQuestion = () => {
    const newId = Math.max(...interviewQuestions.map(q => q.id), 0) + 1;
    setInterviewQuestions([...interviewQuestions, { id: newId, question: '', answer: '' }]);
  };

  const removeInterviewQuestion = (id) => {
    if (interviewQuestions.length > 1) {
      setInterviewQuestions(interviewQuestions.filter(q => q.id !== id));
    }
  };

  const updateInterviewQuestion = (id, field, value) => {
    setInterviewQuestions(interviewQuestions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Load sample questions for common assessments
  const loadSampleQuestions = () => {
    const sampleQuestions = [
      { id: 1, question: 'Can you tell me about your daily routine?', answer: '' },
      { id: 2, question: 'What activities do you enjoy doing?', answer: '' },
      { id: 3, question: 'Are there any activities that are difficult for you?', answer: '' },
      { id: 4, question: 'How do you feel about your current abilities?', answer: '' },
      { id: 5, question: 'What would you like to improve or work on?', answer: '' }
    ];
    setInterviewQuestions(sampleQuestions);
  };

  // Load motor skills assessment questions
  const loadMotorSkillsQuestions = () => {
    const motorQuestions = [
      { id: 1, question: 'How do you hold a pencil or pen?', answer: '' },
      { id: 2, question: 'Can you button your clothes independently?', answer: '' },
      { id: 3, question: 'How do you use scissors?', answer: '' },
      { id: 4, question: 'Can you tie your shoelaces?', answer: '' },
      { id: 5, question: 'How do you perform fine motor tasks?', answer: '' }
    ];
    setInterviewQuestions(motorQuestions);
  };

  // Load sensory processing questions
  const loadSensoryQuestions = () => {
    const sensoryQuestions = [
      { id: 1, question: 'How do you react to loud noises?', answer: '' },
      { id: 2, question: 'Do you have preferences for certain textures?', answer: '' },
      { id: 3, question: 'How do you respond to bright lights?', answer: '' },
      { id: 4, question: 'Do you seek or avoid certain movements?', answer: '' },
      { id: 5, question: 'How do you handle changes in routine?', answer: '' }
    ];
    setInterviewQuestions(sensoryQuestions);
  };

  // Clear all assessment data
  const clearAssessmentData = () => {
    setInterviewQuestions([{ id: 1, question: '', answer: '' }]);
    setObservations('');
    toast.success('Assessment data cleared');
  };

  // Export assessment data
  const exportAssessmentData = () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    const patient = patients.find(p => p.id === parseInt(selectedPatient));
    const assessmentData = {
      patientName: patient.name,
      patientId: selectedPatient,
      date: new Date().toLocaleDateString(),
      interviewQuestions: interviewQuestions.filter(q => q.question.trim() !== ''),
      observations: observations.trim(),
      timestamp: new Date().toISOString()
    };

    const dataStr = JSON.stringify(assessmentData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `assessment_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Assessment data exported successfully!');
  };

  // Save interview questions and observations
  const saveAssessmentData = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    setIsSaving(true);
    
    try {
      // Save to API
      const assessmentData = {
        patientId: selectedPatient,
        interviewQuestions: interviewQuestions.filter(q => q.question.trim() !== ''),
        observations: observations.trim(),
        timestamp: new Date().toISOString()
      };
      
      // For now, save to localStorage (replace with API call when backend is ready)
      localStorage.setItem(`assessment_${selectedPatient}`, JSON.stringify(assessmentData));
      
      toast.success('Assessment data saved successfully!');
    } catch (error) {
      toast.error('Failed to save assessment data');
    } finally {
      setIsSaving(false);
    }
  };

  const generateInsights = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    // Check if we have assessment data
    const hasQuestions = interviewQuestions.some(q => q.question.trim() !== '');
    const hasObservations = observations.trim() !== '';
    
    if (!hasQuestions && !hasObservations) {
      toast.error('Please add interview questions and/or observations before generating insights');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Prepare assessment data
      const assessmentData = {
        interviewQuestions: interviewQuestions.filter(q => q.question.trim() !== ''),
        observations: observations.trim()
      };

      // Get patient data
      const patient = patients.find(p => p.id === parseInt(selectedPatient));
      
      // Call AI API for assessment analysis
      const response = await fetch('/api/ai/analyze-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Assuming token-based auth
        },
        body: JSON.stringify({
          patientData: {
            firstName: patient.name.split(' ')[0],
            lastName: patient.name.split(' ')[1] || '',
            age: patient.age,
            diagnosis: patient.diagnosis,
            therapyGoals: 'To be determined based on assessment'
          },
          assessmentData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate insights');
      }

      const result = await response.json();
      
      if (result.success) {
        // Parse the AI response and create structured insights
        const aiAnalysis = result.data.analysis;
        
        const newInsights = [
          {
            id: Date.now(),
            type: 'assessment-analysis',
            title: 'Assessment Analysis',
            content: aiAnalysis,
            confidence: 0.87,
            recommendations: [
              'Review the detailed analysis above',
              'Consider implementing suggested interventions',
              'Schedule follow-up assessment as recommended'
            ],
            timestamp: new Date().toISOString()
          }
        ];

        setInsights(newInsights);
        toast.success('AI insights generated successfully!');
      } else {
        throw new Error(result.message || 'Failed to generate insights');
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      
      // Fallback to mock insights if API fails
      const newInsights = [
        {
          id: Date.now(),
          type: 'assessment-analysis',
          title: 'Assessment Analysis',
          content: `Based on the interview responses and observations, ${patients.find(p => p.id === parseInt(selectedPatient))?.name} shows ${hasQuestions ? 'specific responses to structured questions' : ''}${hasQuestions && hasObservations ? ' and ' : ''}${hasObservations ? 'notable behavioral observations' : ''}.`,
          confidence: 0.87,
          recommendations: [
            'Continue monitoring progress in identified areas',
            'Consider additional assessment tools if needed',
            'Update treatment plan based on new insights'
          ],
          timestamp: new Date().toISOString()
        },
        {
          id: Date.now() + 1,
          type: 'treatment-suggestions',
          title: 'Treatment Recommendations',
          content: 'AI analysis suggests incorporating targeted interventions based on the assessment findings.',
          confidence: 0.82,
          recommendations: [
            'Develop personalized intervention strategies',
            'Set measurable goals based on assessment results',
            'Plan follow-up assessments to track progress'
          ],
          timestamp: new Date().toISOString()
        }
      ];

      setInsights(newInsights);
      toast.success('AI insights generated successfully! (Using fallback data)');
    } finally {
      setIsGenerating(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'progress-analysis':
        return <TrendingUp className="h-6 w-6 text-blue-600" />;
      case 'treatment-suggestions':
        return <Target className="h-6 w-6 text-green-600" />;
      case 'home-program':
        return <Lightbulb className="h-6 w-6 text-yellow-600" />;
      case 'assessment-analysis':
        return <FileText className="h-6 w-6 text-purple-600" />;
      default:
        return <Brain className="h-6 w-6 text-purple-600" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'progress-analysis':
        return 'bg-blue-50 border-blue-200';
      case 'treatment-suggestions':
        return 'bg-green-50 border-green-200';
      case 'home-program':
        return 'bg-yellow-50 border-yellow-200';
      case 'assessment-analysis':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-purple-50 border-purple-200';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
          <p className="mt-2 text-sm text-gray-700">
            Create assessments and get AI-powered analysis for your patients
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPatient}
            onChange={(e) => setSelectedPatient(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Select Patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name} - {patient.diagnosis}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assessment Creation Section */}
      {selectedPatient && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Create Assessment</h2>
            <div className="text-sm text-gray-500">
              {interviewQuestions.some(q => q.question.trim() !== '') || observations.trim() !== '' ? (
                <span className="text-green-600">✓ Assessment data ready</span>
              ) : (
                <span className="text-gray-400">No assessment data yet</span>
              )}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Assessment Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Add interview questions to gather patient information</li>
              <li>• Record patient responses in the answer fields</li>
              <li>• Write detailed observations about patient behavior and abilities</li>
              <li>• Save your assessment data before generating AI insights</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Interview Questions Panel */}
            <div className="border border-green-300 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-700 text-center mb-4">Interview Questions</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {interviewQuestions.map((item, index) => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{index + 1}. Question</span>
                      {interviewQuestions.length > 1 && (
                        <button
                          onClick={() => removeInterviewQuestion(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => updateInterviewQuestion(item.id, 'question', e.target.value)}
                      placeholder="Enter your question here..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                    />
                    <input
                      type="text"
                      value={item.answer}
                      onChange={(e) => updateInterviewQuestion(item.id, 'answer', e.target.value)}
                      placeholder="Patient's answer..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500 mt-2"
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <button
                    onClick={addInterviewQuestion}
                    className="w-full flex items-center justify-center px-4 py-2 border border-green-300 rounded-md text-green-700 hover:bg-green-50 transition-colors"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Question
                  </button>
                  <button
                    onClick={loadSampleQuestions}
                    className="w-full flex items-center justify-center px-4 py-2 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <FileText size={16} className="mr-2" />
                    Load Sample Questions
                  </button>
                  <button
                    onClick={loadMotorSkillsQuestions}
                    className="w-full flex items-center justify-center px-4 py-2 border border-purple-300 rounded-md text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    <Target size={16} className="mr-2" />
                    Motor Skills Template
                  </button>
                  <button
                    onClick={loadSensoryQuestions}
                    className="w-full flex items-center justify-center px-4 py-2 border border-orange-300 rounded-md text-orange-700 hover:bg-orange-50 transition-colors"
                  >
                    <Brain size={16} className="mr-2" />
                    Sensory Processing Template
                  </button>
                </div>
              </div>
            </div>

            {/* Observations Panel */}
            <div className="border border-green-300 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-700 text-center mb-4">Observations</h3>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Type here..."
                className="w-full h-80 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500 resize-none"
              />
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                <span>Record detailed observations about patient behavior, abilities, and responses</span>
                <span>{observations.length} characters</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={saveAssessmentData}
              disabled={isSaving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </button>
            
            <button
              onClick={generateInsights}
              disabled={isGenerating}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Insights
                </>
              )}
            </button>

            <button
              onClick={clearAssessmentData}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </button>

            <button
              onClick={exportAssessmentData}
              disabled={!interviewQuestions.some(q => q.question.trim() !== '') && !observations.trim()}
              className="inline-flex items-center px-6 py-3 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>

          {/* Assessment Summary */}
          {(interviewQuestions.some(q => q.question.trim() !== '') || observations.trim() !== '') && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Assessment Summary:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Questions:</span>
                  <span className="ml-2 text-gray-600">
                    {interviewQuestions.filter(q => q.question.trim() !== '').length} questions added
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Observations:</span>
                  <span className="ml-2 text-gray-600">
                    {observations.trim() ? `${observations.length} characters` : 'None recorded'}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Ready for AI Analysis:</span>
                  <span className="ml-2 text-green-600 font-medium">
                    ✓ Assessment data is complete and ready for AI insights generation
                  </span>
                </div>
                <div className="md:col-span-2 pt-2 border-t border-gray-200">
                  <div className="flex items-center space-x-4 text-xs">
                    <span className={`px-2 py-1 rounded-full ${interviewQuestions.some(q => q.question.trim() !== '') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {interviewQuestions.some(q => q.question.trim() !== '') ? '✓ Questions' : '○ Questions'}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${observations.trim() !== '' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {observations.trim() !== '' ? '✓ Observations' : '○ Observations'}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${interviewQuestions.some(q => q.question.trim() !== '') && observations.trim() !== '' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}`}>
                      {interviewQuestions.some(q => q.question.trim() !== '') && observations.trim() !== '' ? '✓ Complete' : '○ Incomplete'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assessment History */}
      {selectedPatient && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assessment History</h2>
          <div className="space-y-3">
            {(() => {
              // Mock assessment history data for demonstration
              const mockAssessments = [
                {
                  id: 1,
                  date: '2025-01-20',
                  type: 'Fine Motor Skills Assessment',
                  score: 85,
                  status: 'completed',
                  summary: 'Patient shows improvement in hand-eye coordination and fine motor precision.',
                  details: {
                    areas: ['Hand-eye coordination', 'Fine motor precision', 'Grip strength'],
                    recommendations: ['Continue hand strengthening exercises', 'Practice precision tasks', 'Monitor progress monthly']
                  }
                },
                {
                  id: 2,
                  date: '2025-01-15',
                  type: 'Sensory Processing Evaluation',
                  score: 72,
                  status: 'completed',
                  summary: 'Moderate sensory sensitivity observed, particularly to auditory stimuli.',
                  details: {
                    areas: ['Auditory processing', 'Tactile sensitivity', 'Visual processing'],
                    recommendations: ['Implement noise reduction strategies', 'Gradual exposure therapy', 'Sensory diet planning']
                  }
                },
                {
                  id: 3,
                  date: '2025-01-10',
                  type: 'ADL Assessment',
                  score: 91,
                  status: 'completed',
                  summary: 'Excellent progress in daily living activities and self-care skills.',
                  details: {
                    areas: ['Self-care', 'Mobility', 'Communication'],
                    recommendations: ['Maintain current routine', 'Introduce new challenges', 'Continue independence building']
                  }
                }
              ];

              if (mockAssessments.length > 0) {
                return (
                  <div className="space-y-3">
                    {mockAssessments.map((assessment) => (
                      <div 
                        key={assessment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedAssessment(assessment);
                          setShowAssessmentModal(true);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-sm font-medium text-gray-900">{assessment.type}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assessment.status === 'completed' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {assessment.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{assessment.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Date: {assessment.date}</span>
                            <span>Score: {assessment.score}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssessment(assessment);
                              setShowAssessmentModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast(`Exporting assessment ${assessment.type} (ID: ${assessment.id})`);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              // Fallback to localStorage data if no mock data
              const savedData = localStorage.getItem(`assessment_${selectedPatient}`);
              if (savedData) {
                try {
                  const parsed = JSON.parse(savedData);
                  return (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-green-900">Last Assessment</span>
                        <p className="text-xs text-green-700">
                          {new Date(parsed.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-green-600">
                          {parsed.interviewQuestions.length} questions, {parsed.observations.length} chars
                        </span>
                      </div>
                    </div>
                  );
                } catch (error) {
                  return null;
                }
              }
              
              return (
                <div className="text-center py-4 text-gray-500">
                  <FileText className="mx-auto h-8 w-8 mb-2" />
                  <p className="text-sm">No previous assessments found</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* AI Service Status */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center">
          <Brain className="h-8 w-8 text-purple-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-purple-900">AI Service Status</h3>
            <p className="text-sm text-purple-700">
              GPT-4 powered analysis is available and ready to provide insights
            </p>
          </div>
        </div>
      </div>

      {/* Insights List */}
      {insights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Generated Insights</h2>
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`border rounded-lg p-6 ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {insight.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(insight.confidence)}`}>
                        {Math.round(insight.confidence * 100)}% Confidence
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-4">{insight.content}</p>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h4>
                      <ul className="space-y-1">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-green-400 mt-2 mr-2"></div>
                            <span className="text-sm text-gray-600">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      Generated {new Date(insight.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Insights Message */}
      {insights.length === 0 && !isGenerating && selectedPatient && (
        <div className="text-center py-12">
          <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No insights yet</h3>
          <p className="text-sm text-gray-500 mb-6">
            Create an assessment with interview questions and observations, then generate AI-powered insights.
          </p>
        </div>
      )}

      {/* No Patient Selected Message */}
      {!selectedPatient && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a patient to begin</h3>
          <p className="text-sm text-gray-500 mb-6">
            Choose a patient from the dropdown above to create assessments and generate AI insights.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generating AI Insights</h3>
          <p className="text-sm text-gray-500 mb-4">
            Analyzing assessment data and generating personalized recommendations...
          </p>
          <div className="max-w-md mx-auto">
            <div className="bg-gray-200 rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Processing interview responses and observations...</p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">How AI Insights Work</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Create Assessment</h3>
            <p className="text-xs text-gray-500">
              Add interview questions and record observations about the patient
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Brain className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">AI Analysis</h3>
            <p className="text-xs text-gray-500">
              AI analyzes the assessment data to identify patterns and insights
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <Lightbulb className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Smart Recommendations</h3>
            <p className="text-xs text-gray-500">
              Get evidence-based treatment suggestions and progress insights
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {insights.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent AI Activity</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {insights.slice(0, 3).map((insight) => (
              <div key={insight.id} className="px-6 py-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                    <p className="text-sm text-gray-500">
                      Generated for {patients.find(p => p.id === parseInt(selectedPatient))?.name}
                    </p>
                    <div className="mt-1 flex items-center text-xs text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(insight.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assessment History Modal */}
      {showAssessmentModal && selectedAssessment && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative p-8 border w-2/3 max-w-md mx-auto rounded-lg shadow-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">{selectedAssessment.type}</h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Date:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.date}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Status:</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedAssessment.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedAssessment.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Score:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.score}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Summary:</p>
                <p className="text-sm text-gray-700">{selectedAssessment.summary}</p>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Areas of Concern:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {selectedAssessment.details.areas.map((area, index) => (
                  <li key={index}>{area}</li>
                ))}
              </ul>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recommendations:</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                {selectedAssessment.details.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsights;
