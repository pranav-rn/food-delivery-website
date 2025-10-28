const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Place new order (uses stored procedure)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { restaurantId, addressId, items } = req.body;
    const userId = req.user.userId;

    // Call stored procedure to place order
    const [result] = await db.query(
      'CALL place_order(?, ?, ?, ?, @order_id)',
      [userId, restaurantId, addressId, JSON.stringify(items)]
    );

    const [orderId] = await db.query('SELECT @order_id as order_id');

    res.status(201).json({
      message: 'Order placed successfully',
      orderId: orderId[0].order_id
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Get user's order history (uses stored procedure)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;

    const [orders] = await db.query(
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
    const [orders] = await db.query(
      `SELECT 
        o.*,
        r.name as restaurant_name,
        r.address as restaurant_address,
        r.phone_num as restaurant_phone,
        a.address as delivery_address,
        a.city,
        a.state,
        a.postal_code,
        d.first_name as driver_first_name,
        d.last_name as driver_last_name,
        d.phone_num as driver_phone,
        d.num_plate as driver_plate,
        generate_order_reference(o.order_id) as order_reference
       FROM Orders o
       JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
       JOIN Addresses a ON o.address_id = a.address_id
       LEFT JOIN Drivers d ON o.driver_id = d.driver_id
       WHERE o.order_id = ? AND o.user_id = ?`,
      [req.params.id, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get order items
    const [items] = await db.query(
      `SELECT 
        oi.*,
        mi.name as item_name,
        mi.description as item_description
       FROM Order_Items oi
       JOIN Menu_Items mi ON oi.item_id = mi.item_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    const order = {
      ...orders[0],
      items
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
    
    await db.query(
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
    
    await db.query(
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
    
    await db.query(
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
    
    const [result] = await db.query(
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
    const [result] = await db.query(
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
