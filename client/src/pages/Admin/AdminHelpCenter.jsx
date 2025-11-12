import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Search, MessageCircle, Phone, Mail, FileText, Calendar, Target, Users, ChevronDown, ChevronRight, Settings, BarChart3, Shield, Database, Bell } from 'lucide-react';

const AdminHelpCenter = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqs, setExpandedFaqs] = useState({});

  const toggleFaq = (index) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqs = [
    {
      question: "How do I manage patients and therapists?",
      answer: "Use the Patients section to view all patient records with search and filter capabilities. The Therapists section allows you to manage therapist accounts, view their assigned patients, and monitor their schedules. You can also view detailed patient information including age, assigned therapist, and therapy progress."
    },
    {
      question: "How do I handle appointment requests and scheduling?",
      answer: "The Notifications section shows incoming appointment booking requests from patients. You can accept requests or add patients to a waiting list. The Appointments section displays current and upcoming appointments with patient details, and the Schedule section provides an interactive calendar for managing all appointments."
    },
    {
      question: "How can I view system analytics and patient statistics?",
      answer: "The Dashboard provides comprehensive statistics including total patients, therapists, and appointments. You can view patient demographics, therapy progress trends, and system usage metrics. The statistics cards show real-time data with quick access links to detailed views."
    },
    {
      question: "How do I configure system settings and security?",
      answer: "Access System Settings to configure user registration policies, security settings, notification preferences, and system maintenance. You can manage password complexity, session timeouts, email notifications, and privacy settings. Changes take effect immediately and affect all users."
    },
    {
      question: "How does the notification system work?",
      answer: "The system supports multiple notification types: push notifications for real-time browser alerts, SMS integration for appointment reminders (Philippine number support), email notifications, and WebSocket-based live updates. You can configure notification preferences and delivery methods for different user roles."
    },
    {
      question: "How can I monitor therapist workload and patient assignments?",
      answer: "The Dashboard shows therapist statistics and patient assignments. You can view which patients are assigned to each therapist, monitor appointment schedules, and track therapy progress. The system provides real-time updates on therapist activities and patient care status."
    },
    {
      question: "How do I ensure HIPAA compliance and data security?",
      answer: "The system includes built-in HIPAA compliance features with data encryption, secure user authentication, and audit logging. Patient data is encrypted at rest and in transit. Access controls ensure only authorized users can view patient information. Regular security updates and compliance monitoring are available."
    },
    {
      question: "How can I manage the pediatric therapy focus of the system?",
      answer: "TherapEase is specifically designed for pediatric occupational therapy (ages 0-21). The system supports play-based interventions, developmental milestone tracking, family-centered care, and school integration. AI-powered assessments provide pediatric-specific insights and recommendations for child development."
    }
  ];

  const quickActions = [
    {
      title: "Manage Patients",
      description: "View and manage patient records",
      icon: Users,
      action: () => navigate('/admin/patients')
    },
    {
      title: "View Appointments",
      description: "Manage appointments and schedules",
      icon: Calendar,
      action: () => navigate('/admin/appointments')
    },
    {
      title: "System Settings",
      description: "Configure system settings",
      icon: Settings,
      action: () => navigate('/admin/settings')
    },
    {
      title: "View Notifications",
      description: "Handle appointment requests",
      icon: Bell,
      action: () => navigate('/admin/notifications')
    }
  ];

  const contactInfo = [
    {
      title: "Phone Support",
      description: "Call us for immediate assistance",
      icon: Phone,
      value: "+639851423225",
      action: () => window.open('tel:+639851423225')
    },
    {
      title: "Email Support",
      description: "Send us an email",
      icon: Mail,
      value: "therapease16@gmail.com",
      action: () => window.open('mailto:therapease16@gmail.com')
    },
    {
      title: "Facebook Page",
      description: "Visit our Facebook page",
      icon: MessageCircle,
      value: "TherapEase Page",
      action: () => window.open('https://facebook.com/therapease', '_blank')
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 w-full max-w-full box-border overflow-x-hidden">
        {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <HelpCircle size={32} className="sm:w-10 sm:h-10 text-white" />
            </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 break-words px-4">How can we help you?</h1>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto break-words px-4">
          Find answers to common questions, get support, and learn how to make the most of your TherapEase admin portal for pediatric occupational therapy management.
        </p>
        </div>
        
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8 sm:mb-12 px-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 sm:py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base sm:text-lg"
          />
          </div>
        </div>
        
              {/* Quick Actions */}
      <div className="mb-12 sm:mb-16 px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center break-words">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
              onClick={action.action}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-left group hover:scale-105"
                    >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                <action.icon size={24} className="text-emerald-600" />
                      </div>
              <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
              <p className="text-gray-600 text-sm">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

      {/* Contact Information */}
      <div className="mb-12 sm:mb-16 px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center break-words">Get in Touch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {contactInfo.map((contact, index) => (
            <button
              key={index}
              onClick={contact.action}
              className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 text-left group hover:scale-105"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <contact.icon size={24} className="text-blue-600" />
                      </div>
              <h3 className="font-semibold text-gray-900 mb-2">{contact.title}</h3>
              <p className="text-gray-600 text-sm mb-3">{contact.description}</p>
              <p className="text-blue-600 font-medium">{contact.value}</p>
            </button>
                  ))}
                </div>
              </div>

      {/* FAQs */}
      <div className="mb-12 sm:mb-16 px-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center break-words">Frequently Asked Questions</h2>
        <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4 w-full">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden w-full">
                    <button
                onClick={() => toggleFaq(index)}
                      className="w-full p-4 sm:p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors gap-4"
              >
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 flex-1 min-w-0 break-words">{faq.question}</h3>
                {expandedFaqs[index] ? (
                  <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                      )}
                    </button>
              {expandedFaqs[index] && (
                      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed break-words">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

    </div>
  );
};

export default AdminHelpCenter;
