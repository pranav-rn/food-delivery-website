/**
 * Order Routes
 * Handles order placement, tracking, and history
 * Uses stored procedures and role-based database access
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

/**
 * Place new order
 * POST /api/orders
 * Body: { restaurantId, addressId, items: [{itemId, quantity, price}] }
 * Uses stored procedure: place_order
 * Automatically assigns nearest available driver
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, addressId, items } = req.body;
    const userId = req.user.userId;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');

    // Call stored procedure to place order
    const [result] = await connection.query(
      'CALL place_order(?, ?, ?, ?, @order_id)',
      [userId, restaurantId, addressId, JSON.stringify(items)]
    );

    const [orderId] = await connection.query('SELECT @order_id as order_id');
    const newOrderId = orderId[0].order_id;

    // Auto-assign nearest available driver
    try {
      // Get restaurant location
      const [restaurant] = await db.admin.query(
        'SELECT latitude, longitude FROM Restaurants WHERE restaurant_id = ?',
        [restaurantId]
      );

      if (restaurant.length > 0 && restaurant[0].latitude && restaurant[0].longitude) {
        const restLat = restaurant[0].latitude;
        const restLng = restaurant[0].longitude;

        // Find nearest available driver using Haversine formula
        const [drivers] = await db.admin.query(`
          SELECT 
            driver_id,
            current_latitude,
            current_longitude,
            (6371 * acos(
              cos(radians(?)) * cos(radians(current_latitude)) *
              cos(radians(current_longitude) - radians(?)) +
              sin(radians(?)) * sin(radians(current_latitude))
            )) AS distance
          FROM Drivers
          WHERE is_available = TRUE 
            AND current_latitude IS NOT NULL 
            AND current_longitude IS NOT NULL
          ORDER BY distance ASC
          LIMIT 1
        `, [restLat, restLng, restLat]);

        // Assign driver to order if found (but keep status as 'confirmed')
        if (drivers.length > 0) {
          await db.admin.query(
            'UPDATE Orders SET driver_id = ? WHERE order_id = ?',
            [drivers[0].driver_id, newOrderId]
          );
          
          console.log(`Auto-assigned driver ${drivers[0].driver_id} to order ${newOrderId} (distance: ${drivers[0].distance.toFixed(2)}km)`);
        }
      }
    } catch (assignError) {
      console.error('Error auto-assigning driver:', assignError);
      // Continue even if driver assignment fails
    }

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: newOrderId
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

/**
 * Get user's order history
 * GET /api/orders/history
 * Query params: limit (default: 20)
 * Uses stored procedure: get_user_order_history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');

    const [orders] = await connection.query(
      'CALL get_user_order_history(?, ?)',
      [userId, limit]
    );

    res.json(orders[0]);
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific order details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    const [orders] = await connection.query(
      `SELECT 
        o.*,
        r.name as restaurant_name,
        r.address as restaurant_address,
        r.phone_num as restaurant_phone,
        r.latitude as restaurant_latitude,
        r.longitude as restaurant_longitude,
        a.address as delivery_address,
        a.city,
        a.state,
        a.postal_code,
        a.latitude as customer_latitude,
        a.longitude as customer_longitude,
        d.first_name as driver_first_name,
        d.last_name as driver_last_name,
        d.phone_num as driver_phone,
        d.num_plate as driver_plate,
        d.current_latitude as driver_latitude,
        d.current_longitude as driver_longitude,
        u_driver.email as driver_email,
        generate_order_reference(o.order_id) as order_reference
       FROM Orders o
       JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
       JOIN Addresses a ON o.address_id = a.address_id
       LEFT JOIN Drivers d ON o.driver_id = d.driver_id
       LEFT JOIN Users u_driver ON d.user_id = u_driver.user_id
       WHERE o.order_id = ? AND o.user_id = ?`,
      [req.params.id, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const [items] = await connection.query(
      `SELECT 
        oi.*,
        mi.name as item_name,
        mi.description as item_description
       FROM Order_Items oi
       JOIN Menu_Items mi ON oi.item_id = mi.item_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    // Get payment information
    const [payments] = await connection.query(
      `SELECT amount, payment_method, status, payment_date
       FROM Payments
       WHERE order_id = ?`,
      [req.params.id]
    );

    const order = {
      ...orders[0],
      items,
      payment: payments.length > 0 ? payments[0] : null
    };

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign driver to order (uses stored procedure)
router.put('/:id/assign-driver', async (req, res) => {
  try {
    const { driverId } = req.body;
    const connection = db.admin; // Admin operation
    
    await connection.query(
      'CALL assign_driver_to_order(?, ?)',
      [req.params.id, driverId]
    );

    res.json({ message: 'Driver assigned successfully' });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Complete order (uses stored procedure)
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const { rating } = req.body;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    await connection.query(
      'CALL complete_order(?, ?)',
      [req.params.id, rating]
    );

    res.json({ message: 'Order completed successfully' });
  } catch (error) {
    console.error('Error completing order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Process refund (uses stored procedure)
router.post('/:id/refund', authMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    const connection = db.getConnectionByUserType(req.user.userType || 'customer');
    
    await connection.query(
      'CALL process_refund(?, ?)',
      [req.params.id, reason]
    );

    res.json({ message: 'Refund processed successfully' });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate order total with tax
router.get('/:id/total-with-tax', async (req, res) => {
  try {
    const taxRate = 0.05; // 5% tax
    const connection = db.admin;
    
    const [result] = await connection.query(
      'SELECT calculate_order_total_with_tax(?, ?) as total',
      [req.params.id, taxRate]
    );

    res.json({ totalWithTax: result[0].total });
  } catch (error) {
    console.error('Error calculating total:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Estimate delivery time
router.get('/:restaurantId/estimate/:addressId', async (req, res) => {
  try {
    const connection = db.admin;
    
    const [result] = await connection.query(
      'SELECT estimate_delivery_time(?, ?) as estimated_time',
      [req.params.restaurantId, req.params.addressId]
    );

    res.json({ estimatedTime: result[0].estimated_time });
  } catch (error) {
    console.error('Error estimating delivery time:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
