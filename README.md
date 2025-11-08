# TherapEase - A Web-based Pediatric Occupational Therapy System with AI-Augmented Assessment


A comprehensive, scalable platform designed specifically for **Pediatric Occupational Therapy** practice management with AI-augmented assessment and developmental progress tracking for children.

## 🚀 Features

### 🧠 AI-Powered Intelligence
- **AI-Augmented Assessment**: GPT-4 powered pediatric session analysis and developmental insights
- **Pediatric Session Analysis**: Automated assessment of child therapy sessions with developmental focus
- **Developmental Progress Tracking**: AI-generated progress summaries with milestone references
- **Play-Based Home Programs**: Personalized play-based activity recommendations
- **Family Communication**: Simplified summaries and parent education materials
- **Sensory Processing Assessment**: AI-powered sensory integration analysis
- **School-Based Therapy Planning**: Educational integration and academic support recommendations

### 👥 Multi-Portal System
- **Admin Portal**: System management, user oversight, and analytics dashboard
- **Therapist Portal**: Patient management, session documentation, and AI insights
- **Family Portal**: Child's progress visualization, appointment scheduling, and home programs

### 📱 Advanced Communication
- **Push Notifications**: Real-time browser notifications with VAPID integration
- **SMS Integration**: Automated appointment reminder SMS via PhilSMS API (Philippine number support)
- **WebSocket Support**: Live updates and real-time communication
- **Email Notifications**: Comprehensive email notification system

### 🎯 Pediatric-Focused Features
- **Pediatric-Focused System**: Specialized for children and adolescents (ages 0-21)
- **Play-Based Interventions**: Therapeutic play and developmental milestone tracking
- **Family-Centered Care**: Parent/caregiver education and involvement tools
- **School Integration**: Educational therapy planning and academic support
- **Sensory Processing**: Sensory integration assessment and intervention support
- **OTPF-4 Framework**: Pediatric OTPF-4 framework compliance system

### 🔧 Technical Excellence
- **Real-time Updates**: Live appointment and developmental progress tracking
- **Secure Authentication**: JWT-based user management with role-based access
- **Responsive Design**: Modern UI built with React 18 and Tailwind CSS
- **Database Management**: MySQL with Sequelize ORM and comprehensive data seeding
- **API-First Architecture**: RESTful backend with comprehensive documentation
- **Security Features**: Encryption, CORS protection, and Helmet.js security headers

## 🏗️ Architecture

```
therapease/
├── client/          # React Frontend
├── server/          # Node.js + Express Backend
├── ai/             # AI Integration & Prompts
└── docs/           # Documentation
```

## 🛠️ Tech Stack

### Frontend
- **React 18** - Latest React with concurrent features
- **React Router v6** - Client-side routing with protected routes
- **React Query** - Server state management and caching
- **React Hook Form** - Form management and validation
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **React Hot Toast** - User notifications
- **Chart.js & Recharts** - Data visualization
- **jsPDF** - PDF generation and export

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MySQL** - Relational database with comprehensive data seeding
- **Sequelize ORM** - Database object-relational mapping
- **JWT Authentication** - Secure token-based authentication
- **OpenAI GPT-4 Integration** - AI-powered assessment and insights
- **WebSocket** - Real-time communication
- **Web Push** - Push notification support
- **bcryptjs** - Password hashing
- **Helmet.js** - Security headers

### Communication & Notifications
- **PhilSMS API** - Appointment reminder SMS with Philippine number support
- **Web Push API** - Browser push notifications
- **WebSocket** - Real-time updates
- **VAPID** - Push notification authentication

### DevOps & Security
- **Environment-based configuration** - Flexible configuration options
- **Comprehensive error handling** - Robust error management
- **Data encryption** - Secure data storage
- **CORS protection** - Cross-origin request security
- **Input validation** - Data sanitization and validation

## 📋 Prerequisites

- **Node.js 18+** - JavaScript runtime
- **MySQL 8.0+** - Database server
- **OpenAI API Key** - For AI-powered features
- **PhilSMS Account** - For SMS notifications (optional)
- **Git** - Version control
- **Modern Browser** - For push notifications support

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/therapease.git
cd therapease
```

### 2. Install Dependencies
```bash
npm run install:all
```

### 3. Environment Setup
```bash
cp env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
# Using Docker (recommended)
docker-compose up -d mysql

# Or manually create MySQL database
mysql -u root -p
CREATE DATABASE therapease_db;
```

### 5. Start Development Servers
```bash
npm run dev
```

This will start both the backend (port 5000) and frontend (port 3000) servers.

## 🔧 Configuration

### Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_password
DB_TYPE=mysql

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=5000
NODE_ENV=development

# Client Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_AI_ENABLED=true

# Push Notifications (VAPID Keys)
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@therapease.com
REACT_APP_VAPID_PUBLIC_KEY=your_vapid_public_key

# SMS Integration (Optional)
SMS_ENABLED=true
PHILSMS_API_TOKEN=your_philsms_api_token
PHILSMS_BASE_URL=https://app.philsms.com/api/v3
PHILSMS_SENDER_ID=TherapEase
API_BASE_URL=http://localhost:3000
```

### Database Configuration
The system uses MySQL with comprehensive data seeding including:

#### Core Tables
- `users` - User authentication and profiles (21 users: 1 admin, 5 therapists, 15 patients)
- `therapists` - Therapist-specific information with specializations
- `patients` - Patient records with complete medical information
- `appointments` - Scheduling and session management
- `notes` - Session notes with AI insights
- `notifications` - Push and SMS notification management
- `push_subscriptions` - Push notification subscriptions

#### Data Seeding
The system includes comprehensive test data:
- **Complete User Profiles**: All users have full contact information with Philippine phone numbers
- **Medical Information**: Detailed patient records with diagnoses, therapy goals, and medical history
- **Professional Credentials**: Therapist specializations, certifications, and education
- **Realistic Data**: Based on actual therapy practice with proper Philippine formatting
- **No Null Values**: All fields populated with realistic, complete data

#### Database Initialization
```bash
# Initialize database structure
npm run db:init

# Seed with complete test data
npm run db:seed

# Seed with sample data only
npm run seed:sample
```

## 📚 API Documentation

Comprehensive API documentation is available in `docs/API-spec.md` including:
- Authentication endpoints
- CRUD operations for all entities
- AI integration endpoints
- Push notification endpoints
- SMS integration endpoints
- Error handling and response formats

## 🔔 Notification Systems

### Push Notifications
- **Real-time Browser Notifications**: VAPID-powered push notifications
- **Cross-Platform Support**: Works on desktop and mobile browsers
- **Permission Management**: Automatic browser permission requests
- **Custom Actions**: View and dismiss buttons for notifications
- **Offline Support**: Service worker handles offline scenarios

### SMS Integration
- **Philippine Number Support**: Full support for Philippine mobile numbers
- **Vonage Integration**: Professional SMS delivery service
- **Appointment Reminders**: Automated SMS reminders for upcoming appointments
- **Delivery Tracking**: Real-time SMS delivery status monitoring
- **Single Template**: Pre-built appointment reminder message template with therapist name

### WebSocket Support
- **Real-time Updates**: Live appointment and progress updates
- **Instant Notifications**: Immediate notification delivery
- **Connection Management**: Automatic reconnection and error handling

## 🧠 AI Integration - Pediatric Focus

TherapEase leverages OpenAI's GPT-4 for pediatric occupational therapy:
- **Pediatric Session Analysis**: Automated assessment of child therapy sessions with developmental focus
- **Developmental Progress Tracking**: AI-generated progress summaries with milestone references
- **Play-Based Home Programs**: Personalized play-based activity recommendations
- **Family Communication**: Simplified summaries and parent education materials
- **Sensory Processing Assessment**: AI-powered sensory integration analysis
- **School-Based Therapy Planning**: Educational integration and academic support recommendations

### Pediatric AI Prompts
Located in `ai/prompts/`:
- `assessmentPrompt.js` - Pediatric session analysis templates with developmental focus
- `otPromptTemplates.js` - OT prompt templates for various assessment types
- `otpfFramework.js` - Pediatric OTPF-4 framework compliance system

## 🔐 Security Features

- JWT token authentication
- Role-based access control (Admin/Therapist/Patient)
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet.js security headers

## 📱 User Modules

### Admin Portal
- Dashboard with system statistics
- User management (patients, therapists)
- Appointment oversight
- System notifications

### Therapist Portal
- Patient management
- Session notes and documentation
- AI-powered insights
- Progress tracking tools

### Family Portal
- Child's developmental progress visualization
- Appointment scheduling
- Play-based home programs
- Communication with therapists
- Parent education resources

## 🧪 Testing

### Application Testing
```bash
# Backend tests
npm run test:server

# Frontend tests
npm run test:client

# All tests
npm test
```

### Feature Testing
```bash
# Test SMS functionality
npm run sms:test

# Test Philippine SMS
npm run sms:test-ph

# Test push notifications
npm run push:test

# Test real notifications
npm run notifications:test

# Test database notifications
npm run notifications:db-test

# Test VAPID key generation
npm run vapid:generate

# Test security setup
npm run security:test
```

### Database Testing
```bash
# Initialize database
npm run db:init

# Seed complete data
npm run db:seed

# Seed sample data
npm run seed:sample

# Test database notifications
npm run notifications:db-test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation in `docs/`

## 📖 Documentation

### Complete Documentation Suite
- **API Documentation** (`docs/API-spec.md`) - Complete API reference
- **Database Schema** (`docs/DATABASE_SCHEMA.md`) - Database structure and relationships
- **Frontend Architecture** (`docs/FRONTEND_ARCHITECTURE.md`) - React component architecture
- **Security Guide** (`docs/SECURITY.md`) - Security features and best practices
- **SMS Integration** (`docs/SMS_INTEGRATION.md`) - SMS setup and configuration
- **Push Notifications** (`docs/PUSH_NOTIFICATIONS.md`) - Push notification implementation
- **Data Overview** (`docs/COMPLETE_DATA_OVERVIEW.md`) - Comprehensive data seeding guide
- **Development Guide** (`docs/DEVELOPMENT.md`) - Development setup and guidelines

### Quick Reference
- **Test Accounts**: Available after database seeding
  - Admin: `admin@therapease.com` / `admin123`
  - Therapist: `dr.aleli.ong@therapease.com` / `therapist123`
  - Patient: `alexandra.santos@email.com` / `patient123`

## 🔮 Roadmap

### Phase 1 - Current Features ✅
- [x] AI-powered pediatric assessment
- [x] Multi-portal system (Admin, Therapist, Patient)
- [x] Push notifications with VAPID
- [x] SMS integration with Philippine support
- [x] Real-time WebSocket communication
- [x] Comprehensive data seeding
- [x] Security and encryption

### Phase 2 - Planned Features
- [ ] Mobile app development (React Native)
- [ ] Advanced analytics dashboard
- [ ] Integration with EHR systems
- [ ] Telehealth video sessions
- [ ] Multi-language support
- [ ] Advanced AI models for specific conditions
- [ ] Automated report generation
- [ ] Calendar integration (Google, Outlook)

---

**Built with ❤️ for the occupational therapy community**