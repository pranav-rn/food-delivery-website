/**
 * Order Details Page with Live Delivery Tracking
 * Shows order information and interactive map with delivery route
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orderAPI } from '../services/api';
import DeliveryMap from '../components/DeliveryMap';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rating, setRating] = useState(0);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
    
    // Refresh order details every 30 seconds for live tracking
    const interval = setInterval(fetchOrderDetails, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const response = await orderAPI.getById(id);
      setOrder(response.data);
    } catch (err) {
      setError('Failed to load order details');
      console.error('Error fetching order:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    try {
      await orderAPI.complete(id, rating);
      alert('Order completed! Thank you for your rating.');
      fetchOrderDetails();
    } catch (err) {
      alert('Failed to complete order');
      console.error('Error completing order:', err);
    }
  };

  const handleRefund = async () => {
    const reason = prompt('Please provide a reason for refund:');
    if (!reason) return;

    try {
      await orderAPI.requestRefund(id, reason);
      alert('Refund request submitted successfully');
      fetchOrderDetails();
    } catch (err) {
      alert('Failed to request refund');
      console.error('Error requesting refund:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading order details...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!order) {
    return <div className="error-message">Order not found</div>;
  }

  return (
    <div className="order-details-page">
      <div className="container">
        <button onClick={() => navigate('/orders')} className="back-btn">
          ← Back to Orders
        </button>

        <div className="order-details-card">
          <div className="order-details-header">
            <div>
              <h1>Order #{order.order_reference}</h1>
              <p className="order-date">
                {new Date(order.order_date).toLocaleString()}
              </p>
            </div>
            <span className={`status-badge status-${order.order_status.toLowerCase()}`}>
              {order.order_status}
            </span>
          </div>

          <section className="details-section">
            <h2>Restaurant Information</h2>
            <p><strong>{order.restaurant_name}</strong></p>
            <p>📍 {order.restaurant_address}</p>
            <p>📞 {order.restaurant_phone}</p>
          </section>

          <section className="details-section">
            <h2>Delivery Address</h2>
            <p>{order.delivery_address}</p>
            <p>{order.city}, {order.state} - {order.postal_code}</p>
          </section>

          {order.driver_first_name && (
            <section className="details-section">
              <h2>Driver Information</h2>
              <p><strong>{order.driver_first_name} {order.driver_last_name}</strong></p>
              <p>📞 {order.driver_phone}</p>
              <p>🚗 {order.driver_plate}</p>
            </section>
          )}

          {/* Live Delivery Tracking Map */}
          {['confirmed', 'preparing', 'out_for_delivery'].includes(order.order_status.toLowerCase()) && (
            <section className="details-section">
              <h2>🗺️ Live Delivery Tracking</h2>
              <p className="map-info">Track your order in real-time</p>
              <DeliveryMap
                restaurant={{
                  latitude: order.restaurant_latitude || 28.6139,
                  longitude: order.restaurant_longitude || 77.2090,
                  name: order.restaurant_name
                }}
                customer={{
                  latitude: order.customer_latitude || 28.7041,
                  longitude: order.customer_longitude || 77.1025,
                  address: order.delivery_address
                }}
                driver={order.driver_first_name ? {
                  id: order.driver_id,
                  first_name: order.driver_first_name,
                  last_name: order.driver_last_name,
                  current_latitude: order.driver_latitude || order.restaurant_latitude || 28.6139,
                  current_longitude: order.driver_longitude || order.restaurant_longitude || 77.2090,
                  phone_number: order.driver_phone,
                  vehicle_number: order.driver_plate
                } : null}
                showRoute={order.order_status.toLowerCase() === 'out_for_delivery'}
                animateDriver={order.order_status.toLowerCase() === 'out_for_delivery'}
                height="500px"
              />
            </section>
          )}

          <section className="details-section">
            <h2>Order Items</h2>
            <div className="order-items-list">
              {order.items.map((item) => (
                <div key={item.order_item_id} className="order-item">
                  <div>
                    <p><strong>{item.item_name}</strong></p>
                    <p className="item-description">{item.item_description}</p>
                  </div>
                  <div className="item-price-details">
                    <p>Qty: {item.quantity}</p>
                    <p>₹{item.price_per_item} each</p>
                    <p><strong>₹{(item.price_per_item * item.quantity).toFixed(2)}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="details-section">
            <h2>Payment Summary</h2>
            <div className="payment-summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{order.total_amount}</span>
              </div>
              {order.payment && (
                <>
                  <div className="summary-row">
                    <span>Delivery Fee</span>
                    <span>₹{(2.99).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Tax (5%)</span>
                    <span>₹{(order.total_amount * 0.05).toFixed(2)}</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total Paid</span>
                    <span>₹{parseFloat(order.payment.amount).toFixed(2)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Payment Method</span>
                    <span>{order.payment.payment_method}</span>
                  </div>
                  <div className="summary-row">
                    <span>Payment Status</span>
                    <span style={{ color: order.payment.status === 'completed' ? '#4caf50' : '#ff9800', fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {order.payment.status}
                    </span>
                  </div>
                </>
              )}
              {!order.payment && (
                <div className="summary-row total">
                  <span>Total Paid</span>
                  <span>₹{order.total_amount}</span>
                </div>
              )}
            </div>
          </section>

          {order.order_status.toLowerCase() === 'delivered' && !order.rating && (
            <section className="details-section">
              <h2>Rate Your Order</h2>
              <div className="rating-section">
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`star ${rating >= star ? 'active' : ''}`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                <button onClick={handleCompleteOrder} className="btn btn-primary">
                  Submit Rating
                </button>
              </div>
            </section>
          )}

          {order.rating && (
            <section className="details-section">
              <h2>Your Rating</h2>
              <div className="rating-display">
                {'⭐'.repeat(order.rating)} ({order.rating}/5)
              </div>
            </section>
          )}

          {['pending', 'confirmed'].includes(order.order_status.toLowerCase()) && (
            <div className="order-actions">
              <button onClick={handleRefund} className="btn btn-secondary">
                Request Refund
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
