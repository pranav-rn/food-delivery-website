import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Order Your Favorite Food Online</h1>
          <p>Delicious meals delivered to your doorstep in minutes</p>
          <div className="hero-buttons">
            <Link to="/restaurants" className="btn btn-primary">
              Browse Restaurants
            </Link>
            {!isAuthenticated && (
              <Link to="/register" className="btn btn-secondary">
                Get Started
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Why Choose Us?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Fast Delivery</h3>
              <p>Get your food delivered in 30 minutes or less</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🍕</div>
              <h3>Wide Selection</h3>
              <p>Choose from hundreds of restaurants and cuisines</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💯</div>
              <h3>Quality Assured</h3>
              <p>Only the best restaurants partnered with us</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎁</div>
              <h3>Great Deals</h3>
              <p>Exclusive discounts and loyalty rewards</p>
            </div>
          </div>
        </div>
      </section>

      <section className="popular-cuisines">
        <div className="container">
          <h2>Popular Cuisines</h2>
          <div className="cuisine-grid">
            <div className="cuisine-card">
              <span className="cuisine-emoji">🍕</span>
              <h4>Italian</h4>
            </div>
            <div className="cuisine-card">
              <span className="cuisine-emoji">🍛</span>
              <h4>Indian</h4>
            </div>
            <div className="cuisine-card">
              <span className="cuisine-emoji">🍜</span>
              <h4>Chinese</h4>
            </div>
            <div className="cuisine-card">
              <span className="cuisine-emoji">🍣</span>
              <h4>Japanese</h4>
            </div>
            <div className="cuisine-card">
              <span className="cuisine-emoji">🌮</span>
              <h4>Mexican</h4>
            </div>
            <div className="cuisine-card">
              <span className="cuisine-emoji">🍔</span>
              <h4>American</h4>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
