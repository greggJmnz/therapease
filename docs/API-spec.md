# TherapEase API Specification

## Overview
TherapEase is an AI-powered Occupational Therapy Management System with a RESTful API built on Node.js, Express, and MySQL.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout

### Admin Routes (`/admin`)
- `GET /admin/dashboard` - Get dashboard statistics
- `GET /admin/patients` - Get all patients (with pagination)
- `GET /admin/therapists` - Get all therapists (with pagination)
- `GET /admin/appointments` - Get all appointments (with filters)
- `PATCH /admin/users/:userId/status` - Update user status

### Therapist Routes (`/therapist`)
- `GET /therapist/dashboard` - Get therapist dashboard
- `GET /therapist/patients` - Get assigned patients
- `GET /therapist/appointments` - Get therapist appointments
- `POST /therapist/notes` - Create session notes
- `GET /therapist/notes/:patientId` - Get patient notes
- `PUT /therapist/notes/:noteId` - Update session notes

### Patient Routes (`/patient`)
- `GET /patient/dashboard` - Get patient dashboard
- `GET /patient/progress` - Get progress tracking
- `GET /patient/appointments` - Get patient appointments
- `GET /patient/notes` - Get patient notes (filtered)

### AI Routes (`/ai`)
- `POST /ai/analyze-session` - Analyze session notes
- `POST /ai/generate-summary` - Generate progress summary
- `POST /ai/home-exercises` - Generate home exercise plan
- `POST /ai/parent-summary` - Generate parent-friendly summary

## Data Models

### User
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "therapist",
  "phone": "+1234567890",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Patient
```json
{
  "id": 1,
  "userId": 1,
  "therapistId": 2,
  "dateOfBirth": "2010-01-01",
  "gender": "male",
  "diagnosis": "Autism Spectrum Disorder",
  "therapyGoals": "Improve fine motor skills",
  "status": "active",
  "startDate": "2024-01-01T00:00:00.000Z"
}
```

### Appointment
```json
{
  "id": 1,
  "patientId": 1,
  "therapistId": 2,
  "appointmentDate": "2024-01-15T10:00:00.000Z",
  "duration": 60,
  "type": "follow_up",
  "status": "scheduled",
  "location": "Clinic A",
  "isVirtual": false
}
```

### Note
```json
{
  "id": 1,
  "appointmentId": 1,
  "patientId": 1,
  "therapistId": 2,
  "noteType": "session",
  "title": "Fine Motor Skills Session",
  "content": "Patient worked on buttoning exercises...",
  "aiInsights": {
    "progress": "Good improvement in fine motor control",
    "recommendations": "Continue with current exercises"
  },
  "tags": ["fine_motor", "progress"],
  "createdAt": "2024-01-15T11:00:00.000Z"
}
```

## Error Responses
```json
{
  "success": false,
  "error": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

## Success Responses
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

## Pagination
For endpoints that support pagination:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Rate Limiting
- Default: 100 requests per minute per IP
- Admin endpoints: 200 requests per minute
- AI endpoints: 50 requests per minute

## File Upload
- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX, JPG, PNG
- Files stored in secure cloud storage

## WebSocket Events
Real-time updates for:
- New appointments
- Session notes updates
- AI insights generation
- Notifications

## Security
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- CORS enabled for frontend
- Helmet.js security headers
- Input validation and sanitization
- SQL injection prevention with Sequelize

