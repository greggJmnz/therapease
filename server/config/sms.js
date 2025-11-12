/**
 * SMS Configuration for TherapEase
 * PhilSMS Service Configuration
 */

module.exports = {
  // SMS Service Settings
  enabled: process.env.SMS_ENABLED === 'true',
  
  // PhilSMS API Configuration
  philsms: {
    apiToken: process.env.PHILSMS_API_TOKEN,
    baseUrl: process.env.PHILSMS_BASE_URL || 'https://dashboard.philsms.com/api/v3',
    // Sender ID is optional - only set if registered and approved with PhilSMS
    // IMPORTANT: Default SID "PhilSMS" only works for Globe subscribers, not Smart.
    // To ensure delivery across all networks, register your own Sender ID.
    // Contact support@philsms.com for Sender ID registration.
    senderId: process.env.PHILSMS_SENDER_ID || null
  },

  // SMS Templates - Appointment Reminders Only
  templates: {
    appointmentReminder: (name, type, date, time, therapistName) => 
      `Hi ${name}! Reminder: You have a ${type} appointment with ${therapistName} on ${date} at ${time}. TherapEase Team`
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
