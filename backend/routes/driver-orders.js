/**
 * Driver Routes
 * Handles driver-specific functionality:
 * - View available/assigned orders
 * - Update delivery status
 * - View earnings
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const db = require('../config/db');

/**
 * Get driver profile information
 * GET /api/drivers/profile
 */
router.get('/profile', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    
    // Join query: Get driver info with user details
    const [drivers] = await connection.query(`
      SELECT 
        d.driver_id,
        d.user_id,
        d.vehicle_type,
        d.license_number,
        d.is_available,
        d.current_latitude,
        d.current_longitude,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_num
      FROM Drivers d
      JOIN Users u ON d.user_id = u.user_id
      WHERE d.user_id = ?
    `, [req.user.userId]);

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json(drivers[0]);
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update driver availability
 * PUT /api/drivers/availability
 * Body: { isAvailable, latitude?, longitude? }
 */
router.put('/availability', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { isAvailable, latitude, longitude } = req.body;

    const [result] = await connection.query(`
      UPDATE Drivers 
      SET is_available = ?, 
          current_latitude = COALESCE(?, current_latitude),
          current_longitude = COALESCE(?, current_longitude)
      WHERE user_id = ?
    `, [isAvailable, latitude, longitude, req.user.userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get assigned orders for driver
 * GET /api/drivers/orders
 * Query params: status (optional) - filter by order status
 */
router.get('/orders', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { status } = req.query;

    // Get driver_id
    const [drivers] = await connection.query(
      'SELECT driver_id FROM Drivers WHERE user_id = ?',
      [req.user.userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driverId = drivers[0].driver_id;

    // Join query: Get orders with restaurant and customer details
    let query = `
      SELECT 
        o.order_id,
        o.order_date,
        o.status,
        o.total_amount,
        o.delivery_address,
        o.estimated_delivery_time,
        r.restaurant_name,
        r.address as restaurant_address,
        r.phone_num as restaurant_phone,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.phone_num as customer_phone,
        a.address_line1,
        a.address_line2,
        a.city,
        a.state,
        a.pincode
      FROM Orders o
      JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
      JOIN Users u ON o.user_id = u.user_id
      LEFT JOIN Addresses a ON o.delivery_address = a.address_id
      WHERE o.driver_id = ?
    `;

    const params = [driverId];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.order_date DESC';

    const [orders] = await connection.query(query, params);

    res.json(orders);
  } catch (error) {
    console.error('Get driver orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get available orders (not yet assigned to any driver)
 * GET /api/drivers/available-orders
 * Demonstrates: Nested query to find orders without drivers
 */
router.get('/available-orders', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);

    // Nested query: Orders where driver_id is NULL or in specific statuses
    const [orders] = await connection.query(`
      SELECT 
        o.order_id,
        o.order_date,
        o.total_amount,
        o.delivery_address,
        r.restaurant_name,
        r.address as restaurant_address,
        r.latitude as restaurant_lat,
        r.longitude as restaurant_lng,
        a.address_line1,
        a.city,
        a.latitude as delivery_lat,
        a.longitude as delivery_lng
      FROM Orders o
      JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
      LEFT JOIN Addresses a ON o.delivery_address = a.address_id
      WHERE o.driver_id IS NULL 
        AND o.status = 'confirmed'
        AND o.order_id NOT IN (
          SELECT order_id 
          FROM Orders 
          WHERE driver_id IS NOT NULL
        )
      ORDER BY o.order_date ASC
      LIMIT 20
    `);

    res.json(orders);
  } catch (error) {
    console.error('Get available orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Accept an order
 * POST /api/drivers/orders/:orderId/accept
 */
router.post('/orders/:orderId/accept', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { orderId } = req.params;

    // Get driver_id
    const [drivers] = await connection.query(
      'SELECT driver_id FROM Drivers WHERE user_id = ?',
      [req.user.userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driverId = drivers[0].driver_id;

    // Check if order is available
    const [orders] = await connection.query(
      'SELECT * FROM Orders WHERE order_id = ? AND driver_id IS NULL AND status = ?',
      [orderId, 'confirmed']
    );

    if (orders.length === 0) {
      return res.status(400).json({ error: 'Order not available' });
    }

    // Assign driver to order
    await connection.query(
      'UPDATE Orders SET driver_id = ?, status = ? WHERE order_id = ?',
      [driverId, 'preparing', orderId]
    );

    res.json({ message: 'Order accepted successfully' });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Update order delivery status
 * PUT /api/drivers/orders/:orderId/status
 * Body: { status }
 * Allowed transitions: preparing -> out_for_delivery -> delivered
 */
router.put('/orders/:orderId/status', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { orderId } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['preparing', 'out_for_delivery', 'delivered'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get driver_id
    const [drivers] = await connection.query(
      'SELECT driver_id FROM Drivers WHERE user_id = ?',
      [req.user.userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driverId = drivers[0].driver_id;

    // Verify driver is assigned to this order
    const [orders] = await connection.query(
      'SELECT * FROM Orders WHERE order_id = ? AND driver_id = ?',
      [orderId, driverId]
    );

    if (orders.length === 0) {
      return res.status(403).json({ error: 'Order not assigned to this driver' });
    }

    // Update status
    if (status === 'delivered') {
      // Call stored procedure to mark as completed
      await connection.query('CALL complete_order(?, ?)', [orderId, new Date()]);
    } else {
      await connection.query('UPDATE Orders SET status = ? WHERE order_id = ?', [status, orderId]);
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Get driver earnings
 * GET /api/drivers/earnings
 * Query params: startDate, endDate (optional)
 * Demonstrates: Aggregate query with date filtering
 */
router.get('/earnings', authMiddleware, requireRole('driver'), async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType);
    const { startDate, endDate } = req.query;

    // Get driver_id
    const [drivers] = await connection.query(
      'SELECT driver_id FROM Drivers WHERE user_id = ?',
      [req.user.userId]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const driverId = drivers[0].driver_id;

    // Aggregate earnings query
    let query = `
      SELECT 
        COUNT(o.order_id) as total_deliveries,
        SUM(p.delivery_fee) as total_earnings,
        AVG(p.delivery_fee) as avg_earning_per_delivery,
        MIN(o.order_date) as first_delivery,
        MAX(o.order_date) as last_delivery
      FROM Orders o
      JOIN Payments p ON o.order_id = p.order_id
      WHERE o.driver_id = ? AND o.status = 'delivered'
    `;

    const params = [driverId];

    if (startDate) {
      query += ' AND o.order_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND o.order_date <= ?';
      params.push(endDate);
    }

    const [earnings] = await connection.query(query, params);

    // Daily breakdown
    let dailyQuery = `
      SELECT 
        DATE(o.order_date) as date,
        COUNT(o.order_id) as deliveries,
        SUM(p.delivery_fee) as earnings
      FROM Orders o
      JOIN Payments p ON o.order_id = p.order_id
      WHERE o.driver_id = ? AND o.status = 'delivered'
    `;

    if (startDate) {
      dailyQuery += ' AND o.order_date >= ?';
    }

    if (endDate) {
      dailyQuery += ' AND o.order_date <= ?';
    }

    dailyQuery += ' GROUP BY DATE(o.order_date) ORDER BY date DESC';

    const [dailyEarnings] = await connection.query(dailyQuery, params);

    res.json({
      summary: earnings[0],
      dailyBreakdown: dailyEarnings
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Find closest available drivers to a restaurant
 * GET /api/driver-orders/closest/:restaurantId
 * Uses Haversine formula to calculate distance
 * Returns drivers sorted by distance
 */
router.get('/closest/:restaurantId', async (req, res) => {
  try {
    const connection = db.admin; // Use admin connection for restaurant lookup
    const { restaurantId } = req.params;

    // Get restaurant coordinates
    const [restaurants] = await connection.query(
      'SELECT latitude, longitude, restaurant_name FROM Restaurants WHERE restaurant_id = ?',
      [restaurantId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = restaurants[0];

    // Get all available drivers with coordinates
    // Calculate distance using Haversine formula in SQL
    const [drivers] = await connection.query(`
      SELECT 
        d.driver_id,
        d.vehicle_type,
        d.license_number,
        d.current_latitude,
        d.current_longitude,
        u.first_name,
        u.last_name,
        u.phone_num,
        (
          6371 * acos(
            cos(radians(?)) * 
            cos(radians(d.current_latitude)) * 
            cos(radians(d.current_longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(d.current_latitude))
          )
        ) AS distance_km,
        ROUND(
          (6371 * acos(
            cos(radians(?)) * 
            cos(radians(d.current_latitude)) * 
            cos(radians(d.current_longitude) - radians(?)) + 
            sin(radians(?)) * 
            sin(radians(d.current_latitude))
          )) * 3, 0
        ) AS eta_minutes
      FROM Drivers d
      JOIN Users u ON d.user_id = u.user_id
      WHERE d.is_available = 1 
        AND d.current_latitude IS NOT NULL 
        AND d.current_longitude IS NOT NULL
      HAVING distance_km <= 50
      ORDER BY distance_km ASC
      LIMIT 10
    `, [
      restaurant.latitude, restaurant.longitude, restaurant.latitude,
      restaurant.latitude, restaurant.longitude, restaurant.latitude
    ]);

    res.json({
      restaurant: {
        id: restaurantId,
        name: restaurant.restaurant_name,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude
      },
      availableDrivers: drivers,
      closestDriver: drivers.length > 0 ? drivers[0] : null
    });
  } catch (error) {
    console.error('Find closest drivers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
