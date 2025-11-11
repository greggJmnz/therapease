import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

// Context providers
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SystemSettingsProvider } from './context/SystemSettingsContext.jsx';

// Layouts (eager load - needed immediately)
import AdminLayout from './layouts/AdminLayout';
import TherapistLayout from './layouts/TherapistLayout';
import PatientLayout from './layouts/PatientLayout';
import AuthLayout from './layouts/AuthLayout';

// Lazy load pages for route-based code splitting
// Admin pages
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminPatients = lazy(() => import('./pages/Admin/AdminPatients'));
const AdminTherapists = lazy(() => import('./pages/Admin/AdminTherapists'));
const AdminAppointments = lazy(() => import('./pages/Admin/AdminAppointments'));
const AdminNotifications = lazy(() => import('./pages/Admin/AdminNotifications'));
const AdminReports = lazy(() => import('./pages/Admin/AdminReports'));
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'));
const AdminHelpCenter = lazy(() => import('./pages/Admin/AdminHelpCenter'));
const AdminProfile = lazy(() => import('./pages/Admin/AdminProfile'));
const AdminUserManagement = lazy(() => import('./pages/Admin/AdminUserManagement'));

// Therapist pages
const TherapistDashboard = lazy(() => import('./pages/Therapist/Dashboard'));
const TherapistOnboarding = lazy(() => import('./pages/Therapist/TherapistOnboarding'));
const TherapistDailyNotes = lazy(() => import('./pages/Therapist/DailyNotes'));
const TherapistHomeExercises = lazy(() => import('./pages/Therapist/HomeExercises'));
const TherapistAIInsights = lazy(() => import('./pages/Therapist/AIInsights'));
const TherapistProgressTracking = lazy(() => import('./pages/Therapist/ProgressTracking'));
const TherapistPatients = lazy(() => import('./pages/Therapist/TherapistPatients'));
const TherapistSchedule = lazy(() => import('./pages/Therapist/TherapistSchedule'));
const TherapistNotifications = lazy(() => import('./pages/Therapist/TherapistNotifications'));
const TherapistSettings = lazy(() => import('./pages/Therapist/TherapistSettings'));
const TherapistHelpCenter = lazy(() => import('./pages/Therapist/TherapistHelpCenter'));
const TherapistProfile = lazy(() => import('./pages/Therapist/Profile'));

// Patient pages
const PatientDashboard = lazy(() => import('./pages/Patient/Dashboard'));
const PatientOnboarding = lazy(() => import('./pages/Patient/PatientOnboarding'));
const PatientProgressView = lazy(() => import('./pages/Patient/ProgressView'));
const PatientAppointments = lazy(() => import('./pages/Patient/Appointments'));
const PatientDailyNotes = lazy(() => import('./pages/Patient/DailyNotes'));
const PatientNotifications = lazy(() => import('./pages/Patient/Notifications'));
const PatientSettings = lazy(() => import('./pages/Patient/Settings'));
const PatientHomeExercises = lazy(() => import('./pages/Patient/HomeExercises'));
const PatientHomeExercisesNew = lazy(() => import('./pages/Patient/HomeExercisesNew'));
const PatientProfile = lazy(() => import('./pages/Patient/Profile'));
const PatientHelp = lazy(() => import('./pages/Patient/Help'));

// Auth pages (eager load - needed immediately for login)
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';

// Components
import RealtimeNotificationToast from './components/RealtimeNotificationToast';
import MaintenancePage from './components/MaintenancePage';
import AutoPushNotificationInitializer from './components/AutoPushNotificationInitializer';
import { useMaintenanceMode } from './hooks/useMaintenanceMode';

// Maintenance mode wrapper component
// OPTIMIZED: Don't block rendering while checking maintenance status
const MaintenanceWrapper = ({ children }) => {
  const { isMaintenanceMode, isLoading } = useMaintenanceMode();
  const { user } = useAuth();

  // OPTIMIZED: Don't block UI while checking maintenance - render children immediately
  // If maintenance check fails or is slow, allow user to proceed (better UX)
  // Only show maintenance page if we confirm maintenance mode is ON
  if (!isLoading && isMaintenanceMode && user?.role !== 'admin') {
    return <MaintenancePage />;
  }

  // Render children immediately - don't wait for maintenance check
  return children;
};

// Smart root redirect component - checks authentication and redirects accordingly
const RootRedirect = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Wait for auth state to be initialized
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

  // If authenticated, redirect to appropriate dashboard based on role
  if (isAuthenticated && user) {
    switch (user.role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'therapist':
        return <Navigate to="/therapist/dashboard" replace />;
      case 'patient':
        return <Navigate to="/patient/dashboard" replace />;
      default:
        return <Navigate to="/auth/login" replace />;
    }
  }

  // If not authenticated, redirect to login
  return <Navigate to="/auth/login" replace />;
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

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading page...</p>
    </div>
  </div>
);

// Suspense wrapper for lazy-loaded routes
const LazyRoute = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

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
          <Route path="dashboard" element={<LazyRoute><AdminDashboard /></LazyRoute>} />
          <Route path="users" element={<LazyRoute><AdminUserManagement /></LazyRoute>} />
          <Route path="patients" element={<LazyRoute><AdminPatients /></LazyRoute>} />
          <Route path="therapists" element={<LazyRoute><AdminTherapists /></LazyRoute>} />
          <Route path="appointments" element={<LazyRoute><AdminAppointments /></LazyRoute>} />
          <Route path="reports" element={<LazyRoute><AdminReports /></LazyRoute>} />
          <Route path="notifications" element={<LazyRoute><AdminNotifications /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><AdminSettings /></LazyRoute>} />
          <Route path="help" element={<LazyRoute><AdminHelpCenter /></LazyRoute>} />
          <Route path="profile" element={<LazyRoute><AdminProfile /></LazyRoute>} />
        </Route>

        {/* Therapist routes */}
        <Route path="/therapist" element={
          <ProtectedRoute allowedRoles={['therapist']}>
            <TherapistLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/therapist/dashboard" replace />} />
          <Route path="dashboard" element={<LazyRoute><TherapistDashboard /></LazyRoute>} />
          <Route path="onboarding" element={<LazyRoute><TherapistOnboarding /></LazyRoute>} />
          <Route path="patients" element={<LazyRoute><TherapistPatients /></LazyRoute>} />
          <Route path="schedule" element={<LazyRoute><TherapistSchedule /></LazyRoute>} />
          <Route path="daily-notes" element={<LazyRoute><TherapistDailyNotes /></LazyRoute>} />
          <Route path="home-exercises" element={<LazyRoute><TherapistHomeExercises /></LazyRoute>} />
          <Route path="ai-insights" element={<LazyRoute><TherapistAIInsights /></LazyRoute>} />
          <Route path="progress-tracking" element={<LazyRoute><TherapistProgressTracking /></LazyRoute>} />
          <Route path="notifications" element={<LazyRoute><TherapistNotifications /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><TherapistSettings /></LazyRoute>} />
          <Route path="help" element={<LazyRoute><TherapistHelpCenter /></LazyRoute>} />
          <Route path="profile" element={<LazyRoute><TherapistProfile /></LazyRoute>} />
        </Route>

        {/* Patient routes */}
        <Route path="/patient" element={
          <ProtectedRoute allowedRoles={['patient']}>
            <PatientLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/patient/dashboard" replace />} />
          <Route path="dashboard" element={<LazyRoute><PatientDashboard /></LazyRoute>} />
          <Route path="onboarding" element={<LazyRoute><PatientOnboarding /></LazyRoute>} />
          <Route path="progress" element={<LazyRoute><PatientProgressView /></LazyRoute>} />
          <Route path="appointments" element={<LazyRoute><PatientAppointments /></LazyRoute>} />
          <Route path="daily-notes" element={<LazyRoute><PatientDailyNotes /></LazyRoute>} />
          <Route path="notifications" element={<LazyRoute><PatientNotifications /></LazyRoute>} />
          <Route path="settings" element={<LazyRoute><PatientSettings /></LazyRoute>} />
          <Route path="exercises" element={<LazyRoute><PatientHomeExercisesNew /></LazyRoute>} />
          <Route path="profile" element={<LazyRoute><PatientProfile /></LazyRoute>} />
          <Route path="help" element={<LazyRoute><PatientHelp /></LazyRoute>} />
        </Route>

        {/* Default redirect - smart redirect based on authentication */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
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
      
      {/* Auto-initialize push notifications after login */}
      <AutoPushNotificationInitializer />
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
