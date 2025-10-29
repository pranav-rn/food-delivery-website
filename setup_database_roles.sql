-- Quick Database Setup Script
-- Run this in MySQL workbench or command line

-- 1. First, make sure you're using the correct database
USE food_delivery_db;

-- 2. Apply the role-based updates
SOURCE c:/Users/Pranav/Downloads/Sem_5/DBMS/food-delivery-website/update_roles_and_privileges.sql;

-- 3. Verify the changes
-- Check if user_type column was added
DESCRIBE Users;

-- Check if Restaurant_Owners table exists
DESCRIBE Restaurant_Owners;

-- Check if MySQL users were created
SELECT User, Host FROM mysql.user WHERE User LIKE '%user';

-- 4. Test permissions (run these after creating the users)
-- As customer_user:
-- SHOW GRANTS FOR 'customer_user'@'localhost';

-- As driver_user:
-- SHOW GRANTS FOR 'driver_user'@'localhost';

-- As restaurant_owner_user:
-- SHOW GRANTS FOR 'restaurant_owner_user'@'localhost';

-- 5. Insert some test data for roles
-- Create a test restaurant owner
INSERT INTO Users (first_name, last_name, email, password_hash, phone_num, user_type) 
VALUES ('John', 'Owner', 'owner@test.com', '$2a$10$dummyhash', '1234567890', 'restaurant_owner');

SET @owner_user_id = LAST_INSERT_ID();

-- Link to a restaurant (assuming restaurant_id 1 exists)
INSERT INTO Restaurant_Owners (user_id, restaurant_id) 
VALUES (@owner_user_id, 1);

-- Create a test driver
INSERT INTO Users (first_name, last_name, email, password_hash, phone_num, user_type) 
VALUES ('Jane', 'Driver', 'driver@test.com', '$2a$10$dummyhash', '0987654321', 'driver');

SET @driver_user_id = LAST_INSERT_ID();

-- Create driver entry
INSERT INTO Drivers (user_id, vehicle_type, license_number, is_available) 
VALUES (@driver_user_id, 'Motorcycle', 'DL123456', TRUE);

-- Update an existing customer to have user_type
UPDATE Users SET user_type = 'customer' WHERE user_type IS NULL LIMIT 10;

-- 6. Verify test data
SELECT u.user_id, u.email, u.user_type, ro.restaurant_id 
FROM Users u 
LEFT JOIN Restaurant_Owners ro ON u.user_id = ro.user_id 
WHERE u.user_type = 'restaurant_owner';

SELECT u.user_id, u.email, u.user_type, d.driver_id 
FROM Users u 
LEFT JOIN Drivers d ON u.user_id = d.user_id 
WHERE u.user_type = 'driver';

SELECT user_id, email, user_type 
FROM Users 
WHERE user_type = 'customer' 
LIMIT 5;
