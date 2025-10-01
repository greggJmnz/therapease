import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // Use relative URL with proxy
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
    return api.post('/auth/login', credentials);
  },
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get(`/auth/verify?_t=${Date.now()}`),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
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
  getPatients: () => api.get(`/admin/patients?role=patient&_t=${Date.now()}`),
  getTherapists: () => api.get(`/admin/therapists?role=therapist&_t=${Date.now()}`),
  getAppointments: () => api.get(`/admin/appointments?_t=${Date.now()}`),
  getReports: () => api.get(`/admin/reports?_t=${Date.now()}`),
  getNotifications: () => api.get(`/notifications?_t=${Date.now()}`),
  getSettings: () => api.get(`/admin/settings?_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/admin/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/admin/profile', profileData),
  changePassword: (passwordData) => api.post('/admin/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/admin/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/admin/settings', settingsData),
  
  // Create/Update operations
  createUser: (userData) => api.post('/admin/users', userData),
  updateUser: (id, userData) => api.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  resetUserPassword: (id) => api.post(`/admin/users/${id}/reset-password`),
  sendPasswordResetLink: (id) => api.post(`/admin/users/${id}/send-reset-link`),
  createAppointment: (appointmentData) => api.post('/admin/appointments', appointmentData),
  
  // Patient-specific data
  getPatientAssessments: (patientId) => api.get(`/admin/patients/${patientId}/assessments?_t=${Date.now()}`),
  getPatientSessions: (patientId) => api.get(`/admin/patients/${patientId}/sessions?_t=${Date.now()}`),
  getPatientProgress: (patientId) => api.get(`/admin/patients/${patientId}/progress?_t=${Date.now()}`),
};

// Therapist API endpoints
export const therapistAPI = {
  getDashboard: () => api.get(`/therapist/dashboard?_t=${Date.now()}`),
  getPatients: () => api.get(`/test/patients?_t=${Date.now()}`),
  getSchedule: () => api.get(`/therapist/schedule?_t=${Date.now()}`),
  createAppointment: (appointmentData) => api.post('/therapist/schedule', appointmentData),
  updateAppointment: (id, appointmentData) => api.put(`/therapist/schedule/${id}`, appointmentData),
  deleteAppointment: (id) => api.delete(`/therapist/schedule/${id}`),
  // Session management
  getSessions: () => api.get(`/therapist/sessions?_t=${Date.now()}`),
  createSession: (sessionData) => api.post('/therapist/sessions', sessionData),
  updateSession: (id, sessionData) => api.put(`/therapist/sessions/${id}`, sessionData),
  deleteSession: (id) => api.delete(`/therapist/sessions/${id}`),
  getSessionById: (id) => api.get(`/therapist/sessions/${id}`),
  getDailyNotes: () => api.get(`/therapist/daily-notes?_t=${Date.now()}`),
  getAIInsights: () => api.get(`/therapist/ai-insights?_t=${Date.now()}`),
  getProgressTracking: () => api.get(`/therapist/progress-tracking?_t=${Date.now()}`),
  getPatientProgressSummary: (patientId) => api.get(`/therapist/progress-tracking/patient/${patientId}?_t=${Date.now()}`),
  getNotifications: () => api.get(`/notifications?_t=${Date.now()}`),
  getSettings: () => api.get(`/therapist/settings?_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/therapist/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/therapist/profile', profileData),
  changePassword: (passwordData) => api.post('/therapist/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/therapist/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/therapist/settings', settingsData),
  
  // Create/Update operations
  createDailyNote: (noteData) => api.post('/therapist/daily-notes', noteData),
  updateDailyNote: (id, noteData) => api.put(`/therapist/daily-notes/${id}`, noteData),
  deleteDailyNote: (id) => api.delete(`/therapist/daily-notes/${id}`),
  
  // Patient management
  updatePatientGoals: (patientId, goals) => api.put(`/therapist/patients/${patientId}`, { goals: JSON.stringify(goals) }),
  addNoteComment: (id, comment) => api.post(`/therapist/daily-notes/${id}/comments`, { comment }),
  editNoteComment: (noteId, commentId, comment) => api.put(`/therapist/daily-notes/${noteId}/comments/${commentId}`, { comment }),
  deleteNoteComment: (noteId, commentId) => api.delete(`/therapist/daily-notes/${noteId}/comments/${commentId}`),
  createProgressEntry: (progressData) => api.post('/therapist/progress-tracking', progressData),
  updateProgressEntry: (id, progressData) => api.put(`/therapist/progress-tracking/${id}`, progressData),
  deleteProgressEntry: (id) => api.delete(`/therapist/progress-tracking/${id}`),
  
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
  getAssessments: () => api.get(`/patient/assessments?_t=${Date.now()}`),
  getNotifications: () => api.get(`/notifications?_t=${Date.now()}`),
  getSettings: () => api.get(`/patient/settings?_t=${Date.now()}`),
  getHomeExercises: () => api.get(`/patient/exercises?_t=${Date.now()}`),
  getTreatmentPlan: () => api.get(`/treatment-plans/patient/current?_t=${Date.now()}`),
  
  // Profile management
  getProfile: () => api.get(`/patient/profile?_t=${Date.now()}`),
  updateProfile: (profileData) => api.put('/patient/profile', profileData),
  changePassword: (passwordData) => api.post('/patient/change-password', passwordData),
  uploadProfileImage: (formData) => api.post('/patient/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Settings management
  updateSettings: (settingsData) => api.put('/patient/settings', settingsData),
};

// AI API endpoints
export const aiAPI = {
  analyzeSessionNotes: (data) => api.post('/ai/analyze-session', data),
  generateProgressSummary: (data) => api.post('/ai/progress-summary', data),
  generateHomeExercisePlan: (data) => api.post('/ai/exercise-plan', data),
  generateParentSummary: (data) => api.post('/ai/parent-summary', data),
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
