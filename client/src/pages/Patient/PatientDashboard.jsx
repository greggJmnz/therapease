import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useRealtimeData } from '../../hooks/useWebSocket';
import { 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock, 
  Target,
  Bell,
  Star,
  Activity,
  CheckCircle,
  AlertCircle,
  Download,
  Play,
  Pause
} from 'lucide-react';
import { UltraModernCalendar } from '../../components';
import { patientAPI } from '../../services/api';
import './PatientDashboard.css';

const PatientDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedNote, setSelectedNote] = useState(null);

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading: dashboardLoading, error: dashboardError, refetch: refetchDashboard } = useQuery(
    'patientDashboard',
    patientAPI.getDashboard,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Enable real-time updates for patient dashboard
  const { isRefreshing: isDashboardRefreshing } = useRealtimeData('patientDashboard', refetchDashboard);


  const dashboardStats = {
    totalSessions: dashboardData?.data?.upcomingAppointments?.length || 0,
    completedSessions: dashboardData?.data?.recentProgress?.length || 0,
    currentStreak: 5, // This would need to be calculated from session data
    averageRating: 4.8, // This would need to be calculated from feedback
    nextSession: dashboardData?.data?.upcomingAppointments?.[0]?.appointmentDate || 'No upcoming sessions',
    therapistName: dashboardData?.data?.therapist ? `${dashboardData.data.therapist.firstName} ${dashboardData.data.therapist.lastName}` : 'No therapist assigned'
  };

  // Fetch appointments data for calendar
  const { data: patientAppointmentsData } = useQuery(
    'patientAppointments',
    patientAPI.getAppointments,
    {
      refetchInterval: 30000,
    }
  );

  // Transform appointments to calendar events
  const calendarEvents = (patientAppointmentsData?.data?.appointments || []).map(appointment => ({
    title: appointment.type || 'Session',
    start: appointment.appointmentDate,
    end: appointment.endTime,
    priority: appointment.priority || 'medium',
    type: appointment.type || 'session',
    extendedProps: { 
      type: appointment.type || 'session',
      room: appointment.room || 'Room TBD',
      therapist: dashboardStats.therapistName
    }
  }));

  // Fetch recent sessions data
  const { data: sessionsData } = useQuery(
    'patientSessions',
    patientAPI.getSessions,
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const recentSessions = (sessionsData?.data || []).map(session => ({
    id: session.id,
    date: session.sessionDate || 'No date',
    type: session.type || 'Session',
    duration: session.duration || '45 minutes',
    therapist: dashboardStats.therapistName || 'Dr. Sarah Wilson',
    progress: session.progress || 75,
    notes: session.notes || 'No notes available'
  }));

  // Fetch home exercises data
  const { data: exercisesData } = useQuery(
    'patientExercises',
    patientAPI.getHomeExercises,
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const homeExercises = (exercisesData?.data || []).map(exercise => ({
    id: exercise.id,
    name: exercise.name || 'Exercise',
    description: exercise.description || 'No description',
    duration: exercise.duration || '15 minutes',
    frequency: exercise.frequency || 'Daily',
    difficulty: exercise.difficulty || 'Medium',
    lastCompleted: exercise.lastCompleted || 'Not completed',
    streak: exercise.streak || 0,
    progress: exercise.progress || 50
  }));

  const notifications = [
    {
      id: 1,
      type: 'session',
      title: 'New Daily Notes Available',
      message: 'Dr. Aleli Ong has uploaded new daily notes for your session on January 20',
      time: '2 hours ago',
      priority: 'medium',
      read: false
    },
    {
      id: 2,
      type: 'appointment',
      title: 'Assessment Scheduled',
      message: 'Your therapist has scheduled an assessment on January 25, 10:00 AM',
      time: '1 day ago',
      priority: 'high',
      read: false
    },
    {
      id: 3,
      type: 'progress',
      title: 'Progress Report Ready',
      message: 'Your monthly progress report is now available for review',
      time: '3 days ago',
      priority: 'low',
      read: true
    }
  ];

  // Fetch daily notes data
  const { data: notesData } = useQuery(
    'patientDailyNotes',
    patientAPI.getDailyNotes,
    {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const dailyNotes = (notesData?.data || []).map(note => ({
    id: note.id,
    date: note.date || 'No date',
    sessionDuration: note.sessionDuration || '45 minutes',
    sessionSummary: note.sessionSummary || 'No summary available',
    activities: note.activities || [],
    performanceObservations: note.performanceObservations || [],
    goals: note.goals || [],
    therapist: dashboardStats.therapistName || 'Dr. Sarah Wilson'
  }));

  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2>Welcome back, Alexandra! 👋</h2>
        <p>You're doing great with your therapy sessions. Keep up the excellent work!</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon sessions">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <h3>Total Sessions</h3>
            <p className="stat-number">{dashboardStats.totalSessions}</p>
            <span className="stat-change positive">
              <TrendingUp size={16} />
              +2 this month
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon streak">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <h3>Current Streak</h3>
            <p className="stat-number">{dashboardStats.currentStreak}</p>
            <span className="stat-change positive">
              <CheckCircle size={16} />
              Keep it up!
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon rating">
            <Star size={24} />
          </div>
          <div className="stat-content">
            <h3>Your Rating</h3>
            <p className="stat-number">{dashboardStats.averageRating}</p>
            <span className="stat-change positive">
              <Star size={16} />
              Excellent!
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon next">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <h3>Next Session</h3>
            <p className="stat-number">{dashboardStats.nextSession}</p>
            <span className="stat-change neutral">
              <Clock size={16} />
              With {dashboardStats.therapistName}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="recent-sessions">
        <h3>Recent Sessions</h3>
        <div className="sessions-grid">
          {recentSessions.map(session => (
            <div key={session.id} className="session-card">
              <div className="session-header">
                <h4>{session.type}</h4>
                <span className="session-date">{session.date}</span>
              </div>
              <div className="session-details">
                <p><strong>Therapist:</strong> {session.therapist}</p>
                <p><strong>Duration:</strong> {session.duration}</p>
                <div className="progress-section">
                  <span>Progress: {session.progress}%</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${session.progress}%` }}
                    ></div>
                  </div>
                </div>
                <p className="session-notes">{session.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHomeExercises = () => (
    <div className="home-exercises-section">
      <div className="section-header">
        <h3>Home Exercises</h3>
        <p>Continue your progress with these exercises at home</p>
      </div>

      <div className="exercises-grid">
        {homeExercises.map(exercise => (
          <div key={exercise.id} className="exercise-card">
            <div className="exercise-header">
              <h4>{exercise.name}</h4>
              <span className={`difficulty-badge ${exercise.difficulty.toLowerCase()}`}>
                {exercise.difficulty}
              </span>
            </div>
            
            <p className="exercise-description">{exercise.description}</p>
            
            <div className="exercise-meta">
              <div className="meta-item">
                <Clock size={14} />
                <span>{exercise.duration}</span>
              </div>
              <div className="meta-item">
                <Calendar size={14} />
                <span>{exercise.frequency}</span>
              </div>
              <div className="meta-item">
                <Target size={14} />
                <span>Streak: {exercise.streak}</span>
              </div>
            </div>

            <div className="exercise-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${exercise.progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{exercise.progress}%</span>
            </div>

            <div className="exercise-actions">
              <button className="btn-primary">
                <Play size={16} />
                Start Exercise
              </button>
              <span className="last-completed">
                Last: {exercise.lastCompleted}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyNotes = () => (
    <div className="daily-notes-section">
      <div className="section-header">
        <h3>Daily Notes</h3>
        <p>Review your therapy session notes and progress</p>
      </div>

      <div className="notes-list">
        {dailyNotes.map(note => (
          <div key={note.id} className="note-card" onClick={() => setSelectedNote(note)}>
            <div className="note-header">
              <div className="note-date">
                <Calendar size={16} />
                <span>{note.date}</span>
              </div>
              <div className="note-duration">
                <Clock size={16} />
                <span>{note.sessionDuration}</span>
              </div>
            </div>
            
            <div className="note-summary">
              <h4>Session Summary</h4>
              <p>{note.sessionSummary}</p>
            </div>

            <div className="note-activities">
              <h5>Activities Completed:</h5>
              <ul>
                {note.activities.slice(0, 3).map((activity, index) => (
                  <li key={index}>
                    {activity.name} ({activity.duration})
                  </li>
                ))}
              </ul>
              {note.activities.length > 3 && (
                <span className="more-activities">
                  +{note.activities.length - 3} more activities
                </span>
              )}
            </div>

            <div className="note-footer">
              <span className="therapist-name">By {note.therapist}</span>
              <button className="btn-secondary">
                <FileText size={16} />
                View Full Note
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSchedule = () => (
    <div className="schedule-section">
      <div className="schedule-header">
        <h3>Your Schedule</h3>
        <p>Upcoming therapy sessions and appointments</p>
      </div>

      <div className="upcoming-sessions">
        <h4>Upcoming Sessions</h4>
        <div className="sessions-timeline">
          {calendarEvents.slice(0, 3).map((event, index) => (
            <div key={index} className="timeline-item">
              <div className="timeline-date">
                <span className="date">{new Date(event.start).getDate()}</span>
                <span className="month">{new Date(event.start).toLocaleDateString('en-US', { month: 'short' })}</span>
              </div>
              <div className="timeline-content">
                <h5>{event.title}</h5>
                <p className="timeline-time">
                  {new Date(event.start).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </p>
                <p className="timeline-location">Room {event.extendedProps.room}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="calendar-container">
        <h4>Monthly Calendar</h4>
        <UltraModernCalendar
          events={calendarEvents}
          onEventClick={(event) => {
            // You can open a modal or navigate to event details here
          }}
          onDateClick={(date) => {
            // You can show events for that date or open add event modal
          }}
          onAddEvent={() => {
          }}
          showQuickActions={true}
          showSearch={true}
          showFilters={true}
          className="mt-6"
        />
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="notifications-section">
      <div className="notifications-header">
        <h3>Notifications</h3>
        <button className="btn-secondary">
          <Bell size={16} />
          Mark All Read
        </button>
      </div>

      <div className="notifications-list">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification-card ${notification.priority} ${!notification.read ? 'unread' : ''}`}>
            <div className="notification-icon">
              <Bell size={20} />
            </div>
            <div className="notification-content">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
              <div className="notification-meta">
                <span className="time">{notification.time}</span>
                <span className={`priority-badge ${notification.priority}`}>
                  {notification.priority}
                </span>
              </div>
            </div>
            <div className="notification-actions">
              {!notification.read && (
                <button className="mark-read-btn">Mark Read</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="patient-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1>Welcome back, Alexandra Santos</h1>
        <p>Track your therapy progress and stay connected with your care team</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={16} />
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'exercises' ? 'active' : ''}`}
          onClick={() => setActiveTab('exercises')}
        >
          <Target size={16} />
          Home Exercises
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <FileText size={16} />
          Daily Notes
        </button>
        <button 
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={16} />
          Schedule
        </button>
        <button 
          className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={16} />
          Notifications
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'exercises' && renderHomeExercises()}
        {activeTab === 'notes' && renderDailyNotes()}
        {activeTab === 'schedule' && renderSchedule()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>

      {/* Note Detail Modal */}
      {selectedNote && (
        <div className="modal-overlay" onClick={() => setSelectedNote(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Session Notes - {selectedNote.date}</h3>
              <button className="close-btn" onClick={() => setSelectedNote(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="note-detail">
                <div className="note-meta">
                  <p><strong>Duration:</strong> {selectedNote.sessionDuration}</p>
                  <p><strong>Therapist:</strong> {selectedNote.therapist}</p>
                </div>
                
                <div className="note-section">
                  <h4>Session Summary</h4>
                  <p>{selectedNote.sessionSummary}</p>
                </div>

                <div className="note-section">
                  <h4>Activities Completed</h4>
                  <ul>
                    {selectedNote.activities.map((activity, index) => (
                      <li key={index}>
                        <strong>{activity.name}</strong> - {activity.duration}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="note-section">
                  <h4>Performance Observations</h4>
                  <ul>
                    {selectedNote.performanceObservations.map((observation, index) => (
                      <li key={index}>{observation}</li>
                    ))}
                  </ul>
                </div>

                <div className="note-section">
                  <h4>Goals for Next Session</h4>
                  <ul>
                    {selectedNote.goals.map((goal, index) => (
                      <li key={index}>{goal}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;
