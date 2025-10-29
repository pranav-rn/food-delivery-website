/**
 * Database Connection Configuration with Role-Based Access
 * Creates different connection pools for different user types (customer, driver, restaurant_owner)
 * Implements database-level privilege separation for security
 */

const mysql = require('mysql2');
require('dotenv').config();

// Admin connection pool (for general operations)
const adminPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Customer connection pool (limited privileges)
const customerPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'customer_user',
  password: 'customer_pass123',
  database: process.env.DB_NAME || 'project',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Driver connection pool (limited privileges)
const driverPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'driver_user',
  password: 'driver_pass123',
  database: process.env.DB_NAME || 'project',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Restaurant owner connection pool (limited privileges)
const restaurantOwnerPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: 'restaurant_owner_user',
  password: 'owner_pass123',
  database: process.env.DB_NAME || 'project',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Get promise-based pools
const adminPromisePool = adminPool.promise();
const customerPromisePool = customerPool.promise();
const driverPromisePool = driverPool.promise();
const restaurantOwnerPromisePool = restaurantOwnerPool.promise();

// Test admin connection
adminPool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Database connected successfully!');
  connection.release();
});

/**
 * Get appropriate connection pool based on user type
 * @param {string} userType - Type of user (customer, driver, restaurant_owner)
 * @returns {Promise} - Promise-based connection pool
 */
function getConnectionByUserType(userType) {
  switch (userType) {
    case 'customer':
      return customerPromisePool;
    case 'driver':
      return driverPromisePool;
    case 'restaurant_owner':
      return restaurantOwnerPromisePool;
    default:
      return adminPromisePool;
  }
}

module.exports = {
  admin: adminPromisePool,
  customer: customerPromisePool,
  driver: driverPromisePool,
  restaurantOwner: restaurantOwnerPromisePool,
  getConnectionByUserType
};
