import React, { useState } from 'react';
import { Search, FileText, Check, X } from 'lucide-react';
import { getAllTemplates, getTemplatesByCategory, getTemplatesByType, searchTemplates } from '../services/assessmentTemplates';

const AssessmentTemplateSelector = ({ onTemplateSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const allTemplates = getAllTemplates();
  const categories = [...new Set(allTemplates.map(t => t.category))].sort();
  const types = [...new Set(allTemplates.map(t => t.type))].sort();

  // Filter templates based on search and filters
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || template.category === selectedCategory;
    const matchesType = selectedType === '' || template.type === selectedType;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
      onClose();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedTemplate(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Select Assessment Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedType) && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedTemplate?.id === template.id
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {template.type}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {template.category}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">
                    <p>{template.areas.length} assessment areas</p>
                    <p>{template.recommendations.length} recommendations</p>
                  </div>
                </div>

                {selectedTemplate?.id === template.id && (
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No templates found matching your criteria.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-green-600 hover:text-green-700 underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Cancel
          </button>
          
          <button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate}
            className="px-4 py-2 border border-transparent rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Template
          </button>
        </div>

        {/* Selected Template Preview */}
        {selectedTemplate && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Selected Template: {selectedTemplate.name}</h4>
            <p className="text-sm text-gray-600 mb-3">{selectedTemplate.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Assessment Areas:</h5>
                <ul className="space-y-1">
                  {selectedTemplate.areas.slice(0, 3).map((area, index) => (
                    <li key={index} className="text-gray-600">• {area.name}</li>
                  ))}
                  {selectedTemplate.areas.length > 3 && (
                    <li className="text-gray-500">... and {selectedTemplate.areas.length - 3} more</li>
                  )}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Recommendations:</h5>
                <ul className="space-y-1">
                  {selectedTemplate.recommendations.slice(0, 3).map((rec, index) => (
                    <li key={index} className="text-gray-600">• {rec}</li>
                  ))}
                  {selectedTemplate.recommendations.length > 3 && (
                    <li className="text-gray-500">... and {selectedTemplate.recommendations.length - 3} more</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentTemplateSelector;

