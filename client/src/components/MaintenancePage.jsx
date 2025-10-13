import React from 'react';
import { Wrench, Clock, RefreshCw, Mail } from 'lucide-react';

const MaintenancePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6">
              <Wrench className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">System Maintenance</h1>
            <p className="text-orange-100 text-lg">
              We're working hard to improve your experience
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Temporarily Unavailable
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                TherapEase is currently undergoing scheduled maintenance to enhance 
                performance and add new features. We apologize for any inconvenience.
              </p>
            </div>

            {/* Status Information */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <RefreshCw className="h-5 w-5 mr-2 text-blue-600 animate-spin" />
                Maintenance Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">System Status</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                    Under Maintenance
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Expected Duration</span>
                  <span className="text-gray-900 font-medium">30-60 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-gray-900 font-medium">
                    {new Date().toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* What's Happening */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                What's Happening?
              </h3>
              <div className="space-y-3 text-gray-600">
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Database optimization and performance improvements</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>Security updates and system patches</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>New feature deployment and testing</p>
                </div>
                <div className="flex items-start">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                  <p>System monitoring and health checks</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Need Immediate Assistance?
              </h3>
              <p className="text-gray-600 mb-4">
                If you have an urgent matter that cannot wait, please contact our support team:
              </p>
              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">Email:</span>
                  <a 
                    href="mailto:therapease16@gmail.com" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    therapease16@gmail.com
                  </a>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">Phone:</span>
                  <a 
                    href="tel:+639851423225" 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    +63 985 142 3225
                  </a>
                </div>
              </div>
            </div>

            {/* Auto-refresh Notice */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                This page will automatically refresh every 30 seconds to check for updates.
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Again
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            © 2024 TherapEase. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
