# User Management Implementation

## Overview

This document describes the implementation of the User Management section in the Admin Portal, which allows administrators to access account details of all users (Admins, Therapists, and Patients), including email, password management, and account status.

## Features Implemented

### 1. User Management Dashboard
- **Comprehensive User View**: Display all users across all roles (Admin, Therapist, Patient)
- **User Statistics**: Real-time counts of users by role
- **Search and Filtering**: Search by name/email and filter by role and status
- **Bulk Operations**: Select multiple users for batch operations

### 2. User Account Details
- **Personal Information**: Name, email, phone, date of birth, gender
- **Account Information**: User ID, creation date, last updated
- **Role-Specific Data**: 
  - Therapists: License number, specialization, experience, education
  - Patients: Diagnosis, medical history, status, assigned therapist
- **Password Management**: Secure display of encrypted passwords

### 3. Password Management
- **Secure Password Display**: Passwords are shown as encrypted dots (••••••••••••)
- **Password Reset**: Generate new temporary passwords for users
- **Reset Link**: Send password reset links to user emails
- **Security**: No actual passwords are exposed in the interface

### 4. Account Status Management
- **Active/Inactive Status**: Toggle user account status
- **Status Indicators**: Visual badges showing account status
- **Admin Protection**: Prevent deactivation of admin accounts

### 5. User Actions
- **View Details**: Comprehensive user profile modal
- **Edit User**: Update user information
- **Delete User**: Remove users (with admin protection)
- **Export Users**: Export user data (planned feature)

## Technical Implementation

### Frontend Components

#### AdminUserManagement.jsx
- Main component for user management interface
- Features:
  - User table with sorting and filtering
  - Modal dialogs for user details and password actions
  - Bulk selection and operations
  - Real-time data updates using React Query

#### AdminUserManagement.css
- Comprehensive styling for the user management interface
- Responsive design for mobile and desktop
- Modern UI components with hover effects and animations

### Backend API Endpoints

#### GET /admin/users
- **Purpose**: Retrieve all users with optional filtering
- **Parameters**: 
  - `page`: Page number for pagination
  - `limit`: Number of users per page
  - `role`: Filter by user role (admin, therapist, patient)
  - `search`: Search by name or email
  - `status`: Filter by account status
- **Response**: Paginated list of users with role-specific data

#### GET /admin/users/:userId
- **Purpose**: Get detailed information for a specific user
- **Response**: Complete user profile with role-specific data

#### PUT /admin/users/:userId
- **Purpose**: Update user information
- **Body**: User data to update
- **Response**: Updated user information

#### DELETE /admin/users/:userId
- **Purpose**: Delete a user account
- **Protection**: Prevents deletion of admin users
- **Response**: Confirmation of deletion

#### PUT /admin/users/:userId/status
- **Purpose**: Update user account status (active/inactive)
- **Body**: `{ "status": "active" | "inactive" }`
- **Protection**: Prevents deactivation of admin users

#### POST /admin/users/:userId/reset-password
- **Purpose**: Reset user password to a temporary password
- **Response**: Temporary password (for development only)
- **Security**: Generates secure random password

#### POST /admin/users/:userId/send-reset-link
- **Purpose**: Send password reset link to user's email
- **Response**: Reset token and link (for development only)
- **Future**: Will integrate with email service

### Database Schema

The implementation uses the existing database schema:

#### Users Table
- `id`: Primary key
- `email`: User email address
- `password`: Hashed password
- `role`: User role (admin, therapist, patient)
- `firstName`, `lastName`: User names
- `phone`, `dateOfBirth`, `gender`: Personal information
- `address`, `city`, `state`, `zipCode`: Address information
- `createdAt`, `updatedAt`: Timestamps

#### Therapists Table
- `userId`: Foreign key to users table
- `licenseNumber`: Professional license number
- `specialization`: Area of expertise
- `yearsOfExperience`: Experience level
- `education`: Educational background
- `certifications`: Professional certifications
- `availability`: Schedule availability

#### Patients Table
- `userId`: Foreign key to users table
- `diagnosis`: Medical diagnosis
- `medicalHistory`: Medical background
- `goals`: Treatment goals
- `therapistId`: Assigned therapist
- `emergencyContact`: Emergency contact information
- `insuranceInfo`: Insurance details

## Security Features

### Password Security
- **Encryption**: All passwords are hashed using bcrypt
- **No Plain Text**: Passwords are never displayed in plain text
- **Secure Reset**: Temporary passwords are generated securely
- **Reset Links**: Password reset tokens are time-limited

### Access Control
- **Admin Only**: All user management endpoints require admin role
- **JWT Authentication**: All requests must include valid JWT token
- **Role Protection**: Admin users cannot be deactivated or deleted
- **Audit Logging**: Password resets and status changes are logged

### Data Protection
- **HIPAA Compliance**: User data is handled according to HIPAA guidelines
- **Encryption**: Sensitive data is encrypted at rest
- **Access Logging**: All admin actions are logged for audit purposes

## Usage Instructions

### For Administrators

1. **Access User Management**:
   - Navigate to Admin Portal
   - Click on "User Management" in the sidebar
   - View all users in the system

2. **Search and Filter Users**:
   - Use the search bar to find users by name or email
   - Use role filter to show only specific user types
   - Use status filter to show active/inactive users

3. **View User Details**:
   - Click the eye icon to view detailed user information
   - Review personal, account, and role-specific data
   - Check account status and last activity

4. **Manage Passwords**:
   - Click the key icon to reset user password
   - Click the send icon to send password reset link
   - Temporary passwords are generated securely

5. **Update User Status**:
   - Use the more actions menu to activate/deactivate users
   - Admin users cannot be deactivated
   - Status changes are reflected immediately

6. **Bulk Operations**:
   - Select multiple users using checkboxes
   - Perform bulk actions like sending emails or exporting data
   - Use "Select All" to select all visible users

## Future Enhancements

### Planned Features
1. **Email Integration**: Send password reset emails automatically
2. **User Import/Export**: CSV import/export functionality
3. **Advanced Filtering**: More sophisticated search and filter options
4. **Audit Trail**: Detailed logging of all admin actions
5. **User Activity**: Track user login history and activity
6. **Role Management**: Create and manage custom user roles
7. **Bulk User Creation**: Create multiple users at once
8. **User Groups**: Organize users into groups for easier management

### Technical Improvements
1. **Real-time Updates**: WebSocket integration for live updates
2. **Caching**: Implement Redis caching for better performance
3. **Pagination**: Server-side pagination for large user lists
4. **Search Optimization**: Full-text search capabilities
5. **Mobile App**: Native mobile app for user management
6. **API Rate Limiting**: Implement rate limiting for security

## Testing

### Manual Testing
1. **Login as Admin**: Access the admin portal
2. **Navigate to User Management**: Click on the User Management link
3. **Test Search**: Search for users by name or email
4. **Test Filters**: Filter users by role and status
5. **View User Details**: Click on user details to open modal
6. **Test Password Reset**: Reset a user's password
7. **Test Status Change**: Activate/deactivate a user
8. **Test Bulk Selection**: Select multiple users

### Automated Testing
- Use the provided test script: `test-user-management.js`
- Update the `ADMIN_TOKEN` variable with a valid JWT token
- Run the script to test all API endpoints

## Troubleshooting

### Common Issues

1. **"Failed to load users"**:
   - Check if the server is running
   - Verify admin authentication
   - Check database connection

2. **"Cannot reset password"**:
   - Ensure user exists
   - Check admin permissions
   - Verify password hashing is working

3. **"Cannot deactivate admin"**:
   - This is by design for security
   - Admin users cannot be deactivated
   - Use a different user for testing

4. **"Search not working"**:
   - Check if search term is valid
   - Verify database has data
   - Check API endpoint response

### Debug Mode
- Enable debug logging in the server
- Check browser console for frontend errors
- Use network tab to inspect API calls
- Verify JWT token is valid and not expired

## Conclusion

The User Management system provides administrators with comprehensive tools to manage all users in the TherapEase system. The implementation follows security best practices, provides a modern user interface, and includes robust functionality for user account management.

The system is designed to be scalable, secure, and user-friendly, with plans for future enhancements to provide even more powerful user management capabilities.

