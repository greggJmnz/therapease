import React, { useState } from 'react';
import { Shield, Lock, Eye, Database, AlertTriangle, CheckCircle, X } from 'lucide-react';

const HIPAAComplianceNotice = ({ isOpen, onClose, onAccept }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const complianceFeatures = [
    {
      icon: Lock,
      title: 'Data Encryption',
      description: 'All health information is encrypted using AES-256 encryption both at rest and in transit.'
    },
    {
      icon: Shield,
      title: 'Access Controls',
      description: 'Multi-factor authentication and role-based access controls protect your information.'
    },
    {
      icon: Eye,
      title: 'Audit Logging',
      description: 'All access to your health information is logged and monitored for security.'
    },
    {
      icon: Database,
      title: 'Secure Storage',
      description: 'Your data is stored in HIPAA-compliant data centers with physical security measures.'
    }
  ];

  const patientRights = [
    'Access your health information',
    'Request amendments to your records',
    'Request restrictions on use and disclosure',
    'Receive confidential communications',
    'File complaints about privacy violations'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">HIPAA Compliance Notice</h2>
              <p className="text-sm text-gray-600">Protected Health Information (PHI) Protection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Important Notice</h3>
                <p className="text-yellow-800 text-sm">
                  TherapEase is designed to handle Protected Health Information (PHI) in compliance with 
                  the Health Insurance Portability and Accountability Act (HIPAA). By using this service, 
                  you acknowledge that your health information may be shared with your healthcare providers 
                  as necessary for your treatment.
                </p>
              </div>
            </div>
          </div>

          {/* Security Features */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Measures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {complianceFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">{feature.title}</h4>
                        <p className="text-sm text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Patient Rights */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Rights Under HIPAA</h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <ul className="space-y-2">
                {patientRights.map((right, index) => (
                  <li key={index} className="flex items-center text-sm text-blue-800">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2 flex-shrink-0" />
                    {right}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Data Sharing Notice */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Data Sharing for Treatment</h3>
            <p className="text-sm text-gray-700">
              Your health information may be shared with your healthcare providers, including therapists, 
              doctors, and other authorized personnel involved in your care. This sharing is necessary 
              to provide you with comprehensive treatment and ensure continuity of care.
            </p>
          </div>

          {/* Acknowledgment */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm text-gray-700">
                I acknowledge that I have read and understand this HIPAA compliance notice. 
                I understand that my health information may be shared with my healthcare providers 
                as necessary for my treatment, and I consent to such sharing in accordance with 
                HIPAA regulations.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onAccept}
              disabled={!acknowledged}
              className={`px-6 py-2 rounded-lg transition-colors ${
                acknowledged
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              I Understand & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HIPAAComplianceNotice;
