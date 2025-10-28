import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { restaurantAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import './RestaurantDetails.css';

const RestaurantDetails = () => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addToCart } = useCart();

  useEffect(() => {
    fetchRestaurantDetails();
    fetchMenu();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      const response = await restaurantAPI.getById(id);
      setRestaurant(response.data);
    } catch (err) {
      setError('Failed to load restaurant details');
      console.error('Error fetching restaurant:', err);
    }
  };

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const response = await restaurantAPI.getMenu(id);
      setMenuItems(response.data);
    } catch (err) {
      setError('Failed to load menu');
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item) => {
    if (!restaurant.is_open) {
      alert('Restaurant is currently closed');
      return;
    }

    if (!item.is_available) {
      alert('This item is not available');
      return;
    }

    const success = addToCart(item, restaurant);
    if (success) {
      alert('Item added to cart!');
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!restaurant) {
    return <div className="error-message">Restaurant not found</div>;
  }

  return (
    <div className="restaurant-details">
      <div className="container">
        <div className="restaurant-header">
          <div className="restaurant-hero">
            <div className="restaurant-hero-image">🍽️</div>
          </div>
          <div className="restaurant-header-info">
            <h1>{restaurant.name}</h1>
            <p className="cuisine-badge">{restaurant.cuisine}</p>
            <p className="description">{restaurant.description}</p>
            <div className="restaurant-stats">
              <span className="stat">⭐ {restaurant.rating} Rating</span>
              <span className="stat">
                {restaurant.is_open ? '🟢 Open Now' : '🔴 Closed'}
              </span>
              {restaurant.is_busy && <span className="stat busy">⚠️ Busy</span>}
            </div>
            <p className="address">📍 {restaurant.address}</p>
            <p className="phone">📞 {restaurant.phone_num}</p>
          </div>
        </div>

        <div className="menu-section">
          <h2>Menu</h2>
          {menuItems.length === 0 ? (
            <p>No menu items available</p>
          ) : (
            <div className="menu-grid">
              {menuItems.map((item) => (
                <div key={item.item_id} className="menu-item">
                  <div className="menu-item-content">
                    <h3>{item.name}</h3>
                    <p className="menu-item-description">{item.description}</p>
                    <div className="menu-item-footer">
                      <span className="price">₹{item.price}</span>
                      {item.popularity_score > 0 && (
                        <span className="popularity">🔥 {item.popularity_score} orders</span>
                      )}
                    </div>
                    {!item.is_available && (
                      <div className="unavailable-badge">Not Available</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className={`btn btn-primary ${!item.is_available || !restaurant.is_open ? 'btn-disabled' : ''}`}
                    disabled={!item.is_available || !restaurant.is_open}
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetails;
