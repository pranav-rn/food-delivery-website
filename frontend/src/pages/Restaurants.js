import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { restaurantAPI } from '../services/api';
import './Restaurants.css';

const Restaurants = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCuisine) params.cuisine = selectedCuisine;
      if (searchQuery) params.search = searchQuery;

      const response = await restaurantAPI.getAll(params);
      setRestaurants(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load restaurants');
      console.error('Error fetching restaurants:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCuisine, searchQuery]);

  useEffect(() => {
    fetchCuisines();
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    fetchRestaurants();
  }, [selectedCuisine, searchQuery, fetchRestaurants]);

  const fetchCuisines = async () => {
    try {
      const response = await restaurantAPI.getCuisines();
      setCuisines(response.data);
    } catch (err) {
      console.error('Error fetching cuisines:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRestaurants();
  };

  return (
    <div className="restaurants-page">
      <div className="container">
        <h1>Restaurants Near You</h1>

        <div className="filters">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search restaurants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="cuisine-filter">
            <label>Filter by Cuisine:</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="cuisine-select"
            >
              <option value="">All Cuisines</option>
              {cuisines.map((cuisine) => (
                <option key={cuisine} value={cuisine}>
                  {cuisine}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading restaurants...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : restaurants.length === 0 ? (
          <div className="no-results">No restaurants found</div>
        ) : (
          <div className="restaurants-grid">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant.restaurant_id}
                to={`/restaurants/${restaurant.restaurant_id}`}
                className="restaurant-card"
              >
                <div className="restaurant-image">
                  {restaurant.image ? (
                    <img 
                      src={restaurant.image} 
                      alt={restaurant.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div className="restaurant-placeholder">🍽️</div>
                  )}
                  {!restaurant.is_open && (
                    <div className="closed-badge">Closed</div>
                  )}
                </div>
                <div className="restaurant-info">
                  <h3>{restaurant.name}</h3>
                  <p className="restaurant-cuisine">{restaurant.cuisine}</p>
                  <p className="restaurant-description">{restaurant.description}</p>
                  <div className="restaurant-meta">
                    <span className="rating">⭐ {restaurant.rating}</span>
                    <span className="status">
                      {restaurant.is_open ? '🟢 Open' : '🔴 Closed'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Restaurants;
