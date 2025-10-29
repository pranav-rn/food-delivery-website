/**
 * Main App Component
 * Configures routing and authentication for all user types
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Restaurants from './pages/Restaurants';
import RestaurantDetails from './pages/RestaurantDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Profile from './pages/Profile';

// Role-specific dashboards
import RestaurantOwnerDashboard from './pages/RestaurantOwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';

import './App.css';

/**
 * Protected route wrapper - requires authentication
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

/**
 * Role-based route wrapper - requires specific user type
 */
const RoleRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loading, userType } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (userType !== requiredRole) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="App">
            <Navbar />
            <main className="main-content">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/restaurants" element={<Restaurants />} />
                <Route path="/restaurants/:id" element={<RestaurantDetails />} />
                <Route path="/cart" element={<Cart />} />
                
                {/* Customer routes */}
                <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
                <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
                <Route path="/orders/:id" element={<PrivateRoute><OrderDetails /></PrivateRoute>} />
                <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                
                {/* Restaurant Owner routes */}
                <Route 
                  path="/restaurant-owner-dashboard" 
                  element={
                    <RoleRoute requiredRole="restaurant_owner">
                      <RestaurantOwnerDashboard />
                    </RoleRoute>
                  } 
                />
                
                {/* Driver routes */}
                <Route 
                  path="/driver-dashboard" 
                  element={
                    <RoleRoute requiredRole="driver">
                      <DriverDashboard />
                    </RoleRoute>
                  } 
                />
              </Routes>
            </main>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
