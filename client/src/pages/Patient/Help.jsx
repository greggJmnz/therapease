import React, { useState } from 'react';
import { HelpCircle, Search, MessageCircle, Phone, Mail, FileText, Calendar, Target, Users, ChevronDown, ChevronRight } from 'lucide-react';

const PatientHelp = () => {
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
      question: "How do I schedule a session?",
      answer: "You can schedule sessions through the Schedule page. Click on 'Book Session' and select your preferred date and time. Your therapist will confirm the session within 24 hours."
    },
    {
      question: "How do I access my daily notes?",
      answer: "Daily notes can be found in the 'Daily Notes' section. You can view notes from your therapy sessions and add your own observations about your progress."
    },
    {
      question: "What are home exercises?",
      answer: "Home exercises are personalized activities assigned by your therapist to help you continue your progress outside of sessions. You can find them in the 'Home Exercises' section."
    },
    {
      question: "How do I track my progress?",
      answer: "Use the 'Progress Tracking' feature to monitor your improvement over time. You can view charts and see your therapy journey."
    },
    {
      question: "Can I reschedule my session?",
      answer: "Yes, you can reschedule sessions up to 24 hours before the scheduled time. Go to the Schedule page and click on the session you want to reschedule."
    },
    {
      question: "How do I contact my therapist?",
      answer: "You can contact your therapist through the messaging system in the app, or use the contact information provided in your profile. For urgent matters, please call the clinic directly."
    }
  ];

  const quickActions = [
    {
      title: "Book Session",
      description: "Book your next therapy session",
      icon: Calendar,
      action: () => window.location.href = '/patient/appointments'
    },
    {
      title: "View Progress",
      description: "Check your therapy progress",
      icon: Target,
      action: () => window.location.href = '/patient/progress'
    },
    {
      title: "Daily Notes",
      description: "Access your session notes",
      icon: FileText,
      action: () => window.location.href = '/patient/daily-notes'
    },
    {
      title: "Home Exercises",
      description: "View assigned exercises",
      icon: Target,
      action: () => window.location.href = '/patient/exercises'
    }
  ];

  const contactInfo = [
    {
      title: "Phone Support",
      description: "Call us for immediate assistance",
      icon: Phone,
      value: "+1 (555) 123-4567",
      action: () => window.open('tel:+15551234567')
    },
    {
      title: "Email Support",
      description: "Send us an email",
      icon: Mail,
      value: "support@therapease.com",
      action: () => window.open('mailto:support@therapease.com')
    },
    {
      title: "Live Chat",
      description: "Chat with our support team",
      icon: MessageCircle,
      value: "Available 9 AM - 6 PM",
      action: () => alert('Live chat feature coming soon!')
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
          Find answers to common questions, get support, and learn how to make the most of your therapy experience.
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

      {/* Additional Resources */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Still need help?</h2>
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">We're here to help you succeed</h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            If you couldn't find what you're looking for, our support team is ready to assist you. 
            Don't hesitate to reach out - we're committed to making your therapy journey as smooth as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.open('tel:+15551234567')}
              className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={20} />
              Call Support
            </button>
            <button
              onClick={() => window.open('mailto:support@therapease.com')}
              className="px-8 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Mail size={20} />
              Email Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientHelp;
