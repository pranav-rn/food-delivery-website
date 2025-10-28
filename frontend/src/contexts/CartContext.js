import React, { createContext, useState, useContext, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedRestaurantId = localStorage.getItem('cartRestaurantId');
    
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    if (savedRestaurantId) {
      setRestaurantId(parseInt(savedRestaurantId));
    }
  }, []);

  const addToCart = (item, restaurant) => {
    // If cart has items from different restaurant, clear it
    if (restaurantId && restaurantId !== restaurant.restaurant_id) {
      if (window.confirm('Your cart contains items from another restaurant. Do you want to clear it?')) {
        clearCart();
      } else {
        return false;
      }
    }

    const existingItem = cartItems.find(cartItem => cartItem.item_id === item.item_id);
    
    let newCart;
    if (existingItem) {
      newCart = cartItems.map(cartItem =>
        cartItem.item_id === item.item_id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    } else {
      newCart = [...cartItems, { ...item, quantity: 1, restaurant_name: restaurant.name }];
    }

    setCartItems(newCart);
    setRestaurantId(restaurant.restaurant_id);
    localStorage.setItem('cart', JSON.stringify(newCart));
    localStorage.setItem('cartRestaurantId', restaurant.restaurant_id);
    return true;
  };

  const removeFromCart = (itemId) => {
    const newCart = cartItems.filter(item => item.item_id !== itemId);
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    
    if (newCart.length === 0) {
      clearCart();
    }
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const newCart = cartItems.map(item =>
      item.item_id === itemId ? { ...item, quantity } : item
    );
    setCartItems(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
  };

  const clearCart = () => {
    setCartItems([]);
    setRestaurantId(null);
    localStorage.removeItem('cart');
    localStorage.removeItem('cartRestaurantId');
  };

  const getTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const value = {
    cartItems,
    restaurantId,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
