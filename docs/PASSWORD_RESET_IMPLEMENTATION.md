# 🔐 Password Reset Feature Implementation - TherapEase

## 📋 Overview

TherapEase now includes a comprehensive password reset feature with email service integration, secure token management, and database storage. This implementation provides a complete solution for users to reset their passwords securely.

## 🚀 Features Implemented

### ✅ Core Features

- **Email Service Integration**: Nodemailer-based email service with Gmail SMTP support
- **Database Storage**: Secure storage of reset tokens with expiration and usage tracking
- **Token Management**: Cryptographically secure token generation and validation
- **Email Templates**: Professional HTML and text email templates
- **Security Features**: Token expiration, single-use tokens, and secure password validation
- **API Endpoints**: Complete REST API for password reset functionality
- **Admin Integration**: Admin can send reset links to users
- **Testing Scripts**: Comprehensive testing and validation scripts

### 📧 Email Service Features

- **Gmail SMTP Integration**: Uses Gmail SMTP with app password authentication
- **Professional Templates**: HTML and text versions of emails
- **Password Reset Emails**: Secure reset links with expiration warnings
- **Welcome Emails**: Role-specific welcome emails for new users
- **Error Handling**: Comprehensive error handling and logging

### 🗄️ Database Features

- **Password Reset Tokens Table**: Secure storage with proper indexing
- **Token Expiration**: 24-hour token expiration
- **Usage Tracking**: Tracks token usage and prevents reuse
- **User Association**: Links tokens to specific users
- **Cleanup**: Automatic cleanup of expired tokens

## 🛠️ Technical Implementation

### Database Schema

```sql
CREATE TABLE password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  usedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user_expires (userId, expiresAt),
  INDEX idx_expires (expiresAt)
);
```

### API Endpoints

#### 1. Request Password Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset instructions have been sent to your email"
}
```

#### 2. Verify Reset Token
```http
GET /api/auth/verify-reset-token/:token
```

**Response:**
```json
{
  "success": true,
  "message": "Reset token is valid",
  "data": {
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "expiresAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### 3. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "abc123...",
  "newPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

#### 4. Admin Send Reset Link
```http
POST /api/admin/users/:userId/send-reset-link
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset link sent successfully",
  "data": {
    "userId": 123,
    "email": "user@example.com",
    "resetToken": "abc123...",
    "resetLink": "http://localhost:3000/auth/reset-password?token=abc123..."
  }
}
```

## 🔧 Configuration

### Environment Variables

Add these environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
FRONTEND_URL=http://localhost:3000

# Database Configuration (existing)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=therapease
```

### Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Go to Google Account settings** > Security > App passwords
3. **Generate an app password** for "Mail"
4. **Use that app password** as `EMAIL_PASSWORD` (not your regular password)

## 📦 Dependencies

The following new dependency has been added:

```json
{
  "nodemailer": "^6.9.7"
}
```

Install with:
```bash
npm install nodemailer
```

## 🧪 Testing

### Test Scripts

#### 1. Email Service Test
```bash
npm run email:test
```
Tests email connection and sends test emails.

#### 2. Password Reset Test
```bash
npm run password-reset:test
```
Comprehensive test of the entire password reset flow.

### Manual Testing

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Test forgot password**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email": "jimenezgregg365@gmail.com"}'
   ```

3. **Check email** for the reset link

4. **Test token verification**:
   ```bash
   curl http://localhost:5000/api/auth/verify-reset-token/YOUR_TOKEN_HERE
   ```

5. **Test password reset**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token": "YOUR_TOKEN_HERE", "newPassword": "NewPassword123!"}'
   ```

## 🔒 Security Features

### Token Security
- **Cryptographically Secure**: Uses `crypto.randomBytes(32)` for token generation
- **Expiration**: 24-hour token expiration
- **Single Use**: Tokens are marked as used after password reset
- **User Association**: Tokens are tied to specific users

### Password Security
- **Complexity Validation**: Enforces strong password requirements
- **Bcrypt Hashing**: Passwords are hashed using bcrypt
- **Secure Storage**: No plain text passwords stored

### Email Security
- **No Information Leakage**: Doesn't reveal if email exists
- **Secure Links**: Reset links contain secure tokens
- **Expiration Warnings**: Clear warnings about link expiration

## 📁 File Structure

```
server/
├── services/
│   └── emailService.js          # Email service implementation
├── controllers/
│   ├── authController.js        # Updated with reset functionality
│   └── adminController.js       # Updated admin reset function
├── routes/
│   └── authRoutes.js            # Updated with reset routes
├── scripts/
│   ├── test-email.js            # Email service testing
│   └── test-password-reset.js   # Complete reset flow testing
└── config/
    └── database.js              # Updated with reset tokens table
```

## 🎯 Usage Examples

### Frontend Integration

#### Forgot Password Form
```javascript
const handleForgotPassword = async (email) => {
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Password reset instructions sent to your email');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

#### Reset Password Form
```javascript
const handleResetPassword = async (token, newPassword) => {
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Password reset successfully');
      // Redirect to login
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Admin Usage

```javascript
const sendResetLink = async (userId) => {
  try {
    const response = await fetch(`/api/admin/users/${userId}/send-reset-link`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('Reset link sent:', result.data.resetLink);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## 🚨 Error Handling

### Common Errors

1. **Email Configuration Error**:
   ```
   Error: Invalid login: 535-5.7.8 Username and Password not accepted
   ```
   **Solution**: Check Gmail app password configuration

2. **Token Expired**:
   ```json
   {
     "success": false,
     "error": "Invalid or expired reset token"
   }
   ```
   **Solution**: Request a new reset link

3. **Email Not Found**:
   ```json
   {
     "success": true,
     "message": "If an account with that email exists, password reset instructions have been sent"
   }
   ```
   **Note**: This is intentional for security - doesn't reveal if email exists

## 🔄 Maintenance

### Cleanup Expired Tokens

Add a cron job to clean up expired tokens:

```sql
DELETE FROM password_reset_tokens 
WHERE expiresAt < NOW() OR used = TRUE;
```

### Monitoring

Monitor email delivery and token usage:

```sql
-- Check token usage
SELECT 
  COUNT(*) as total_tokens,
  SUM(used) as used_tokens,
  COUNT(*) - SUM(used) as active_tokens
FROM password_reset_tokens 
WHERE expiresAt > NOW();

-- Check recent reset attempts
SELECT 
  u.email,
  prt.createdAt,
  prt.used,
  prt.usedAt
FROM password_reset_tokens prt
JOIN users u ON prt.userId = u.id
ORDER BY prt.createdAt DESC
LIMIT 10;
```

## 🎉 Success!

The password reset feature is now fully implemented with:

- ✅ Email service integration
- ✅ Database storage for reset tokens  
- ✅ Actual email sending functionality
- ✅ Comprehensive testing
- ✅ Security best practices
- ✅ Admin integration
- ✅ Complete API endpoints

**Test with jimenezgregg365@gmail.com** using the provided test scripts!

---

**Built with ❤️ for the TherapEase community**
