const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get available drivers (uses stored procedure)
router.get('/available', async (req, res) => {
  try {
    const { location } = req.query;
    
    const [drivers] = await db.query(
      'CALL get_available_drivers(?)',
      [location || null]
    );

    res.json(drivers[0]);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get driver details
router.get('/:id', async (req, res) => {
  try {
    const [drivers] = await db.query(
      `SELECT 
        *,
        get_driver_rating(driver_id) as rating
       FROM Drivers 
       WHERE driver_id = ?`,
      [req.params.id]
    );

    if (drivers.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(drivers[0]);
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get driver earnings
router.get('/:id/earnings', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const [result] = await db.query(
      'SELECT calculate_driver_earnings(?, ?, ?) as earnings',
      [req.params.id, startDate, endDate]
    );

    res.json({ earnings: result[0].earnings });
  } catch (error) {
    console.error('Error calculating earnings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get driver's current orders
router.get('/:id/orders', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT 
        o.*,
        r.name as restaurant_name,
        r.address as restaurant_address,
        a.address as delivery_address,
        a.city,
        a.state,
        u.first_name as customer_first_name,
        u.last_name as customer_last_name,
        u.phone_num as customer_phone
       FROM Orders o
       JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
       JOIN Addresses a ON o.address_id = a.address_id
       JOIN Users u ON o.user_id = u.user_id
       WHERE o.driver_id = ?
       AND o.order_status IN ('assigned', 'picked_up', 'on_the_way')
       ORDER BY o.order_date DESC`,
      [req.params.id]
    );

    res.json(orders);
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update driver availability
router.put('/:id/availability', async (req, res) => {
  try {
    const { isAvailable } = req.body;

    await db.query(
      'UPDATE Drivers SET is_available = ? WHERE driver_id = ?',
      [isAvailable, req.params.id]
    );

    res.json({ message: 'Availability updated successfully' });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update driver location
router.put('/:id/location', async (req, res) => {
  try {
    const { location } = req.body;

    await db.query(
      'UPDATE Drivers SET current_location = ? WHERE driver_id = ?',
      [location, req.params.id]
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
