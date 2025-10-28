# Food Delivery Website

A full-stack food delivery application built with React, Node.js, Express, and MySQL. This application features user authentication, restaurant browsing, cart management, order tracking, and utilizes stored procedures and functions from your database schema.

## Features

### Customer Features
- **User Authentication**: Register and login with JWT-based authentication
- **Browse Restaurants**: Search and filter restaurants by cuisine
- **View Menus**: Browse restaurant menus with item availability and popularity
- **Shopping Cart**: Add items to cart, manage quantities
- **Checkout**: Select delivery address and payment method
- **Order Tracking**: View order history and track current orders
- **User Profile**: Manage personal information and delivery addresses
- **Loyalty Program**: Tier-based rewards (Bronze, Silver, Gold, Platinum)
- **Ratings**: Rate orders after delivery

### Admin/Driver Features
- Driver availability management
- Order assignment to drivers
- Real-time order status updates

### Database Features
- All stored procedures from your SQL files implemented
- Functions for discounts, delivery estimates, ratings
- Triggers for validation and automatic updates
- Complex queries for analytics and reporting

## Tech Stack

### Frontend
- React 18
- React Router for navigation
- Axios for API calls
- Context API for state management
- Modern CSS with responsive design

### Backend
- Node.js & Express
- MySQL2 for database connection
- JWT for authentication
- Bcrypt for password hashing
- Express Validator for input validation

## Project Structure

```
food-delivery-website/
├── backend/
│   ├── config/
│   │   └── db.js              # Database configuration
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── restaurants.js     # Restaurant routes
│   │   ├── orders.js          # Order routes
│   │   ├── users.js           # User routes
│   │   ├── drivers.js         # Driver routes
│   │   └── payments.js        # Payment routes
│   ├── .env.example           # Environment variables template
│   ├── package.json
│   └── server.js              # Main server file
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.js
│   │   │   └── Navbar.css
│   │   ├── contexts/
│   │   │   ├── AuthContext.js
│   │   │   └── CartContext.js
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Restaurants.js
│   │   │   ├── RestaurantDetails.js
│   │   │   ├── Cart.js
│   │   │   ├── Checkout.js
│   │   │   ├── Orders.js
│   │   │   ├── OrderDetails.js
│   │   │   ├── Profile.js
│   │   │   └── (CSS files)
│   │   ├── services/
│   │   │   └── api.js         # API service layer
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
├── project.sql                 # Database schema
├── Triggers_functions_procedures.sql
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8 or higher)
- npm or yarn

### Database Setup

1. **Create the database and tables**:
   ```bash
   mysql -u root -p < project.sql
   ```

2. **Add triggers, functions, and procedures**:
   ```bash
   mysql -u root -p project < Triggers_functions_procedures.sql
   ```

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your database credentials**:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=project
   DB_PORT=3306
   JWT_SECRET=your_secret_key_here
   PORT=5000
   ```

5. **Start the backend server**:
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

   The app will open at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Restaurants
- `GET /api/restaurants` - Get all restaurants (with filters)
- `GET /api/restaurants/:id` - Get restaurant details
- `GET /api/restaurants/:id/menu` - Get restaurant menu
- `GET /api/restaurants/cuisines/list` - Get all cuisines

### Orders
- `POST /api/orders` - Place new order (uses stored procedure)
- `GET /api/orders/history` - Get user's order history
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/complete` - Complete order with rating
- `POST /api/orders/:id/refund` - Request refund

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/addresses` - Get user addresses
- `POST /api/users/addresses` - Add new address
- `PUT /api/users/addresses/:id` - Update address
- `DELETE /api/users/addresses/:id` - Delete address

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments/methods/list` - Get payment methods

### Drivers
- `GET /api/drivers/available` - Get available drivers
- `GET /api/drivers/:id` - Get driver details
- `PUT /api/drivers/:id/availability` - Update driver availability

## Database Functions & Procedures Used

### Stored Procedures
- `place_order()` - Places a new order with validation
- `assign_driver_to_order()` - Assigns driver to order
- `complete_order()` - Completes order and updates driver status
- `get_user_order_history()` - Retrieves user's order history
- `get_available_drivers()` - Gets list of available drivers
- `calculate_restaurant_revenue()` - Calculates restaurant revenue
- `process_refund()` - Processes order refund

### Functions
- `calculate_discount()` - Calculates user discount based on loyalty
- `calculate_delivery_fee()` - Calculates delivery fee
- `get_user_loyalty_tier()` - Gets user's loyalty tier
- `get_driver_rating()` - Gets driver's average rating
- `is_restaurant_busy()` - Checks if restaurant is busy
- `estimate_delivery_time()` - Estimates delivery time
- `get_item_popularity_score()` - Gets item popularity score
- `is_restaurant_open_now()` - Checks if restaurant is currently open
- `generate_order_reference()` - Generates order reference number

### Triggers
- `validate_order_total` - Validates order amount is not negative
- `update_restaurant_rating` - Updates restaurant rating after order
- `check_restaurant_open` - Ensures restaurant is open before order
- `validate_payment_amount` - Validates payment matches order total
- `check_item_availability` - Checks menu item availability
- `check_user_active` - Ensures user account is active
- `check_driver_available` - Verifies driver availability

## Usage Guide

### For Customers

1. **Register/Login**: Create an account or login
2. **Browse Restaurants**: View available restaurants and their menus
3. **Add to Cart**: Select items and add them to your cart
4. **Checkout**: Choose delivery address and payment method
5. **Track Order**: Monitor your order status in real-time
6. **Rate Order**: Provide feedback after delivery

### Testing the Application

You can use the sample data inserted in `project.sql`:

**Test User Login**:
- Email: `alice@example.com`
- Password: Create a new account or update the password hash

**Sample Restaurants**:
- Spicy Bites (Indian)
- Pasta Palace (Italian)
- Sushi World (Japanese)

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Protected API routes
- Input validation
- SQL injection prevention with parameterized queries

## Future Enhancements

- Real-time order tracking with WebSockets
- Payment gateway integration
- Google Maps integration for delivery tracking
- Push notifications
- Admin dashboard
- Restaurant owner dashboard
- Advanced analytics and reporting
- Review and rating system expansion

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running
- Check database credentials in `.env`
- Ensure database and tables are created

### Port Already in Use
- Change the PORT in backend `.env` file
- Kill the process using the port

### CORS Issues
- Ensure backend CORS is properly configured
- Check frontend proxy settings in `package.json`

## Contributing

This is a course project for DBMS. Feel free to extend and improve the functionality.

## License

This project is for educational purposes.

## Contact

For questions or issues, please contact the project maintainer.