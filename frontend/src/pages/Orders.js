import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderAPI } from '../services/api';
import './Orders.css';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getHistory(50);
      setOrders(response.data);
    } catch (err) {
      setError('Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ff9800',
      'confirmed': '#2196f3',
      'preparing': '#9c27b0',
      'assigned': '#00bcd4',
      'picked_up': '#03a9f4',
      'on_the_way': '#4caf50',
      'delivered': '#8bc34a',
      'cancelled': '#f44336'
    };
    return colors[status.toLowerCase()] || '#757575';
  };

  if (loading) {
    return <div className="loading">Loading orders...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="orders-empty">
        <div className="container">
          <h2>No Orders Yet</h2>
          <p>Start ordering from your favorite restaurants</p>
          <Link to="/restaurants" className="btn btn-primary">
            Browse Restaurants
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="container">
        <h1>My Orders</h1>

        <div className="orders-list">
          {orders.map((order) => (
            <Link
              key={order.order_id}
              to={`/orders/${order.order_id}`}
              className="order-card"
            >
              <div className="order-header">
                <h3>{order.restaurant_name}</h3>
                <span
                  className="order-status"
                  style={{ backgroundColor: getStatusColor(order.order_status) }}
                >
                  {order.order_status}
                </span>
              </div>
              <p className="order-cuisine">{order.cuisine}</p>
              <p className="order-items">{order.items}</p>
              <div className="order-footer">
                <span className="order-date">
                  {new Date(order.order_date).toLocaleDateString()}
                </span>
                <span className="order-total">₹{order.total_amount}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Orders;
