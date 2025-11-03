import axios from 'axios';

// Create axios instance with base configuration
// Use environment variable if available, otherwise fallback to relative URL
const getApiBaseUrl = () => {
  // Check if VITE_API_URL is set (production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback to relative URL for development
  return '/api';
};

// Create axios instance with base configuration
// Export it so other services can use it
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Request interceptor to add auth token
api.interceptors.request.use(
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

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API: Response interceptor error:', error);
    
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage but don't redirect automatically
      // Let the AuthContext handle the logout logic to prevent page reloads
      console.log('🔐 Token expired, clearing storage...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      
      // Only redirect if not already on login page and not in the middle of a request
      if (window.location.pathname !== '/auth/login' && !error.config?.url?.includes('/auth/verify')) {
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
  verify: () => api.get(`/auth/verify?_t=${Date.now()}`),
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
  getDashboard: () => api.get(`/admin/dashboard?_t=${Date.now()}`),
  getUsers: () => api.get(`/admin/users?_t=${Date.now()}`),
  getAllUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    queryParams.append('_t', Date.now());
    return api.get(`/admin/users?${queryParams.toString()}`);
  },
  getPatients: () => api.get(`/admin/patients?_t=${Date.now()}`),
  getPatientsWithAssignments: () => api.get(`/admin/patients/with-assignments?_t=${Date.now()}`),
  getTherapists: () => api.get(`/admin/therapists?_t=${Date.now()}`),
  getAvailableTherapists: (patientId) => api.get(`/admin/therapists/available?patientId=${patientId}&_t=${Date.now()}`),
  updateTherapistAvailability: (therapistId, data) => api.put(`/admin/therapists/${therapistId}/availability`, data),
  addTherapistToPatient: (data) => api.post('/admin/patients/add-therapist', data),
  removeTherapistFromPatient: (patientId, therapistId, reason) => api.delete(`/admin/patients/${patientId}/therapists/${therapistId}`, { data: { reason } }),
  getPatientTherapists: (patientId) => api.get(`/admin/patients/${patientId}/therapists?_t=${Date.now()}`),
  getAppointments: () => api.get(`/admin/appointments?_t=${Date.now()}`),
  getPendingAppointments: () => api.get(`/admin/appointments/pending?_t=${Date.now()}`),
  approveAppointment: (appointmentId) => api.post(`/admin/appointments/${appointmentId}/approve`),
  rejectAppointment: (appointmentId, reason) => api.post(`/admin/appointments/${appointmentId}/reject`, { reason }),
  getReports: () => api.get(`/admin/reports?_t=${Date.now()}`),
  getSystemStats: (period = 'month') => api.get(`/admin/system-stats?period=${period}&_t=${Date.now()}`),
  getDailyTrends: (days = 30) => api.get(`/admin/daily-trends?days=${days}&_t=${Date.now()}`),
  getNotifications: () => api.get(`/admin/notifications?_t=${Date.now()}`),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`),
  markNotificationAsRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/admin/notifications/read-all'),
  getSettings: () => api.get(`/admin/settings?_t=${Date.now()}`),
  updateSettings: (settingsData) => api.put('/admin/settings', settingsData),
  
  // System settings management
  getSystemSettings: () => api.get(`/admin/system-settings?_t=${Date.now()}`),
  updateSystemSettings: (settingsData) => api.put('/admin/system-settings', settingsData),
  
  // Public maintenance status check
  getMaintenanceStatus: () => api.get(`/maintenance-status?_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/admin/profile?_t=${Date.now()}`),
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
  getTherapistWorkingHours: (therapistId) => api.get(`/admin/therapists/${therapistId}/working-hours?_t=${Date.now()}`),
  
  // Patient-specific data
  getPatientAssessments: (patientId) => api.get(`/admin/patients/${patientId}/assessments?_t=${Date.now()}`),
  getPatientSessions: (patientId) => api.get(`/admin/patients/${patientId}/sessions?_t=${Date.now()}`),
  getPatientProgress: (patientId) => api.get(`/admin/patients/${patientId}/progress?_t=${Date.now()}`),
};

// Therapist API endpoints
export const therapistAPI = {
  getDashboard: (therapistId) => api.get(`/therapist/dashboard?therapistId=${therapistId}&_t=${Date.now()}`),
  getPatients: () => api.get(`/therapist/patients?_t=${Date.now()}`),
  getSchedule: () => api.get(`/therapist/schedule?_t=${Date.now()}`),
  createAppointment: (appointmentData) => api.post('/therapist/schedule', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/therapist/schedule/${id}`, appointmentData),
  deleteAppointment: (id) => api.delete(`/therapist/schedule/${id}`),
  // Session management
  getSessions: (therapistId) => api.get(`/therapist/sessions?therapistId=${therapistId}&_t=${Date.now()}`),
  createSession: (sessionData, therapistId) => api.post(`/therapist/sessions?therapistId=${therapistId}`, sessionData),
  updateSession: (id, sessionData) => api.put(`/therapist/sessions/${id}`, sessionData),
  deleteSession: (id) => api.delete(`/therapist/sessions/${id}`),
  getSessionById: (id) => api.get(`/therapist/sessions/${id}`),
  getDailyNotes: (therapistId) => api.get(`/therapist/daily-notes?therapistId=${therapistId}&_t=${Date.now()}`),
  getAIInsights: () => api.get(`/therapist/ai-insights?_t=${Date.now()}`),
  getProgressTracking: (therapistId) => api.get(`/therapist/progress-tracking?therapistId=${therapistId}&_t=${Date.now()}`),
  getPatientProgressSummary: (patientId) => api.get(`/therapist/progress-tracking/patient/${patientId}?_t=${Date.now()}`),
  getNotifications: () => api.get(`/notifications?_t=${Date.now()}`),
  getSettings: (therapistId) => api.get(`/therapist/settings?therapistId=${therapistId}&_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/therapist/profile?_t=${Date.now()}`),
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
  createDailyNote: (noteData) => api.post('/therapist/daily-notes', noteData),
  updateDailyNote: (id, noteData) => api.put(`/therapist/daily-notes/${id}`, noteData),
  deleteDailyNote: (id) => api.delete(`/therapist/daily-notes/${id}`),
  
  // Home Exercises management
  getHomeExercises: (therapistId) => api.get(`/home-exercises/therapist/exercises?therapistId=${therapistId}&_t=${Date.now()}`),
  createHomeExercise: (exerciseData) => api.post('/home-exercises/therapist/exercises', exerciseData),
  updateHomeExercise: (id, exerciseData) => api.put(`/home-exercises/therapist/exercises/${id}`, exerciseData),
  deleteHomeExercise: (id) => api.delete(`/home-exercises/therapist/exercises/${id}`),
  getHomeExerciseProofs: (therapistId) => api.get(`/home-exercises/therapist/proofs?therapistId=${therapistId}&_t=${Date.now()}`),
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
  getProgressReports: (patientId) => api.get(`/progress-reports/patient/${patientId}?_t=${Date.now()}`),
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
  getDashboard: () => api.get(`/patient/dashboard?_t=${Date.now()}`),
  getProgress: () => api.get(`/patient/progress?_t=${Date.now()}`),
  getAppointments: () => api.get(`/patient/appointments?_t=${Date.now()}`).then(response => response.data),
  bookAppointment: (appointmentData) => api.post('/patient/appointments', appointmentData),
  cancelAppointment: (id, reason) => api.put(`/patient/appointments/${id}/cancel`, { reason }),
  postponeAppointment: (id, newDate, newTime, reason) => api.put(`/patient/appointments/${id}/postpone`, { newDate, newTime, reason }),
  rescheduleAppointment: (id, data) => api.put(`/patient/appointments/${id}/reschedule`, data),
  getDailyNotes: () => api.get(`/patient/daily-notes?_t=${Date.now()}`),
  cleanupDailyNotes: () => api.post('/patient/daily-notes/cleanup'),
  addNoteComment: (noteId, comment) => api.post(`/patient/daily-notes/${noteId}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/patient/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/patient/daily-notes/${noteId}/comments/${commentId}`),
  getSessions: () => api.get(`/patient/sessions?_t=${Date.now()}`),
  getNotifications: () => api.get(`/notifications?_t=${Date.now()}`),
  getSettings: () => api.get(`/patient/settings?_t=${Date.now()}`),
  getHomeExercises: (patientId) => api.get(`/home-exercises/patient/exercises?patientId=${patientId}&_t=${Date.now()}`),
  getHomeExercisesNew: (patientId) => api.get(`/home-exercises/patient/exercises?patientId=${patientId}&_t=${Date.now()}`),
  submitHomeExerciseProof: (exerciseId, formData) => api.post(`/home-exercises/patient/exercises/${exerciseId}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getHomeExerciseProofs: (patientId) => api.get(`/home-exercises/patient/proofs?patientId=${patientId}&_t=${Date.now()}`),
  getExerciseProofs: (exerciseId) => api.get(`/home-exercises/patient/exercises/${exerciseId}/proofs?_t=${Date.now()}`),
      getTreatmentPlan: () => api.get(`/treatment-plans/patient/current?_t=${Date.now()}`),
  
  // Progress Reports
  getMyProgressReports: () => api.get(`/progress-reports/my-reports?_t=${Date.now()}`),
  downloadProgressReport: (reportId) => api.get(`/progress-reports/download/${reportId}`, { responseType: 'blob' }),
  
  // Profile management
  getProfile: () => api.get(`/patient/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/patient/profile', profileData),
  getTherapists: () => api.get(`/patient/therapists?_t=${Date.now()}`),
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
export const aiAPI = {
  analyzeAssessment: (data) => api.post('/ai/analyze-assessment', data),
  
  // AI Assessment Data Storage
  saveAssessmentData: (data) => api.post('/ai/assessment-data', data),
  getAssessmentData: (patientId) => api.get(`/ai/assessment-data/${patientId}`),
  
  // AI PDF Records Storage
  savePDFRecord: (data) => api.post('/ai/pdf-records', data),
  getPDFRecords: (patientId) => api.get(`/ai/pdf-records/${patientId}`),
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
