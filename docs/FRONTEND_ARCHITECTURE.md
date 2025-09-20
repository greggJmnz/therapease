# 🎨 TherapEase Frontend Architecture Documentation

## 📋 Overview

The TherapEase frontend is built with React 18, using modern hooks, context API, and a component-based architecture. The design follows a clean, accessible, and responsive approach optimized for healthcare professionals.

## 🏗️ Architecture Overview

### Technology Stack
- **React 18**: Latest React with concurrent features
- **React Router v6**: Client-side routing with protected routes
- **Tailwind CSS**: Utility-first CSS framework
- **React Hook Form**: Form management and validation
- **React Query**: Server state management
- **Lucide React**: Modern icon library
- **React Hot Toast**: User notifications

### Project Structure
```
client/src/
├── 📁 components/          # Reusable UI components
│   ├── 📁 common/          # Generic components
│   ├── 📁 layout/          # Layout components
│   ├── 📁 forms/           # Form components
│   └── 📁 ui/              # UI-specific components
├── 📁 pages/               # Page components
│   ├── 📁 Admin/           # Admin portal pages
│   ├── 📁 Therapist/       # Therapist portal pages
│   ├── 📁 Patient/         # Patient portal pages
│   └── 📁 Auth/            # Authentication pages
├── 📁 context/             # React Context providers
├── 📁 services/            # API service layer
├── 📁 hooks/               # Custom React hooks
├── 📁 utils/               # Utility functions
├── 📁 styles/              # Global styles and CSS
└── 📁 assets/              # Static assets
```

## 🧩 Component Architecture

### Component Hierarchy
```
App
├── AuthProvider
├── Router
│   ├── Public Routes
│   │   ├── Login
│   │   └── Register
│   └── Protected Routes
│       ├── Admin Routes
│       │   ├── Dashboard
│       │   ├── Patients
│       │   ├── Therapists
│       │   └── Settings
│       ├── Therapist Routes
│       │   ├── Dashboard
│       │   ├── Patients
│       │   ├── Sessions
│       │   └── AI Insights
│       └── Patient Routes
│           ├── Dashboard
│           ├── Progress
│           └── Appointments
```

### Component Categories

#### 1. Common Components (`components/common/`)
**Purpose**: Reusable components used across the application

```jsx
// Button.jsx - Reusable button component
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  onClick,
  type = 'button',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {children}
    </button>
  );
};
```

#### 2. Layout Components (`components/layout/`)
**Purpose**: Structure and navigation components

```jsx
// Header.jsx - Application header
const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };
  
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img className="h-8 w-auto" src="/logo.svg" alt="TherapEase" />
            <h1 className="ml-3 text-xl font-semibold text-gray-900">
              TherapEase
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">
              Welcome, {user?.firstName} {user?.lastName}
            </span>
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
```

#### 3. Form Components (`components/forms/`)
**Purpose**: Form-specific components with validation

```jsx
// Input.jsx - Form input component
const Input = ({ 
  label, 
  name, 
  type = 'text', 
  error, 
  required = false,
  ...props 
}) => {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
```

## 🎯 Page Components

### Admin Portal Pages

#### AdminDashboard.jsx
**Purpose**: Main admin dashboard with system overview

```jsx
const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalTherapists: 0,
    totalAppointments: 0,
    pendingApprovals: 0
  });
  
  const [recentAppointments, setRecentAppointments] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, appointmentsResponse] = await Promise.all([
          adminAPI.getDashboard(),
          adminAPI.getAppointments()
        ]);
        
        setStats(statsResponse.data.data);
        setRecentAppointments(appointmentsResponse.data.data.slice(0, 5));
      } catch (error) {
        toast.error('Failed to load dashboard data');
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Admin Dashboard
      </h1>
      
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Patients" value={stats.totalPatients} icon={Users} />
        <StatCard title="Total Therapists" value={stats.totalTherapists} icon={UserCheck} />
        <StatCard title="Total Appointments" value={stats.totalAppointments} icon={Calendar} />
        <StatCard title="Pending Approvals" value={stats.pendingApprovals} icon={Clock} />
      </div>
      
      {/* Recent Appointments */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Recent Appointments
        </h2>
        <AppointmentsTable appointments={recentAppointments} />
      </div>
    </div>
  );
};
```

### Therapist Portal Pages

#### TherapistDashboard.jsx
**Purpose**: Therapist-specific dashboard with patient overview

```jsx
const TherapistDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    assignedPatients: [],
    todaySessions: [],
    recentNotes: []
  });
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [patientsResponse, sessionsResponse, notesResponse] = await Promise.all([
          therapistAPI.getPatients(),
          therapistAPI.getSchedule(),
          therapistAPI.getDailyNotes()
        ]);
        
        setDashboardData({
          assignedPatients: patientsResponse.data.data,
          todaySessions: sessionsResponse.data.data.filter(s => 
            new Date(s.appointmentDate).toDateString() === new Date().toDateString()
          ),
          recentNotes: notesResponse.data.data.slice(0, 5)
        });
      } catch (error) {
        toast.error('Failed to load dashboard data');
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Welcome back, {user?.firstName}!
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assigned Patients */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Your Patients ({dashboardData.assignedPatients.length})
          </h2>
          <PatientsList patients={dashboardData.assignedPatients} />
        </div>
        
        {/* Today's Sessions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Today's Sessions ({dashboardData.todaySessions.length})
          </h2>
          <SessionsList sessions={dashboardData.todaySessions} />
        </div>
      </div>
    </div>
  );
};
```

## 🔄 State Management

### Context API Usage

#### AuthContext
**Purpose**: Manage authentication state across the application

```jsx
// context/AuthContext.js
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const data = response.data;
      
      if (data.success) {
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role
        };
        
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        setToken(data.data.token);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      return { success: false, message: 'Network error' };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      token,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### Custom Hooks

#### useAuth Hook
**Purpose**: Easy access to authentication context

```jsx
// hooks/useAuth.js
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### useAPI Hook
**Purpose**: Centralized API calls with error handling

```jsx
// hooks/useAPI.js
export const useAPI = () => {
  const { token } = useAuth();
  
  const apiCall = useCallback(async (apiFunction, ...args) => {
    try {
      const response = await apiFunction(...args);
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        return { success: false, error: 'Unauthorized' };
      }
      return { success: false, error: error.message };
    }
  }, [token]);
  
  return { apiCall };
};
```

## 🛣️ Routing & Navigation

### Route Configuration

```jsx
// App.jsx
const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="patients" element={<AdminPatients />} />
              <Route path="therapists" element={<AdminTherapists />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            <Route path="/therapist" element={<TherapistLayout />}>
              <Route index element={<TherapistDashboard />} />
              <Route path="patients" element={<TherapistPatients />} />
              <Route path="sessions" element={<TherapistSessions />} />
              <Route path="ai-insights" element={<AIInsights />} />
            </Route>
            
            <Route path="/patient" element={<PatientLayout />}>
              <Route index element={<PatientDashboard />} />
              <Route path="progress" element={<PatientProgress />} />
              <Route path="appointments" element={<PatientAppointments />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};
```

### Protected Route Component

```jsx
// components/common/ProtectedRoute.jsx
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }
  
  // Role-based access control
  const path = location.pathname;
  if (path.startsWith('/admin') && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  if (path.startsWith('/therapist') && user?.role !== 'therapist') {
    return <Navigate to="/" replace />;
  }
  
  if (path.startsWith('/patient') && user?.role !== 'patient') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};
```

## 🎨 Styling & Design System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        success: {
          500: '#10b981',
          600: '#059669'
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706'
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
```

### Component Variants

```jsx
// Utility function for component variants
const getComponentVariants = (baseClasses, variants, sizes) => {
  return (variant = 'default', size = 'default', className = '') => {
    const variantClasses = variants[variant] || variants.default;
    const sizeClasses = sizes[size] || sizes.default;
    
    return `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();
  };
};

// Usage example
const buttonClasses = getComponentVariants(
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    default: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  },
  {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-6 py-3 text-base'
  }
);
```

## 📱 Responsive Design

### Breakpoint Strategy

```jsx
// Responsive component example
const ResponsiveGrid = ({ children }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {children}
    </div>
  );
};

// Mobile-first approach
const ResponsiveTable = ({ data }) => {
  return (
    <div className="overflow-x-auto">
      {/* Desktop view */}
      <table className="hidden lg:table w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4">Name</th>
            <th className="text-left py-3 px-4">Status</th>
            <th className="text-left py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-3 px-4">{item.name}</td>
              <td className="py-3 px-4">{item.status}</td>
              <td className="py-3 px-4">{item.actions}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Mobile view */}
      <div className="lg:hidden space-y-4">
        {data.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium">{item.name}</h3>
              <span className="text-sm text-gray-500">{item.status}</span>
            </div>
            <div className="flex space-x-2">
              {item.actions}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 🧪 Testing Strategy

### Component Testing

```jsx
// __tests__/components/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';

describe('Button Component', () => {
  test('renders button with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('applies variant classes correctly', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-red-600');
    expect(button).toHaveClass('text-white');
  });
});
```

### Integration Testing

```jsx
// __tests__/pages/AdminDashboard.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import AdminDashboard from '../../pages/Admin/AdminDashboard';

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  test('renders dashboard with statistics', async () => {
    renderWithProviders(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Total Patients')).toBeInTheDocument();
      expect(screen.getByText('Total Therapists')).toBeInTheDocument();
    });
  });
});
```

## 🚀 Performance Optimization

### Code Splitting

```jsx
// Lazy load page components
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const TherapistDashboard = lazy(() => import('./pages/Therapist/TherapistDashboard'));
const PatientDashboard = lazy(() => import('./pages/Patient/PatientDashboard'));

// Suspense wrapper
const App = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Routes */}
      </Routes>
    </Suspense>
  );
};
```

### Memoization

```jsx
// Memoize expensive components
const ExpensiveChart = memo(({ data }) => {
  // Chart rendering logic
  return <Chart data={data} />;
});

// Memoize expensive calculations
const useMemoizedData = (rawData) => {
  return useMemo(() => {
    return rawData.map(item => ({
      ...item,
      calculatedValue: expensiveCalculation(item)
    }));
  }, [rawData]);
};
```

## 📚 Additional Resources

- **React Documentation**: [Official React Docs](https://react.dev/)
- **Tailwind CSS**: [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- **React Router**: [React Router Documentation](https://reactrouter.com/)
- **Testing**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

**Frontend Architecture Version**: 1.0  
**Last Updated**: September 2025  
**Maintained By**: TherapEase Development Team
