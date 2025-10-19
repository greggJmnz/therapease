import axios from 'axios';

// Create axios instance with base configuration
// In production, use relative URL with Nginx proxy; in development, use relative URL
const getApiBaseUrl = () => {
  // Always use relative URL to work with Nginx proxy
  return '/api';
};

const api = axios.create({
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
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => {
    return api.post('/api/auth/login', credentials);
  },
  loginWith2FA: (data) => api.post('/api/auth/login-2fa', data),
  register: (userData) => api.post('/api/auth/register', userData),
  verify: () => api.get(`/api/auth/verify?_t=${Date.now()}`),
  changePassword: (data) => api.post('/api/auth/change-password', data),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
  // 2FA endpoints
  send2FACode: (data) => api.post('/api/auth/2fa/send-code', data),
  verify2FACode: (data) => api.post('/api/auth/2fa/verify-code', data),
  get2FAStatus: () => api.get('/api/auth/2fa/status'),
  enable2FA: (password) => api.post('/api/auth/2fa/enable', { password }),
  verify2FASetup: (code) => api.post('/api/auth/2fa/verify-setup', { code }),
  disable2FA: (password) => api.post('/api/auth/2fa/disable', { password }),
};

// Admin API endpoints
export const adminAPI = {
  getDashboard: () => api.get(`/api/admin/dashboard?_t=${Date.now()}`),
  getUsers: () => api.get(`/api/admin/users?_t=${Date.now()}`),
  getAllUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.append('search', params.search);
    if (params.role && params.role !== 'all') queryParams.append('role', params.role);
    if (params.status && params.status !== 'all') queryParams.append('status', params.status);
    queryParams.append('_t', Date.now());
    return api.get(`/api/admin/users?${queryParams.toString()}`);
  },
  getPatients: () => api.get(`/api/admin/patients?_t=${Date.now()}`),
  getPatientsWithAssignments: () => api.get(`/api/admin/patients/with-assignments?_t=${Date.now()}`),
  getTherapists: () => api.get(`/api/admin/therapists?_t=${Date.now()}`),
  getAvailableTherapists: (patientId) => api.get(`/api/admin/therapists/available?patientId=${patientId}&_t=${Date.now()}`),
  updateTherapistAvailability: (therapistId, data) => api.put(`/api/admin/therapists/${therapistId}/availability`, data),
  addTherapistToPatient: (data) => api.post('/api/admin/patients/add-therapist', data),
  removeTherapistFromPatient: (patientId, therapistId, reason) => api.delete(`/api/admin/patients/${patientId}/therapists/${therapistId}`, { data: { reason } }),
  getPatientTherapists: (patientId) => api.get(`/api/admin/patients/${patientId}/therapists?_t=${Date.now()}`),
  getAppointments: () => api.get(`/api/admin/appointments?_t=${Date.now()}`),
  getPendingAppointments: () => api.get(`/api/admin/appointments/pending?_t=${Date.now()}`),
  approveAppointment: (appointmentId) => api.post(`/api/admin/appointments/${appointmentId}/approve`),
  rejectAppointment: (appointmentId, reason) => api.post(`/api/admin/appointments/${appointmentId}/reject`, { reason }),
  getReports: () => api.get(`/api/admin/reports?_t=${Date.now()}`),
  getSystemStats: (period = 'month') => api.get(`/api/admin/system-stats?period=${period}&_t=${Date.now()}`),
  getDailyTrends: (days = 30) => api.get(`/api/admin/daily-trends?days=${days}&_t=${Date.now()}`),
  getNotifications: () => api.get(`/api/admin/notifications?_t=${Date.now()}`),
  deleteNotification: (id) => api.delete(`/api/admin/notifications/${id}`),
  markNotificationAsRead: (id) => api.patch(`/api/admin/notifications/${id}/read`),
  markAllNotificationsAsRead: () => api.patch('/api/admin/notifications/read-all'),
  getSettings: () => api.get(`/api/admin/settings?_t=${Date.now()}`),
  updateSettings: (settingsData) => api.put('/api/admin/settings', settingsData),
  
  // System settings management
  getSystemSettings: () => api.get(`/api/admin/system-settings?_t=${Date.now()}`),
  updateSystemSettings: (settingsData) => api.put('/api/admin/system-settings', settingsData),
  
  // Public maintenance status check
  getMaintenanceStatus: () => api.get(`/api/maintenance-status?_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/api/admin/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/api/admin/profile', profileData),
  changePassword: (passwordData) => api.post('/api/admin/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/api/admin/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Create/Update operations
  createUser: (userData) => api.post('/api/admin/users', userData),
  updateUser: (id, userData) => api.put(`/api/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/api/admin/users/${id}`),
  updateUserStatus: (id, status) => api.put(`/api/admin/users/${id}/status`, { status }),
  resetUserPassword: (id) => api.post(`/api/admin/users/${id}/reset-password`),
  sendPasswordResetLink: (id) => api.post(`/api/admin/users/${id}/send-reset-link`),
  createAppointment: (appointmentData) => api.post('/api/admin/appointments', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/api/admin/appointments/${id}`, appointmentData),
  
  // Therapist assignment
  assignTherapistToPatient: (data) => api.post('/api/admin/patients/assign-therapist', data),
  unassignTherapistFromPatient: (patientId) => api.delete(`/api/admin/patients/${patientId}/unassign-therapist`),
  deleteAppointment: (id) => api.delete(`/api/admin/appointments/${id}`),
  
  // Therapist working hours
  getTherapistWorkingHours: (therapistId) => api.get(`/api/admin/therapists/${therapistId}/working-hours?_t=${Date.now()}`),
  
  // Patient-specific data
  getPatientAssessments: (patientId) => api.get(`/api/admin/patients/${patientId}/assessments?_t=${Date.now()}`),
  getPatientSessions: (patientId) => api.get(`/api/admin/patients/${patientId}/sessions?_t=${Date.now()}`),
  getPatientProgress: (patientId) => api.get(`/api/admin/patients/${patientId}/progress?_t=${Date.now()}`),
};

// Therapist API endpoints
export const therapistAPI = {
  getDashboard: (therapistId) => api.get(`/api/therapist/dashboard?therapistId=${therapistId}&_t=${Date.now()}`),
  getPatients: () => api.get(`/api/therapist/patients?_t=${Date.now()}`),
  getSchedule: () => api.get(`/api/therapist/schedule?_t=${Date.now()}`),
  createAppointment: (appointmentData) => api.post('/api/therapist/schedule', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/api/therapist/schedule/${id}`, appointmentData),
  deleteAppointment: (id) => api.delete(`/api/therapist/schedule/${id}`),
  // Session management
  getSessions: (therapistId) => api.get(`/api/therapist/sessions?therapistId=${therapistId}&_t=${Date.now()}`),
  createSession: (sessionData, therapistId) => api.post(`/api/therapist/sessions?therapistId=${therapistId}`, sessionData),
  updateSession: (id, sessionData) => api.put(`/api/therapist/sessions/${id}`, sessionData),
  deleteSession: (id) => api.delete(`/api/therapist/sessions/${id}`),
  getSessionById: (id) => api.get(`/api/therapist/sessions/${id}`),
  getDailyNotes: (therapistId) => api.get(`/api/therapist/daily-notes?therapistId=${therapistId}&_t=${Date.now()}`),
  getAIInsights: () => api.get(`/api/therapist/ai-insights?_t=${Date.now()}`),
  getProgressTracking: (therapistId) => api.get(`/api/therapist/progress-tracking?therapistId=${therapistId}&_t=${Date.now()}`),
  getPatientProgressSummary: (patientId) => api.get(`/api/therapist/progress-tracking/patient/${patientId}?_t=${Date.now()}`),
  getNotifications: () => api.get(`/api/notifications?_t=${Date.now()}`),
  getSettings: (therapistId) => api.get(`/api/therapist/settings?therapistId=${therapistId}&_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/api/therapist/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/api/therapist/profile', profileData),
  changePassword: (passwordData) => api.post('/api/therapist/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/api/therapist/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/api/therapist/settings', settingsData),
  
  // Onboarding management
  getOnboardingStatus: () => api.get('/api/therapist/onboarding/status'),
  updateOnboardingData: (onboardingData) => api.put('/api/therapist/onboarding', onboardingData),
  completeOnboarding: (onboardingData) => api.post('/api/therapist/onboarding/complete', onboardingData),
  getOnboardingProgress: () => api.get('/api/therapist/onboarding/progress'),
  
  // Create/Update operations
  createDailyNote: (noteData) => api.post('/api/therapist/daily-notes', noteData),
  updateDailyNote: (id, noteData) => api.put(`/api/therapist/daily-notes/${id}`, noteData),
  deleteDailyNote: (id) => api.delete(`/api/therapist/daily-notes/${id}`),
  
  // Home Exercises management
  getHomeExercises: (therapistId) => api.get(`/api/home-exercises/therapist/exercises?therapistId=${therapistId}&_t=${Date.now()}`),
  createHomeExercise: (exerciseData) => api.post('/api/home-exercises/therapist/exercises', exerciseData),
  updateHomeExercise: (id, exerciseData) => api.put(`/api/home-exercises/therapist/exercises/${id}`, exerciseData),
  deleteHomeExercise: (id) => api.delete(`/api/home-exercises/therapist/exercises/${id}`),
  getHomeExerciseProofs: (therapistId) => api.get(`/api/home-exercises/therapist/proofs?therapistId=${therapistId}&_t=${Date.now()}`),
  reviewHomeExerciseProof: (proofId, reviewData) => api.put(`/api/home-exercises/therapist/proofs/${proofId}/review`, reviewData),
  
  // Patient management
  updatePatientGoals: (patientId, goals) => api.put(`/api/therapist/patients/${patientId}`, { goals: JSON.stringify(goals) }),
  addNoteComment: (id, comment) => api.post(`/api/therapist/daily-notes/${id}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/api/therapist/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/api/therapist/daily-notes/${noteId}/comments/${commentId}`),
  createProgressEntry: (progressData) => api.post('/api/therapist/progress-tracking', progressData),
  updateProgressEntry: (id, progressData) => api.put(`/api/therapist/progress-tracking/${id}`, progressData),
  deleteProgressEntry: (id) => api.delete(`/api/therapist/progress-tracking/${id}`),
  
  // Progress Reports
  uploadProgressReport: (formData) => api.post('/api/progress-reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getProgressReports: (patientId) => api.get(`/api/progress-reports/patient/${patientId}?_t=${Date.now()}`),
  downloadProgressReport: (reportId) => api.get(`/api/progress-reports/download/${reportId}`, { responseType: 'blob' }),
  deleteProgressReport: (reportId) => api.delete(`/api/progress-reports/${reportId}`),
  
  // Treatment Plan management
  getTreatmentPlans: (params = {}) => api.get('/api/treatment-plans', { params }),
  getTreatmentPlan: (id) => api.get(`/api/treatment-plans/${id}`),
  createTreatmentPlan: (planData) => api.post('/api/treatment-plans', planData),
  updateTreatmentPlan: (id, planData) => api.put(`/api/treatment-plans/${id}`, planData),
  deleteTreatmentPlan: (id) => api.delete(`/api/treatment-plans/${id}`),
  
  // Main Objectives
  createMainObjective: (treatmentPlanId, objectiveData) => api.post(`/api/treatment-plans/${treatmentPlanId}/main-objectives`, objectiveData),
  updateMainObjective: (id, objectiveData) => api.put(`/api/treatment-plans/main-objectives/${id}`, objectiveData),
  deleteMainObjective: (id) => api.delete(`/api/treatment-plans/main-objectives/${id}`),
  
  // Specific Objectives
  createSpecificObjective: (mainObjectiveId, objectiveData) => api.post(`/api/treatment-plans/main-objectives/${mainObjectiveId}/specific-objectives`, objectiveData),
  updateSpecificObjective: (id, objectiveData) => api.put(`/api/treatment-plans/specific-objectives/${id}`, objectiveData),
  deleteSpecificObjective: (id) => api.delete(`/api/treatment-plans/specific-objectives/${id}`),
  
  // AI PDF Records Storage
  savePDFRecord: (data) => api.post('/api/ai/pdf-records', data),
  getPDFRecords: (patientId) => api.get(`/api/ai/pdf-records/${patientId}`),
  deletePDFRecord: (recordId) => api.delete(`/api/ai/pdf-records/${recordId}`),
};

// Patient API endpoints
export const patientAPI = {
  getDashboard: () => api.get(`/api/patient/dashboard?_t=${Date.now()}`),
  getProgress: () => api.get(`/api/patient/progress?_t=${Date.now()}`),
  getAppointments: () => api.get(`/api/patient/appointments?_t=${Date.now()}`).then(response => response.data),
  bookAppointment: (appointmentData) => api.post('/api/patient/appointments', appointmentData),
  cancelAppointment: (id, reason) => api.put(`/api/patient/appointments/${id}/cancel`, { reason }),
  postponeAppointment: (id, newDate, newTime, reason) => api.put(`/api/patient/appointments/${id}/postpone`, { newDate, newTime, reason }),
  rescheduleAppointment: (id, data) => api.put(`/api/patient/appointments/${id}/reschedule`, data),
  getDailyNotes: () => api.get(`/api/patient/daily-notes?_t=${Date.now()}`),
  cleanupDailyNotes: () => api.post('/api/patient/daily-notes/cleanup'),
  addNoteComment: (noteId, comment) => api.post(`/api/patient/daily-notes/${noteId}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/api/patient/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/api/patient/daily-notes/${noteId}/comments/${commentId}`),
  getSessions: () => api.get(`/api/patient/sessions?_t=${Date.now()}`),
  getNotifications: () => api.get(`/api/notifications?_t=${Date.now()}`),
  getSettings: () => api.get(`/api/patient/settings?_t=${Date.now()}`),
  getHomeExercises: (patientId) => api.get(`/api/home-exercises/patient/exercises?patientId=${patientId}&_t=${Date.now()}`),
  getHomeExercisesNew: (patientId) => api.get(`/api/home-exercises/patient/exercises?patientId=${patientId}&_t=${Date.now()}`),
  submitHomeExerciseProof: (exerciseId, formData) => api.post(`/api/home-exercises/patient/exercises/${exerciseId}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getHomeExerciseProofs: (patientId) => api.get(`/api/home-exercises/patient/proofs?patientId=${patientId}&_t=${Date.now()}`),
  getExerciseProofs: (exerciseId) => api.get(`/api/home-exercises/patient/exercises/${exerciseId}/proofs?_t=${Date.now()}`),
      getTreatmentPlan: () => api.get(`/api/treatment-plans/patient/current?_t=${Date.now()}`),
  
  // Progress Reports
  getMyProgressReports: () => api.get(`/api/progress-reports/my-reports?_t=${Date.now()}`),
  downloadProgressReport: (reportId) => api.get(`/api/progress-reports/download/${reportId}`, { responseType: 'blob' }),
  
  // Profile management
  getProfile: () => api.get(`/api/patient/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/api/patient/profile', profileData),
  getTherapists: () => api.get(`/api/patient/therapists?_t=${Date.now()}`),
  changePassword: (passwordData) => api.post('/api/patient/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/api/patient/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/api/patient/settings', settingsData),
  
  // Onboarding management
  getOnboardingStatus: () => api.get('/api/patient/onboarding/status'),
  updateOnboardingData: (onboardingData) => api.put('/api/patient/onboarding', onboardingData),
  completeOnboarding: (onboardingData) => api.post('/api/patient/onboarding/complete', onboardingData),
  getOnboardingProgress: () => api.get('/api/patient/onboarding/progress'),
};

// AI API endpoints
export const aiAPI = {
  analyzeAssessment: (data) => api.post('/api/ai/analyze-assessment', data),
  
  // AI Assessment Data Storage
  saveAssessmentData: (data) => api.post('/api/ai/assessment-data', data),
  getAssessmentData: (patientId) => api.get(`/api/ai/assessment-data/${patientId}`),
  
  // AI PDF Records Storage
  savePDFRecord: (data) => api.post('/api/ai/pdf-records', data),
  getPDFRecords: (patientId) => api.get(`/api/ai/pdf-records/${patientId}`),
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
