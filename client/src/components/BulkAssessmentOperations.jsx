import React, { useState } from 'react';
import { CheckSquare, Square, Trash2, Download, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { exportMultipleAssessmentsToCSV, exportAssessmentSummaryToPDF } from '../utils/exportUtils';
import toast from 'react-hot-toast';

const BulkAssessmentOperations = ({ assessments, onBulkDelete, onBulkStatusUpdate }) => {
  const [selectedAssessments, setSelectedAssessments] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleSelectAll = () => {
    if (selectedAssessments.length === assessments.length) {
      setSelectedAssessments([]);
    } else {
      setSelectedAssessments(assessments.map(a => a.id));
    }
  };

  const handleSelectAssessment = (assessmentId) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId)
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  const handleBulkExportCSV = () => {
    const selectedAssessmentData = assessments.filter(a => selectedAssessments.includes(a.id));
    exportMultipleAssessmentsToCSV(selectedAssessmentData);
    toast.success(`Exported ${selectedAssessmentData.length} assessments to CSV`);
  };

  const handleBulkExportPDF = () => {
    const selectedAssessmentData = assessments.filter(a => selectedAssessments.includes(a.id));
    exportAssessmentSummaryToPDF(selectedAssessmentData);
    toast.success(`Exported ${selectedAssessmentData.length} assessments to PDF`);
  };

  const handleBulkStatusUpdate = (newStatus) => {
    if (selectedAssessments.length === 0) return;
    
    onBulkStatusUpdate(selectedAssessments, newStatus);
    setSelectedAssessments([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
    if (selectedAssessments.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedAssessments.length} assessments? This action cannot be undone.`)) {
      onBulkDelete(selectedAssessments);
      setSelectedAssessments([]);
      setShowBulkActions(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'in-progress':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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

  if (assessments.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Bulk Selection Header */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
            >
              {selectedAssessments.length === assessments.length ? (
                <CheckSquare className="h-5 w-5 text-green-600" />
              ) : (
                <Square className="h-5 w-5 text-gray-400" />
              )}
              <span>
                {selectedAssessments.length === 0 
                  ? 'Select All' 
                  : `${selectedAssessments.length} of ${assessments.length} selected`
                }
              </span>
            </button>
          </div>

          {selectedAssessments.length > 0 && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                {showBulkActions ? 'Hide' : 'Show'} Bulk Actions
              </button>
            </div>
          )}
        </div>

        {/* Bulk Actions Panel */}
        {showBulkActions && selectedAssessments.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-gray-900 mb-3">
              Bulk Operations ({selectedAssessments.length} assessments selected)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Export Actions */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Export</h5>
                <div className="space-y-2">
                  <button
                    onClick={handleBulkExportCSV}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export CSV
                  </button>
                  <button
                    onClick={handleBulkExportPDF}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Status Updates */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Update Status</h5>
                <div className="space-y-2">
                  <button
                    onClick={() => handleBulkStatusUpdate('completed')}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-green-300 shadow-sm text-xs font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mark Complete
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('scheduled')}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-blue-300 shadow-sm text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Mark Scheduled
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Danger Zone</h5>
                <button
                  onClick={handleBulkDelete}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-red-300 shadow-sm text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete Selected
                </button>
              </div>

              {/* Selection Info */}
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-gray-700">Selection Info</h5>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Total: {selectedAssessments.length}</p>
                  <p>Completed: {assessments.filter(a => selectedAssessments.includes(a.id) && a.status === 'completed').length}</p>
                  <p>Scheduled: {assessments.filter(a => selectedAssessments.includes(a.id) && a.status === 'scheduled').length}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assessment List with Checkboxes */}
      <div className="space-y-3">
        {assessments.map(assessment => (
          <div
            key={assessment.id}
            className={`bg-white shadow rounded-lg p-4 border-2 transition-colors ${
              selectedAssessments.includes(assessment.id) 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-4">
              {/* Checkbox */}
              <button
                onClick={() => handleSelectAssessment(assessment.id)}
                className="flex-shrink-0"
              >
                {selectedAssessments.includes(assessment.id) ? (
                  <CheckSquare className="h-5 w-5 text-green-600" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              {/* Assessment Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {assessment.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {assessment.patientName} • {assessment.type} • {assessment.category}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                      {getStatusIcon(assessment.status)}
                      <span className="ml-1">{assessment.status}</span>
                    </span>
                    
                    {assessment.score !== null && (
                      <span className="text-sm text-gray-600">
                        {assessment.score}/{assessment.maxScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkAssessmentOperations;
