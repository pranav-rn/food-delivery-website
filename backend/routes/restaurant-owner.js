/**
 * Restaurant Owner Routes
 * Handles restaurant owner-specific functionality:
 * - Menu item management (add/edit/delete)
 * - Image uploads for menu items
 * - Sales analytics
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware, requireRole } = require('../middleware/auth');
const db = require('../config/db');

// Configure multer for image upload (store in memory as buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

/**
 * Get restaurant owned by current user
 * GET /api/restaurant-owner/my-restaurant
 */
router.get('/my-restaurant', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    
    // Join query to get restaurant info for the owner
    const [restaurants] = await connection.query(`
      SELECT r.*, ro.owner_id 
      FROM Restaurant_Owners ro
      JOIN Restaurants r ON ro.restaurant_id = r.restaurant_id
      WHERE ro.user_id = ?
    `, [req.user.userId]);

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found for this owner' });
    }

    res.json(restaurants[0]);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get all menu items for owner's restaurant
 * GET /api/restaurant-owner/menu
 */
router.get('/menu', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    
    // Get restaurant_id for this owner
    const [restaurants] = await connection.query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;

    // Get menu items (image as base64 if exists)
    const [menuItems] = await connection.query(`
      SELECT 
        item_id,
        item_name,
        description,
        price,
        category,
        is_vegetarian,
        is_available,
        CASE 
          WHEN image IS NOT NULL THEN CONCAT('data:image/jpeg;base64,', TO_BASE64(image))
          ELSE NULL 
        END as image
      FROM Menu_Items
      WHERE restaurant_id = ?
      ORDER BY category, item_name
    `, [restaurantId]);

    res.json(menuItems);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Add new menu item with optional image
 * POST /api/restaurant-owner/menu
 * Body: { itemName, description, price, category, isVegetarian }
 * File: image (optional)
 */
router.post('/menu', authMiddleware, requireRole('restaurant_owner'), upload.single('image'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { itemName, description, price, category, isVegetarian } = req.body;

    // Get restaurant_id
    const [restaurants] = await connection.query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;
    const imageBuffer = req.file ? req.file.buffer : null;

    // Insert menu item with image as BLOB
    const [result] = await connection.query(`
      INSERT INTO Menu_Items 
      (restaurant_id, item_name, description, price, category, is_vegetarian, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [restaurantId, itemName, description, price, category, isVegetarian === 'true', imageBuffer]);

    res.status(201).json({
      message: 'Menu item added successfully',
      itemId: result.insertId
    });
  } catch (error) {
    console.error('Add menu item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update menu item
 * PUT /api/restaurant-owner/menu/:itemId
 * Body: { itemName, description, price, category, isVegetarian, isAvailable }
 * File: image (optional)
 */
router.put('/menu/:itemId', authMiddleware, requireRole('restaurant_owner'), upload.single('image'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { itemId } = req.params;
    const { itemName, description, price, category, isVegetarian, isAvailable } = req.body;

    // Verify ownership
    const [items] = await connection.query(`
      SELECT mi.* FROM Menu_Items mi
      JOIN Restaurant_Owners ro ON mi.restaurant_id = ro.restaurant_id
      WHERE mi.item_id = ? AND ro.user_id = ?
    `, [itemId, req.user.userId]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found or access denied' });
    }

    const imageBuffer = req.file ? req.file.buffer : null;

    // Update query - only update image if new one is provided
    let query, params;
    if (imageBuffer) {
      query = `
        UPDATE Menu_Items 
        SET item_name = ?, description = ?, price = ?, 
            category = ?, is_vegetarian = ?, is_available = ?, image = ?
        WHERE item_id = ?
      `;
      params = [itemName, description, price, category, isVegetarian === 'true', isAvailable === 'true', imageBuffer, itemId];
    } else {
      query = `
        UPDATE Menu_Items 
        SET item_name = ?, description = ?, price = ?, 
            category = ?, is_vegetarian = ?, is_available = ?
        WHERE item_id = ?
      `;
      params = [itemName, description, price, category, isVegetarian === 'true', isAvailable === 'true', itemId];
    }

    await connection.query(query, params);

    res.json({ message: 'Menu item updated successfully' });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Delete menu item
 * DELETE /api/restaurant-owner/menu/:itemId
 */
router.delete('/menu/:itemId', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { itemId } = req.params;

    // Verify ownership
    const [items] = await connection.query(`
      SELECT mi.* FROM Menu_Items mi
      JOIN Restaurant_Owners ro ON mi.restaurant_id = ro.restaurant_id
      WHERE mi.item_id = ? AND ro.user_id = ?
    `, [itemId, req.user.userId]);

    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found or access denied' });
    }

    await connection.query('DELETE FROM Menu_Items WHERE item_id = ?', [itemId]);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get sales analytics for owner's restaurant
 * GET /api/restaurant-owner/analytics
 * Demonstrates: Aggregate query with GROUP BY, SUM, COUNT
 */
router.get('/analytics', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);

    // Get restaurant_id
    const [restaurants] = await connection.query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;

    // Aggregate query: Sales by date
    const [dailySales] = await connection.query(`
      SELECT 
        DATE(o.order_date) as date,
        COUNT(DISTINCT o.order_id) as total_orders,
        SUM(o.total_amount) as total_revenue,
        AVG(o.total_amount) as avg_order_value
      FROM Orders o
      WHERE o.restaurant_id = ? 
        AND o.status NOT IN ('cancelled')
        AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(o.order_date)
      ORDER BY date DESC
    `, [restaurantId]);

    // Top selling items (nested query with aggregate)
    const [topItems] = await connection.query(`
      SELECT 
        mi.item_name,
        COUNT(oi.item_id) as times_ordered,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price) as total_revenue
      FROM Order_Items oi
      JOIN Menu_Items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id IN (
        SELECT order_id 
        FROM Orders 
        WHERE restaurant_id = ? 
          AND status NOT IN ('cancelled')
          AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      )
      GROUP BY mi.item_id, mi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [restaurantId]);

    // Overall stats
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        AVG(rating) as avg_rating
      FROM Orders
      WHERE restaurant_id = ? 
        AND status NOT IN ('cancelled')
        AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [restaurantId]);

    res.json({
      dailySales,
      topItems,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
