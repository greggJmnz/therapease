/**
 * SMS Configuration for TherapEase
 * Infobip SMS Service Configuration
 */

module.exports = {
  // SMS Service Settings
  enabled: process.env.SMS_ENABLED === 'true',
  
  // Infobip API Configuration
  infobip: {
    apiKey: process.env.INFOBIP_API_KEY,
    baseUrl: process.env.INFOBIP_BASE_URL || 'https://api.infobip.com',
    senderId: process.env.INFOBIP_SENDER_ID || 'TherapEase'
  },

  // SMS Templates
  templates: {
    appointmentReminder: (name, type, date, time) => 
      `Hi ${name}! Reminder: You have a ${type} appointment on ${date} at ${time}. TherapEase Team`,
    
    assessmentDue: (name, title, patientName, date) => 
      `Hi ${name}! Assessment "${title}" for ${patientName} is due on ${date}. Please complete it soon. TherapEase Team`,
    
    progressUpdate: (name, area, status) => 
      `Hi ${name}! Progress update: ${area} area shows ${status}. Check your TherapEase dashboard for details. TherapEase Team`,
    
    dailyNotesNotification: (name, date) => 
      `Hi ${name}! New daily notes from your session on ${date} are now available. Check your TherapEase dashboard. TherapEase Team`,
    
    systemAlert: (name, message) => 
      `Hi ${name}! System Alert: ${message} - TherapEase Team`,
    
    welcomeMessage: (name) => 
      `Welcome to TherapEase, ${name}! Your account has been created successfully. TherapEase Team`,
    
    passwordReset: (name, resetCode) => 
      `Hi ${name}! Your password reset code is: ${resetCode}. This code expires in 15 minutes. TherapEase Team`
  },

  // SMS Settings
  settings: {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
    maxMessageLength: 160,
    deliveryReportUrl: `${process.env.API_BASE_URL}/api/notifications/sms/delivery-status`
  },

  // Phone Number Validation
  phoneValidation: {
    // Supported country codes
    supportedCountries: ['US', 'CA', 'GB', 'AU', 'PH'],
    
    // Phone number patterns
    patterns: {
      US: /^\+1[2-9]\d{9}$/,
      CA: /^\+1[2-9]\d{9}$/,
      GB: /^\+44[1-9]\d{8,9}$/,
      AU: /^\+61[2-9]\d{8}$/,
      PH: /^\+63[2-9]\d{9}$/  // Philippine mobile: +639XXXXXXXXX
    },
    
    // Philippine mobile number patterns
    philippinePatterns: {
      // 09XX-XXX-XXXX (11 digits starting with 09)
      local: /^09[2-9]\d{8}$/,
      // +639XX-XXX-XXXX (13 digits starting with +639)
      international: /^\+639[2-9]\d{8}$/,
      // 639XX-XXX-XXXX (12 digits starting with 639)
      withoutPlus: /^639[2-9]\d{8}$/,
      // 9XX-XXX-XXXX (10 digits starting with 9)
      withoutZero: /^9[2-9]\d{8}$/
    }
  }
};
