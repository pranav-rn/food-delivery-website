import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { userAPI, orderAPI, paymentAPI } from '../services/api';
import './Checkout.css';

const Checkout = () => {
  const { cartItems, restaurantId, getTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAddresses();
    fetchPaymentMethods();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await userAPI.getAddresses();
      setAddresses(response.data);
      const defaultAddress = response.data.find(addr => addr.is_default);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.address_id.toString());
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await paymentAPI.getMethods();
      setPaymentMethods(response.data);
      if (response.data.length > 0) {
        setSelectedPayment(response.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError('Please select a delivery address');
      return;
    }

    if (!selectedPayment) {
      setError('Please select a payment method');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const items = cartItems.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity
      }));

      const orderResponse = await orderAPI.create({
        restaurantId,
        addressId: parseInt(selectedAddress),
        items
      });

      const orderId = orderResponse.data.orderId;

      // Create payment
      const total = getTotal() + 2.99 + (getTotal() * 0.05);
      await paymentAPI.create({
        orderId,
        paymentMethod: selectedPayment,
        amount: total.toFixed(2)
      });

      clearCart();
      
      // Show payment processing message
      alert('Order placed successfully! Payment is being processed...');
      
      // Navigate to order details
      navigate(`/orders/${orderId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
      console.error('Error placing order:', err);
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  const subtotal = getTotal();
  const deliveryFee = 2.99;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax;

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>

        {error && <div className="error-message">{error}</div>}

        <div className="checkout-content">
          <div className="checkout-sections">
            <section className="checkout-section">
              <h2>Delivery Address</h2>
              {addresses.length === 0 ? (
                <p>No addresses found. Please add one in your profile.</p>
              ) : (
                <div className="address-list">
                  {addresses.map((address) => (
                    <label key={address.address_id} className="address-option">
                      <input
                        type="radio"
                        name="address"
                        value={address.address_id}
                        checked={selectedAddress === address.address_id.toString()}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                      />
                      <div className="address-details">
                        <p>{address.address}</p>
                        <p>{address.city}, {address.state} - {address.postal_code}</p>
                        {address.is_default && <span className="default-badge">Default</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="checkout-section">
              <h2>Payment Method</h2>
              <div className="payment-methods">
                {paymentMethods.map((method) => (
                  <label key={method.id} className="payment-option">
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={selectedPayment === method.id}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <span className="payment-icon">{method.icon}</span>
                    <span>{method.name}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="checkout-section">
              <h2>Order Items</h2>
              <div className="checkout-items">
                {cartItems.map((item) => (
                  <div key={item.item_id} className="checkout-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="checkout-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>₹{deliveryFee.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            <button
              onClick={handlePlaceOrder}
              className="btn btn-primary btn-block"
              disabled={loading || !selectedAddress || !selectedPayment}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
