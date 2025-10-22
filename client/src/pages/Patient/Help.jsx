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
      question: "How do I schedule a therapy session?",
      answer: "Use the Appointments section to book therapy sessions. Click 'Book Session' to select your preferred date and time. Your therapist will confirm the session, and you'll receive notifications about your appointment status. The system supports pediatric occupational therapy sessions with play-based interventions."
    },
    {
      question: "How do I view my therapy progress and daily notes?",
      answer: "Access the Daily Notes section to read detailed session summaries from your therapist. You can view activities performed, progress observations, and therapist recommendations. The Progress section shows your developmental milestones and therapy journey with visual charts and achievement tracking."
    },
    {
      question: "What are home exercises and how do I complete them?",
      answer: "Home exercises are personalized play-based activities assigned by your therapist to support your development outside of sessions. Access them in the Home Exercises section where you can view instructions, track completion, and submit proof of activities. The system includes timers and progress tracking for each exercise."
    },
    {
      question: "How do I track my therapy progress and achievements?",
      answer: "The Progress section provides comprehensive tracking of your therapy journey. View your developmental milestones, treatment plan progress, and achievement badges. The system shows visual progress indicators and celebrates your accomplishments in age-appropriate activities and skills development."
    },
    {
      question: "How do I manage my appointments and schedule?",
      answer: "The Appointments section shows your upcoming sessions with an interactive calendar view. You can view session details, reschedule appointments (with advance notice), and receive automatic reminders. The system integrates with notification features to keep you informed about your therapy schedule."
    },
    {
      question: "How do I receive notifications and stay updated?",
      answer: "The system provides multiple notification options: push notifications for real-time browser alerts, SMS reminders for appointments (Philippine number support), and email updates. You can configure your notification preferences in the Settings section to receive updates about appointments, progress reports, and therapy activities."
    },
    {
      question: "How do I access my therapy reports and documents?",
      answer: "View your progress reports and therapy documents in the Progress Reports section. You can download files, view uploaded assessments, and access therapy summaries. All documents are securely stored and organized by date for easy reference and sharing with family members or other healthcare providers."
    },
    {
      question: "How does the pediatric therapy focus benefit me?",
      answer: "TherapEase is specifically designed for pediatric occupational therapy (ages 0-21) with play-based interventions, developmental milestone tracking, and family-centered care. The system supports your growth through age-appropriate activities, sensory processing support, and educational integration to help you succeed in school and daily life."
    }
  ];

  const quickActions = [
    {
      title: "Book Session",
      description: "Schedule your next therapy session",
      icon: Calendar,
      action: () => window.location.href = '/patient/appointments'
    },
    {
      title: "View Progress",
      description: "Track your therapy progress",
      icon: Target,
      action: () => window.location.href = '/patient/progress'
    },
    {
      title: "Daily Notes",
      description: "Read your session notes",
      icon: FileText,
      action: () => window.location.href = '/patient/daily-notes'
    },
    {
      title: "Home Exercises",
      description: "Complete assigned exercises",
      icon: Target,
      action: () => window.location.href = '/patient/home-exercises'
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">How can we help you?</h1>
        <p className="text-sm sm:text-base lg:text-xl text-gray-600 max-w-2xl mx-auto">
          Find answers to common questions, get support, and learn how to make the most of your TherapEase patient portal for pediatric occupational therapy.
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
            className="w-full pl-12 pr-4 py-3 sm:py-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base lg:text-lg"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-16">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-8 text-center">Quick Actions</h2>
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

export default PatientHelp;
