import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedRole = localStorage.getItem('userRole');
      const storedUserId = localStorage.getItem('userId');

      if (storedToken && storedUser && storedRole && storedUserId) {
        try {
          // Verify token with backend
          const response = await authAPI.verify();
          const data = response.data;

          if (data.success) {
            const userData = {
              id: storedUserId,
              role: storedRole,
              ...JSON.parse(storedUser),
            };
        setUser(userData);
        setIsAuthenticated(true);
        setToken(storedToken);
        
        // Initialize WebSocket connection
        websocketService.connect(storedToken);
          } else {
            // Token is invalid, clear storage
            logout();
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    console.log('AuthContext: login called with:', { email, password });
    try {
      console.log('AuthContext: making API call to login...');
      const response = await authAPI.login({ email, password });
      console.log('AuthContext: API response received:', response);
      const data = response.data;
      console.log('AuthContext: response data:', data);

      // Axios automatically throws errors for non-2xx status codes
      // If we reach here, the request was successful
      if (data.success) {
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          lastName: data.data.user.lastName,
          role: data.data.user.role,
          phone: data.data.user.phone,
          dateOfBirth: data.data.user.dateOfBirth,
        };

        console.log('AuthContext: setting user data:', userData);
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
        console.log('AuthContext: login failed with message:', data.message);
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      if (error.response) {
        // Server responded with error status
        console.log('AuthContext: Server error response:', error.response);
        return { success: false, message: error.response.data?.message || 'Login failed' };
      } else if (error.request) {
        // Request was made but no response received
        console.log('AuthContext: No response received:', error.request);
        return { success: false, message: 'Network error. Please check your connection.' };
      } else {
        // Something else happened
        console.log('AuthContext: Other error:', error.message);
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
        return { success: false, message: error.response.data?.message || 'Registration failed' };
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

  const value = {
    user,
    isAuthenticated,
    isLoading,
    token,
    login,
    register,
    logout,
    updateUser,
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
