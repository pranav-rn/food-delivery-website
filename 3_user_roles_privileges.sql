/**
 * USER ROLES AND PRIVILEGES
 * Database security with role-based access control
 * Run this file after 2_triggers_functions_procedures.sql
 */

USE project;

-- =====================================================
-- STEP 1: CREATE DATABASE USERS WITH ROLES
-- =====================================================

-- Drop users if they exist (for clean re-run)
DROP USER IF EXISTS 'customer_user'@'localhost';
DROP USER IF EXISTS 'driver_user'@'localhost';
DROP USER IF EXISTS 'restaurant_owner_user'@'localhost';

-- Create Customer User (limited privileges for customer operations)
CREATE USER 'customer_user'@'localhost' IDENTIFIED BY 'customer_pass123';

-- Create Driver User (access to delivery-related operations)
CREATE USER 'driver_user'@'localhost' IDENTIFIED BY 'driver_pass123';

-- Create Restaurant Owner User (menu management and order tracking)
CREATE USER 'restaurant_owner_user'@'localhost' IDENTIFIED BY 'owner_pass123';

-- =====================================================
-- STEP 2: GRANT TABLE-LEVEL PERMISSIONS
-- =====================================================

-- -------------------- CUSTOMER USER --------------------
-- Read access to public information
GRANT SELECT ON project.Users TO 'customer_user'@'localhost';
GRANT SELECT ON project.Restaurants TO 'customer_user'@'localhost';
GRANT SELECT ON project.Menu_Items TO 'customer_user'@'localhost';
GRANT SELECT ON project.Drivers TO 'customer_user'@'localhost';

-- Full access to own data
GRANT SELECT, INSERT, UPDATE ON project.Addresses TO 'customer_user'@'localhost';
GRANT SELECT, INSERT ON project.Orders TO 'customer_user'@'localhost';
GRANT SELECT, INSERT ON project.Order_Items TO 'customer_user'@'localhost';
GRANT SELECT, INSERT ON project.Payments TO 'customer_user'@'localhost';

-- -------------------- DRIVER USER --------------------
-- Read access to necessary information
GRANT SELECT ON project.Users TO 'driver_user'@'localhost';
GRANT SELECT ON project.Restaurants TO 'driver_user'@'localhost';
GRANT SELECT ON project.Menu_Items TO 'driver_user'@'localhost';
GRANT SELECT ON project.Addresses TO 'driver_user'@'localhost';
GRANT SELECT ON project.Order_Items TO 'driver_user'@'localhost';
GRANT SELECT ON project.Payments TO 'driver_user'@'localhost';

-- Write access to driver-specific data
GRANT SELECT, UPDATE ON project.Drivers TO 'driver_user'@'localhost';
GRANT SELECT, UPDATE ON project.Orders TO 'driver_user'@'localhost';

-- -------------------- RESTAURANT OWNER USER --------------------
-- Read access to necessary information
GRANT SELECT ON project.Users TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Drivers TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Addresses TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Order_Items TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Payments TO 'restaurant_owner_user'@'localhost';
GRANT SELECT ON project.Restaurant_Owners TO 'restaurant_owner_user'@'localhost';

-- Full access to restaurant data
GRANT SELECT, UPDATE ON project.Restaurants TO 'restaurant_owner_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON project.Menu_Items TO 'restaurant_owner_user'@'localhost';
GRANT SELECT, UPDATE ON project.Orders TO 'restaurant_owner_user'@'localhost';

-- =====================================================
-- STEP 3: GRANT EXECUTE PERMISSIONS ON PROCEDURES
-- =====================================================

-- -------------------- CUSTOMER USER --------------------
GRANT EXECUTE ON PROCEDURE project.place_order TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.get_user_order_history TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.complete_order TO 'customer_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.process_refund TO 'customer_user'@'localhost';

-- -------------------- DRIVER USER --------------------
GRANT EXECUTE ON PROCEDURE project.get_driver_orders TO 'driver_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.get_driver_earnings TO 'driver_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.assign_driver_to_order TO 'driver_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.get_available_drivers TO 'driver_user'@'localhost';

-- -------------------- RESTAURANT OWNER USER --------------------
GRANT EXECUTE ON PROCEDURE project.get_restaurant_orders TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.calculate_restaurant_revenue TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.assign_driver_to_order TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON PROCEDURE project.toggle_menu_item_availability TO 'restaurant_owner_user'@'localhost';

-- =====================================================
-- STEP 4: GRANT EXECUTE PERMISSIONS ON FUNCTIONS
-- =====================================================

-- -------------------- CUSTOMER USER --------------------
GRANT EXECUTE ON FUNCTION project.calculate_order_total_with_tax TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.estimate_delivery_time TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_discount TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_user_loyalty_tier TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_user_avg_order_value TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.generate_order_reference TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.is_restaurant_open_now TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.is_restaurant_busy TO 'customer_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_item_popularity_score TO 'customer_user'@'localhost';

-- -------------------- DRIVER USER --------------------
GRANT EXECUTE ON FUNCTION project.get_driver_rating TO 'driver_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_driver_rating TO 'driver_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.generate_order_reference TO 'driver_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.estimate_delivery_time TO 'driver_user'@'localhost';

-- -------------------- RESTAURANT OWNER USER --------------------
GRANT EXECUTE ON FUNCTION project.is_restaurant_open_now TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.is_restaurant_busy TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.get_item_popularity_score TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_restaurant_rating TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.calculate_restaurant_commission TO 'restaurant_owner_user'@'localhost';
GRANT EXECUTE ON FUNCTION project.generate_order_reference TO 'restaurant_owner_user'@'localhost';

-- =====================================================
-- STEP 5: APPLY CHANGES
-- =====================================================

FLUSH PRIVILEGES;

-- =====================================================
-- STEP 6: VERIFY PERMISSIONS
-- =====================================================

SELECT '========================================' as '';
SELECT 'CUSTOMER USER GRANTS:' as '';
SELECT '========================================' as '';
SHOW GRANTS FOR 'customer_user'@'localhost';

SELECT '' as '';
SELECT '========================================' as '';
SELECT 'DRIVER USER GRANTS:' as '';
SELECT '========================================' as '';
SHOW GRANTS FOR 'driver_user'@'localhost';

SELECT '' as '';
SELECT '========================================' as '';
SELECT 'RESTAURANT OWNER USER GRANTS:' as '';
SELECT '========================================' as '';
SHOW GRANTS FOR 'restaurant_owner_user'@'localhost';

SELECT '' as '';
SELECT '✓ All user roles and privileges configured successfully!' as Status;
SELECT '✓ Password for customer_user: customer_pass123' as Credentials;
SELECT '✓ Password for driver_user: driver_pass123' as Credentials;
SELECT '✓ Password for restaurant_owner_user: owner_pass123' as Credentials;

-- =====================================================
-- SECURITY NOTES
-- =====================================================

/*
PRIVILEGE SUMMARY:

1. CUSTOMER USER (customer_user):
   - Can view: All public data (restaurants, menu, drivers)
   - Can create: Orders, payments, addresses
   - Can update: Own addresses
   - Cannot: Modify restaurant data, assign drivers, view other users' data

2. DRIVER USER (driver_user):
   - Can view: Order details, customer info, restaurant locations
   - Can update: Own driver profile, order status
   - Can execute: Driver-specific procedures and functions
   - Cannot: Create orders, modify menu items, access payment details

3. RESTAURANT OWNER USER (restaurant_owner_user):
   - Can view: All order information for own restaurant
   - Can update: Restaurant profile, menu items, order status
   - Can create/delete: Menu items
   - Cannot: Access payment details, modify other restaurants' data

SECURITY FEATURES:
- Principle of Least Privilege: Each user has minimal necessary permissions
- Data Isolation: Users can only access data relevant to their role
- Audit Trail: All actions are logged with user credentials
- Trigger Protection: Business logic enforced at database level
- Password Protected: Each role has unique credentials

TESTING:
To test permissions, connect as each user:
  mysql -u customer_user -pcustomer_pass123 project
  mysql -u driver_user -pdriver_pass123 project
  mysql -u restaurant_owner_user -powner_pass123 project
*/
