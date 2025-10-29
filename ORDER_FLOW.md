# Order Flow Documentation

## Complete Order Workflow

This document describes the complete order flow from placement to delivery in the food delivery system.

## Order Status Transitions

```
CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
```

### Status Definitions

1. **CONFIRMED** - Order placed by customer, payment completed, driver assigned
2. **PREPARING** - Restaurant marked order as prepared, ready for pickup
3. **OUT_FOR_DELIVERY** - Driver picked up order and is delivering
4. **DELIVERED** - Order successfully delivered to customer

## Step-by-Step Flow

### 1. Customer Places Order
**Route:** `POST /api/orders`

- Customer selects items and places order
- Payment is automatically completed after 2 seconds
- System finds nearest available driver using Haversine distance formula
- Driver is automatically assigned to order
- **Initial Status:** `CONFIRMED`
- Order appears in:
  - Customer's order history
  - Restaurant owner's Orders tab
  - Driver's "My Deliveries" tab

### 2. Restaurant Prepares Order
**Route:** `PUT /api/restaurant-owner/orders/:orderId/prepare`

- Restaurant owner sees order in "Orders" tab with status `CONFIRMED`
- Restaurant prepares the food
- Restaurant clicks **"Mark as Prepared 🍽️"** button
- **Status Changes:** `CONFIRMED` → `PREPARING`
- Driver is notified that order is ready for pickup

### 3. Driver Picks Up & Delivers
**Route:** `PUT /api/driver-orders/orders/:orderId/status`

#### Driver View States:

**When order status = CONFIRMED:**
- Shows message: "⏳ Waiting for restaurant to prepare"
- "Start Delivery" button is DISABLED

**When order status = PREPARING:**
- Shows button: **"Start Delivery 🚗"**
- Driver clicks to begin delivery
- Driver is marked as UNAVAILABLE for new orders
- **Status Changes:** `PREPARING` → `OUT_FOR_DELIVERY`

**When order status = OUT_FOR_DELIVERY:**
- Shows button: **"Complete Delivery ✓"**
- Driver clicks when delivered to customer
- **Status Changes:** `OUT_FOR_DELIVERY` → `DELIVERED`
- Driver is marked as AVAILABLE for new orders
- Order is marked complete with timestamp

### 4. Order Completion
**Route:** `POST /api/driver-orders/orders/:orderId/complete`

- Order is marked as delivered
- `delivered_at` timestamp is set
- **Driver is released and marked as AVAILABLE**
- Driver can accept new orders
- Order appears in completed deliveries
- Driver can view earnings for completed delivery

## Automatic Features

### Auto-Assignment
When an order is placed:
```javascript
// Finds nearest driver using Haversine formula (spherical distance)
SELECT driver_id, 
  (6371 * acos(
    cos(radians(rest_lat)) * cos(radians(driver_lat)) *
    cos(radians(driver_lng) - radians(rest_lng)) +
    sin(radians(rest_lat)) * sin(radians(driver_lat))
  )) AS distance
FROM Drivers
WHERE is_available = TRUE
ORDER BY distance ASC
LIMIT 1
```

### Driver Availability Management
- **On Order Assignment:** Driver remains AVAILABLE (order status: confirmed)
- **On Start Delivery:** Driver marked as UNAVAILABLE (cannot receive new orders)
- **On Order Completion:** Driver marked as AVAILABLE (can receive new orders)

### Auto-Payment Completion
```javascript
setTimeout(async () => {
  // Completes payment after 2 seconds
  UPDATE Payments 
  SET status = 'completed', payment_date = NOW()
  WHERE payment_id = ?
}, 2000);
```

## User Interactions by Role

### Customer
1. Browse restaurants and menu items
2. Add items to cart
3. Select delivery address
4. Choose payment method
5. Place order
6. Track order status in real-time
7. **View assigned driver details** (name, phone, vehicle, email)
8. Track driver location on map

### Restaurant Owner
1. View incoming orders with status `CONFIRMED`
2. **View assigned driver information** for each order
3. Prepare the food items
4. Click **"Mark as Prepared"** when ready
5. View order progress (preparing, out for delivery, delivered)
6. **See driver details** (name, phone, vehicle type, plate number)
7. View analytics and earnings

### Driver
1. View assigned orders automatically
2. Wait for restaurant to prepare (status: confirmed)
3. Click **"Start Delivery"** when order is ready (status: preparing)
   - Driver becomes UNAVAILABLE for new orders
4. Navigate to customer location
5. Click **"Complete Delivery"** when delivered (status: out_for_delivery)
   - Driver becomes AVAILABLE for new orders
6. View earnings from completed deliveries

## Database Updates

### Key Tables Involved
- **Orders** - Main order tracking with status
- **Order_Items** - Individual items in order
- **Payments** - Payment status and method
- **Drivers** - Driver assignment and location
- **Restaurants** - Restaurant details and location
- **Users** - Customer and driver information

### Status Enforcement

Backend validates status transitions:
```javascript
// Driver cannot start delivery until restaurant marks as preparing
if (newStatus === 'out_for_delivery' && currentStatus !== 'preparing') {
  return error('Order must be prepared by restaurant first');
}
```

## Error Handling

- If no drivers available → Order stays in confirmed, no driver assigned
- If driver assignment fails → Order continues, can be manually assigned
- If restaurant preparation fails → Order remains in confirmed state
- If delivery fails → Status can be rolled back by admin

## Testing the Flow

1. **Login as Customer** (customer_pass123)
   - Place an order from any restaurant
   - Verify order shows status: CONFIRMED

2. **Login as Restaurant Owner** (owner_pass123)
   - Go to Orders tab
   - Find the order with status: CONFIRMED
   - Click "Mark as Prepared"
   - Verify status changes to PREPARING

3. **Login as Driver** (driver_pass123)
   - Go to My Deliveries tab
   - Find the auto-assigned order
   - Initially shows: "Waiting for restaurant"
   - After restaurant prepares, click "Start Delivery"
   - Status changes to OUT_FOR_DELIVERY
   - Click "Complete Delivery"
   - Order is marked DELIVERED

## API Endpoints Summary

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/api/orders` | POST | Customer | Place new order |
| `/api/restaurant-owner/orders` | GET | Owner | View restaurant orders |
| `/api/restaurant-owner/orders/:id/prepare` | PUT | Owner | Mark order as prepared |
| `/api/driver-orders/orders` | GET | Driver | View assigned orders |
| `/api/driver-orders/orders/:id/status` | PUT | Driver | Update delivery status |
| `/api/driver-orders/orders/:id/complete` | POST | Driver | Complete delivery |

## Notes

- All coordinates use latitude/longitude for map functionality
- Distance calculations use Haversine formula (Earth radius: 6371 km)
- Payments auto-complete for demo purposes (2-second delay)
- Passwords are plaintext for development (customer_pass123, driver_pass123, owner_pass123)
