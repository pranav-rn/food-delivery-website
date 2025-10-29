/**
 * Authentication Context
 * Manages user authentication state and provides login/logout functionality
 * Supports role-based authentication (customer, driver, restaurant_owner)
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

/**
 * Hook to access authentication context
 * @returns {Object} Authentication context with user, login, logout, userType
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Authentication Provider Component
 * Wraps the app and provides authentication state to all children
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user data from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  /**
   * Login user with email and password
   * Stores token and user data (including userType) in localStorage
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Object} Success status and user data with userType
   */
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      // Return user data including userType for routing
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  /**
   * Register new user
   * Accepts userType for role-based registration
   * @param {Object} data - Registration data including userType
   * @returns {Object} Success status and user data
   */
  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  /**
   * Logout user and clear stored data
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
    userType: user?.userType || 'customer' // Expose userType for role-based routing
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
