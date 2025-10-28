import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { getItemCount } = useCart();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          🍔 FoodDelivery
        </Link>

        <div className="navbar-menu">
          <Link to="/restaurants" className="navbar-link">
            Restaurants
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/orders" className="navbar-link">
                My Orders
              </Link>
              <Link to="/profile" className="navbar-link">
                Profile
              </Link>
              <Link to="/cart" className="navbar-link cart-link">
                🛒 Cart {getItemCount() > 0 && <span className="cart-badge">{getItemCount()}</span>}
              </Link>
              <button onClick={logout} className="navbar-button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-button">
                Login
              </Link>
              <Link to="/register" className="navbar-button navbar-button-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
