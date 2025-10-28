const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Create payment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { orderId, paymentMethod, amount } = req.body;

    // Verify order belongs to user
    const [orders] = await db.query(
      'SELECT * FROM Orders WHERE order_id = ? AND user_id = ?',
      [orderId, req.user.userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Insert payment (trigger will validate amount)
    const [result] = await db.query(
      'INSERT INTO Payments (order_id, payment_method, amount, status) VALUES (?, ?, ?, ?)',
      [orderId, paymentMethod, amount, 'pending']
    );

    res.status(201).json({
      message: 'Payment initiated',
      paymentId: result.insertId
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// Update payment status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    await db.query(
      'UPDATE Payments SET status = ? WHERE payment_id = ?',
      [status, req.params.id]
    );

    res.json({ message: 'Payment status updated' });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payment details
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT p.*, o.user_id 
       FROM Payments p
       JOIN Orders o ON p.order_id = o.order_id
       WHERE p.payment_id = ?`,
      [req.params.id]
    );

    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payments[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(payments[0]);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get payment methods (could be expanded)
router.get('/methods/list', (req, res) => {
  res.json([
    { id: 'upi', name: 'UPI', icon: '📱' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳' },
    { id: 'cash', name: 'Cash on Delivery', icon: '💵' },
    { id: 'wallet', name: 'Digital Wallet', icon: '💰' }
  ]);
});

module.exports = router;
