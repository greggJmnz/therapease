#!/usr/bin/env node

/**
 * Email Connection Test Script
 * Tests SMTP connectivity and email sending capabilities
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env.production') });

const nodemailer = require('nodemailer');

async function testSMTPConnection() {
  console.log('🔍 Testing Email Service Configuration...\n');

  // Check environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Missing email credentials:');
    console.error('   EMAIL_USER:', process.env.EMAIL_USER ? '✓ Set' : '✗ Missing');
    console.error('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✓ Set' : '✗ Missing');
    return;
  }

  console.log('📧 Email Configuration:');
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' : 'Not set');
  console.log('   EMAIL_ENABLED:', process.env.EMAIL_ENABLED || 'not set');
  console.log('');

  // Test different SMTP configurations
  const configs = [
    {
      name: 'Gmail SMTP (Port 587 - TLS)',
      config: {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000
      }
    },
    {
      name: 'Gmail SMTP (Port 465 - SSL)',
      config: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000
      }
    },
    {
      name: 'Gmail SMTP (Port 587 - STARTTLS)',
      config: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000
      }
    }
  ];

  for (const { name, config } of configs) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const transporter = nodemailer.createTransport(config);
      
      // Test connection
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
      ]);
      
      console.log(`✅ ${name}: Connection successful!`);
      
      // Test sending email
      console.log(`   Attempting to send test email...`);
      const info = await Promise.race([
        transporter.sendMail({
          from: `"TherapEase Test" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER, // Send to self
          subject: 'TherapEase Email Test',
          text: 'This is a test email from TherapEase.',
          html: '<p>This is a test email from TherapEase.</p>'
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Send timeout')), 5000))
      ]);
      
      console.log(`✅ ${name}: Test email sent successfully!`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`\n🎉 RECOMMENDED CONFIGURATION: ${name}`);
      console.log(`\nAdd to your .env.production file:`);
      console.log(`EMAIL_ENABLED=true`);
      if (config.service === 'gmail') {
        console.log(`# Using Gmail service`);
      } else {
        console.log(`EMAIL_HOST=${config.host}`);
        console.log(`EMAIL_PORT=${config.port}`);
        console.log(`EMAIL_SECURE=${config.secure || false}`);
      }
      return;
      
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
      if (error.code === 'ETIMEDOUT') {
        console.log(`   ⚠️ Connection timeout - Gmail may be blocking your server IP`);
        console.log(`   💡 Try: 1) Use app-specific password, 2) Allow less secure apps, 3) Use SendGrid instead`);
      } else if (error.code === 'ECONNREFUSED') {
        console.log(`   ⚠️ Connection refused - Check firewall settings`);
        console.log(`   💡 Ensure ports 587/465 are open: sudo ufw allow 587/tcp && sudo ufw allow 465/tcp`);
      } else if (error.code === 'EAUTH') {
        console.log(`   ⚠️ Authentication failed - Check credentials`);
        console.log(`   💡 For Gmail, use app-specific password, not regular password`);
      }
    }
  }

  console.log('\n❌ All SMTP configurations failed.');
  console.log('\n💡 Recommendations:');
  console.log('1. Check if firewall is blocking SMTP ports:');
  console.log('   sudo ufw status');
  console.log('   sudo ufw allow 587/tcp');
  console.log('   sudo ufw allow 465/tcp');
  console.log('');
  console.log('2. Test network connectivity:');
  console.log('   telnet smtp.gmail.com 587');
  console.log('   # Should connect, if not, firewall is blocking');
  console.log('');
  console.log('3. Use alternative email service:');
  console.log('   - SendGrid (recommended): https://sendgrid.com');
  console.log('   - AWS SES: https://aws.amazon.com/ses/');
  console.log('   - Mailgun: https://www.mailgun.com/');
  console.log('');
  console.log('4. For Gmail, ensure:');
  console.log('   - 2-Step Verification is enabled');
  console.log('   - App-specific password is used (not regular password)');
  console.log('   - Server IP is not on Gmail blacklist');
}

// Run test
testSMTPConnection().catch(console.error);

