/**
 * Driver Dashboard Component
 * Allows drivers to:
 * - Toggle availability status
 * - View and accept available orders (nested query)
 * - Manage active deliveries
 * - Update delivery status
 * - View earnings (aggregate query with GROUP BY)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DriverDashboard = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();

  // State management
  const [profile, setProfile] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('available'); // 'available', 'active', 'earnings'

  // Redirect if not driver
  useEffect(() => {
    if (userType !== 'driver') {
      navigate('/');
    }
  }, [userType, navigate]);

  // Fetch driver profile on mount
  useEffect(() => {
    fetchProfile();
    fetchAvailableOrders();
    fetchActiveOrders();
  }, []);

  /**
   * Fetch driver profile information
   * Uses JOIN query to get user details with driver data
   */
  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/driver-orders/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
    }
  };

  /**
   * Fetch available unassigned orders
   * Uses NESTED query in backend to find orders without drivers
   */
  const fetchAvailableOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/driver-orders/available-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableOrders(response.data);
    } catch (error) {
      console.error('Error fetching available orders:', error);
    }
  };

  /**
   * Fetch orders assigned to this driver
   * Uses multi-table JOIN query for complete order details
   */
  const fetchActiveOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/driver-orders/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveOrders(response.data);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    }
  };

  /**
   * Fetch driver earnings
   * Uses AGGREGATE query with SUM, COUNT, AVG, GROUP BY
   */
  const fetchEarnings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/driver-orders/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnings(response.data);
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };

  /**
   * Toggle driver availability status
   */
  const toggleAvailability = async () => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = !profile.is_available;
      
      await axios.put(
        `${API_URL}/driver-orders/availability`,
        { isAvailable: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile({ ...profile, is_available: newStatus });
      alert(`You are now ${newStatus ? 'available' : 'unavailable'} for deliveries`);
    } catch (error) {
      console.error('Error updating availability:', error);
      alert('Failed to update availability');
    }
  };

  /**
   * Accept an available order
   */
  const acceptOrder = async (orderId) => {
    if (!window.confirm('Accept this delivery order?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/driver-orders/orders/${orderId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Order accepted! Check your active deliveries.');
      fetchAvailableOrders();
      fetchActiveOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      alert(error.response?.data?.error || 'Failed to accept order');
    }
  };

  /**
   * Update order status
   * Transitions: preparing → out_for_delivery → delivered
   */
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/driver-orders/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Order status updated!');
      fetchActiveOrders();
      fetchProfile(); // Refresh profile to update availability status
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update order status');
    }
  };

  /**
   * Complete delivery - simplified endpoint
   */
  const completeDelivery = async (orderId) => {
    if (!window.confirm('Mark this order as delivered?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/driver-orders/orders/${orderId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Delivery completed successfully! 🎉');
      fetchActiveOrders();
      fetchProfile(); // Refresh profile to update availability status
    } catch (error) {
      console.error('Error completing delivery:', error);
      alert(error.response?.data?.error || 'Failed to complete delivery');
    }
  };

  /**
   * Show earnings tab and fetch data
   */
  const showEarnings = () => {
    setActiveTab('earnings');
    if (!earnings) {
      fetchEarnings();
    }
  };

  /**
   * Get status action button for order
   */
  const getStatusButton = (order) => {
    switch (order.order_status) {
      case 'pending':
        return (
          <div className="status-info">
            <span className="status-badge waiting">⏳ Waiting for restaurant to prepare</span>
          </div>
        );
      case 'preparing':
        return (
          <button
            className="btn btn-sm btn-info"
            onClick={() => updateOrderStatus(order.order_id, 'out_for_delivery')}
          >
            📦 Picked Up
          </button>
        );
      case 'out_for_delivery':
        return (
          <button
            className="btn btn-sm btn-success"
            onClick={() => completeDelivery(order.order_id)}
          >
            ✓ Delivered
          </button>
        );
      case 'delivered':
        return <span className="status-badge delivered">Completed</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="dashboard-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Driver Dashboard</h1>
        {profile && (
          <div className="driver-info">
            <h2>{profile.first_name} {profile.last_name}</h2>
            <p>Vehicle: {profile.num_plate}</p>
            <p>📞 {profile.phone_num}</p>
            {profile.current_location && <p>📍 {profile.current_location}</p>}
            
            {/* Availability Toggle */}
            <div className="availability-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={profile.is_available === 1}
                  onChange={toggleAvailability}
                />
                <span className="slider"></span>
              </label>
              <span className={`availability-status ${profile.is_available === 1 ? 'available' : 'unavailable'}`}>
                {profile.is_available === 1 ? '🟢 Available for Deliveries' : '🔴 Unavailable'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'available' ? 'tab-active' : ''}
          onClick={() => setActiveTab('available')}
        >
          Available Orders ({availableOrders.length})
        </button>
        <button
          className={activeTab === 'active' ? 'tab-active' : ''}
          onClick={() => setActiveTab('active')}
        >
          My Deliveries ({activeOrders.length})
        </button>
        <button
          className={activeTab === 'earnings' ? 'tab-active' : ''}
          onClick={showEarnings}
        >
          Earnings
        </button>
      </div>

      {/* Available Orders Tab - Nested Query Results */}
      {activeTab === 'available' && (
        <div className="tab-content">
          <h3>Available Orders</h3>
          <p className="tab-description">Orders waiting to be picked up. First come, first served!</p>
          
          {availableOrders.length === 0 ? (
            <div className="no-orders">
              <p>No available orders at the moment. Check back soon!</p>
            </div>
          ) : (
            <div className="orders-grid">
              {availableOrders.map((order) => (
                <div key={order.order_id} className="order-card">
                  <div className="order-header">
                    <h4>Order #{order.order_id}</h4>
                    <span className="order-amount">₹{order.total_amount}</span>
                  </div>
                  
                  <div className="order-details">
                    <p><strong>Restaurant:</strong> {order.restaurant_name}</p>
                    <p><strong>From:</strong> {order.restaurant_address}</p>
                    <p><strong>To:</strong> {order.address_line1}, {order.city}</p>
                    <p><strong>Ordered:</strong> {new Date(order.order_date).toLocaleString()}</p>
                  </div>

                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => acceptOrder(order.order_id)}
                  >
                    Accept Delivery
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Deliveries Tab - JOIN Query Results */}
      {activeTab === 'active' && (
        <div className="tab-content">
          <h3>My Deliveries</h3>
          <p className="tab-description">Orders assigned to you</p>

          {activeOrders.length === 0 ? (
            <div className="no-orders">
              <p>No active deliveries. Check available orders to get started!</p>
            </div>
          ) : (
            <div className="orders-list">
              {activeOrders.map((order) => (
                <div key={order.order_id} className="delivery-card">
                  <div className="delivery-header">
                    <div>
                      <h4>Order #{order.order_id}</h4>
                      <span className={`status-badge ${order.order_status}`}>
                        {order.order_status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="order-amount">₹{order.total_amount}</div>
                  </div>

                  <div className="delivery-details">
                    <div className="detail-section">
                      <h5>📍 Pickup</h5>
                      <p><strong>{order.restaurant_name}</strong></p>
                      <p>{order.restaurant_address}</p>
                      <p>📞 {order.restaurant_phone}</p>
                    </div>

                    <div className="detail-section">
                      <h5>🏠 Delivery</h5>
                      <p><strong>{order.customer_first_name} {order.customer_last_name}</strong></p>
                      <p>{order.address_line1}</p>
                      {order.address_line2 && <p>{order.address_line2}</p>}
                      <p>{order.city}, {order.state} - {order.pincode}</p>
                      <p>📞 {order.customer_phone}</p>
                    </div>

                    <div className="detail-section">
                      <p><strong>Ordered:</strong> {new Date(order.order_date).toLocaleString()}</p>
                      {order.estimated_delivery_time && (
                        <p><strong>Est. Delivery:</strong> {new Date(order.estimated_delivery_time).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="delivery-actions">
                    {getStatusButton(order)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab - Aggregate Query Results */}
      {activeTab === 'earnings' && (
        <div className="tab-content">
          {!earnings ? (
            <div className="loading">Loading earnings...</div>
          ) : (
            <div className="earnings-container">
              <h3>Your Earnings</h3>

              {/* Summary Stats */}
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total Deliveries</h4>
                  <p className="stat-value">{earnings.summary.total_deliveries || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Total Earnings</h4>
                  <p className="stat-value">₹{parseFloat(earnings.summary.total_earnings || 0).toFixed(2)}</p>
                </div>
                <div className="stat-card">
                  <h4>Avg per Delivery</h4>
                  <p className="stat-value">₹{parseFloat(earnings.summary.avg_earning_per_delivery || 0).toFixed(2)}</p>
                </div>
              </div>

              {/* Daily Breakdown - GROUP BY Results */}
              <div className="earnings-section">
                <h4>Daily Breakdown</h4>
                {earnings.dailyBreakdown.length === 0 ? (
                  <p>No completed deliveries yet</p>
                ) : (
                  <table className="earnings-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Deliveries</th>
                        <th>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnings.dailyBreakdown.map((day) => (
                        <tr key={day.date}>
                          <td>{new Date(day.date).toLocaleDateString()}</td>
                          <td>{day.deliveries}</td>
                          <td>₹{parseFloat(day.earnings).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
