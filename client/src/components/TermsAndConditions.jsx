import React, { useState } from 'react';
import { X, FileText, Shield, Eye, Lock, Database, UserCheck, AlertTriangle } from 'lucide-react';

const TermsAndConditions = ({ isOpen, onClose, onAccept, onDecline }) => {
  const [activeSection, setActiveSection] = useState('terms');

  const sections = [
    { id: 'terms', title: 'Terms of Service', icon: FileText },
    { id: 'privacy', title: 'Privacy Policy', icon: Shield },
    { id: 'data-privacy', title: 'Data Privacy Act 2012', icon: Database }
  ];

  const renderTermsOfService = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Terms of Service</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h4>
          <p>By accessing and using TherapEase, you accept and agree to be bound by the terms and provision of this agreement.</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">2. Use License</h4>
          <p>Permission is granted to temporarily use TherapEase for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">3. User Responsibilities</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide accurate and complete information</li>
            <li>Maintain the confidentiality of your account</li>
            <li>Use the service in compliance with applicable laws</li>
            <li>Report any security concerns immediately</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">4. Prohibited Uses</h4>
          <p>You may not use our service for any unlawful purpose or to solicit others to perform unlawful acts.</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">5. Service Availability</h4>
          <p>We strive to maintain service availability but do not guarantee uninterrupted access.</p>
        </div>
      </div>
    </div>
  );

  const renderPrivacyPolicy = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Privacy Policy</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Information We Collect</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Personal identification information (name, email, phone)</li>
            <li>Health information necessary for therapy services</li>
            <li>Usage data and analytics</li>
            <li>Device and browser information</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">How We Use Information</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Provide and improve therapy services</li>
            <li>Communicate with you about appointments and care</li>
            <li>Ensure service security and compliance</li>
            <li>Generate anonymized analytics for service improvement</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Data Protection</h4>
          <p>We implement industry-standard security measures including encryption, access controls, and regular security audits.</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Your Rights</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Access your personal data</li>
            <li>Request data correction or deletion</li>
            <li>Withdraw consent for data processing</li>
            <li>Data portability</li>
          </ul>
        </div>
      </div>
    </div>
  );


  const renderDataPrivacyAct = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Data Privacy Act of 2012 Compliance</h3>
      <div className="space-y-3 text-sm text-gray-700">
        <p><strong>Republic Act No. 10173</strong> - Data Privacy Act of 2012</p>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Data Subject Rights</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Right to be informed about data collection</li>
            <li>Right to access personal data</li>
            <li>Right to object to data processing</li>
            <li>Right to erasure or blocking of data</li>
            <li>Right to damages for violations</li>
            <li>Right to data portability</li>
            <li>Right to file complaints with the NPC</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Data Processing Principles</h4>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Transparency in data collection and processing</li>
            <li>Legitimate purpose for data processing</li>
            <li>Proportionality in data collection</li>
            <li>Data quality and accuracy</li>
            <li>Security measures for data protection</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Consent Requirements</h4>
          <p>We obtain your explicit consent before processing your personal data for therapy services, and you may withdraw this consent at any time.</p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">Data Protection Officer</h4>
          <p>For questions about data privacy, contact our Data Protection Officer at privacy@therapease.com</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <UserCheck className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">Your Privacy Matters</h4>
              <p className="text-green-800">We are committed to protecting your privacy and ensuring compliance with all applicable data protection laws.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'terms':
        return renderTermsOfService();
      case 'privacy':
        return renderPrivacyPolicy();
      case 'data-privacy':
        return renderDataPrivacyAct();
      default:
        return renderTermsOfService();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Terms & Conditions</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-gray-200">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
