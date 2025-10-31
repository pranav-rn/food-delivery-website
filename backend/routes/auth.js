/**
 * Authentication Routes
 * Handles user registration and login for different user types
 * Supports: customer, driver, restaurant_owner
 */

const express = require('express');
const router = express.Router();
// const bcrypt = require('bcryptjs'); // Removed - using plaintext passwords
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');

/**
 * Register new user
 * POST /api/auth/register
 * Body: { firstName, lastName, email, password, phoneNum, userType, restaurant?, numPlate?, currentLocation? }
 */
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty(),
  body('lastName').notEmpty(),
  body('userType').isIn(['customer', 'driver', 'restaurant_owner']).optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      phoneNum, 
      userType, 
      restaurant, 
      numPlate, 
      currentLocation,
      currentLatitude,
      currentLongitude
    } = req.body;
    const finalUserType = userType || 'customer';

    // Check if user exists
    const [existingUser] = await db.admin.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Store password as plaintext (for development/testing only)
    const passwordHash = password;

    // Insert user
    const [result] = await db.admin.query(
      'INSERT INTO Users (first_name, last_name, email, password_hash, phone_num, user_type) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, passwordHash, phoneNum, finalUserType]
    );

    const userId = result.insertId;

    // Handle restaurant owner registration
    if (finalUserType === 'restaurant_owner' && restaurant) {
      // Create the restaurant
      const [restaurantResult] = await db.admin.query(
        `INSERT INTO Restaurants (name, description, address, latitude, longitude, phone_num, cuisine, is_open) 
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          restaurant.name,
          restaurant.description || null,
          restaurant.address,
          restaurant.latitude || null,
          restaurant.longitude || null,
          restaurant.phoneNum || phoneNum,
          restaurant.cuisine
        ]
      );

      const restaurantId = restaurantResult.insertId;

      // Link user to restaurant
      await db.admin.query(
        'INSERT INTO Restaurant_Owners (user_id, restaurant_id) VALUES (?, ?)',
        [userId, restaurantId]
      );
    }

    // Handle driver registration
    if (finalUserType === 'driver') {
      // Create driver profile
      await db.admin.query(
        `INSERT INTO Drivers (user_id, first_name, last_name, phone_num, num_plate, current_location, 
         current_latitude, current_longitude, is_available) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          userId,
          firstName,
          lastName,
          phoneNum,
          numPlate || null,
          currentLocation || null,
          currentLatitude || null,
          currentLongitude || null
        ]
      );
    }

    // Create token with user type
    const token = jwt.sign(
      { userId, email, userType: finalUserType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userId,
        firstName,
        lastName,
        email,
        userType: finalUserType
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * User login
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: JWT token with user type and user information
 */
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user with admin connection
    const [users] = await db.admin.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password (plaintext comparison)
    const isMatch = password === user.password_hash;
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create token with user type
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, userType: user.user_type || 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phoneNum: user.phone_num,
        userType: user.user_type || 'customer'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
