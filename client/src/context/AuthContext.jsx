import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { authAPI } from '../services/api';
import websocketService from '../services/websocketService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Listen for custom logout events from API interceptor
    const handleLogoutEvent = (event) => {
      logout();
    };
    
    window.addEventListener('auth:logout', handleLogoutEvent);
    
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');

      if (storedToken && storedUser && storedRole && storedUserId) {
        // Set user immediately from cache for faster initial render
        const userData = {
          id: storedUserId,
          role: storedRole,
          ...JSON.parse(storedUser),
        };
        setUser(userData);
        setIsAuthenticated(true);
        setToken(storedToken);
        setIsLoading(false); // Allow UI to render immediately
        
        // Verify token and initialize WebSocket asynchronously (non-blocking)
        // This allows the UI to render immediately while verification happens in background
        // IMPORTANT: Keep user logged in even if verification fails (network issues, etc.)
        // Only logout if token is explicitly invalid (401 Unauthorized)
        authAPI.verify().then(response => {
          const data = response.data;
          if (!data.success) {
            // Token is invalid, clear storage
            logout();
          } else {
            // Token is valid - initialize WebSocket connection
            // Use setTimeout to defer WebSocket connection slightly to prioritize UI rendering
            setTimeout(() => {
              websocketService.connect(storedToken);
            }, 100);
          }
        }).catch(error => {
          // IMPORTANT: Don't logout on network errors or timeouts
          // Keep user logged in if there's any chance token is still valid
          // Only logout if we get explicit 401 Unauthorized response
          if (error.response?.status === 401) {
            // Token is explicitly invalid - logout user
            console.warn('Token verification failed with 401 - logging out');
            logout();
          } else {
            // Network error, timeout, or other error - keep user logged in
            // User can still use the app, and we'll retry verification later
            console.warn('Token verification failed (network error) - keeping user logged in:', error.message);
            // Still try to connect WebSocket - it might work even if verify failed
            setTimeout(() => {
              websocketService.connect(storedToken);
            }, 100);
          }
        });
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, []);

  // Auto-refresh token to maintain session
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    let refreshInterval;
    let lastActivity = Date.now();

    // Track user activity
    const updateActivity = () => {
      lastActivity = Date.now();
    };

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Refresh token every 30 minutes, but only if user has been active
    refreshInterval = setInterval(async () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      
      // Only refresh if user has been active in the last 5 minutes
      if (timeSinceActivity < 5 * 60 * 1000) {
        try {
          // Verify token to refresh session
          const response = await authAPI.verify();
          if (response.data.success) {
            // Token is still valid - session maintained
          } else {
            // Token is invalid - logout
            logout();
          }
        } catch (error) {
          // IMPORTANT: Don't logout on network errors during background refresh
          // Only logout if token is explicitly invalid (401)
          if (error.response?.status === 401) {
            logout();
          }
          // Otherwise, keep user logged in even if refresh fails
        }
      }
    }, 30 * 60 * 1000); // Check every 30 minutes

    return () => {
      clearInterval(refreshInterval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [isAuthenticated, token]);

  // Clear cache when user changes
  useEffect(() => {
    if (user) {
      // Clear cache when a new user logs in
      clearCache();
    }
  }, [user?.id]);

  const login = async (email, password) => {
    // Only log in development
    try {
      const response = await authAPI.login({ email, password });
      const data = response.data;

      // Axios automatically throws errors for non-2xx status codes
      // If we reach here, the request was successful
      if (data.success) {
        // Check if 2FA is required
        if (data.requires2FA) {
          return { 
            success: true, 
            requires2FA: true, 
            message: data.message,
            email: data.email 
          };
        }

        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role,
          phone: data.data.user.phone,
          dateOfBirth: data.data.user.dateOfBirth,
          onboardingCompleted: data.data.user.onboardingCompleted || false,
        };
        
        // Clear any cached data from previous users (optimized)
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.startsWith('react-query') || key.startsWith('patient') || key.startsWith('onboarding')
        );
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Clear React Query cache
        queryClient.clear();
        
        // Store token FIRST before any state updates to ensure it's available for subsequent requests
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userRole', data.data.user.role);
        localStorage.setItem('userId', data.data.user.id);

        // OPTIMIZED: Reduce delay - localStorage is synchronous, minimal delay needed
        // This prevents race conditions where components try to make API calls before token is available
        await new Promise(resolve => setTimeout(resolve, 10));

        setUser(userData);
        setToken(data.data.token);
        setIsAuthenticated(true);
        
        // OPTIMIZED: Defer WebSocket connection further to prioritize UI rendering
        // Connect after UI has rendered to make login feel instant
        setTimeout(() => {
          websocketService.connect(data.data.token);
        }, 1000);

        return { success: true, user: userData };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Login failed' };
      } else if (error.request) {
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        return { success: false, message: 'An unexpected error occurred.' };
      }
    }
  };

  const loginWith2FA = async (email, code) => {
    try {
      const response = await authAPI.loginWith2FA({ email, code });
      const data = response.data;

      if (data.success) {
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role,
          phone: data.data.user.phone,
          dateOfBirth: data.data.user.dateOfBirth,
          onboardingCompleted: data.data.user.onboardingCompleted || false,
        };

        
        // Clear any cached data from previous users
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('react-query') || key.startsWith('patient') || key.startsWith('onboarding')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear React Query cache
        queryClient.clear();
        
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userRole', data.data.user.role);
        localStorage.setItem('userId', data.data.user.id);

        setUser(userData);
        setToken(data.data.token);
        setIsAuthenticated(true);
        
        // Initialize WebSocket connection
        websocketService.connect(data.data.token);

        return { success: true, user: userData };
      } else {
        return { success: false, message: data.message || '2FA verification failed' };
      }
    } catch (error) {
      console.error('AuthContext: 2FA Login error:', error);
      if (error.response) {
        return { success: false, message: error.response.data?.message || '2FA verification failed' };
      } else if (error.request) {
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        return { success: false, message: 'An unexpected error occurred.' };
      }
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const data = response.data;

      // Axios automatically throws errors for non-2xx status codes
      if (data.success) {
        return { success: true, message: data.message || 'Registration successful' };
      } else {
        return { success: false, message: data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.response) {
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Registration failed';
        const errorDetails = error.response.data?.details;
        return { 
          success: false, 
          message: errorMessage,
          details: errorDetails
        };
      } else if (error.request) {
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        return { success: false, message: 'An unexpected error occurred.' };
      }
    }
  };

  const logout = () => {
    // Disconnect WebSocket
    websocketService.disconnect();
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    
    // Clear all localStorage items that might contain cached data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('react-query') || key.startsWith('patient') || key.startsWith('onboarding')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear React Query cache
    queryClient.clear();
    
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    navigate('/auth/login');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const clearCache = () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear localStorage cache
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('react-query') || key.startsWith('patient') || key.startsWith('onboarding')) {
        localStorage.removeItem(key);
      }
    });
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await authAPI.changePassword({ currentPassword, newPassword });
      const data = response.data;

      // Axios automatically throws errors for non-2xx status codes
      if (data.success) {
        return { success: true, message: data.message || 'Password changed successfully' };
      } else {
        return { success: false, message: data.message || 'Password change failed' };
      }
    } catch (error) {
      console.error('Password change error:', error);
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Password change failed' };
      } else if (error.request) {
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        return { success: false, message: 'An unexpected error occurred.' };
      }
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authAPI.forgotPassword(email);
      const data = response.data;

      if (response.status === 200) {
        return { success: true, message: data.message || 'Password reset email sent' };
      } else {
        return { success: false, message: data.message || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Password reset failed' };
      }
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await authAPI.resetPassword({ token, newPassword });
      const data = response.data;

      if (response.status === 200) {
        return { success: true, message: data.message || 'Password reset successful' };
      } else {
        return { success: false, message: data.message || 'Password reset failed' };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Password reset failed' };
      }
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const send2FACode = async (email) => {
    try {
      const response = await authAPI.send2FACode({ email });
      const data = response.data;
      
      if (data.success) {
        return { success: true, message: data.message || '2FA code sent successfully' };
      } else {
        return { success: false, message: data.message || 'Failed to send 2FA code' };
      }
    } catch (error) {
      console.error('Send 2FA code error:', error);
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Failed to send 2FA code' };
      } else if (error.request) {
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        return { success: false, message: 'An unexpected error occurred.' };
      }
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    token,
    login,
    loginWith2FA,
    send2FACode,
    register,
    logout,
    updateUser,
    clearCache,
    changePassword,
    forgotPassword,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
