const emailService = require('../services/emailService');

// Handle contact form submission from public website
const submitContactForm = async (req, res) => {
  try {
    const { name, email, phone, inquiryType, subject, message, newsletter, userAgent, referrer, pageUrl } = req.body;

    // Validate required fields (phone, inquiryType, newsletter, privacy are optional)
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'Please fill in all required fields (name, email, subject, message)'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Prepare email content (inquiryType is optional)
    const inquiryTypeLabels = {
      demo: 'Schedule a Demo',
      pricing: 'Pricing Information',
      support: 'Technical Support',
      partnership: 'Partnership Inquiry',
      general: 'General Question'
    };

    const inquiryLabel = inquiryType ? (inquiryTypeLabels[inquiryType] || inquiryType) : 'General Inquiry';

    // Create HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission - TherapEase</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .field { margin: 15px 0; }
          .label { font-weight: bold; color: #4F46E5; }
          .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .meta-info { background: #e5e7eb; padding: 10px; border-radius: 4px; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Name:</div>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <div class="label">Email:</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${phone ? `
            <div class="field">
              <div class="label">Phone:</div>
              <div class="value">${phone}</div>
            </div>
            ` : ''}
            ${inquiryType ? `
            <div class="field">
              <div class="label">Inquiry Type:</div>
              <div class="value">${inquiryLabel}</div>
            </div>
            ` : ''}
            <div class="field">
              <div class="label">Subject:</div>
              <div class="value">${subject}</div>
            </div>
            <div class="field">
              <div class="label">Message:</div>
              <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
            ${newsletter ? '<div class="field"><div class="label">Newsletter:</div><div class="value">Subscribed</div></div>' : ''}
            <div class="meta-info">
              <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC</p>
              ${userAgent ? `<p><strong>User Agent:</strong> ${userAgent}</p>` : ''}
              ${pageUrl ? `<p><strong>Page URL:</strong> ${pageUrl}</p>` : ''}
              ${referrer ? `<p><strong>Referrer:</strong> ${referrer}</p>` : ''}
            </div>
          </div>
          <div class="footer">
            <p>This email was sent from the TherapEase public website contact form</p>
            <p>© ${new Date().getFullYear()} TherapEase. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create plain text version
    const textContent = `
New Contact Form Submission - TherapEase

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ''}${inquiryType ? `Inquiry Type: ${inquiryLabel}\n` : ''}Subject: ${subject}

Message:
${message}

${newsletter ? 'Newsletter: Subscribed\n' : ''}
---
Submitted: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
${userAgent ? `User Agent: ${userAgent}\n` : ''}
${pageUrl ? `Page URL: ${pageUrl}\n` : ''}
${referrer ? `Referrer: ${referrer}\n` : ''}
    `.trim();

    // Send email to therapease16@gmail.com
    const recipientEmail = 'therapease16@gmail.com';
    const emailSubject = inquiryType ? `Contact Form: ${inquiryLabel} - ${subject}` : `Contact Form: ${subject}`;

    let emailResult;
    
    // Use SendGrid API if configured
    if (emailService.useSendGridAPI) {
      emailResult = await emailService.sendViaSendGridAPI(
        recipientEmail,
        emailSubject,
        htmlContent,
        textContent,
        process.env.EMAIL_FROM || 'therapease16@gmail.com'
      );
    } else {
      // Use SMTP
      if (!emailService.transporter) {
        return res.status(503).json({
          success: false,
          error: 'Email service is not configured. Please contact support directly at therapease16@gmail.com'
        });
      }

      const mailOptions = {
        from: {
          name: 'TherapEase Contact Form',
          address: process.env.EMAIL_USER || process.env.EMAIL_FROM || 'therapease16@gmail.com'
        },
        to: recipientEmail,
        replyTo: email, // Allow replying directly to the sender
        subject: emailSubject,
        html: htmlContent,
        text: textContent
      };

      try {
        const result = await emailService.transporter.sendMail(mailOptions);
        emailResult = { success: true, messageId: result.messageId };
      } catch (error) {
        console.error('Error sending contact form email:', error);
        emailResult = { success: false, error: error.message };
      }
    }

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      });
    } else {
      console.error('Failed to send contact form email:', emailResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to send your message. Please try again later or contact us directly at therapease16@gmail.com'
      });
    }
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred while processing your request. Please try again later.'
    });
  }
};

module.exports = {
  submitContactForm
};

