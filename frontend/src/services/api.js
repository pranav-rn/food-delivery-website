import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data)
};

// Restaurant API
export const restaurantAPI = {
  getAll: (params) => api.get('/restaurants', { params }),
  getById: (id) => api.get(`/restaurants/${id}`),
  getMenu: (id) => api.get(`/restaurants/${id}/menu`),
  getCuisines: () => api.get('/restaurants/cuisines/list')
};

// Order API
export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getHistory: (limit) => api.get('/orders/history', { params: { limit } }),
  getById: (id) => api.get(`/orders/${id}`),
  complete: (id, rating) => api.put(`/orders/${id}/complete`, { rating }),
  requestRefund: (id, reason) => api.post(`/orders/${id}/refund`, { reason }),
  estimateDeliveryTime: (restaurantId, addressId) => 
    api.get(`/orders/${restaurantId}/estimate/${addressId}`)
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getAddresses: () => api.get('/users/addresses'),
  addAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  getDiscount: (amount) => api.get(`/users/discount/${amount}`)
};

// Payment API
export const paymentAPI = {
  create: (data) => api.post('/payments', data),
  getById: (id) => api.get(`/payments/${id}`),
  getMethods: () => api.get('/payments/methods/list')
};

// Driver API
export const driverAPI = {
  getAvailable: (location) => api.get('/drivers/available', { params: { location } }),
  getById: (id) => api.get(`/drivers/${id}`),
  getOrders: (id) => api.get(`/drivers/${id}/orders`),
  updateAvailability: (id, isAvailable) => 
    api.put(`/drivers/${id}/availability`, { isAvailable }),
  updateLocation: (id, location) => 
    api.put(`/drivers/${id}/location`, { location })
};

export default api;
