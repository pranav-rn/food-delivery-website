import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import './Profile.css';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNum: ''
  });

  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    isDefault: false
  });

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      setProfile(response.data);
      setFormData({
        firstName: response.data.first_name,
        lastName: response.data.last_name,
        phoneNum: response.data.phone_num || ''
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const response = await userAPI.getAddresses();
      setAddresses(response.data);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await userAPI.updateProfile(formData);
      alert('Profile updated successfully!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      alert('Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await userAPI.addAddress(newAddress);
      alert('Address added successfully!');
      setAddingAddress(false);
      setNewAddress({
        address: '',
        city: '',
        state: '',
        postalCode: '',
        isDefault: false
      });
      fetchAddresses();
    } catch (err) {
      alert('Failed to add address');
      console.error('Error adding address:', err);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await userAPI.deleteAddress(id);
      alert('Address deleted successfully!');
      fetchAddresses();
    } catch (err) {
      alert('Failed to delete address');
      console.error('Error deleting address:', err);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="error-message">Failed to load profile</div>;
  }

  return (
    <div className="profile-page">
      <div className="container">
        <h1>My Profile</h1>

        <div className="profile-content">
          <section className="profile-section">
            <div className="section-header">
              <h2>Personal Information</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="btn btn-secondary">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleUpdateProfile} className="profile-form">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNum}
                    onChange={(e) => setFormData({ ...formData, phoneNum: e.target.value })}
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Save</button>
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
                <p><strong>Email:</strong> {profile.email}</p>
                <p><strong>Phone:</strong> {profile.phone_num || 'Not provided'}</p>
                <p><strong>Member Since:</strong> {new Date(profile.created_at).toLocaleDateString()}</p>
                <p><strong>Loyalty Tier:</strong> <span className="loyalty-badge">{profile.loyalty_tier}</span></p>
                <p><strong>Average Order Value:</strong> ₹{parseFloat(profile.avg_order_value).toFixed(2)}</p>
              </div>
            )}
          </section>

          <section className="profile-section">
            <div className="section-header">
              <h2>Delivery Addresses</h2>
              {!addingAddress && (
                <button onClick={() => setAddingAddress(true)} className="btn btn-primary">
                  Add Address
                </button>
              )}
            </div>

            {addingAddress && (
              <form onSubmit={handleAddAddress} className="address-form">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City</label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input
                      type="text"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    value={newAddress.postalCode}
                    onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                    />
                    Set as default address
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">Add</button>
                  <button type="button" onClick={() => setAddingAddress(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="addresses-list">
              {addresses.length === 0 ? (
                <p>No addresses added yet</p>
              ) : (
                addresses.map((address) => (
                  <div key={address.address_id} className="address-card">
                    <div className="address-content">
                      <p><strong>{address.address}</strong></p>
                      <p>{address.city}, {address.state} - {address.postal_code}</p>
                      {address.is_default && <span className="default-badge">Default</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(address.address_id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
