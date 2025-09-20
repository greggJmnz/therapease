# 🚀 TherapEase Development Guide

## 📋 Table of Contents
1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Database Schema](#database-schema)
4. [API Architecture](#api-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Development Workflow](#development-workflow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Deployment](#deployment)

## 🛠️ Development Environment Setup

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **MySQL**: 8.0.20 or higher
- **Git**: Latest version
- **Code Editor**: VS Code, Cursor, or similar

### Initial Setup
```bash
# 1. Clone the repository
git clone <repository-url>
cd therapease

# 2. Install dependencies
npm run install:all

# 3. Set up environment variables
cp env.example .env
# Edit .env with your MySQL credentials

# 4. Initialize database
cd server && npm run db:init

# 5. Start development servers
npm run dev
```

### Environment Variables (.env)
```env
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=therapease_dev
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development

# OpenAI (Optional for development)
OPENAI_API_KEY=your_openai_api_key
```

## 🏗️ Project Structure

```
therapease/
├── 📁 client/                 # React Frontend
│   ├── 📁 src/
│   │   ├── 📁 components/     # Reusable UI components
│   │   ├── 📁 pages/         # Page components
│   │   ├── 📁 context/       # React Context providers
│   │   ├── 📁 services/      # API service layer
│   │   ├── 📁 hooks/         # Custom React hooks
│   │   └── 📁 utils/         # Utility functions
│   ├── 📁 public/            # Static assets
│   └── package.json          # Frontend dependencies
│
├── 📁 server/                 # Node.js Backend
│   ├── 📁 config/            # Configuration files
│   ├── 📁 controllers/       # Request handlers
│   ├── 📁 middleware/        # Express middleware
│   ├── 📁 routes/            # API route definitions
│   ├── 📁 scripts/           # Database scripts
│   └── package.json          # Backend dependencies
│
├── 📁 ai/                     # AI Integration
│   ├── 📁 services/          # AI service implementations
│   ├── 📁 prompts/           # AI prompt templates
│   └── README.md             # AI integration guide
│
├── 📁 docs/                   # Documentation
│   ├── DEVELOPMENT.md         # This file
│   ├── API-spec.md           # API documentation
│   └── MYSQL_INTEGRATION_COMPLETE.md
│
├── package.json               # Root package.json
└── README.md                  # Project overview
```

## 🗄️ Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'therapist', 'patient') NOT NULL,
  firstName VARCHAR(100) NOT NULL,
  lastName VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  dateOfBirth DATE,
  gender ENUM('male', 'female', 'other'),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zipCode VARCHAR(20),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Patients Table
```sql
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT UNIQUE,
  diagnosis TEXT,
  medicalHistory TEXT,
  goals TEXT,
  therapistId INT,
  emergencyContact TEXT,
  insuranceInfo TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Therapists Table
```sql
CREATE TABLE therapists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT UNIQUE,
  licenseNumber VARCHAR(100),
  specialization TEXT,
  yearsOfExperience INT,
  education TEXT,
  certifications TEXT,
  availability TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

### Database Relationships
- **One-to-One**: User ↔ Patient/Therapist profiles
- **One-to-Many**: Therapist → Patients
- **Many-to-Many**: Patients ↔ Therapists (through assignments)

## 🔌 API Architecture

### Authentication Flow
1. **Login**: `POST /api/auth/login`
2. **Token Verification**: `GET /api/auth/verify`
3. **Protected Routes**: Include `Authorization: Bearer <token>`

### API Structure
```
/api
├── /auth          # Authentication endpoints
├── /admin         # Admin-only endpoints
├── /therapist     # Therapist endpoints
├── /patient       # Patient endpoints
└── /ai            # AI integration endpoints
```

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Handling
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

## 🎨 Frontend Architecture

### Component Structure
```
components/
├── 📁 common/           # Reusable components
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   └── Table.jsx
├── 📁 layout/           # Layout components
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
└── 📁 forms/            # Form components
    ├── LoginForm.jsx
    └── PatientForm.jsx
```

### State Management
- **React Context**: Authentication, user data
- **Local State**: Component-specific state
- **React Query**: Server state management

### Routing
- **React Router v6**: Client-side routing
- **Protected Routes**: Role-based access control
- **Lazy Loading**: Code splitting for performance

## 🔄 Development Workflow

### Git Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature description"

# 3. Push and create PR
git push origin feature/new-feature
# Create Pull Request on GitHub
```

### Code Standards
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Component Naming**: PascalCase for components

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing

## 🧪 Testing

### Backend Testing
```bash
# Run all tests
npm run test:server

# Run tests in watch mode
npm run test:server:watch

# Run specific test file
npm test -- --testPathPattern=userController
```

### Frontend Testing
```bash
# Run all tests
npm run test:client

# Run tests in watch mode
npm run test:client:watch

# Run tests with coverage
npm run test:client:coverage
```

### API Testing
```bash
# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"admin123"}'

# Test protected endpoint
curl -X GET http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <your_token>"
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check MySQL status
sudo systemctl status mysql

# Check connection
mysql -u root -p -e "SELECT VERSION();"

# Reset database
cd server && npm run db:init
```

#### 2. Port Conflicts
```bash
# Check what's using port 5000
lsof -i :5000

# Kill conflicting processes
pkill -f "node.*index.js"
pkill -f "npm run dev"
```

#### 3. Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear React cache
cd client && npm run build -- --reset-cache
```

#### 4. Authentication Issues
```bash
# Check JWT secret in .env
# Verify database has users
mysql -u root -p therapease_dev -e "SELECT * FROM users;"

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@therapease.com","password":"admin123"}'
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev

# Check server logs
tail -f server/logs/app.log
```

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client && npm run build

# Set production environment
NODE_ENV=production npm start
```

### Environment Configuration
```env
# Production .env
NODE_ENV=production
DB_HOST=production-db-host
DB_NAME=therapease_prod
JWT_SECRET=production_jwt_secret
```

### Health Checks
```bash
# Check server health
curl http://localhost:5000/health

# Check database connection
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

## 📚 Additional Resources

- **API Documentation**: `docs/API-spec.md`
- **Database Setup**: `docs/MYSQL_INTEGRATION_COMPLETE.md`
- **Project Overview**: `README.md`
- **AI Integration**: `ai/README.md`

## 🤝 Getting Help

1. **Check this documentation first**
2. **Review existing issues on GitHub**
3. **Create a new issue with detailed information**
4. **Contact the development team**

---

**Happy Coding! 🎉**
