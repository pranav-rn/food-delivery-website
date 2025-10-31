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
 * Create a new restaurant for the owner
 * POST /api/restaurant-owner/create-restaurant
 */
router.post('/create-restaurant', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.admin; // Use admin for INSERT operations
    const { name, description, address, phoneNum, cuisine, latitude, longitude } = req.body;
    
    // Check if this user already owns a restaurant
    const [existing] = await connection.query(
      'SELECT * FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already own a restaurant' });
    }
    
    // Create the restaurant
    const [result] = await connection.query(
      'INSERT INTO Restaurants (name, description, address, phone_num, cuisine, latitude, longitude, rating, is_open) VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, TRUE)',
      [name, description, address, phoneNum, cuisine, latitude || null, longitude || null]
    );
    
    const restaurantId = result.insertId;
    
    // Link the restaurant to the owner
    await connection.query(
      'INSERT INTO Restaurant_Owners (user_id, restaurant_id) VALUES (?, ?)',
      [req.user.userId, restaurantId]
    );
    
    res.status(201).json({ 
      message: 'Restaurant created successfully',
      restaurantId 
    });
  } catch (error) {
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Server error' });
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

    // Convert image BLOB to base64 if exists
    const restaurant = restaurants[0];
    if (restaurant.image) {
      restaurant.image = `data:image/jpeg;base64,${restaurant.image.toString('base64')}`;
    }

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update restaurant profile with image
 * PUT /api/restaurant-owner/my-restaurant
 */
router.put('/my-restaurant', authMiddleware, requireRole('restaurant_owner'), upload.single('image'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { name, description, address, phoneNum, cuisine } = req.body;
    
    // Get restaurant_id for this owner
    const [restaurants] = await connection.query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;

    // Build update query dynamically based on provided fields
    let updateFields = [];
    let updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (address) {
      updateFields.push('address = ?');
      updateValues.push(address);
    }
    if (phoneNum) {
      updateFields.push('phone_num = ?');
      updateValues.push(phoneNum);
    }
    if (cuisine) {
      updateFields.push('cuisine = ?');
      updateValues.push(cuisine);
    }
    if (req.file) {
      updateFields.push('image = ?');
      updateValues.push(req.file.buffer);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add restaurant_id to values array
    updateValues.push(restaurantId);

    // Execute update
    await connection.query(
      `UPDATE Restaurants SET ${updateFields.join(', ')} WHERE restaurant_id = ?`,
      updateValues
    );

    // Fetch updated restaurant
    const [updated] = await connection.query(
      'SELECT * FROM Restaurants WHERE restaurant_id = ?',
      [restaurantId]
    );

    // Convert image BLOB to base64 if exists
    const restaurant = updated[0];
    if (restaurant.image) {
      restaurant.image = `data:image/jpeg;base64,${restaurant.image.toString('base64')}`;
    }

    res.json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    console.error('Update restaurant error:', error);
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
        name as item_name,
        description,
        price,
        is_available,
        CASE 
          WHEN image IS NOT NULL THEN CONCAT('data:image/jpeg;base64,', TO_BASE64(image))
          ELSE NULL 
        END as image
      FROM Menu_Items
      WHERE restaurant_id = ?
      ORDER BY name
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
      (restaurant_id, name, description, price, image)
      VALUES (?, ?, ?, ?, ?)
    `, [restaurantId, itemName, description, price, imageBuffer]);

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
        SET name = ?, description = ?, price = ?, is_available = ?, image = ?
        WHERE item_id = ?
      `;
      params = [itemName, description, price, isAvailable === 'true', imageBuffer, itemId];
    } else {
      query = `
        UPDATE Menu_Items 
        SET name = ?, description = ?, price = ?, is_available = ?
        WHERE item_id = ?
      `;
      params = [itemName, description, price, isAvailable === 'true', itemId];
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
        AND o.order_status NOT IN ('cancelled')
        AND o.order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(o.order_date)
      ORDER BY date DESC
    `, [restaurantId]);

    // Top selling items (nested query with aggregate)
    const [topItems] = await connection.query(`
      SELECT 
        mi.name as item_name,
        COUNT(oi.item_id) as times_ordered,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.price_per_item) as total_revenue
      FROM Order_Items oi
      JOIN Menu_Items mi ON oi.item_id = mi.item_id
      WHERE oi.order_id IN (
        SELECT order_id 
        FROM Orders 
        WHERE restaurant_id = ? 
          AND order_status NOT IN ('cancelled')
          AND order_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      )
      GROUP BY mi.item_id, mi.name
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
        AND order_status NOT IN ('cancelled')
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

/**
 * Get orders for restaurant owner's restaurant
 * GET /api/restaurant-owner/orders
 */
router.get('/orders', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { status } = req.query;
    
    // Get restaurant_id for this owner
    const [restaurants] = await connection.query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;

    // Build query with optional status filter
    let query = `
      SELECT 
        o.order_id,
        o.order_date,
        o.order_status,
        o.total_amount,
        o.rating,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.phone_num as customer_phone,
        u.email as customer_email,
        a.address as delivery_address,
        a.city as delivery_city,
        a.latitude as customer_latitude,
        a.longitude as customer_longitude,
        d.first_name as driver_first_name,
        d.last_name as driver_last_name,
        d.phone_num as driver_phone,
        d.num_plate as driver_plate,
        d.current_latitude as driver_latitude,
        d.current_longitude as driver_longitude,
        u_driver.email as driver_email,
        p.payment_method,
        p.status as payment_status
      FROM Orders o
      JOIN Users u ON o.user_id = u.user_id
      JOIN Addresses a ON o.address_id = a.address_id
      LEFT JOIN Drivers d ON o.driver_id = d.driver_id
      LEFT JOIN Users u_driver ON d.user_id = u_driver.user_id
      LEFT JOIN Payments p ON o.order_id = p.order_id
      WHERE o.restaurant_id = ?
    `;

    const params = [restaurantId];

    if (status) {
      query += ' AND o.order_status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.order_date DESC LIMIT 50';

    const [orders] = await connection.query(query, params);

    // For each order, get the items
    for (let order of orders) {
      const [items] = await connection.query(`
        SELECT 
          oi.quantity,
          oi.price_per_item,
          mi.name as item_name,
          mi.description
        FROM Order_Items oi
        JOIN Menu_Items mi ON oi.item_id = mi.item_id
        WHERE oi.order_id = ?
      `, [order.order_id]);
      
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Get restaurant orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Mark order as prepared
 * PUT /api/restaurant-owner/orders/:orderId/prepare
 * Changes status from 'confirmed' to 'preparing'
 */
router.put('/orders/:orderId/prepare', authMiddleware, requireRole('restaurant_owner'), async (req, res) => {
  try {
    const connection = db.admin; // Use admin for UPDATE
    const { orderId } = req.params;
    
    // Verify this order belongs to owner's restaurant
    const [restaurants] = await db.getConnectionByUserType(req.user.userType).query(
      'SELECT restaurant_id FROM Restaurant_Owners WHERE user_id = ?',
      [req.user.userId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'No restaurant found' });
    }

    const restaurantId = restaurants[0].restaurant_id;

    // Check order exists and belongs to this restaurant
    const [orders] = await connection.query(
      'SELECT * FROM Orders WHERE order_id = ? AND restaurant_id = ?',
      [orderId, restaurantId]
    );

    if (orders.length === 0) {
      return res.status(403).json({ error: 'Order not found or not from your restaurant' });
    }

    const order = orders[0];

    // Allow transition from 'pending' or 'confirmed' to 'preparing'
    if (order.order_status !== 'confirmed' && order.order_status !== 'pending') {
      return res.status(400).json({ error: 'Order must be in pending or confirmed status to mark as preparing' });
    }

    // Update order status to preparing
    await connection.query(
      'UPDATE Orders SET order_status = ? WHERE order_id = ?',
      ['preparing', orderId]
    );

    res.json({ message: 'Order marked as preparing' });
  } catch (error) {
    console.error('Mark order prepared error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;


