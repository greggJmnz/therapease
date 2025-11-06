const axios = require('axios');
const { validatePhilippineNumber } = require('../utils/phoneValidation');

/**
 * PhilSMS Service for TherapEase
 * Handles appointment reminder SMS notifications through PhilSMS API
 */
class SMSService {
  constructor() {
    this.loadConfig();
  }

  /**
   * Load configuration from environment variables
   * Can be called to reload config after environment changes
   */
  loadConfig() {
    this.apiToken = process.env.PHILSMS_API_TOKEN;
    this.baseUrl = process.env.PHILSMS_BASE_URL || 'https://app.philsms.com/api/v3';
    // Sender ID is optional - only use if set in environment
    this.senderId = process.env.PHILSMS_SENDER_ID || null;
    this.enabled = process.env.SMS_ENABLED === 'true' && !!this.apiToken;
    
    if (!this.enabled) {
      console.warn('SMS Service disabled: Missing PHILSMS_API_TOKEN or SMS_ENABLED=false');
    } else if (!this.senderId) {
      console.warn('SMS Service: PHILSMS_SENDER_ID not set. Messages will be sent without sender ID.');
      console.warn('Note: To register a Sender ID, visit https://app.philsms.com and request approval.');
    } else {
      console.log('✅ SMS Service enabled and configured');
    }
  }

  /**
   * Get current service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      enabled: this.enabled,
      hasApiToken: !!this.apiToken,
      baseUrl: this.baseUrl,
      hasSenderId: !!this.senderId,
      senderId: this.senderId
    };
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number (international format)
   * @param {string} message - SMS message content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - API response
   */
  async sendSMS(to, message, options = {}) {
    if (!this.enabled) {
      console.log(`SMS (disabled): ${to} - ${message}`);
      return { success: false, message: 'SMS service disabled' };
    }

    // Initialize formattedNumber early to avoid scope issues
    let formattedNumber = null;

    try {
      // Validate phone number format (prioritize Philippine numbers)
      formattedNumber = this.formatPhoneNumberForPhilSMS(to);
      
      // If it's a Philippine number, use specialized validation
      if (to.includes('9') && (to.startsWith('09') || to.startsWith('+639') || to.startsWith('639'))) {
        const phValidation = validatePhilippineNumber(to);
        if (phValidation.valid) {
          formattedNumber = this.formatPhoneNumberForPhilSMS(phValidation.formatted);
        } else {
          throw new Error(`Invalid Philippine phone number: ${phValidation.error}`);
        }
      } else if (!formattedNumber) {
        throw new Error('Invalid phone number format');
      }

      // Build payload - only include sender_id if it's set and approved
      const payload = {
        recipient: formattedNumber,
        message: message
      };
      
      // Only include sender_id if it's set (either from options or environment)
      // Note: If sender ID is not approved, don't include it (PhilSMS will use default)
      const senderId = options.sender_id || this.senderId;
      // Only add sender_id if it's explicitly set and not empty
      // If sender ID is not approved, PhilSMS will use their default
      if (senderId && senderId.trim() && senderId.trim() !== 'TherapEase') {
        // Only use approved sender IDs (e.g., "PhilSMS" or other approved ones)
        payload.sender_id = senderId.trim();
      }
      // If senderId is "TherapEase" and it's not approved, don't include it

      const response = await axios.post(
        `${this.baseUrl}/sms/send`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // PhilSMS response format may vary, handle both success and error cases
      if (response.data) {
        // Check for success indicators in response
        const messageId = response.data.id || response.data.message_id || response.data.messageId || 
                         response.data.uuid || response.data.message_uuid;
        
        if (messageId || response.data.success !== false) {
          return {
            success: true,
            messageId: messageId || 'unknown',
            status: response.data.status || 'sent',
            to: formattedNumber,
            message: message,
            data: response.data
          };
        }
      }

      throw new Error('No message data in response');

    } catch (error) {
      console.error('SMS send error:', error.response?.data || error.message);
      const errorNumber = formattedNumber || this.formatPhoneNumberForPhilSMS(to) || to;
      
      // Check if error is related to sender_id
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      const errorString = JSON.stringify(error.response?.data || error.message || '').toLowerCase();
      
      if (errorString.includes('sender') || errorString.includes('sender_id') || errorString.includes('sender id')) {
        console.warn('⚠️  Sender ID error detected. If PHILSMS_SENDER_ID is not approved,');
        console.warn('   you may need to register it at https://app.philsms.com or remove it from .env.production');
      }
      
      return {
        success: false,
        error: errorMessage,
        to: errorNumber,
        message: message,
        details: error.response?.data || null
      };
    }
  }

  /**
   * Send appointment reminder SMS
   * @param {Object} appointment - Appointment details
   * @param {string} recipientPhone - Recipient phone number
   * @param {string} recipientName - Recipient name
   * @returns {Promise<Object>} - API response
   */
  async sendAppointmentReminder(appointment, recipientPhone, recipientName) {
    const message = `Hi ${recipientName}! Reminder: You have a ${appointment.type} appointment with ${appointment.therapistName} on ${appointment.appointmentDate} at ${appointment.startTime}. TherapEase Team`;
    
    return await this.sendSMS(recipientPhone, message);
  }

  /**
   * Format phone number for PhilSMS API (needs 639XXXXXXXXX format, no +)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string|null} - Formatted phone number or null if invalid
   */
  formatPhoneNumberForPhilSMS(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Philippine mobile number patterns for PhilSMS
    // PhilSMS expects format: 639XXXXXXXXX (12 digits, no +)
    
    // If it's 11 digits and starts with 09, convert to 639XXXXXXXXX
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
      return `63${cleaned.substring(1)}`; // Convert 09XX to 639XX
    }
    
    // If it's 12 digits and starts with 639, it's already correct
    if (cleaned.length === 12 && cleaned.startsWith('639')) {
      return cleaned;
    }
    
    // If it's 10 digits and starts with 9, add 63 prefix
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `63${cleaned}`;
    }
    
    // If it starts with +63, remove the + and return
    if (phoneNumber.startsWith('+63')) {
      return phoneNumber.replace('+', '');
    }
    
    // If it's already 12 digits starting with 63, return as is
    if (cleaned.length === 12 && cleaned.startsWith('63')) {
      return cleaned;
    }
    
    // For other international numbers, try to format
    // If it starts with +1 (US/Canada), remove + and return
    if (phoneNumber.startsWith('+1')) {
      return phoneNumber.replace('+', '');
    }
    
    // If it already starts with +, remove + and return
    if (phoneNumber.startsWith('+')) {
      return phoneNumber.replace('+', '');
    }
    
    // If it starts with country code, return as is
    if (cleaned.length >= 10) {
      return cleaned;
    }
    
    return null;
  }

  /**
   * Format phone number to international format (for display/logging)
   * @param {string} phoneNumber - Phone number to format
   * @returns {string|null} - Formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return null;
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Philippine mobile number patterns
    // 09XX-XXX-XXXX (11 digits starting with 09)
    // +639XX-XXX-XXXX (13 digits starting with +639)
    // 639XX-XXX-XXXX (12 digits starting with 639)
    
    // If it's 11 digits and starts with 09, it's a Philippine mobile
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
      return `+63${cleaned.substring(1)}`; // Convert 09XX to +639XX
    }
    
    // If it's 12 digits and starts with 639, it's a Philippine mobile
    if (cleaned.length === 12 && cleaned.startsWith('639')) {
      return `+${cleaned}`;
    }
    
    // If it's 10 digits and starts with 9, it's a Philippine mobile without 0
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return `+63${cleaned}`;
    }
    
    // If it already starts with +63, it's already formatted Philippine number
    if (phoneNumber.startsWith('+63')) {
      return phoneNumber;
    }
    
    // US number patterns
    // If it starts with 1 and is 11 digits, it's US number
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    
    // If it's 10 digits, assume US number and add +1
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    }
    
    // If it already starts with +, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }
    
    // If it starts with country code, add +
    if (cleaned.length >= 10) {
      return `+${cleaned}`;
    }
    
    return null;
  }

  /**
   * Get SMS delivery status
   * @param {string} messageId - Message ID to check
   * @returns {Promise<Object>} - Delivery status
   */
  async getDeliveryStatus(messageId) {
    if (!this.enabled) {
      return { success: false, message: 'SMS service disabled' };
    }

    try {
      // PhilSMS API endpoint for delivery status (may vary based on their API)
      const response = await axios.get(
        `${this.baseUrl}/sms/status/${messageId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        status: response.data.status || response.data.delivery_status || 'unknown',
        data: response.data
      };

    } catch (error) {
      console.error('SMS delivery status error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get SMS account balance
   * @returns {Promise<Object>} - Account balance
   */
  async getAccountBalance() {
    if (!this.enabled) {
      return { success: false, message: 'SMS service disabled' };
    }

    try {
      // PhilSMS API endpoint for account balance (may vary based on their API)
      const response = await axios.get(
        `${this.baseUrl}/account/balance`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Accept': 'application/json'
          }
        }
      );

      // Try multiple possible response formats
      const balanceData = response.data;
      let balance = 0;
      let currency = 'PHP';

      // Check various possible fields for balance
      if (typeof balanceData === 'number') {
        balance = balanceData;
      } else if (balanceData.balance !== undefined) {
        balance = parseFloat(balanceData.balance) || 0;
      } else if (balanceData.credits !== undefined) {
        balance = parseFloat(balanceData.credits) || 0;
      } else if (balanceData.value !== undefined) {
        balance = parseFloat(balanceData.value) || 0;
      } else if (balanceData.amount !== undefined) {
        balance = parseFloat(balanceData.amount) || 0;
      } else if (balanceData.data && balanceData.data.balance !== undefined) {
        balance = parseFloat(balanceData.data.balance) || 0;
      } else if (balanceData.data && balanceData.data.credits !== undefined) {
        balance = parseFloat(balanceData.data.credits) || 0;
      }

      // Check for currency
      if (balanceData.currency) {
        currency = balanceData.currency;
      } else if (balanceData.data && balanceData.data.currency) {
        currency = balanceData.data.currency;
      }

      return {
        success: true,
        balance: balance,
        currency: currency,
        raw: balanceData // Include raw response for debugging
      };

    } catch (error) {
      console.error('SMS balance error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Test SMS service connectivity
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    if (!this.enabled) {
      return { success: false, message: 'SMS service disabled' };
    }

    try {
      const balance = await this.getAccountBalance();
      return {
        success: balance.success,
        message: balance.success ? 'SMS service connected' : 'SMS service connection failed',
        balance: balance.balance,
        currency: balance.currency
      };

    } catch (error) {
      return {
        success: false,
        message: 'SMS service test failed',
        error: error.message
      };
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

module.exports = smsService;
