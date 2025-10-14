# ⚡ TherapEase Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 18+ and NPM 8+
- MySQL 8.0+
- Git

### 1. Clone and Install
```bash
git clone <repository-url>
cd therapease
npm run fresh-install
```

### 2. Start the Application
```bash
npm run dev
```

### 3. Access the Application
- **Client**: http://localhost:3000
- **API**: http://localhost:5000
- **HTTPS**: https://localhost:5443

### 4. Login with Test Accounts
- **Admin**: admin@therapease.com / admin123
- **Therapist**: dr.aleli.ong@therapease.com / therapist123
- **Patient**: alexandra.santos@email.com / patient123

## 🔧 What's Included

### Complete Database Schema
- ✅ All tables with proper relationships
- ✅ Foreign key constraints
- ✅ Indexes for performance
- ✅ UTF-8 support

### Comprehensive Test Data
- ✅ 16 users (1 admin, 5 therapists, 10 patients)
- ✅ 10 assessments with AI insights
- ✅ 20 daily therapy notes
- ✅ 15 scheduled appointments
- ✅ 10 system notifications

### Full Feature Set
- ✅ User authentication and authorization
- ✅ Patient management
- ✅ Therapist scheduling
- ✅ Assessment tracking
- ✅ Progress monitoring
- ✅ Push notifications
- ✅ SMS integration (configurable)
- ✅ AI-powered insights
- ✅ File uploads
- ✅ SSL/HTTPS support

## 📱 Ready-to-Use Features

### For Administrators
- User management
- System settings
- Therapist assignments
- Analytics dashboard

### For Therapists
- Patient management
- Session scheduling
- Assessment creation
- Progress tracking
- Daily notes

### For Patients
- View appointments
- Track progress
- Submit exercise proofs
- Receive notifications

## 🔐 Security Features

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ SSL/TLS encryption
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

## 📊 Database Tables

| Table | Purpose | Records |
|-------|---------|---------|
| users | Authentication & profiles | 16 |
| patients | Patient medical info | 10 |
| therapists | Professional credentials | 5 |
| assessments | Therapy evaluations | 10 |
| daily_notes | Session documentation | 20 |
| appointments | Scheduling | 15 |
| notifications | System alerts | 10 |
| home_exercises | Exercise assignments | 0 |
| progress_tracking | Outcome measurement | 0 |

## 🛠️ Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:server       # Server only
npm run dev:client       # Client only

# Database
npm run db:init          # Initialize database
npm run db:seed          # Seed with test data
npm run db:reset         # Reset and reseed

# Setup
npm run setup            # Complete setup
npm run fresh-install    # Clean install + setup + seed
npm run reset            # Clean and reinstall

# Maintenance
npm run check-deps       # Check for updates
npm run update-deps      # Update dependencies
npm run clean            # Clean node_modules
```

## 🔧 Configuration

### Environment Variables
Copy `env.example` to `.env` and configure:
- Database credentials
- JWT secrets
- Email/SMS settings
- OpenAI API key

### Database
- **Host**: localhost
- **Port**: 3306
- **Database**: therapease
- **User**: root (or your MySQL user)

## 📞 Support

### Troubleshooting
1. Check MySQL is running
2. Verify database credentials
3. Ensure ports 3000, 5000, 5443 are free
4. Run `npm run reset` for clean install

### Documentation
- `INSTALLATION_GUIDE.md` - Detailed setup
- `docs/` - API and feature documentation
- `README.md` - Project overview

---

**🎉 You're ready to start using TherapEase!**

The system is fully configured with realistic test data and ready for development or demonstration.
