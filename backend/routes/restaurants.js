const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all restaurants
router.get('/', async (req, res) => {
  try {
    const connection = db.admin; // Public endpoint, use admin connection
    const { cuisine, search } = req.query;
    let query = 'SELECT * FROM Restaurants WHERE 1=1';
    const params = [];

    if (cuisine) {
      query += ' AND cuisine = ?';
      params.push(cuisine);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY rating DESC';

    const [restaurants] = await connection.query(query, params);
    
    // Convert image BLOBs to base64
    const restaurantsWithImages = restaurants.map(restaurant => {
      if (restaurant.image) {
        restaurant.image = `data:image/jpeg;base64,${restaurant.image.toString('base64')}`;
      }
      return restaurant;
    });
    
    res.json(restaurantsWithImages);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get restaurant by ID
router.get('/:id', async (req, res) => {
  try {
    const connection = db.admin; // Public endpoint
    
    const [restaurants] = await connection.query(
      'SELECT * FROM Restaurants WHERE restaurant_id = ?',
      [req.params.id]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Check if restaurant is open now using function
    const [openStatus] = await connection.query(
      'SELECT is_restaurant_open_now(?) as is_open',
      [req.params.id]
    );

    // Check if restaurant is busy using function
    const [busyStatus] = await connection.query(
      'SELECT is_restaurant_busy(?) as is_busy',
      [req.params.id]
    );

    const restaurant = {
      ...restaurants[0],
      is_open_now: openStatus[0].is_open,
      is_busy: busyStatus[0].is_busy
    };
    
    // Convert image BLOB to base64
    if (restaurant.image) {
      restaurant.image = `data:image/jpeg;base64,${restaurant.image.toString('base64')}`;
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get restaurant menu
router.get('/:id/menu', async (req, res) => {
  try {
    const connection = db.admin; // Public endpoint
    
    const [menuItems] = await connection.query(
      `SELECT 
        item_id,
        name,
        description,
        price,
        is_available,
        get_item_popularity_score(item_id) as popularity_score
       FROM Menu_Items 
       WHERE restaurant_id = ?
       ORDER BY popularity_score DESC, name`,
      [req.params.id]
    );

    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get restaurant revenue (admin endpoint)
router.get('/:id/revenue', async (req, res) => {
  try {
    const connection = db.admin; // Admin operation
    const { startDate, endDate } = req.query;
    
    const [result] = await connection.query(
      'CALL calculate_restaurant_revenue(?, ?, ?, @total_revenue, @order_count)',
      [req.params.id, startDate, endDate]
    );

    const [revenue] = await connection.query('SELECT @total_revenue as total_revenue, @order_count as order_count');

    res.json(revenue[0]);
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all cuisines
router.get('/cuisines/list', async (req, res) => {
  try {
    const connection = db.admin; // Public endpoint
    
    const [cuisines] = await connection.query(
      'SELECT DISTINCT cuisine FROM Restaurants WHERE cuisine IS NOT NULL ORDER BY cuisine'
    );
    res.json(cuisines.map(c => c.cuisine));
  } catch (error) {
    console.error('Error fetching cuisines:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
