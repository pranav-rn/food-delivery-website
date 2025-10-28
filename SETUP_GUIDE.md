# Quick Setup Guide

## Step-by-Step Instructions

### 1. Database Setup (5 minutes)

Open your MySQL command line or MySQL Workbench and run:

```sql
-- Import the schema
SOURCE project.sql;

-- Import triggers, functions, and procedures
SOURCE Triggers_functions_procedures.sql;
```

Or use command line:
```bash
mysql -u root -p < project.sql
mysql -u root -p project < Triggers_functions_procedures.sql
```

### 2. Backend Setup (5 minutes)

Open PowerShell and navigate to the backend folder:

```powershell
cd backend

# Install dependencies
npm install

# Create .env file from example
Copy-Item .env.example .env

# Edit .env with your database credentials
notepad .env
```

Update the `.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=project
DB_PORT=3306
JWT_SECRET=my_secret_key_12345
PORT=5000
```

Start the backend server:
```powershell
npm start
```

You should see: "Server is running on port 5000" and "Database connected successfully!"

### 3. Frontend Setup (5 minutes)

Open a NEW PowerShell window and navigate to the frontend folder:

```powershell
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The app will automatically open in your browser at `http://localhost:3000`

## Testing the Application

### Creating Your First Account

1. Click "Sign Up" in the navigation bar
2. Fill in your details:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: 1234567890
   - Password: password123
3. Click "Register"

### Placing Your First Order

1. Click "Restaurants" in the navigation
2. Click on any restaurant (e.g., "Spicy Bites")
3. Add items to your cart by clicking "Add to Cart"
4. Click the cart icon (🛒) in the navigation
5. Click "Proceed to Checkout"
6. Add a delivery address
7. Select a payment method
8. Click "Place Order"

### Viewing Your Orders

1. Click "My Orders" in the navigation
2. Click on any order to view details
3. Rate the order if it's delivered

## Common Issues & Solutions

### Backend won't start
- **Error: "Cannot connect to database"**
  - Check if MySQL is running
  - Verify credentials in `.env` file
  - Make sure database "project" exists

- **Error: "Port 5000 already in use"**
  - Change PORT in `.env` to 5001
  - Update frontend proxy in `package.json` if needed

### Frontend won't start
- **Error: "npm ERR! missing script: start"**
  - Make sure you're in the frontend folder
  - Run `npm install` first

- **Error: "proxy error"**
  - Make sure backend is running on port 5000
  - Check the proxy setting in frontend/package.json

### Can't login
- **"Invalid credentials"**
  - Make sure you registered first
  - Check email and password are correct

### Orders not showing
- **Empty order list**
  - You need to place an order first
  - Make sure you're logged in

## Useful Commands

### Backend
```powershell
cd backend
npm start          # Start server
npm run dev        # Start with auto-reload (if nodemon installed)
```

### Frontend
```powershell
cd frontend
npm start          # Start dev server
npm run build      # Build for production
```

### Database
```sql
-- View all users
USE project;
SELECT * FROM Users;

-- View all restaurants
SELECT * FROM Restaurants;

-- View all orders
SELECT * FROM Orders;

-- Check functions work
SELECT calculate_discount(1000, 1) as discount;
SELECT get_user_loyalty_tier(1) as tier;
```

## Next Steps

1. **Explore the Features**:
   - Browse different restaurants
   - Add multiple items to cart
   - Manage your addresses in profile
   - View order history

2. **Test Database Functions**:
   - Place multiple orders to increase loyalty tier
   - Check how discounts are calculated
   - See popularity scores on menu items

3. **Customize**:
   - Add your own restaurants to the database
   - Create menu items with images
   - Test different payment methods

## Support

If you encounter any issues:
1. Check the console for error messages
2. Verify all services are running (MySQL, Backend, Frontend)
3. Review the main README.md for detailed troubleshooting

Happy coding! 🚀
