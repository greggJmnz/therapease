import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { SystemSettingsProvider } from './context/SystemSettingsContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import TherapistLayout from './layouts/TherapistLayout';
import PatientLayout from './layouts/PatientLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminPatients from './pages/Admin/AdminPatients';
import AdminTherapists from './pages/Admin/AdminTherapists';
import AdminAppointments from './pages/Admin/AdminAppointments';
import AdminNotifications from './pages/Admin/AdminNotifications';
import AdminReports from './pages/Admin/AdminReports';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminHelpCenter from './pages/Admin/AdminHelpCenter';
import AdminProfile from './pages/Admin/AdminProfile';
import AdminUserManagement from './pages/Admin/AdminUserManagement';

import TherapistDashboard from './pages/Therapist/Dashboard';
import TherapistOnboarding from './pages/Therapist/TherapistOnboarding';
import TherapistDailyNotes from './pages/Therapist/DailyNotes';
import TherapistHomeExercises from './pages/Therapist/HomeExercises';
import TherapistAIInsights from './pages/Therapist/AIInsights';
import TherapistProgressTracking from './pages/Therapist/ProgressTracking';
import TherapistPatients from './pages/Therapist/TherapistPatients';
import TherapistSchedule from './pages/Therapist/TherapistSchedule';
import TherapistNotifications from './pages/Therapist/TherapistNotifications';
import TherapistSettings from './pages/Therapist/TherapistSettings';
import TherapistHelpCenter from './pages/Therapist/TherapistHelpCenter';
import TherapistProfile from './pages/Therapist/Profile';


import PatientDashboard from './pages/Patient/Dashboard';
import PatientOnboarding from './pages/Patient/PatientOnboarding';
import PatientProgressView from './pages/Patient/ProgressView';
import PatientAppointments from './pages/Patient/Appointments';
import PatientDailyNotes from './pages/Patient/DailyNotes';
import PatientNotifications from './pages/Patient/Notifications';
import PatientSettings from './pages/Patient/Settings';
import PatientHomeExercises from './pages/Patient/HomeExercises';
import PatientHomeExercisesNew from './pages/Patient/HomeExercisesNew';
import PatientProfile from './pages/Patient/Profile';
import PatientHelp from './pages/Patient/Help';

import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

// Components
import RealtimeNotificationToast from './components/RealtimeNotificationToast';
import MaintenancePage from './components/MaintenancePage';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';

// Maintenance mode wrapper component
const MaintenanceWrapper = ({ children }) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show maintenance page if maintenance mode is enabled and user is not admin
  if (isMaintenanceMode && user?.role !== 'admin') {
    return <MaintenancePage />;
  }

  return children;
};

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/auth/login" replace />;
  }

  return children;
};

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// App content component
const AppContent = () => (
  <MaintenanceWrapper>
    <div className="App">
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route index element={<Navigate to="/auth/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* Admin routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="patients" element={<AdminPatients />} />
          <Route path="therapists" element={<AdminTherapists />} />
          <Route path="appointments" element={<AdminAppointments />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="help" element={<AdminHelpCenter />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Therapist routes */}
        <Route path="/therapist" element={
          <ProtectedRoute allowedRoles={['therapist']}>
            <TherapistLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/therapist/dashboard" replace />} />
          <Route path="dashboard" element={<TherapistDashboard />} />
          <Route path="onboarding" element={<TherapistOnboarding />} />
          <Route path="patients" element={<TherapistPatients />} />
          <Route path="schedule" element={<TherapistSchedule />} />
          <Route path="daily-notes" element={<TherapistDailyNotes />} />
          <Route path="home-exercises" element={<TherapistHomeExercises />} />
          <Route path="ai-insights" element={<TherapistAIInsights />} />
          <Route path="progress-tracking" element={<TherapistProgressTracking />} />
          <Route path="notifications" element={<TherapistNotifications />} />
          <Route path="settings" element={<TherapistSettings />} />
          <Route path="help" element={<TherapistHelpCenter />} />
          <Route path="profile" element={<TherapistProfile />} />
        </Route>

        {/* Patient routes */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<PatientDashboard />} />
          <Route path="onboarding" element={<PatientOnboarding />} />
          <Route path="progress" element={<PatientProgressView />} />
          <Route path="appointments" element={<PatientAppointments />} />
          <Route path="daily-notes" element={<PatientDailyNotes />} />
          <Route path="notifications" element={<PatientNotifications />} />
          <Route path="settings" element={<PatientSettings />} />
          <Route path="exercises" element={<PatientHomeExercisesNew />} />
          <Route path="profile" element={<PatientProfile />} />
          <Route path="help" element={<PatientHelp />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Routes>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      {/* Real-time notifications */}
      <RealtimeNotificationToast />
    </div>
  </MaintenanceWrapper>
);

// Inner app component that has access to auth context
const InnerApp = () => {
  const { isAuthenticated } = useAuth();

  // Conditionally wrap with SystemSettingsProvider only for authenticated users
  if (isAuthenticated) {
    return (
      <SystemSettingsProvider>
        <AppContent />
      </SystemSettingsProvider>
    );
  }

  // For unauthenticated users (login page), don't use SystemSettingsProvider
  return <AppContent />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <InnerApp />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
