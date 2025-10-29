/**
 * Restaurant Owner Dashboard Component
 * Allows restaurant owners to:
 * - View and manage menu items
 * - Add new items with image upload
 * - Edit/delete existing items
 * - View sales analytics (aggregate query demonstration)
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantOwnerDashboard = () => {
  const { user, userType } = useAuth();
  const navigate = useNavigate();

  // State management
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'analytics'
  
  // Form state for add/edit
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    itemName: '',
    description: '',
    price: '',
    category: 'Main Course',
    isVegetarian: false,
    isAvailable: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Redirect if not restaurant owner
  useEffect(() => {
    if (userType !== 'restaurant_owner') {
      navigate('/');
    }
  }, [userType, navigate]);

  // Fetch restaurant and menu data on mount
  useEffect(() => {
    fetchRestaurantData();
    fetchMenuItems();
  }, []);

  /**
   * Fetch restaurant information for the logged-in owner
   * Uses JOIN query in backend
   */
  const fetchRestaurantData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/restaurant-owner/my-restaurant`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRestaurant(response.data);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    }
  };

  /**
   * Fetch all menu items for the restaurant
   * Images are returned as base64 encoded data URLs
   */
  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/restaurant-owner/menu`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu:', error);
      setLoading(false);
    }
  };

  /**
   * Fetch sales analytics
   * Demonstrates AGGREGATE query with SUM, COUNT, AVG, GROUP BY
   */
  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/restaurant-owner/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  /**
   * Handle image file selection
   * Creates preview for user feedback
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Add new menu item
   * Sends FormData with image as BLOB to backend
   */
  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      // Append all form fields
      data.append('itemName', formData.itemName);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('isVegetarian', formData.isVegetarian);
      
      // Append image if selected
      if (imageFile) {
        data.append('image', imageFile);
      }

      await axios.post(`${API_URL}/restaurant-owner/menu`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Reset form and refresh list
      resetForm();
      fetchMenuItems();
      alert('Menu item added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add menu item');
    }
  };

  /**
   * Update existing menu item
   * Sends FormData with optional new image
   */
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      data.append('itemName', formData.itemName);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('isVegetarian', formData.isVegetarian);
      data.append('isAvailable', formData.isAvailable);
      
      if (imageFile) {
        data.append('image', imageFile);
      }

      await axios.put(`${API_URL}/restaurant-owner/menu/${editingItem.item_id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      resetForm();
      fetchMenuItems();
      alert('Menu item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update menu item');
    }
  };

  /**
   * Delete menu item with confirmation
   */
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/restaurant-owner/menu/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      fetchMenuItems();
      alert('Menu item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete menu item');
    }
  };

  /**
   * Open edit form with existing item data
   */
  const startEdit = (item) => {
    setEditingItem(item);
    setFormData({
      itemName: item.item_name,
      description: item.description,
      price: item.price,
      category: item.category,
      isVegetarian: item.is_vegetarian === 1,
      isAvailable: item.is_available === 1
    });
    setImagePreview(item.image); // Base64 image from DB
    setShowForm(true);
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      itemName: '',
      description: '',
      price: '',
      category: 'Main Course',
      isVegetarian: false,
      isAvailable: true
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingItem(null);
    setShowForm(false);
  };

  /**
   * Switch to analytics tab and fetch data
   */
  const showAnalytics = () => {
    setActiveTab('analytics');
    if (!analytics) {
      fetchAnalytics();
    }
  };

  if (loading) {
    return <div className="dashboard-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Restaurant Owner Dashboard</h1>
        {restaurant && (
          <div className="restaurant-info">
            <h2>{restaurant.restaurant_name}</h2>
            <p>{restaurant.address} | {restaurant.phone_num}</p>
            <p>Cuisine: {restaurant.cuisine_type} | Rating: {restaurant.rating || 'N/A'} ⭐</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'menu' ? 'tab-active' : ''}
          onClick={() => setActiveTab('menu')}
        >
          Menu Management
        </button>
        <button 
          className={activeTab === 'analytics' ? 'tab-active' : ''}
          onClick={showAnalytics}
        >
          Sales Analytics
        </button>
      </div>

      {/* Menu Management Tab */}
      {activeTab === 'menu' && (
        <div className="tab-content">
          <div className="menu-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? 'Cancel' : '+ Add New Item'}
            </button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="menu-form-card">
              <h3>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
              <form onSubmit={editingItem ? handleUpdateItem : handleAddItem}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Item Name *</label>
                    <input
                      type="text"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., Margherita Pizza"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Describe the item..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Appetizer">Appetizer</option>
                      <option value="Main Course">Main Course</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Beverage">Beverage</option>
                      <option value="Sides">Sides</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                    )}
                  </div>
                </div>

                <div className="form-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      name="isVegetarian"
                      checked={formData.isVegetarian}
                      onChange={handleInputChange}
                    />
                    Vegetarian
                  </label>

                  {editingItem && (
                    <label>
                      <input
                        type="checkbox"
                        name="isAvailable"
                        checked={formData.isAvailable}
                        onChange={handleInputChange}
                      />
                      Available
                    </label>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-success">
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Menu Items List */}
          <div className="menu-items-grid">
            {menuItems.length === 0 ? (
              <p className="no-items">No menu items yet. Add your first item!</p>
            ) : (
              menuItems.map((item) => (
                <div key={item.item_id} className="menu-item-card">
                  {item.image && (
                    <img src={item.image} alt={item.item_name} className="menu-item-image" />
                  )}
                  <div className="menu-item-details">
                    <h3>{item.item_name}</h3>
                    <p className="item-description">{item.description}</p>
                    <p className="item-category">{item.category}</p>
                    <div className="item-tags">
                      {item.is_vegetarian === 1 && <span className="tag-veg">🌱 Veg</span>}
                      {item.is_available === 1 ? (
                        <span className="tag-available">Available</span>
                      ) : (
                        <span className="tag-unavailable">Unavailable</span>
                      )}
                    </div>
                    <p className="item-price">₹{item.price}</p>
                    <div className="item-actions">
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteItem(item.item_id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab - Demonstrates Aggregate Queries */}
      {activeTab === 'analytics' && (
        <div className="tab-content">
          {!analytics ? (
            <div className="loading">Loading analytics...</div>
          ) : (
            <div className="analytics-container">
              <h3>Sales Overview (Last 30 Days)</h3>
              
              {/* Summary Stats - Aggregate Query Results */}
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Total Orders</h4>
                  <p className="stat-value">{analytics.stats.total_orders || 0}</p>
                </div>
                <div className="stat-card">
                  <h4>Total Revenue</h4>
                  <p className="stat-value">₹{analytics.stats.total_revenue?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="stat-card">
                  <h4>Avg Order Value</h4>
                  <p className="stat-value">₹{analytics.stats.avg_order_value?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="stat-card">
                  <h4>Avg Rating</h4>
                  <p className="stat-value">{analytics.stats.avg_rating?.toFixed(1) || 'N/A'} ⭐</p>
                </div>
              </div>

              {/* Daily Sales - GROUP BY Date */}
              <div className="analytics-section">
                <h4>Daily Sales</h4>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                      <th>Avg Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dailySales.map((day) => (
                      <tr key={day.date}>
                        <td>{new Date(day.date).toLocaleDateString()}</td>
                        <td>{day.total_orders}</td>
                        <td>₹{parseFloat(day.total_revenue).toFixed(2)}</td>
                        <td>₹{parseFloat(day.avg_order_value).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Top Selling Items - Nested Query Results */}
              <div className="analytics-section">
                <h4>Top Selling Items</h4>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Item Name</th>
                      <th>Times Ordered</th>
                      <th>Total Quantity</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topItems.map((item) => (
                      <tr key={item.item_name}>
                        <td>{item.item_name}</td>
                        <td>{item.times_ordered}</td>
                        <td>{item.total_quantity}</td>
                        <td>₹{parseFloat(item.total_revenue).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantOwnerDashboard;
