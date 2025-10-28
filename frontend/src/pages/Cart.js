import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import './Cart.css';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <div className="container">
          <h2>Your Cart is Empty</h2>
          <p>Add some delicious items from our restaurants</p>
          <button onClick={() => navigate('/restaurants')} className="btn btn-primary">
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Your Cart</h1>
        <p className="restaurant-name">From: {cartItems[0]?.restaurant_name}</p>

        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.item_id} className="cart-item">
                <div className="cart-item-info">
                  <h3>{item.name}</h3>
                  <p className="item-price">₹{item.price}</p>
                </div>
                <div className="cart-item-actions">
                  <div className="quantity-controls">
                    <button
                      onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                  <span className="item-total">₹{(item.price * item.quantity).toFixed(2)}</span>
                  <button
                    onClick={() => removeFromCart(item.item_id)}
                    className="remove-btn"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{getTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>₹2.99</span>
            </div>
            <div className="summary-row">
              <span>Tax (5%)</span>
              <span>₹{(getTotal() * 0.05).toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>₹{(getTotal() + 2.99 + getTotal() * 0.05).toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} className="btn btn-primary btn-block">
              Proceed to Checkout
            </button>
            <button onClick={clearCart} className="btn btn-secondary btn-block">
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
