const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // For development/testing, we'll use Gmail SMTP
    // In production, you should use a proper email service like SendGrid, AWS SES, etc.
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password' // Use App Password for Gmail
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('Email service configuration error:', error);
      } else {
        console.log('✅ Email service is ready to send messages');
      }
    });
  }

  async sendPasswordResetEmail(email, resetToken, userFirstName = 'User') {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: {
          name: 'TherapEase Support',
          address: process.env.EMAIL_USER || 'noreply@therapease.com'
        },
        to: email,
        subject: 'Password Reset Request - TherapEase',
        html: this.getPasswordResetEmailTemplate(userFirstName, resetLink),
        text: this.getPasswordResetEmailText(userFirstName, resetLink)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendWelcomeEmail(email, userFirstName, userRole) {
    try {
      const mailOptions = {
        from: {
          name: 'TherapEase Team',
          address: process.env.EMAIL_USER || 'noreply@therapease.com'
        },
        to: email,
        subject: 'Welcome to TherapEase!',
        html: this.getWelcomeEmailTemplate(userFirstName, userRole),
        text: this.getWelcomeEmailText(userFirstName, userRole)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
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
      await this.transporter.verify();
      return { success: true, message: 'Email service is properly configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
