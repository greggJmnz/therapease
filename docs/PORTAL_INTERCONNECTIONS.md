# TherapEase Portal Interconnections

## Overview

The TherapEase system consists of three interconnected portals (Admin, Therapist, and Patient) that share real-time data synchronization through WebSocket connections and a unified database. This document outlines how the portals are interconnected and how data flows between them.

## Architecture

### Real-time Communication
- **WebSocket Server**: Handles real-time communication between all portals
- **Event Broadcasting**: Changes in one portal are immediately broadcast to relevant portals
- **Room-based Subscriptions**: Users are automatically subscribed to relevant data rooms

### Data Synchronization
- **Unified Database**: All portals share the same MySQL database
- **Event-driven Updates**: Database changes trigger WebSocket broadcasts
- **Automatic Refresh**: Frontend components automatically refresh when data changes

## Portal Interconnections

### 1. Appointment Management

**Data Flow:**
- Admin creates/updates appointments → All portals notified
- Therapist creates/updates appointments → Admin and Patient portals notified
- Patient views appointments → Real-time updates from other portals

**WebSocket Events:**
- `appointment_change`: Broadcasts appointment CRUD operations
- `appointment_created`: New appointment created
- `appointment_updated`: Existing appointment modified
- `appointment_cancelled`: Appointment cancelled

**Cross-Portal Visibility:**
- Admin: Can see all appointments across all therapists and patients
- Therapist: Can see their own appointments and patient appointments
- Patient: Can see their own appointments and receive updates

### 2. Patient Record Management

**Data Flow:**
- Admin creates/updates patient records → All portals notified
- Therapist creates/updates patient records → Admin and Patient portals notified
- Patient views their own records → Real-time updates from other portals

**WebSocket Events:**
- `patient_change`: Broadcasts patient CRUD operations
- `patient_created`: New patient added
- `patient_updated`: Patient information modified
- `patient_deleted`: Patient removed

**Cross-Portal Visibility:**
- Admin: Full access to all patient records
- Therapist: Access to their assigned patients
- Patient: Access to their own records only

### 3. Daily Notes Synchronization

**Data Flow:**
- Therapist creates/updates daily notes → Admin and Patient portals notified
- Patient views daily notes → Real-time updates from therapist
- Admin monitors daily notes → Real-time updates from all therapists

**WebSocket Events:**
- `daily_note_change`: Broadcasts daily note CRUD operations
- `daily_note_created`: New session note added
- `daily_note_updated`: Session note modified
- `daily_note_deleted`: Session note removed

**Cross-Portal Visibility:**
- Admin: Can view all daily notes across all therapists
- Therapist: Can view and manage their own daily notes
- Patient: Can view their own daily notes

### 4. Progress Tracking Synchronization

**Data Flow:**
- Therapist creates/updates progress entries → Admin and Patient portals notified
- Patient views progress → Real-time updates from therapist
- Admin monitors progress → Real-time updates from all therapists

**WebSocket Events:**
- `progress_change`: Broadcasts progress tracking CRUD operations
- `progress_created`: New progress entry added
- `progress_updated`: Progress entry modified
- `progress_deleted`: Progress entry removed

**Cross-Portal Visibility:**
- Admin: Can view all progress tracking across all patients
- Therapist: Can view and manage progress for their patients
- Patient: Can view their own progress tracking

### 5. Notification System

**Data Flow:**
- System events trigger notifications → Relevant portals notified
- User actions trigger notifications → Other relevant users notified
- Real-time notifications appear in all portals

**WebSocket Events:**
- `notification`: Broadcasts notifications to specific users
- `system_notification`: System-wide notifications
- `user_notification`: User-specific notifications

**Cross-Portal Visibility:**
- Admin: Receives system and user notifications
- Therapist: Receives patient and system notifications
- Patient: Receives appointment and progress notifications

## Technical Implementation

### WebSocket Service

The WebSocket service (`server/services/websocketService.js`) handles:
- Connection management
- Room-based subscriptions
- Event broadcasting
- Authentication and authorization

### Frontend Integration

The frontend uses:
- `websocketService.js`: WebSocket client service
- `useWebSocket.js`: React hooks for WebSocket integration
- `useRealtimeData.js`: Hook for automatic data refreshing
- `RealtimeNotification.jsx`: Real-time notification component

### Database Integration

All database operations trigger WebSocket broadcasts:
- Appointment changes → `broadcastAppointmentChange()`
- Patient changes → `broadcastPatientChange()`
- Daily note changes → `broadcastDailyNoteChange()`
- Progress changes → `broadcastProgressChange()`

## Security Considerations

### Authentication
- WebSocket connections require valid JWT tokens
- Token verification on connection establishment
- Automatic disconnection on token expiration

### Authorization
- Role-based access control
- Users can only access data they're authorized to see
- Patient data is encrypted and only accessible to assigned therapist

### Data Privacy
- Sensitive data is encrypted in transit and at rest
- Patient data is only shared with authorized personnel
- Audit trails for all data access and modifications

## Testing

### Automated Testing
Run the interconnection test suite:
```bash
node test-interconnections.js
```

This tests:
- WebSocket connection establishment
- Real-time data synchronization
- Cross-portal data visibility
- Event broadcasting

### Manual Testing
1. Open multiple browser tabs with different portal roles
2. Perform actions in one portal
3. Verify real-time updates in other portals
4. Check notification delivery

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if server is running
   - Verify JWT token validity
   - Check network connectivity

2. **Data Not Syncing**
   - Check WebSocket connection status
   - Verify event broadcasting
   - Check database connectivity

3. **Notifications Not Appearing**
   - Check WebSocket connection
   - Verify notification permissions
   - Check browser console for errors

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'websocket');
```

## Performance Considerations

### Optimization
- WebSocket connections are persistent
- Data is only sent to relevant portals
- Automatic reconnection on connection loss
- Efficient event filtering

### Scalability
- Room-based subscriptions reduce unnecessary data transfer
- Event batching for high-frequency updates
- Connection pooling for multiple users

## Future Enhancements

### Planned Features
- Video call integration
- File sharing synchronization
- Advanced notification filtering
- Offline data synchronization
- Mobile app support

### Monitoring
- Connection health monitoring
- Event delivery tracking
- Performance metrics
- Error rate monitoring

## Conclusion

The TherapEase portal interconnections provide seamless real-time data synchronization across all three portals, ensuring that all users have access to the most current information and can collaborate effectively in patient care management.
