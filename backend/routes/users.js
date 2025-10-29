const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    // Only include loyalty functions for customers
    let query;
    if (req.user.userType === 'customer') {
      query = `SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_num,
        created_at,
        is_active,
        get_user_loyalty_tier(user_id) as loyalty_tier,
        get_user_avg_order_value(user_id) as avg_order_value
       FROM Users 
       WHERE user_id = ?`;
    } else {
      // For drivers and restaurant owners, exclude loyalty functions
      query = `SELECT 
        user_id,
        first_name,
        last_name,
        email,
        phone_num,
        created_at,
        is_active
       FROM Users 
       WHERE user_id = ?`;
    }
    
    const [users] = await connection.query(query, [req.user.userId]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phoneNum } = req.body;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');

    await connection.query(
      'UPDATE Users SET first_name = ?, last_name = ?, phone_num = ? WHERE user_id = ?',
      [firstName, lastName, phoneNum, req.user.userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user addresses
router.get('/addresses', authMiddleware, async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    const [addresses] = await connection.query(
      'SELECT * FROM Addresses WHERE user_id = ? ORDER BY is_default DESC',
      [req.user.userId]
    );

    res.json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new address
router.post('/addresses', authMiddleware, async (req, res) => {
  try {
    const { address, city, state, postalCode, isDefault } = req.body;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');

    // If this is default, unset other defaults
    if (isDefault) {
      await connection.query(
        'UPDATE Addresses SET is_default = FALSE WHERE user_id = ?',
        [req.user.userId]
      );
    }

    const [result] = await connection.query(
      'INSERT INTO Addresses (user_id, address, city, state, postal_code, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, address, city, state, postalCode, isDefault]
    );

    res.status(201).json({
      message: 'Address added successfully',
      addressId: result.insertId
    });
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update address
router.put('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const { address, city, state, postalCode, isDefault } = req.body;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');

    // Verify address belongs to user
    const [addresses] = await connection.query(
      'SELECT * FROM Addresses WHERE address_id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (addresses.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If this is default, unset other defaults
    if (isDefault) {
      await connection.query(
        'UPDATE Addresses SET is_default = FALSE WHERE user_id = ? AND address_id != ?',
        [req.user.userId, req.params.id]
      );
    }

    await connection.query(
      'UPDATE Addresses SET address = ?, city = ?, state = ?, postal_code = ?, is_default = ? WHERE address_id = ?',
      [address, city, state, postalCode, isDefault, req.params.id]
    );

    res.json({ message: 'Address updated successfully' });
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete address
router.delete('/addresses/:id', authMiddleware, async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    const [result] = await connection.query(
      'DELETE FROM Addresses WHERE address_id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate discount for user
router.get('/discount/:amount', authMiddleware, async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    const [result] = await connection.query(
      'SELECT calculate_discount(?, ?) as discount',
      [req.params.amount, req.user.userId]
    );

    res.json({ discount: result[0].discount });
  } catch (error) {
    console.error('Error calculating discount:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
