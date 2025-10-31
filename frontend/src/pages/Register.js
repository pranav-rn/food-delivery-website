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
    numPlate: '',
    currentLocation: '',
    currentLatitude: '',
    currentLongitude: '',
    // Restaurant owner-specific fields
    restaurantName: '',
    restaurantDescription: '',
    restaurantAddress: '',
    restaurantLatitude: '',
    restaurantLongitude: '',
    restaurantPhone: '',
    cuisine: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated, userType } = useAuth();
  const navigate = useNavigate();

  /**
   * Redirect to appropriate dashboard based on user role
   */
  const redirectToDashboard = React.useCallback((userType) => {
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
  }, [navigate]);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      redirectToDashboard(userType);
    }
  }, [isAuthenticated, userType, redirectToDashboard]);

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
    if (formData.userType === 'driver' && (!formData.numPlate)) {
      setError('Vehicle plate number is required for drivers');
      return;
    }

    if (formData.userType === 'restaurant_owner' && 
        (!formData.restaurantName || !formData.restaurantAddress || !formData.cuisine)) {
      setError('Restaurant name, address, and cuisine are required for restaurant owners');
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
      registrationData.numPlate = formData.numPlate;
      registrationData.currentLocation = formData.currentLocation;
      registrationData.currentLatitude = formData.currentLatitude || null;
      registrationData.currentLongitude = formData.currentLongitude || null;
    } else if (formData.userType === 'restaurant_owner') {
      registrationData.restaurant = {
        name: formData.restaurantName,
        description: formData.restaurantDescription,
        address: formData.restaurantAddress,
        latitude: formData.restaurantLatitude || null,
        longitude: formData.restaurantLongitude || null,
        phoneNum: formData.restaurantPhone,
        cuisine: formData.cuisine
      };
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
                <label htmlFor="numPlate">Vehicle Plate Number *</label>
                <input
                  type="text"
                  id="numPlate"
                  name="numPlate"
                  value={formData.numPlate}
                  onChange={handleChange}
                  required
                  placeholder="e.g., MH12AB1234"
                />
              </div>
              <div className="form-group">
                <label htmlFor="currentLocation">Current Location</label>
                <input
                  type="text"
                  id="currentLocation"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai, Maharashtra"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="currentLatitude">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    id="currentLatitude"
                    name="currentLatitude"
                    value={formData.currentLatitude}
                    onChange={handleChange}
                    placeholder="19.0760"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="currentLongitude">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    id="currentLongitude"
                    name="currentLongitude"
                    value={formData.currentLongitude}
                    onChange={handleChange}
                    placeholder="72.8777"
                  />
                </div>
              </div>
            </>
          )}

          {/* Conditional Fields for Restaurant Owner */}
          {formData.userType === 'restaurant_owner' && (
            <>
              <div className="restaurant-section">
                <h3 style={{marginTop: '20px', marginBottom: '15px', color: '#333'}}>Restaurant Details</h3>
                
                <div className="form-group">
                  <label htmlFor="restaurantName">Restaurant Name *</label>
                  <input
                    type="text"
                    id="restaurantName"
                    name="restaurantName"
                    value={formData.restaurantName}
                    onChange={handleChange}
                    required
                    placeholder="Enter restaurant name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="restaurantDescription">Description</label>
                  <textarea
                    id="restaurantDescription"
                    name="restaurantDescription"
                    value={formData.restaurantDescription}
                    onChange={handleChange}
                    placeholder="Describe your restaurant"
                    rows="3"
                    style={{width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd'}}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="restaurantAddress">Address *</label>
                  <input
                    type="text"
                    id="restaurantAddress"
                    name="restaurantAddress"
                    value={formData.restaurantAddress}
                    onChange={handleChange}
                    required
                    placeholder="Full address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="restaurantLatitude">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      id="restaurantLatitude"
                      name="restaurantLatitude"
                      value={formData.restaurantLatitude}
                      onChange={handleChange}
                      placeholder="19.0760"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="restaurantLongitude">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      id="restaurantLongitude"
                      name="restaurantLongitude"
                      value={formData.restaurantLongitude}
                      onChange={handleChange}
                      placeholder="72.8777"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="restaurantPhone">Restaurant Phone Number</label>
                  <input
                    type="tel"
                    id="restaurantPhone"
                    name="restaurantPhone"
                    value={formData.restaurantPhone}
                    onChange={handleChange}
                    placeholder="Restaurant contact number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cuisine">Cuisine Type *</label>
                  <select
                    id="cuisine"
                    name="cuisine"
                    value={formData.cuisine}
                    onChange={handleChange}
                    required
                    className="form-select"
                  >
                    <option value="">Select cuisine type</option>
                    <option value="Italian">Italian</option>
                    <option value="Chinese">Chinese</option>
                    <option value="Indian">Indian</option>
                    <option value="Mexican">Mexican</option>
                    <option value="Japanese">Japanese</option>
                    <option value="American">American</option>
                    <option value="Thai">Thai</option>
                    <option value="Mediterranean">Mediterranean</option>
                    <option value="Fast Food">Fast Food</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </>
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
