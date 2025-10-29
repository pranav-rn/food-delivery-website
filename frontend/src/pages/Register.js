/**
 * Registration Page Component
 * Handles user registration with role selection
 * Supports three user types: customer, driver, restaurant_owner
 * Shows conditional fields based on selected user type
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNum: '',
    userType: 'customer', // Default user type
    // Driver-specific fields
    vehicleType: '',
    licenseNumber: '',
    // Restaurant owner-specific fields
    restaurantId: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated, userType } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      redirectToDashboard(userType);
    }
  }, [isAuthenticated, navigate]);

  /**
   * Redirect to appropriate dashboard based on user role
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
   * Handle form input changes
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Handle registration form submission
   * Validates input and sends registration data with role-specific fields
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate role-specific fields
    if (formData.userType === 'driver' && (!formData.vehicleType || !formData.licenseNumber)) {
      setError('Vehicle type and license number are required for drivers');
      return;
    }

    if (formData.userType === 'restaurant_owner' && !formData.restaurantId) {
      setError('Restaurant ID is required for restaurant owners');
      return;
    }

    setLoading(true);

    // Build registration data based on user type
    const registrationData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      phoneNum: formData.phoneNum,
      userType: formData.userType
    };

    // Add role-specific fields
    if (formData.userType === 'driver') {
      registrationData.vehicleType = formData.vehicleType;
      registrationData.licenseNumber = formData.licenseNumber;
    } else if (formData.userType === 'restaurant_owner') {
      registrationData.restaurantId = formData.restaurantId;
    }

    const result = await register(registrationData);

    if (result.success) {
      redirectToDashboard(result.user.userType);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Your Account</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="First name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNum">Phone Number</label>
            <input
              type="tel"
              id="phoneNum"
              name="phoneNum"
              value={formData.phoneNum}
              onChange={handleChange}
              placeholder="10-digit phone number"
            />
          </div>

          {/* User Type Selection */}
          <div className="form-group">
            <label htmlFor="userType">I am registering as</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="restaurant_owner">Restaurant Owner</option>
            </select>
          </div>

          {/* Conditional Fields for Driver */}
          {formData.userType === 'driver' && (
            <>
              <div className="form-group">
                <label htmlFor="vehicleType">Vehicle Type</label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="">Select vehicle type</option>
                  <option value="Motorcycle">Motorcycle</option>
                  <option value="Car">Car</option>
                  <option value="Bicycle">Bicycle</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="licenseNumber">License Number</label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  placeholder="Enter your license number"
                />
              </div>
            </>
          )}

          {/* Conditional Fields for Restaurant Owner */}
          {formData.userType === 'restaurant_owner' && (
            <div className="form-group">
              <label htmlFor="restaurantId">Restaurant ID</label>
              <input
                type="number"
                id="restaurantId"
                name="restaurantId"
                value={formData.restaurantId}
                onChange={handleChange}
                required
                placeholder="Enter your restaurant ID"
              />
              <small className="form-text">Contact admin if you don't have a restaurant ID</small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="At least 6 characters"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Confirm your password"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
