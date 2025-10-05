const axios = require('axios');
const { validatePhilippineNumber } = require('../utils/phoneValidation');

/**
 * Vonage SMS Service for TherapEase
 * Handles appointment reminder SMS notifications through Vonage API
 */
class SMSService {
  constructor() {
    this.apiKey = process.env.VONAGE_API_KEY;
    this.apiSecret = process.env.VONAGE_API_SECRET;
    this.baseUrl = process.env.VONAGE_BASE_URL || 'https://api.nexmo.com';
    this.fromNumber = process.env.VONAGE_FROM_NUMBER || 'TherapEase';
    this.enabled = process.env.SMS_ENABLED === 'true' && !!this.apiKey && !!this.apiSecret;
    
    if (!this.enabled) {
      console.warn('SMS Service disabled: Missing VONAGE_API_KEY, VONAGE_API_SECRET or SMS_ENABLED=false');
    }
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

    try {
      // Validate phone number format (prioritize Philippine numbers)
      let formattedNumber = this.formatPhoneNumber(to);
      
      // If it's a Philippine number, use specialized validation
      if (to.includes('9') && (to.startsWith('09') || to.startsWith('+639') || to.startsWith('639'))) {
        const phValidation = validatePhilippineNumber(to);
        if (phValidation.valid) {
          formattedNumber = phValidation.formatted;
        } else {
          throw new Error(`Invalid Philippine phone number: ${phValidation.error}`);
        }
      } else if (!formattedNumber) {
        throw new Error('Invalid phone number format');
      }

      const payload = {
        from: this.fromNumber,
        to: formattedNumber,
        text: message,
        ...options
      };

      const response = await axios.post(
        `${this.baseUrl}/v0.1/messages`,
        payload,
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret
          },
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data && response.data.message_uuid) {
        return {
          success: true,
          messageId: response.data.message_uuid,
          status: 'accepted',
          to: formattedNumber,
          message: message
        };
      }

      throw new Error('No message data in response');

    } catch (error) {
      console.error('SMS send error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        to: formattedNumber,
        message: message
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
    
    return await this.sendSMS(recipientPhone, message, {
      notifyUrl: `${process.env.API_BASE_URL}/api/notifications/sms/delivery-status`
    });
  }

  /**
   * Format phone number to international format
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
      const response = await axios.get(
        `${this.baseUrl}/v0.1/messages/${messageId}`,
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        status: response.data.status || 'unknown',
        data: response.data
      };

    } catch (error) {
      console.error('SMS delivery status error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
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
      const response = await axios.get(
        `${this.baseUrl}/account/balance`,
        {
          auth: {
            username: this.apiKey,
            password: this.apiSecret
          },
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        balance: response.data.value,
        currency: response.data.currency || 'EUR'
      };

    } catch (error) {
      console.error('SMS balance error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || error.message
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
