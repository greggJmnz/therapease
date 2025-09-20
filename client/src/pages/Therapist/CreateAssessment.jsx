import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Plus,
  X,
  Save,
  ArrowLeft,
  AlertCircle,
  Download,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import AssessmentTemplateSelector from '../../components/AssessmentTemplateSelector';


const CreateAssessment = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [areas, setAreas] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);


  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm();

  const assessmentType = watch('type');
  const isScheduled = watch('isScheduled');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/therapist/patients');
      const data = await response.json();
      if (data.success) {
        setPatients(data.data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Failed to fetch patients');
    }
  };

  const addArea = () => {
    setAreas([...areas, { name: '', score: '', maxScore: 100 }]);
  };

  const removeArea = (index) => {
    setAreas(areas.filter((_, i) => i !== index));
  };

  const updateArea = (index, field, value) => {
    const newAreas = [...areas];
    newAreas[index][field] = value;
    setAreas(newAreas);
  };

  const addRecommendation = () => {
    setRecommendations([...recommendations, '']);
  };

  const removeRecommendation = (index) => {
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  const updateRecommendation = (index, value) => {
    const newRecommendations = [...recommendations];
    newRecommendations[index] = value;
    setRecommendations(newRecommendations);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Apply template data to form
    setValue('title', template.name);
    setValue('type', template.type);
    setValue('category', template.category);
    setValue('summary', template.summary);
    setValue('aiInsights', template.aiInsights);
    
    // Set areas and recommendations
    setAreas(template.areas.map(area => ({ ...area })));
    setRecommendations([...template.recommendations]);
    
    toast.success(`Template "${template.name}" applied successfully!`);
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const assessmentData = {
        ...data,
        areas: areas.filter(area => area.name && area.score),
        recommendations: recommendations.filter(rec => rec.trim()),
        scheduledDate: isScheduled ? data.scheduledDate : null
      };

      const response = await fetch('/api/therapist/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Assessment created successfully!');
        navigate('/therapist/assessments');
      } else {
        toast.error(result.error || 'Failed to create assessment');
      }
    } catch (error) {
      console.error('Error creating assessment:', error);
      toast.error('Failed to create assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const assessmentTypes = [
    'Comprehensive',
    'Screening',
    'Progress Review',
    'Re-evaluation',
    'Discharge',
    'Custom'
  ];

  const assessmentCategories = [
    'Fine Motor',
    'Gross Motor',
    'Sensory',
    'Cognitive',
    'ADL',
    'IADL',
    'Social Skills',
    'Communication',
    'Behavioral',
    'Other'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/therapist/assessments"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Assessments
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Assessment</h1>
            <p className="mt-2 text-sm text-gray-700">
              Create a comprehensive assessment for your patient
            </p>
            {selectedTemplate && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Copy className="h-3 w-3 mr-1" />
                Using template: {selectedTemplate.name}
              </div>
            )}
          </div>
        </div>
        
        <button
          type="button"
          onClick={() => setShowTemplateSelector(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Copy className="h-4 w-4 mr-2" />
          Use Template
        </button>
      </div>




        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Patient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('patientId', { required: 'Patient is required' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName} - {patient.diagnosis}
                    </option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.patientId.message}
                  </p>
                )}
              </div>

              {/* Assessment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Type <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('type', { required: 'Assessment type is required' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select type</option>
                  {assessmentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Assessment Title */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="e.g., Fine Motor Skills Assessment"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select category</option>
                  {assessmentCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.category.message}
                  </p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Status
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('isScheduled')}
                      value="false"
                      defaultChecked
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Completed</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      {...register('isScheduled')}
                      value="true"
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Scheduled</span>
                  </label>
                </div>
              </div>

              {/* Scheduled Date */}
              {isScheduled === 'true' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    {...register('scheduledDate')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Areas */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Assessment Areas</h3>
            <p className="mt-1 text-sm text-gray-500">
              Define specific areas to be assessed and their scoring
            </p>
          </div>
          <div className="px-6 py-4 space-y-4">
            {areas.map((area, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Area name (e.g., Hand-Eye Coordination)"
                    value={area.name}
                    onChange={(e) => updateArea(index, 'name', e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <input
                    type="number"
                    placeholder="Score"
                    value={area.score}
                    onChange={(e) => updateArea(index, 'score', e.target.value)}
                    min="0"
                    max={area.maxScore}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <input
                    type="number"
                    placeholder="Max score"
                    value={area.maxScore}
                    onChange={(e) => updateArea(index, 'maxScore', e.target.value)}
                    min="1"
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeArea(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addArea}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Assessment Area
            </button>
          </div>
        </div>

        {/* Summary and Recommendations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Summary & Recommendations</h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Summary
              </label>
              <textarea
                {...register('summary')}
                rows={4}
                placeholder="Provide a comprehensive summary of the assessment findings..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Recommendations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendations
              </label>
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <input
                      type="text"
                      placeholder="Enter recommendation..."
                      value={rec}
                      onChange={(e) => updateRecommendation(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeRecommendation(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addRecommendation}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recommendation
                </button>
              </div>
            </div>

            {/* AI Insights */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Insights (Optional)
              </label>
              <textarea
                {...register('aiInsights')}
                rows={3}
                placeholder="AI-generated insights or additional analysis..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-between">
          <Link
            to="/therapist/assessments"
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancel
          </Link>
          
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Assessment
              </>
            )}
          </button>
        </div>
      </form>
      )}

      {/* Template Selector Modal */}
      {showTemplateSelector && (
        <AssessmentTemplateSelector
          onTemplateSelect={handleTemplateSelect}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
};

export default CreateAssessment;
