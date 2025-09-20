# 📱 SMS Integration with Infobip - TherapEase

## Overview

TherapEase now includes comprehensive SMS notification capabilities powered by Infobip's SMS API. This integration allows the system to send automated SMS notifications for appointments, assessments, progress updates, and system alerts.

## 🚀 Features

### 🇵🇭 Philippine Phone Number Support
- **Local Format**: 09XX-XXX-XXXX (e.g., 09123456789)
- **International Format**: +639XX-XXX-XXXX (e.g., +639123456789)
- **Without + Prefix**: 639XX-XXX-XXXX (e.g., 639123456789)
- **Without 0 Prefix**: 9XX-XXX-XXXX (e.g., 9123456789)
- **Carrier Detection**: Automatic identification of Globe, Smart, DITO
- **Format Validation**: Comprehensive validation with helpful error messages

### Core SMS Capabilities
- **Appointment Reminders**: Automated SMS reminders for upcoming appointments
- **Assessment Notifications**: SMS alerts for due assessments
- **Progress Updates**: SMS notifications for progress milestones
- **Daily Notes Alerts**: SMS when new daily notes are available
- **System Alerts**: Critical system notifications via SMS
- **Delivery Tracking**: Real-time SMS delivery status monitoring
- **Account Management**: SMS balance and usage tracking

### Technical Features
- **International Support**: Global phone number formatting
- **Delivery Reports**: Webhook integration for delivery status
- **Error Handling**: Comprehensive error management and retry logic
- **Rate Limiting**: Built-in rate limiting and timeout handling
- **Template System**: Pre-built message templates for different notification types

## 🔧 Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# SMS Configuration
SMS_ENABLED=true
INFOBIP_API_KEY=your_infobip_api_key_here
INFOBIP_BASE_URL=https://api.infobip.com
INFOBIP_SENDER_ID=TherapEase
API_BASE_URL=http://localhost:3000
```

### Infobip Account Setup

1. **Create Infobip Account**: Sign up at [infobip.com](https://www.infobip.com)
2. **Get API Key**: Generate your API key from the Infobip dashboard
3. **Configure Sender ID**: Set up your sender ID (e.g., "TherapEase")
4. **Add Webhook URL**: Configure delivery status webhook: `https://yourdomain.com/api/notifications/sms/delivery-status`

## 📊 Database Schema Updates

The notifications table has been enhanced to support SMS tracking:

```sql
ALTER TABLE notifications ADD COLUMN relatedId INT;
ALTER TABLE notifications ADD COLUMN smsMessageId VARCHAR(255);
ALTER TABLE notifications ADD COLUMN smsStatus ENUM('pending', 'sent', 'delivered', 'failed', 'error') DEFAULT NULL;
ALTER TABLE notifications ADD COLUMN smsSentAt TIMESTAMP NULL;
ALTER TABLE notifications ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
```

## 🛠️ API Endpoints

### SMS Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/notifications/sms/send` | Send SMS notification | Admin |
| GET | `/api/notifications/sms/delivery-status/:messageId` | Get delivery status | User |
| GET | `/api/notifications/sms/balance` | Get account balance | Admin |
| GET | `/api/notifications/sms/test` | Test SMS service | Admin |
| POST | `/api/notifications/sms/delivery-status` | Webhook for delivery status | None |

### Example API Usage

#### Send SMS Notification
```bash
POST /api/notifications/sms/send
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "phoneNumber": "+1234567890",
  "message": "Your appointment reminder",
  "type": "appointment"
}
```

#### Get Delivery Status
```bash
GET /api/notifications/sms/delivery-status/12345678-1234-1234-1234-123456789012
Authorization: Bearer <user_token>
```

## 💻 Code Integration

### Using SMS Service in Controllers

```javascript
const smsService = require('../services/smsService');

// Send appointment reminder
const result = await smsService.sendAppointmentReminder(
  appointment, 
  recipientPhone, 
  recipientName
);

// Send custom SMS
const result = await smsService.sendSMS(
  '+1234567890', 
  'Your custom message'
);
```

### Creating Notifications with SMS

```javascript
const notificationController = require('../controllers/notificationController');

// Create notification with SMS
const notificationId = await notificationController.createNotification(
  userId,
  'Appointment Reminder',
  'You have an appointment tomorrow',
  'appointment',
  {
    sendSMS: true,
    phoneNumber: '+1234567890',
    relatedId: appointmentId
  }
);
```

## 📱 SMS Templates

### Pre-built Templates

1. **Appointment Reminder**
   ```
   Hi {name}! Reminder: You have a {type} appointment on {date} at {time}. TherapEase Team
   ```

2. **Assessment Due**
   ```
   Hi {name}! Assessment "{title}" for {patientName} is due on {date}. Please complete it soon. TherapEase Team
   ```

3. **Progress Update**
   ```
   Hi {name}! Progress update: {area} area shows {status}. Check your TherapEase dashboard for details. TherapEase Team
   ```

4. **Daily Notes Notification**
   ```
   Hi {name}! New daily notes from your session on {date} are now available. Check your TherapEase dashboard. TherapEase Team
   ```

## 🔄 Webhook Integration

### Delivery Status Webhook

Infobip will send delivery status updates to your webhook URL:

```javascript
// Webhook payload example
{
  "results": [
    {
      "messageId": "12345678-1234-1234-1234-123456789012",
      "status": {
        "groupId": 3,
        "groupName": "DELIVERED",
        "id": 5,
        "name": "DELIVERED_TO_HANDSET",
        "description": "Message delivered to handset"
      }
    }
  ]
}
```

### Webhook Configuration

1. **URL**: `https://yourdomain.com/api/notifications/sms/delivery-status`
2. **Method**: POST
3. **Content-Type**: application/json
4. **Authentication**: None (webhook endpoint is public)

## 🧪 Testing

### Test SMS Service

```bash
# Test SMS connectivity
GET /api/notifications/sms/test
Authorization: Bearer <admin_token>
```

### Test SMS Sending

```bash
# Send test SMS (US number)
POST /api/notifications/sms/send
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "phoneNumber": "+1234567890",
  "message": "Test message from TherapEase",
  "type": "test"
}
```

### Test Philippine SMS

```bash
# Send test SMS (Philippine number)
POST /api/notifications/sms/send
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "phoneNumber": "09123456789",
  "message": "Test message from TherapEase for Philippine numbers",
  "type": "test"
}
```

### Test Philippine Phone Number Validation

```bash
# Test Philippine phone number validation
npm run sms:test-ph

# Test with specific Philippine number
TEST_PHONE_NUMBER=09123456789 npm run sms:test-ph
```

## 📊 Monitoring and Analytics

### SMS Metrics

- **Delivery Rate**: Percentage of successfully delivered messages
- **Failure Rate**: Percentage of failed message deliveries
- **Response Time**: Average time for SMS delivery
- **Cost Tracking**: SMS usage and cost monitoring

### Logging

All SMS activities are logged with:
- Message ID
- Recipient phone number (masked)
- Delivery status
- Timestamp
- Error details (if any)

## 🚨 Error Handling

### Common Error Scenarios

1. **Invalid Phone Number**: Automatically formatted or rejected
2. **API Rate Limits**: Automatic retry with exponential backoff
3. **Network Timeouts**: Configurable timeout and retry logic
4. **Insufficient Balance**: Account balance monitoring and alerts
5. **Invalid API Key**: Authentication error handling

### Error Response Format

```javascript
{
  "success": false,
  "error": "Invalid phone number format",
  "code": "INVALID_PHONE",
  "details": {
    "phoneNumber": "+1234567890",
    "formattedNumber": null
  }
}
```

## 🔒 Security Considerations

### Data Protection
- Phone numbers are masked in logs
- SMS content is not stored in plain text
- API keys are stored securely in environment variables

### Rate Limiting
- Built-in rate limiting to prevent abuse
- Configurable retry delays
- Maximum retry attempts

### Authentication
- Admin-only access for SMS management
- User authentication for delivery status
- Webhook endpoint is public but validates payload

## 📈 Performance Optimization

### Caching
- SMS templates are cached in memory
- Delivery status is cached for quick access
- Account balance is cached with TTL

### Batch Processing
- Multiple SMS can be sent in batches
- Queue-based processing for high volume
- Asynchronous processing for better performance

## 🛠️ Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check API key configuration
   - Verify phone number format
   - Check account balance
   - Review error logs

2. **Delivery Status Not Updating**
   - Verify webhook URL configuration
   - Check webhook endpoint accessibility
   - Review webhook payload format

3. **High Failure Rate**
   - Check phone number validity
   - Review message content for compliance
   - Verify sender ID configuration

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG_SMS=true
```

## 📚 Additional Resources

- [Infobip SMS API Documentation](https://www.infobip.com/docs/api/channels/sms)
- [Phone Number Formatting Guide](https://www.infobip.com/docs/api/channels/sms/send-sms-message)
- [Webhook Configuration Guide](https://www.infobip.com/docs/api/channels/sms/sms-webhooks)
- [Error Codes Reference](https://www.infobip.com/docs/api/channels/sms/sms-error-codes)

## 🔄 Migration Guide

### From Mock SMS to Infobip

1. **Install Dependencies**: `npm install axios`
2. **Update Environment**: Add Infobip configuration
3. **Run Database Migration**: Update notifications table
4. **Test Integration**: Use test endpoints
5. **Configure Webhooks**: Set up delivery status webhook
6. **Monitor Usage**: Track SMS usage and costs

### Rollback Plan

If issues arise:
1. Set `SMS_ENABLED=false` to disable SMS
2. System will continue with web notifications only
3. Review logs and fix issues
4. Re-enable SMS when ready

---

## 📞 Support

For SMS integration support:
- **Technical Issues**: Check logs and error messages
- **Infobip Support**: Contact Infobip support for API issues
- **TherapEase Support**: Contact development team for integration issues

---

*Last updated: January 2024*
*Version: 1.0.0*
