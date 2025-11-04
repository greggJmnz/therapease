const nodemailer = require('nodemailer');
const crypto = require('crypto');
const axios = require('axios');

class EmailService {
  constructor() {
    this.transporter = null;
    this.useSendGridAPI = false;
    this.sendGridAPIKey = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Check if email is enabled
    if (process.env.EMAIL_ENABLED === 'false') {
      this.transporter = null;
      return;
    }

    // Check if we should use SendGrid API instead of SMTP (when SMTP is blocked)
    // This check should happen BEFORE checking credentials, as API mode uses different auth
    if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
      const shouldUseAPI = process.env.EMAIL_USE_API === 'true' || 
                          (process.env.EMAIL_HOST === 'smtp.sendgrid.net' && process.env.EMAIL_USER === 'apikey');
      
      if (shouldUseAPI) {
        // Use SendGrid API instead of SMTP (works when SMTP ports are blocked)
        if (!process.env.EMAIL_PASSWORD) {
          this.transporter = null;
          return;
        }
        this.useSendGridAPI = true;
        this.sendGridAPIKey = process.env.EMAIL_PASSWORD;
        return; // Don't create SMTP transporter
      }
    }

    // For SMTP, check credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      this.transporter = null;
      return;
    }

    try {
      // Support multiple SMTP configurations
      // Priority: Custom SMTP config > Gmail service
      let smtpConfig;
      
      if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
        // Custom SMTP configuration (SendGrid, AWS SES, etc.)
        smtpConfig = {
          host: process.env.EMAIL_HOST,
          port: parseInt(process.env.EMAIL_PORT),
          secure: process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_PORT === '465',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          },
          // Longer timeout for SendGrid/other services
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 10000
        };
        
        // Add TLS options for STARTTLS
        if (!smtpConfig.secure && process.env.EMAIL_REQUIRE_TLS === 'true') {
          smtpConfig.requireTLS = true;
        }
      } else {
        // Default to Gmail SMTP service
        smtpConfig = {
      service: 'gmail',
      auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
          },
          // Shorter timeouts to fail fast
          connectionTimeout: 5000,
          greetingTimeout: 5000,
          socketTimeout: 5000
        };
      }
      
      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify connection configuration (non-blocking, with timeout)
      // Don't block initialization if verification fails
      const verifyPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000); // 5 second timeout for verification

    this.transporter.verify((error, success) => {
          clearTimeout(timeout);
      if (error) {
            console.error('Email service configuration error:', error.message);
            resolve(false);
      } else {
            resolve(true);
      }
    });
      });

      // Fire and forget - don't wait for verification
      verifyPromise.catch(() => {
        // Verification failed but transporter is still set
      });

    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  // Send email via SendGrid API (when SMTP is blocked)
  async sendViaSendGridAPI(email, subject, html, text, fromEmail = null) {
    try {
      if (!this.sendGridAPIKey) {
        throw new Error('SendGrid API key not configured');
      }

      const fromAddress = fromEmail || process.env.EMAIL_FROM || 'therapease16@gmail.com';
      
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{
            to: [{ email: email }],
            subject: subject
          }],
          from: {
            email: fromAddress,
            name: 'TherapEase Support'
          },
          content: [
            {
              type: 'text/plain',
              value: text
            },
            {
              type: 'text/html',
              value: html
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.sendGridAPIKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      return { success: true, messageId: response.headers['x-message-id'] || 'sent' };
    } catch (error) {
      if (error.response) {
        const errorMessage = error.response.data?.errors?.[0]?.message || error.response.statusText;
        
        // Provide helpful guidance for common SendGrid errors
        if (errorMessage.includes('verified Sender Identity') || errorMessage.includes('sender identity')) {
          throw new Error(
            `SendGrid sender identity not verified: The email address "${fromEmail || process.env.EMAIL_FROM || 'therapease16@gmail.com'}" needs to be verified in SendGrid. ` +
            `Visit https://app.sendgrid.com/settings/sender_auth/senders/new to verify your sender identity. ` +
            `After verification, update EMAIL_FROM in .env.production to match the verified address.`
          );
        }
        
        throw new Error(`SendGrid API error: ${errorMessage}`);
      }
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userFirstName = 'User') {
    try {
      // URL encode the token to ensure it's safely handled in the URL
      const encodedToken = encodeURIComponent(resetToken);
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${encodedToken}`;
      const html = this.getPasswordResetEmailTemplate(userFirstName, resetLink);
      const text = this.getPasswordResetEmailText(userFirstName, resetLink);
      
      // Use SendGrid API if configured (when SMTP is blocked)
      if (this.useSendGridAPI) {
        const result = await this.sendViaSendGridAPI(
          email,
          'Password Reset Request - TherapEase',
          html,
          text,
          process.env.EMAIL_FROM || 'therapease16@gmail.com'
        );
        return result;
      }

      // Check if email service is enabled
      if (!this.transporter && !this.useSendGridAPI) {
        return { 
          success: false, 
          error: 'Email service is disabled. Please enable email service in environment variables to send password reset emails.' 
        };
      }
      
      const mailOptions = {
        from: {
          name: 'TherapEase Support',
            address: process.env.EMAIL_USER || 'therapease16@gmail.com'
        },
        to: email,
        subject: 'Password Reset Request - TherapEase',
        html: html,
        text: text
      };

      // Add timeout to prevent long blocking - 5 seconds max
      const sendPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout - connection to email server failed or took too long')), 5000);
      });

      const result = await Promise.race([sendPromise, timeoutPromise]);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error.message);
      
      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.message.includes('timeout')) {
        errorMessage = 'Email service connection failed or timed out. This may be due to network restrictions, firewall blocking SMTP ports, or Gmail blocking the connection. Try using a different email service (SendGrid, AWS SES) or check your network settings.';
      } else if (error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed. Please check your EMAIL_USER and EMAIL_PASSWORD. For Gmail, use an app-specific password, not your regular password.';
      }
      
      return { success: false, error: errorMessage };
    }
  }

  async sendWelcomeEmail(email, userFirstName, userRole) {
    try {
      const html = this.getWelcomeEmailTemplate(userFirstName, userRole);
      const text = this.getWelcomeEmailText(userFirstName, userRole);
      
      // Use SendGrid API if configured
      if (this.useSendGridAPI) {
        const result = await this.sendViaSendGridAPI(
          email,
          'Welcome to TherapEase!',
          html,
          text,
          process.env.EMAIL_FROM || 'therapease16@gmail.com'
        );
        return result;
      }

      // Check if email service is enabled
      if (!this.transporter) {
        return { 
          success: false, 
          error: 'Email service is disabled. Please enable email service in environment variables to send welcome emails.' 
        };
      }

      const mailOptions = {
        from: {
          name: 'TherapEase Team',
            address: process.env.EMAIL_USER || 'therapease16@gmail.com'
        },
        to: email,
        subject: 'Welcome to TherapEase!',
        html: html,
        text: text
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  getPasswordResetEmailTemplate(firstName, resetLink) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - TherapEase</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>We received a request to reset your password for your TherapEase account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" class="button">Reset My Password</a>
            <div class="warning">
              <strong>⚠️ Important Security Information:</strong>
              <ul>
                <li>This link will expire in 24 hours</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetLink}</p>
            <p>If you have any questions, please contact our support team.</p>
            <p>Best regards,<br>The TherapEase Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from TherapEase - Your trusted occupational therapy platform</p>
            <p>© 2024 TherapEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPasswordResetEmailText(firstName, resetLink) {
    return `
Password Reset Request - TherapEase

Hello ${firstName}!

We received a request to reset your password for your TherapEase account.

To reset your password, please click the following link:
${resetLink}

Important Security Information:
- This link will expire in 24 hours
- If you didn't request this reset, please ignore this email
- Never share this link with anyone

If you have any questions, please contact our support team.

Best regards,
The TherapEase Team

---
This email was sent from TherapEase - Your trusted occupational therapy platform
© 2024 TherapEase. All rights reserved.
    `;
  }

  getWelcomeEmailTemplate(firstName, userRole) {
    const roleSpecificContent = {
      patient: {
        title: 'Welcome to Your Therapy Journey!',
        content: `
          <p>We're excited to have you join the TherapEase community! As a patient, you'll have access to:</p>
          <ul>
            <li>📋 Personalized assessment tools</li>
            <li>📅 Easy appointment scheduling</li>
            <li>📊 Progress tracking and reports</li>
            <li>🏠 Home exercise programs</li>
            <li>💬 Direct communication with your therapist</li>
          </ul>
        `
      },
      therapist: {
        title: 'Welcome to TherapEase Professional Platform!',
        content: `
          <p>Thank you for joining TherapEase! As a therapist, you'll have access to:</p>
          <ul>
            <li>👥 Patient management tools</li>
            <li>📝 Assessment and documentation features</li>
            <li>📈 Progress tracking and analytics</li>
            <li>🏠 Home exercise program creation</li>
            <li>📅 Appointment scheduling system</li>
          </ul>
        `
      },
      admin: {
        title: 'Welcome to TherapEase Administration!',
        content: `
          <p>Welcome to the TherapEase administrative platform! You have access to:</p>
          <ul>
            <li>👥 User management</li>
            <li>📊 System analytics and reports</li>
            <li>⚙️ Platform configuration</li>
            <li>🔒 Security and compliance tools</li>
            <li>📈 Performance monitoring</li>
          </ul>
        `
      }
    };

    const content = roleSpecificContent[userRole] || roleSpecificContent.patient;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TherapEase</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to TherapEase!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <h3>${content.title}</h3>
            ${content.content}
            <p>Ready to get started? Log in to your account and explore all the features available to you.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Log In to TherapEase</a>
            <p>If you have any questions or need assistance, our support team is here to help!</p>
            <p>Best regards,<br>The TherapEase Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from TherapEase - Your trusted occupational therapy platform</p>
            <p>© 2024 TherapEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWelcomeEmailText(firstName, userRole) {
    const roleSpecificContent = {
      patient: 'As a patient, you\'ll have access to personalized assessment tools, easy appointment scheduling, progress tracking, home exercise programs, and direct communication with your therapist.',
      therapist: 'As a therapist, you\'ll have access to patient management tools, assessment and documentation features, progress tracking and analytics, home exercise program creation, and appointment scheduling.',
      admin: 'As an admin, you\'ll have access to user management, system analytics and reports, platform configuration, security and compliance tools, and performance monitoring.'
    };

    const content = roleSpecificContent[userRole] || roleSpecificContent.patient;

    return `
Welcome to TherapEase!

Hello ${firstName}!

Welcome to TherapEase! We're excited to have you join our community.

${content}

Ready to get started? Log in to your account and explore all the features available to you.

Log in here: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/login

If you have any questions or need assistance, our support team is here to help!

Best regards,
The TherapEase Team

---
This email was sent from TherapEase - Your trusted occupational therapy platform
© 2024 TherapEase. All rights reserved.
    `;
  }

  // Generate a secure random token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Test email functionality
  async testEmailConnection() {
    try {
      if (!this.transporter) {
        return { 
          success: false, 
          error: 'Email service is disabled. Set EMAIL_ENABLED=true and provide EMAIL_USER and EMAIL_PASSWORD to enable email service.' 
        };
      }
      await this.transporter.verify();
      return { success: true, message: 'Email service is properly configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate a 6-digit 2FA code
  generate2FACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send 2FA verification code via email
  async send2FACodeEmail(email, code, userFirstName = 'User') {
    try {
      // Use SendGrid API if configured
      if (this.useSendGridAPI) {
        const html = this.get2FACodeEmailTemplate(code, userFirstName);
        const result = await this.sendViaSendGridAPI(
          email,
          'TherapEase - Your 2FA Login Code',
          html,
          `Your TherapEase login verification code is: ${code}`,
          'therapease16@gmail.com'
        );
        return {
          success: true,
          messageId: result.messageId,
          message: '2FA code sent successfully'
        };
      }

      // Check if email service is enabled
      if (!this.transporter) {
        return {
          success: false,
          error: 'Email service is disabled. Please enable email service in environment variables to use 2FA via email.'
        };
      }

      const mailOptions = {
        from: {
          name: 'TherapEase Support',
          address: 'therapease16@gmail.com'
        },
        to: email,
        subject: 'TherapEase - Your 2FA Login Code',
        html: this.get2FACodeEmailTemplate(code, userFirstName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: '2FA code sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send 2FA code email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send 2FA setup verification code
  async send2FASetupCodeEmail(email, code, userFirstName = 'User') {
    try {
      // Use SendGrid API if configured
      if (this.useSendGridAPI) {
        const html = this.get2FASetupCodeEmailTemplate(code, userFirstName);
        const result = await this.sendViaSendGridAPI(
          email,
          'TherapEase - Verify 2FA Setup',
          html,
          `Your 2FA setup verification code is: ${code}`,
          'therapease16@gmail.com'
        );
        return {
          success: true,
          messageId: result.messageId,
          message: '2FA setup code sent successfully'
        };
      }

      // Check if email service is enabled
      if (!this.transporter) {
        return {
          success: false,
          error: 'Email service is disabled. Please enable email service in environment variables to set up 2FA via email.'
        };
      }

      const mailOptions = {
        from: {
          name: 'TherapEase Support',
          address: 'therapease16@gmail.com'
        },
        to: email,
        subject: 'TherapEase - Verify 2FA Setup',
        html: this.get2FASetupCodeEmailTemplate(code, userFirstName)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: result.messageId,
        message: '2FA setup code sent successfully'
      };

    } catch (error) {
      console.error('❌ Failed to send 2FA setup code email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 2FA code email template
  get2FACodeEmailTemplate(code, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TherapEase - 2FA Login Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 3px solid #4F46E5; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
          .code { color: #4F46E5; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Your TherapEase login verification code is:</p>
            <div class="code-box">
              <h1 class="code">${code}</h1>
            </div>
            <div class="warning">
              <p><strong>⚠️ Important:</strong></p>
              <ul>
                <li>This code expires in <strong>10 minutes</strong></li>
                <li>Enter this code on the login page to complete your sign-in</li>
                <li>Never share this code with anyone</li>
              </ul>
            </div>
            <p>If you didn't request this login attempt, please ignore this email and consider changing your password.</p>
            <p>For security reasons, this code can only be used once.</p>
          </div>
          <div class="footer">
            <p>This email was sent from TherapEase - Your trusted occupational therapy platform</p>
            <p>© 2024 TherapEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // 2FA setup code email template
  get2FASetupCodeEmailTemplate(code, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TherapEase - Verify 2FA Setup</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 3px solid #10B981; padding: 25px; text-align: center; margin: 25px 0; border-radius: 8px; }
          .code { color: #10B981; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info { background: #EBF8FF; border: 1px solid #3B82F6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Enable Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>You're setting up Two-Factor Authentication for your TherapEase account. To complete the setup, please enter this verification code:</p>
            <div class="code-box">
              <h1 class="code">${code}</h1>
            </div>
            <div class="info">
              <p><strong>ℹ️ What happens next:</strong></p>
              <ul>
                <li>Enter this code in the setup form to verify your email</li>
                <li>Once verified, 2FA will be enabled for your account</li>
                <li>Future logins will require a code sent to your email</li>
                <li>This code expires in <strong>10 minutes</strong></li>
              </ul>
            </div>
            <p>If you didn't request to enable 2FA, please ignore this email and contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>This email was sent from TherapEase - Your trusted occupational therapy platform</p>
            <p>© 2024 TherapEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

}

module.exports = new EmailService();
