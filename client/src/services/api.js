import axios from 'axios';

// Create axios instance with base configuration
// Use environment variable if available, otherwise fallback to relative URL
const getApiBaseUrl = () => {
  // Check if VITE_API_URL is set (production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback to relative URL for development
  if (import.meta.env.DEV) {
    console.warn('⚠️ VITE_API_URL not set! Falling back to relative /api. This will fail in production.');
    console.warn('💡 Set VITE_API_URL=https://api.therapease.site/api in Vercel environment variables');
  }
  return '/api';
};

// Create axios instance with base configuration
// Export it so other services can use it
const apiBaseUrl = getApiBaseUrl();
const isCrossOrigin = apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://');

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000, // 10 seconds for regular API calls
  headers: {
    'Content-Type': 'application/json',
  },
  // Enable credentials for cross-origin requests to send Authorization header
  withCredentials: isCrossOrigin,
  // OPTIMIZED: Disable axios retries - React Query will handle retries with better control
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors (only 5xx)
});

// Create separate axios instance for AI endpoints with longer timeout
// AI insights generation can take 1-3 minutes
export const aiApi = axios.create({
  baseURL: apiBaseUrl,
  timeout: 180000, // 3 minutes (180 seconds) for AI endpoints
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: isCrossOrigin,
  // OPTIMIZED: Disable axios retries - React Query will handle retries with better control
  validateStatus: (status) => status < 500, // Don't throw on 4xx errors (only 5xx)
});

// Request interceptor to add auth token to aiApi
aiApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor to add auth token to regular api
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Debug logging in development
      if (import.meta.env.DEV) {
        console.log('API Request:', {
          url: config.url,
          baseURL: config.baseURL,
          fullURL: `${config.baseURL}${config.url}`,
          hasToken: !!token,
          tokenLength: token.length,
          tokenPreview: token.substring(0, 20) + '...',
          headers: config.headers,
        });
      }
    } else {
      // Debug logging if no token
      if (import.meta.env.DEV) {
        console.warn('API Request without token:', {
          url: config.url,
          baseURL: config.baseURL,
        });
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Only log in development to avoid console spam
    if (import.meta.env.DEV) {
      console.error('API: Response interceptor error:', {
        url: error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
    }
    
    // Handle 503 Service Unavailable (Maintenance Mode)
    if (error.response?.status === 503 && error.response?.data?.maintenanceMode) {
      // Dispatch event to trigger maintenance mode in useMaintenanceMode hook
      window.dispatchEvent(new CustomEvent('maintenance:enabled', {
        detail: {
          message: error.response.data.message || 'System is currently under maintenance. Please try again later.',
          maintenanceMode: true
        }
      }));
      // Don't reject - let the maintenance page handle it
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      // Don't clear token on initial verify check (this happens during auth initialization)
      // Only clear token if we're not on the login page and it's not a verify request
      const isVerifyRequest = error.config?.url?.includes('/auth/verify');
      const isLoginPage = window.location.pathname === '/auth/login';
      
      // If it's a verify request and we're on login page, it's expected - don't clear
      if (isVerifyRequest && isLoginPage) {
        // Expected during auth initialization - don't clear token
        return Promise.reject(error);
      }
      
      // Token expired or invalid, clear storage but don't redirect automatically
      // Let the AuthContext handle the logout logic to prevent page reloads
      if (!isVerifyRequest) {
        // Only clear token if it's not a verify request (verify might fail during init)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
      }
      
      // Only trigger logout if not already on login page and not a verify request
      if (!isLoginPage && !isVerifyRequest) {
        // Use custom event to trigger logout in AuthContext instead of direct redirect
        // This prevents full page reload and maintains React state
        window.dispatchEvent(new CustomEvent('auth:logout', { 
          detail: { reason: 'token_expired', error: error.response?.data } 
        }));
      }
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },
  loginWith2FA: (data) => api.post('/auth/login-2fa', data),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  // 2FA endpoints
  send2FACode: (data) => api.post('/auth/2fa/send-code', data),
  verify2FACode: (data) => api.post('/auth/2fa/verify-code', data),
  get2FAStatus: () => api.get('/auth/2fa/status'),
  enable2FA: (password) => api.post('/auth/2fa/enable', { password }),
  verify2FASetup: (code) => api.post('/auth/2fa/verify-setup', { code }),
  disable2FA: (password) => api.post('/auth/2fa/disable', { password }),
};

// Admin API endpoints
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getAllUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    return api.get(`/admin/users?${queryParams.toString()}`);
  },
  getPatients: () => api.get('/admin/patients'),
  getPatientsWithAssignments: () => api.get('/admin/patients/with-assignments'),
  getTherapists: () => api.get('/admin/therapists'),
  getAvailableTherapists: (patientId) => api.get(`/admin/therapists/available?patientId=${patientId}`),
  updateTherapistAvailability: (therapistId, data) => api.put(`/admin/therapists/${therapistId}/availability`, data),
  addTherapistToPatient: (data) => api.post('/admin/patients/add-therapist', data),
  removeTherapistFromPatient: (patientId, therapistId, reason) => api.delete(`/admin/patients/${patientId}/therapists/${therapistId}`, { data: { reason } }),
  getPatientTherapists: (patientId) => api.get(`/admin/patients/${patientId}/therapists`),
  getAppointments: () => api.get('/admin/appointments'),
  getPendingAppointments: () => api.get('/admin/appointments/pending'),
  approveAppointment: (appointmentId) => api.post(`/admin/appointments/${appointmentId}/approve`),
  rejectAppointment: (appointmentId, reason) => api.post(`/admin/appointments/${appointmentId}/reject`, { reason }),
  getReports: () => api.get('/admin/reports'),
  getSystemStats: (period = 'month') => api.get(`/admin/system-stats?period=${period}`),
  getDailyTrends: (days = 30) => api.get(`/admin/daily-trends?days=${days}`),
  getNotifications: () => api.get('/admin/notifications'),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
  markNotificationAsRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/admin/notifications/read-all'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (settingsData) => api.put('/admin/settings', settingsData),
  
  // System settings management
  getSystemSettings: () => api.get('/admin/system-settings'),
  updateSystemSettings: (settingsData) => api.put('/admin/system-settings', settingsData),
  
  // Public maintenance status check
  getMaintenanceStatus: () => api.get('/maintenance-status'),
  
  // Profile management
  getProfile: () => api.get('/admin/profile'),
  updateProfile: (profileData) => api.put('/admin/profile', profileData),
  changePassword: (passwordData) => api.post('/admin/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/admin/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Create/Update operations
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  sendPasswordResetLink: (id) => api.post(`/admin/users/${id}/send-reset-link`),
  createAppointment: (appointmentData) => api.post('/admin/appointments', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/admin/appointments/${id}`, appointmentData),
  
  // Therapist assignment
  assignTherapistToPatient: (data) => api.post('/admin/patients/assign-therapist', data),
  unassignTherapistFromPatient: (patientId) => api.delete(`/admin/patients/${patientId}/unassign-therapist`),
  deleteAppointment: (id) => api.delete(`/admin/appointments/${id}`),
  
  // Therapist working hours
  getTherapistWorkingHours: (therapistId) => api.get(`/admin/therapists/${therapistId}/working-hours`),
  
  // Patient-specific data
  getPatientAssessments: (patientId) => api.get(`/admin/patients/${patientId}/assessments`),
  getPatientSessions: (patientId) => api.get(`/admin/patients/${patientId}/sessions`),
  getPatientProgress: (patientId) => api.get(`/admin/patients/${patientId}/progress`),
};

// Therapist API endpoints
export const therapistAPI = {
  getDashboard: (therapistId) => api.get(`/therapist/dashboard?therapistId=${therapistId}`), // Full dashboard (backward compatible)
  getDashboardStats: () => api.get('/therapist/dashboard/stats'), // Fast stats only
  getDashboardRecent: () => api.get('/therapist/dashboard/recent'), // Recent items only
  getDashboardProgressTrends: () => api.get('/therapist/dashboard/progress-trends'), // Progress and trends only
  getPatients: () => api.get(`/therapist/patients`),
  getSchedule: () => api.get(`/therapist/schedule`),
  createAppointment: (appointmentData) => api.post('/therapist/schedule', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/therapist/schedule/${id}`, appointmentData),
  deleteAppointment: (id) => api.delete(`/therapist/schedule/${id}`),
  approveAppointment: (id) => api.post(`/therapist/schedule/${id}/approve`),
  // Session management
  getSessions: (therapistId) => api.get(`/therapist/sessions?therapistId=${therapistId}`),
  createSession: (sessionData, therapistId) => api.post(`/therapist/sessions?therapistId=${therapistId}`, sessionData),
  updateSession: (id, sessionData) => api.put(`/therapist/sessions/${id}`, sessionData),
  deleteSession: (id) => api.delete(`/therapist/sessions/${id}`),
  getSessionById: (id) => api.get(`/therapist/sessions/${id}`),
  getDailyNotes: (therapistId) => api.get(`/therapist/daily-notes?therapistId=${therapistId}`),
  getPastAppointmentsForPatient: (patientId) => api.get(`/therapist/daily-notes/past-appointments?patientId=${patientId}`),
  getAIInsights: () => api.get(`/therapist/ai-insights`),
  getProgressTracking: (therapistId) => api.get(`/therapist/progress-tracking?therapistId=${therapistId}`),
  getPatientProgressSummary: (patientId) => api.get(`/therapist/progress-tracking/patient/${patientId}`),
  getNotifications: () => api.get(`/therapist/notifications`),
  getSettings: (therapistId) => api.get(`/therapist/settings?therapistId=${therapistId}`),
  
  // Profile management
  getProfile: () => api.get(`/therapist/profile`),
  updateProfile: (profileData) => api.put('/therapist/profile', profileData),
  changePassword: (passwordData) => api.post('/therapist/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/therapist/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/therapist/settings', settingsData),
  
  // Onboarding management
  getOnboardingStatus: () => api.get('/therapist/onboarding/status'),
  updateOnboardingData: (onboardingData) => api.put('/therapist/onboarding', onboardingData),
  completeOnboarding: (onboardingData) => api.post('/therapist/onboarding/complete', onboardingData),
  getOnboardingProgress: () => api.get('/therapist/onboarding/progress'),
  
  // Create/Update operations
  createDailyNote: (noteData) => {
    // If noteData is FormData, send as-is with proper headers
    if (noteData instanceof FormData) {
      return api.post('/therapist/daily-notes', noteData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    // Otherwise, send as JSON
    return api.post('/therapist/daily-notes', noteData);
  },
  updateDailyNote: (id, noteData) => api.put(`/therapist/daily-notes/${id}`, noteData),
  deleteDailyNote: (id) => api.delete(`/therapist/daily-notes/${id}`),
  
  // Home Exercises management
  getHomeExercises: (therapistId) => api.get(`/home-exercises/therapist/exercises?therapistId=${therapistId}`),
  createHomeExercise: (exerciseData) => api.post('/home-exercises/therapist/exercises', exerciseData),
  updateHomeExercise: (id, exerciseData) => api.put(`/home-exercises/therapist/exercises/${id}`, exerciseData),
  deleteHomeExercise: (id) => api.delete(`/home-exercises/therapist/exercises/${id}`),
  getHomeExerciseProofs: (therapistId) => api.get(`/home-exercises/therapist/proofs?therapistId=${therapistId}`),
  reviewHomeExerciseProof: (proofId, reviewData) => api.put(`/home-exercises/therapist/proofs/${proofId}/review`, reviewData),
  
  // Patient management
  updatePatientGoals: (patientId, goals) => api.put(`/therapist/patients/${patientId}`, { goals: JSON.stringify(goals) }),
  addNoteComment: (id, comment) => api.post(`/therapist/daily-notes/${id}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/therapist/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/therapist/daily-notes/${noteId}/comments/${commentId}`),
  createProgressEntry: (progressData) => api.post('/therapist/progress-tracking', progressData),
  updateProgressEntry: (id, progressData) => api.put(`/therapist/progress-tracking/${id}`, progressData),
  deleteProgressEntry: (id) => api.delete(`/therapist/progress-tracking/${id}`),
  
  // Progress Reports
  uploadProgressReport: (formData) => api.post('/progress-reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getProgressReports: (patientId) => api.get(`/progress-reports/patient/${patientId}`),
  downloadProgressReport: (reportId) => api.get(`/progress-reports/download/${reportId}`, { responseType: 'blob' }),
  deleteProgressReport: (reportId) => api.delete(`/progress-reports/${reportId}`),
  
  // Treatment Plan management
  getTreatmentPlans: (params = {}) => api.get('/treatment-plans', { params }),
  getTreatmentPlan: (id) => api.get(`/treatment-plans/${id}`),
  createTreatmentPlan: (planData) => api.post('/treatment-plans', planData),
  updateTreatmentPlan: (id, planData) => api.put(`/treatment-plans/${id}`, planData),
  deleteTreatmentPlan: (id) => api.delete(`/treatment-plans/${id}`),
  
  // Main Objectives
  createMainObjective: (treatmentPlanId, objectiveData) => api.post(`/treatment-plans/${treatmentPlanId}/main-objectives`, objectiveData),
  updateMainObjective: (id, objectiveData) => api.put(`/treatment-plans/main-objectives/${id}`, objectiveData),
  deleteMainObjective: (id) => api.delete(`/treatment-plans/main-objectives/${id}`),
  
  // Specific Objectives
  createSpecificObjective: (mainObjectiveId, objectiveData) => api.post(`/treatment-plans/main-objectives/${mainObjectiveId}/specific-objectives`, objectiveData),
  updateSpecificObjective: (id, objectiveData) => api.put(`/treatment-plans/specific-objectives/${id}`, objectiveData),
  deleteSpecificObjective: (id) => api.delete(`/treatment-plans/specific-objectives/${id}`),
  
  // AI PDF Records Storage
  savePDFRecord: (data) => api.post('/ai/pdf-records', data),
  getPDFRecords: (patientId) => api.get(`/ai/pdf-records/${patientId}`),
  deletePDFRecord: (recordId) => api.delete(`/ai/pdf-records/${recordId}`),
};

// Patient API endpoints
export const patientAPI = {
  getDashboard: () => api.get(`/patient/dashboard`),
  getProgress: () => api.get(`/patient/progress`),
  getAppointments: () => api.get(`/patient/appointments`).then(response => response.data),
  bookAppointment: (appointmentData) => api.post('/patient/appointments', appointmentData),
  cancelAppointment: (id, reason) => api.put(`/patient/appointments/${id}/cancel`, { reason }),
  postponeAppointment: (id, newDate, newTime, reason) => api.put(`/patient/appointments/${id}/postpone`, { newDate, newTime, reason }),
  rescheduleAppointment: (id, data) => api.put(`/patient/appointments/${id}/reschedule`, data),
  getDailyNotes: () => api.get(`/patient/daily-notes`),
  cleanupDailyNotes: () => api.post('/patient/daily-notes/cleanup'),
  addNoteComment: (noteId, comment) => api.post(`/patient/daily-notes/${noteId}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/patient/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/patient/daily-notes/${noteId}/comments/${commentId}`),
  getSessions: () => api.get(`/patient/sessions`),
  getNotifications: () => api.get(`/patient/notifications`),
  getSettings: () => api.get(`/patient/settings`),
  getHomeExercises: () => api.get(`/patient/exercises`),
  getHomeExercisesNew: (patientId) => api.get(`/home-exercises/patient/exercises?patientId=${patientId || localStorage.getItem('userId') || ''}`),
  updateExerciseStatus: (exerciseId, status) => api.put(`/home-exercises/patient/exercises/${exerciseId}/status`, { status }),
  submitHomeExerciseProof: (exerciseId, formData) => api.post(`/home-exercises/patient/exercises/${exerciseId}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getHomeExerciseProofs: (patientId) => api.get(`/home-exercises/patient/proofs?patientId=${patientId || localStorage.getItem('userId') || ''}`),
  getExerciseProofs: (exerciseId) => api.get(`/home-exercises/patient/exercises/${exerciseId}/proofs`),
      getTreatmentPlan: () => api.get(`/treatment-plans/patient/current`),
  
  // Progress Reports
  getMyProgressReports: () => api.get(`/progress-reports/my-reports`),
  downloadProgressReport: (reportId) => api.get(`/progress-reports/download/${reportId}`, { responseType: 'blob' }),
  
  // Profile management
  getProfile: () => api.get(`/patient/profile`),
  updateProfile: (profileData) => api.put('/patient/profile', profileData),
  getTherapists: () => api.get(`/patient/therapists`),
  changePassword: (passwordData) => api.post('/patient/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/patient/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/patient/settings', settingsData),
  
  // Onboarding management
  getOnboardingStatus: () => api.get('/patient/onboarding/status'),
  updateOnboardingData: (onboardingData) => api.put('/patient/onboarding', onboardingData),
  completeOnboarding: (onboardingData) => api.post('/patient/onboarding/complete', onboardingData),
  getOnboardingProgress: () => api.get('/patient/onboarding/progress'),
};

// AI API endpoints
// Use aiApi for analyzeAssessment (longer timeout for AI generation)
// Use regular api for other AI endpoints (data storage, etc.)
export const aiAPI = {
  analyzeAssessment: (data) => aiApi.post('/ai/analyze-assessment', data),
  
  // AI Assessment Data Storage (regular timeout is fine)
  saveAssessmentData: (data) => api.post('/ai/assessment-data', data),
  getAssessmentData: (patientId) => api.get(`/ai/assessment-data/${patientId}`),
  
  // AI PDF Records Storage (regular timeout is fine)
  savePDFRecord: (data) => api.post('/ai/pdf-records', data),
  getPDFRecords: (patientId) => api.get(`/ai/pdf-records/${patientId}`),
  
  // Question Templates
  getQuestionTemplates: () => api.get('/ai/question-templates'),
  saveQuestionTemplate: (template) => {
    if (template.id) {
      return api.put(`/ai/question-templates/${template.id}`, template);
    }
    return api.post('/ai/question-templates', template);
  },
  deleteQuestionTemplate: (id) => api.delete(`/ai/question-templates/${id}`),
  migrateTemplates: (templates) => api.post('/ai/question-templates/migrate', { templates }),
};

// Generic API methods
export const genericAPI = {
  get: (url) => api.get(url),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  delete: (url) => api.delete(url),
  patch: (url, data) => api.patch(url, data),
};


export default api;
