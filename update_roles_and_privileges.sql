-- Phase 1: Add user roles and update schema
-- ==========================================

-- Add user_type to Users table
ALTER TABLE Users ADD COLUMN user_type ENUM('customer', 'driver', 'restaurant_owner') DEFAULT 'customer';

-- Create Restaurant_Owners table
CREATE TABLE IF NOT EXISTS Restaurant_Owners (
    owner_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    restaurant_id INT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id) ON DELETE CASCADE
);

-- Update Drivers table to link with Users
ALTER TABLE Drivers ADD COLUMN user_id INT UNIQUE DEFAULT NULL;
ALTER TABLE Drivers ADD FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL;

-- Phase 2: Create database users with different privileges
-- =========================================================

-- Customer user (can read restaurants/menu, manage own orders)
CREATE USER IF NOT EXISTS 'customer_user'@'localhost' IDENTIFIED BY 'customer_pass123';
GRANT SELECT ON project.Restaurants TO 'customer_user'@'localhost';
GRANT SELECT ON project.Menu_Items TO 'customer_user'@'localhost';
GRANT SELECT, INSERT, UPDATE ON project.Orders TO 'customer_user'@'localhost';
GRANT SELECT, INSERT ON project.Order_Items TO 'customer_user'@'localhost';
GRANT SELECT, INSERT, UPDATE ON project.Payments TO 'customer_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON project.Addresses TO 'customer_user'@'localhost';
GRANT SELECT, UPDATE ON project.Users TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.place_order TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.get_user_order_history TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.complete_order TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_discount TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_user_loyalty_tier TO 'customer_user'@'localhost';

-- Driver user (can read orders, update order status)
CREATE USER IF NOT EXISTS 'driver_user'@'localhost' IDENTIFIED BY 'driver_pass123';
GRANT SELECT ON project.Orders TO 'driver_user'@'localhost';
GRANT UPDATE(order_status) ON project.Orders TO 'driver_user'@'localhost';
GRANT SELECT ON project.Restaurants TO 'driver_user'@'localhost';
GRANT SELECT ON project.Addresses TO 'driver_user'@'localhost';
GRANT SELECT ON project.Users TO 'driver_user'@'localhost';
GRANT SELECT, UPDATE ON project.Drivers TO 'driver_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.get_available_drivers TO 'driver_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_driver_rating TO 'driver_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_driver_earnings TO 'driver_user'@'localhost';

-- Restaurant owner user (can manage own restaurant and menu items)
CREATE USER IF NOT EXISTS 'restaurant_owner_user'@'localhost' IDENTIFIED BY 'owner_pass123';
GRANT SELECT ON project.Restaurants TO 'restaurant_owner_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON project.Menu_Items TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Orders TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Order_Items TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Restaurant_Owners TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.calculate_restaurant_revenue TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.toggle_menu_item_availability TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.is_restaurant_busy TO 'restaurant_owner_user'@'localhost';

FLUSH PRIVILEGES;
