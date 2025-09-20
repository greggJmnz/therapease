# 🗄️ TherapEase Database Schema Documentation

## 📋 Overview

TherapEase uses MySQL 8.0+ as its primary database with a relational design optimized for healthcare management. The schema follows normalization principles and includes proper foreign key constraints for data integrity.

## 🏗️ Database Architecture

### Connection Pool Configuration
```javascript
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'therapease',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  connectTimeout: 60000
};
```

### Database Features
- **Connection Pooling**: 10 concurrent connections
- **Transaction Support**: ACID compliance
- **Foreign Key Constraints**: Referential integrity
- **UTF-8 Support**: International character sets
- **Indexing**: Performance optimization

## 📊 Table Structure

### 1. Users Table
**Purpose**: Core user authentication and profile management

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

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY (email)`
- `INDEX (role)` - For role-based queries

**Sample Data**:
```sql
INSERT INTO users (email, password, role, firstName, lastName, phone, gender) VALUES
('admin@therapease.com', '$2a$10$...', 'admin', 'Admin', 'User', '555-0001', 'other'),
('therapist@therapease.com', '$2a$10$...', 'therapist', 'Dr. Sarah', 'Johnson', '555-0002', 'female'),
('emma@example.com', '$2a$10$...', 'patient', 'Emma', 'Smith', '555-0003', 'female');
```

### 2. Patients Table
**Purpose**: Patient-specific medical and therapy information

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

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY (userId)`
- `INDEX (therapistId)` - For therapist-patient queries

**Sample Data**:
```sql
INSERT INTO patients (userId, diagnosis, medicalHistory, therapistId) VALUES
(3, 'Developmental Delay', 'No significant medical history', 2),
(4, 'Autism Spectrum Disorder', 'Diagnosed at age 3', 2),
(5, 'Cerebral Palsy', 'Premature birth, diagnosed at 6 months', 2);
```

### 3. Therapists Table
**Purpose**: Professional credentials and specializations

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

**Indexes**:
- `PRIMARY KEY (id)`
- `UNIQUE KEY (userId)`
- `INDEX (specialization)` - For specialization searches

**Sample Data**:
```sql
INSERT INTO therapists (userId, licenseNumber, specialization, yearsOfExperience, education) VALUES
(2, 'OT12345', 'Pediatric Occupational Therapy', 8, 'Masters in Occupational Therapy');
```

### 4. Assessments Table
**Purpose**: Patient evaluation and assessment data

```sql
CREATE TABLE assessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patientId INT NOT NULL,
  therapistId INT NOT NULL,
  assessmentDate DATE NOT NULL,
  assessmentType ENUM('initial', 'progress', 'final') NOT NULL,
  scores JSON,
  observations TEXT,
  recommendations TEXT,
  aiInsights TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX (patientId)` - For patient assessment history
- `INDEX (therapistId)` - For therapist assessments
- `INDEX (assessmentDate)` - For date-based queries

### 5. Daily Notes Table
**Purpose**: Session documentation and progress tracking

```sql
CREATE TABLE daily_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patientId INT NOT NULL,
  therapistId INT NOT NULL,
  sessionDate DATE NOT NULL,
  sessionDuration INT,
  activities TEXT,
  progress TEXT,
  challenges TEXT,
  nextSteps TEXT,
  aiAnalysis TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX (patientId, sessionDate)` - For patient session history
- `INDEX (therapistId, sessionDate)` - For therapist session history

### 6. Appointments Table
**Purpose**: Scheduling and session management

```sql
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patientId INT NOT NULL,
  therapistId INT NOT NULL,
  appointmentDate DATETIME NOT NULL,
  duration INT NOT NULL,
  type ENUM('assessment', 'therapy', 'consultation', 'follow_up') NOT NULL,
  status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show') NOT NULL,
  location VARCHAR(100),
  notes TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX (patientId, appointmentDate)` - For patient schedule
- `INDEX (therapistId, appointmentDate)` - For therapist schedule
- `INDEX (status, appointmentDate)` - For status queries

### 7. Progress Tracking Table
**Purpose**: Outcome measurement and goal tracking

```sql
CREATE TABLE progress_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patientId INT NOT NULL,
  therapistId INT NOT NULL,
  trackingDate DATE NOT NULL,
  baselineScores JSON,
  currentScores JSON,
  targetScores JSON,
  progressNotes TEXT,
  aiInsights TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE,
  FOREIGN KEY (therapistId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX (patientId, trackingDate)` - For patient progress history
- `INDEX (therapistId, trackingDate)` - For therapist progress tracking

### 8. Notifications Table
**Purpose**: System alerts and user communications

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('appointment', 'assessment', 'progress', 'system', 'reminder') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  isRead BOOLEAN DEFAULT FALSE,
  relatedId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX (userId, isRead)` - For user unread notifications
- `INDEX (type, createdAt)` - For notification type queries

## 🔗 Database Relationships

### Entity Relationship Diagram
```
users (1) ←→ (1) patients
  ↓              ↓
  ↓              ↓
therapists (1) ←→ (M) patients
  ↓              ↓
  ↓              ↓
assessments (M) ←→ (1) patients
  ↓              ↓
  ↓              ↓
daily_notes (M) ←→ (1) patients
  ↓              ↓
  ↓              ↓
appointments (M) ←→ (1) patients
  ↓              ↓
  ↓              ↓
progress_tracking (M) ←→ (1) patients
  ↓              ↓
  ↓              ↓
notifications (M) ←→ (1) users
```

### Relationship Details

#### One-to-One Relationships
- **User ↔ Patient**: Each user can have one patient profile
- **User ↔ Therapist**: Each user can have one therapist profile

#### One-to-Many Relationships
- **Therapist → Patients**: One therapist can have multiple patients
- **Patient → Assessments**: One patient can have multiple assessments
- **Patient → Daily Notes**: One patient can have multiple session notes
- **Patient → Appointments**: One patient can have multiple appointments
- **Patient → Progress Tracking**: One patient can have multiple progress entries
- **User → Notifications**: One user can have multiple notifications

#### Many-to-Many Relationships
- **Patients ↔ Therapists**: Through patient assignments and sessions

## 📈 Performance Optimization

### Indexing Strategy
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_patient_sessions ON daily_notes(patientId, sessionDate);
CREATE INDEX idx_therapist_sessions ON daily_notes(therapistId, sessionDate);
CREATE INDEX idx_appointments_schedule ON appointments(therapistId, appointmentDate, status);
CREATE INDEX idx_progress_tracking ON progress_tracking(patientId, trackingDate);
```

### Query Optimization
- **JOIN Optimization**: Use appropriate JOIN types
- **WHERE Clauses**: Leverage indexed columns
- **LIMIT/OFFSET**: Implement pagination for large datasets
- **Connection Pooling**: Reuse database connections

## 🔒 Data Security

### Access Control
- **Role-Based Access**: Admin, Therapist, Patient roles
- **Row-Level Security**: Users can only access their own data
- **Audit Logging**: Track all data modifications

### Data Protection
- **Password Hashing**: bcrypt with 10 rounds
- **JWT Tokens**: Secure authentication
- **Input Validation**: Prevent SQL injection
- **Data Encryption**: Sensitive data encryption (future enhancement)

## 🧹 Data Maintenance

### Backup Strategy
```bash
# Daily backup
mysqldump -u root -p therapease_dev > backup_$(date +%Y%m%d).sql

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p therapease_dev > backup_$DATE.sql
gzip backup_$DATE.sql
```

### Cleanup Procedures
```sql
-- Archive old data
INSERT INTO archived_daily_notes SELECT * FROM daily_notes WHERE sessionDate < DATE_SUB(NOW(), INTERVAL 2 YEAR);
DELETE FROM daily_notes WHERE sessionDate < DATE_SUB(NOW(), INTERVAL 2 YEAR);

-- Clean up expired notifications
DELETE FROM notifications WHERE createdAt < DATE_SUB(NOW(), INTERVAL 30 DAY) AND isRead = TRUE;
```

## 🔧 Database Administration

### Health Monitoring
```sql
-- Check table sizes
SELECT 
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'therapease_dev'
ORDER BY (data_length + index_length) DESC;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

### Performance Tuning
```sql
-- Analyze table statistics
ANALYZE TABLE users, patients, therapists, assessments, daily_notes, appointments, progress_tracking, notifications;

-- Optimize tables
OPTIMIZE TABLE users, patients, therapists, assessments, daily_notes, appointments, progress_tracking, notifications;
```

## 📚 Additional Resources

- **MySQL Documentation**: [Official MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)
- **Database Design**: [Database Design Best Practices](https://www.mysql.com/why-mysql/white-papers/)
- **Performance Tuning**: [MySQL Performance Tuning Guide](https://dev.mysql.com/doc/refman/8.0/en/optimization.html)

---

**Database Schema Version**: 1.0  
**Last Updated**: September 2025  
**Maintained By**: TherapEase Development Team
