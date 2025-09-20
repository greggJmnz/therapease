# 🔔 Push Notifications System - TherapEase

## Overview

TherapEase now includes a comprehensive push notification system that provides real-time notifications to users across all roles (Admin, Therapist, Patient). The system supports both browser push notifications and WebSocket-based real-time notifications.

## 🚀 Features

### ✅ Implemented Features

- **Browser Push Notifications**: Native browser notifications with custom actions
- **Service Worker**: Handles push events, notification clicks, and offline functionality
- **WebSocket Integration**: Real-time notifications via WebSocket connections
- **Permission Management**: Automatic permission requests and status tracking
- **Multi-Platform Support**: Works across desktop and mobile browsers
- **Notification Actions**: Custom actions (View, Dismiss) for each notification
- **Database Integration**: Stores push subscriptions and notification history
- **Role-Based Notifications**: Send notifications to specific roles or users
- **SMS Integration**: Combined with existing SMS notification system

### 📱 Notification Types

1. **Appointment Reminders**: Session reminders and schedule changes
2. **Assessment Updates**: New assessments and due dates
3. **Progress Reports**: Patient progress updates and reviews
4. **Daily Notes**: New therapy notes and updates
5. **System Notifications**: Maintenance alerts and system updates
6. **Emergency Alerts**: Critical notifications requiring immediate attention

## 🛠️ Technical Implementation

### Client-Side Components

#### Service Worker (`/client/public/sw.js`)
- Handles push events and notification display
- Manages notification clicks and actions
- Provides offline functionality
- Caches essential resources

#### Push Notification Service (`/client/src/services/pushNotificationService.js`)
- Manages push subscription lifecycle
- Handles permission requests
- Sends subscriptions to server
- Provides notification display methods

#### React Hooks (`/client/src/hooks/usePushNotifications.js`)
- React integration for push notifications
- State management for notification status
- Error handling and loading states

#### UI Components
- `PushNotificationManager.jsx`: Main notification management component
- `NotificationSettings.jsx`: Settings and configuration panel
- `RealtimeNotification.jsx`: Real-time notification display

### Server-Side Implementation

#### Database Schema
```sql
-- Push Subscriptions Table
CREATE TABLE push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh VARCHAR(255),
  auth VARCHAR(255),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_endpoint (userId, endpoint(255))
);
```

#### API Endpoints
- `POST /api/notifications/subscribe` - Subscribe to push notifications
- `POST /api/notifications/unsubscribe` - Unsubscribe from push notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

#### Controller Functions
- `subscribeToPush()` - Store push subscription
- `unsubscribeFromPush()` - Remove push subscription
- `sendPushNotification()` - Send notification to specific user
- `broadcastPushNotification()` - Send to multiple users
- `sendPushToRole()` - Send to all users of a role

## 🔧 Setup Instructions

### 1. Generate VAPID Keys

```bash
cd server
npm run vapid:generate
```

This will generate VAPID keys that you need to add to your environment files.

### 2. Environment Variables

#### Server (.env)
```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@therapease.com
```

#### Client (.env)
```env
# VAPID Public Key for Client
REACT_APP_VAPID_PUBLIC_KEY=your_public_key_here
```

### 3. Install Dependencies

```bash
# Server
cd server
npm install web-push

# Client
cd client
npm install
```

### 4. Initialize Database

```bash
cd server
npm run db:init
```

This will create the push_subscriptions table.

## 📱 Usage

### Enabling Push Notifications

1. **User Experience**:
   - Users see a notification bell icon in the interface
   - Clicking the bell prompts for notification permission
   - Once enabled, users receive real-time notifications

2. **Settings Management**:
   - Users can access notification settings
   - Test notifications to verify functionality
   - Enable/disable notifications at any time

### Sending Notifications

#### From Server Code
```javascript
const { sendPushNotification, sendPushToRole } = require('./controllers/notificationController');

// Send to specific user
await sendPushNotification(userId, 'Appointment Reminder', 'Your session starts in 30 minutes', {
  url: '/appointments',
  icon: '/icons/appointment.png',
  requireInteraction: true
});

// Send to all therapists
await sendPushToRole('therapist', 'System Update', 'New features available', {
  url: '/admin/updates'
});
```

#### From WebSocket Events
```javascript
// Broadcast via WebSocket (already implemented)
websocketService.broadcastNotification({
  userId: 123,
  title: 'New Assessment',
  message: 'Assessment completed for John Doe',
  type: 'assessment'
});
```

## 🎨 UI Components

### Notification Bell
- Shows current notification status
- Allows toggling notifications on/off
- Displays recent notifications on hover
- Test notification button when enabled

### Settings Panel
- Browser support status
- Permission status
- Enable/disable controls
- Test notification functionality
- Notification type preferences

### Real-time Display
- Shows incoming notifications
- Auto-hide after 5 seconds
- Click to view full details
- Smooth animations and transitions

## 🔒 Security Features

- **VAPID Authentication**: Secure push notification authentication
- **User Authentication**: All endpoints require valid JWT tokens
- **Permission Validation**: Respects browser notification permissions
- **Rate Limiting**: Prevents notification spam
- **Data Encryption**: Sensitive data encrypted in transit

## 📊 Monitoring and Analytics

### Notification Statistics
- Total notifications sent
- Delivery success rates
- User engagement metrics
- Permission grant rates

### Error Handling
- Failed delivery tracking
- Permission denied handling
- Network error recovery
- Service worker updates

## 🧪 Testing

### Manual Testing
1. Enable notifications in browser
2. Send test notification from UI
3. Verify notification appears
4. Test notification actions
5. Check offline functionality

### Automated Testing
```bash
# Test push notification service
cd server
npm run test:notifications

# Test client integration
cd client
npm run test:push-notifications
```

## 🚨 Troubleshooting

### Common Issues

1. **Notifications Not Appearing**
   - Check browser permission settings
   - Verify VAPID keys are correct
   - Check service worker registration
   - Ensure HTTPS is enabled

2. **Permission Denied**
   - Guide users to browser settings
   - Provide clear instructions
   - Offer alternative notification methods

3. **Service Worker Issues**
   - Check browser console for errors
   - Verify service worker file exists
   - Clear browser cache and reload

### Debug Mode
Enable debug logging by setting:
```env
DEBUG_PUSH_NOTIFICATIONS=true
```

## 🔄 Future Enhancements

### Planned Features
- **Rich Notifications**: Images, progress bars, custom layouts
- **Notification Scheduling**: Send notifications at specific times
- **User Preferences**: Granular notification settings
- **Analytics Dashboard**: Detailed notification metrics
- **Mobile App Integration**: Native mobile push notifications
- **Notification Templates**: Predefined notification formats

### Integration Opportunities
- **Calendar Integration**: Appointment-based notifications
- **AI-Powered Timing**: Optimal notification timing
- **Multi-Language Support**: Localized notifications
- **Accessibility Features**: Screen reader support

## 📚 API Reference

### Push Notification Service

#### `subscribeToPush(subscription, userAgent)`
Subscribe user to push notifications.

**Parameters:**
- `subscription` (Object): Push subscription object
- `userAgent` (String): Browser user agent

**Returns:** Promise<Object>

#### `sendPushNotification(userId, title, message, options)`
Send push notification to specific user.

**Parameters:**
- `userId` (Number): Target user ID
- `title` (String): Notification title
- `message` (String): Notification message
- `options` (Object): Notification options

**Returns:** Promise<Object>

#### `sendPushToRole(role, title, message, options)`
Send push notification to all users of a role.

**Parameters:**
- `role` (String): Target role (admin, therapist, patient)
- `title` (String): Notification title
- `message` (String): Notification message
- `options` (Object): Notification options

**Returns:** Promise<Array>

## 🎉 Success Metrics

The push notification system is considered successful when:
- ✅ 90%+ of users can enable notifications
- ✅ 95%+ notification delivery rate
- ✅ <2 second notification display time
- ✅ 80%+ user engagement with notifications
- ✅ Zero critical security vulnerabilities

---

*TherapEase Push Notification System - Delivering real-time updates to enhance the therapeutic experience.*
