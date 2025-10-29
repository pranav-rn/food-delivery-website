/**
 * Login Page Component
 * Handles user authentication and role-based routing
 * Redirects to appropriate dashboard based on userType:
 * - customer → /restaurants
 * - driver → /driver-dashboard
 * - restaurant_owner → /restaurant-owner-dashboard
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, userType } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      redirectToDashboard(userType);
    }
  }, [isAuthenticated, navigate]);

  /**
   * Redirect user to appropriate dashboard based on role
   * @param {string} userType - User role (customer/driver/restaurant_owner)
   */
  const redirectToDashboard = (userType) => {
    switch(userType) {
      case 'restaurant_owner':
        navigate('/restaurant-owner-dashboard');
        break;
      case 'driver':
        navigate('/driver-dashboard');
        break;
      case 'customer':
      default:
        navigate('/restaurants');
        break;
    }
  };

  /**
   * Handle login form submission
   * Validates credentials and redirects based on user role
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      // Role-based redirect after successful login
      redirectToDashboard(result.user.userType);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login to Your Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
