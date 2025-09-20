# TherapEase - AI-Powered Pediatric Occupational Therapy Management System

A comprehensive, scalable platform designed specifically for **Pediatric Occupational Therapy** practice management with AI-augmented assessment and developmental progress tracking for children and adolescents (ages 0-21).

## 🚀 Features

- **Pediatric-Focused System**: Specialized for children and adolescents (ages 0-21)
- **AI-Augmented Assessment**: GPT-powered pediatric session analysis and developmental insights
- **Play-Based Interventions**: Therapeutic play and developmental milestone tracking
- **Family-Centered Care**: Parent/caregiver education and involvement tools
- **School Integration**: Educational therapy planning and academic support
- **Sensory Processing**: Sensory integration assessment and intervention support
- **Multi-Module System**: Admin, Therapist, and Family portals
- **Real-time Updates**: Live appointment and developmental progress tracking
- **Secure Authentication**: JWT-based user management with role-based access
- **Responsive Design**: Modern UI built with React and Tailwind CSS
- **Database Management**: MySQL with Sequelize ORM
- **API-First Architecture**: RESTful backend with comprehensive documentation

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
- React 18
- React Router v6
- React Query
- Tailwind CSS
- Lucide React Icons

### Backend
- Node.js
- Express.js
- MySQL
- Sequelize ORM
- JWT Authentication
- OpenAI GPT-4 Integration

### DevOps
- Docker & Docker Compose
- Environment-based configuration
- Comprehensive error handling

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- OpenAI API Key
- Git

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
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_db
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Server
PORT=5000
NODE_ENV=development
```

### Database Configuration
The system uses MySQL with the following main tables:
- `users` - User authentication and profiles
- `therapists` - Therapist-specific information
- `patients` - Patient records and therapy details
- `appointments` - Scheduling and session management
- `notes` - Session notes with AI insights

## 📚 API Documentation

Comprehensive API documentation is available in `docs/API-spec.md` including:
- Authentication endpoints
- CRUD operations for all entities
- AI integration endpoints
- Error handling and response formats

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
- `progressSummaryPrompt.js` - Child progress tracking prompts with milestone references
- `parentSummaryPrompt.js` - Family communication and parent education templates
- `homeExercisePrompt.js` - Play-based home program creation templates
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

```bash
# Backend tests
npm run test:server

# Frontend tests
npm run test:client

# All tests
npm test
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
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

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with EHR systems
- [ ] Telehealth video sessions
- [ ] Multi-language support
- [ ] Advanced AI models for specific conditions

---

**Built with ❤️ for the occupational therapy community**