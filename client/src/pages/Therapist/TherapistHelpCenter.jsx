import React, { useState } from 'react';
import { HelpCircle, Search, MessageCircle, Phone, Mail, FileText, Calendar, Target, Users, ChevronDown, ChevronRight } from 'lucide-react';

const TherapistHelpCenter = () => {
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
      question: "How do I manage my patients and view their information?",
      answer: "Use the Patients section to view all your assigned patients with their profiles, therapy progress, and appointment history. You can access detailed patient information including age, diagnosis, therapy goals, and developmental stage. The system is specifically designed for pediatric occupational therapy (ages 0-21)."
    },
    {
      question: "How do I create and manage treatment plans?",
      answer: "Access the Progress Tracking section to create comprehensive treatment plans with main objectives and specific goals. You can set progress indicators, track completion status, and monitor developmental milestones. The system supports play-based interventions and family-centered care approaches."
    },
    {
      question: "How do I document daily therapy sessions?",
      answer: "Use the Daily Notes section to document session activities, patient responses, and progress observations. Include session objectives, activities performed, developmental progress, and recommendations for future sessions. The system supports detailed documentation with date tracking and patient-specific notes."
    },
    {
      question: "How do I use AI insights for pediatric therapy?",
      answer: "The AI Insights feature provides GPT-4 powered pediatric session analysis and developmental insights. It offers OTPF-4 compliant assessments, play-based intervention recommendations, sensory processing analysis, and family-centered care suggestions. Access this through the AI Insights section for evidence-based therapy recommendations."
    },
    {
      question: "How do I assign and track home exercises?",
      answer: "Use the Home Exercises section to create personalized play-based activities for patients. You can assign exercises with instructions, duration, frequency, and difficulty levels. Track patient completion and view proof submissions. The system supports equipment lists and due date management for comprehensive home programs."
    },
    {
      question: "How do I manage my schedule and appointments?",
      answer: "The Schedule section provides an interactive calendar for managing therapy sessions. You can view your availability, schedule appointments, and track patient sessions. The system integrates with the notification system to send reminders and updates to patients and families."
    },
    {
      question: "How do I upload and manage progress reports?",
      answer: "Use the Progress Reports section to upload files (PDF, images, videos) documenting patient progress. The system supports file management with upload progress tracking, file organization, and patient-specific documentation. Files are securely stored and accessible for review and sharing."
    },
    {
      question: "How do I handle notifications and communication?",
      answer: "The Notifications section manages appointment alerts, patient updates, and system messages. The system supports push notifications, SMS integration (Philippine number support), and email notifications. You can configure notification preferences and delivery methods for optimal communication."
    }
  ];

  const quickActions = [
    {
      title: "View Patients",
      description: "Manage your patient list",
      icon: Users,
      action: () => window.location.href = '/therapist/patients'
    },
    {
      title: "Progress Tracking",
      description: "Create treatment plans and track progress",
      icon: Target,
      action: () => window.location.href = '/therapist/progress-tracking'
    },
    {
      title: "Daily Notes",
      description: "Document therapy sessions",
      icon: FileText,
      action: () => window.location.href = '/therapist/daily-notes'
    },
    {
      title: "AI Insights",
      description: "Get AI-powered therapy recommendations",
      icon: Target,
      action: () => window.location.href = '/therapist/ai-insights'
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <HelpCircle size={40} className="text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions, get support, and learn how to make the most of your TherapEase therapist portal for pediatric occupational therapy practice.
        </p>
            </div>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Get in Touch</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <button
                onClick={() => toggleFaq(index)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 pr-4">{faq.question}</h3>
                {expandedFaqs[index] ? (
                  <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                )}
            </button>
              {expandedFaqs[index] && (
                <div className="px-6 pb-6">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

    </div>
  );
};

export default TherapistHelpCenter;
