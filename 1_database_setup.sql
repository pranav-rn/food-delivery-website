/**
 * DATABASE SETUP - DDL AND DML
 * Complete database initialization with schema and sample data
 * Run this file first to set up the database structure and initial data
 */

-- =====================================================
-- STEP 1: CREATE DATABASE
-- =====================================================

DROP DATABASE IF EXISTS project;
CREATE DATABASE project;
USE project;

-- =====================================================
-- STEP 2: CREATE TABLES (DDL)
-- =====================================================

-- Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_num BIGINT,
    user_type ENUM('customer', 'driver', 'restaurant_owner') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Addresses Table
CREATE TABLE Addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Restaurants Table
CREATE TABLE Restaurants (
    restaurant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    phone_num VARCHAR(20),
    rating DECIMAL(2,1) DEFAULT 0.0,
    is_open BOOLEAN DEFAULT TRUE,
    cuisine VARCHAR(100)
);

-- Restaurant_Owners Table (links users to restaurants they own)
CREATE TABLE Restaurant_Owners (
    owner_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    restaurant_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id)
);

-- Drivers Table
CREATE TABLE Drivers (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_num VARCHAR(20),
    num_plate VARCHAR(20) UNIQUE,
    current_location VARCHAR(255),
    current_latitude DECIMAL(10, 8) DEFAULT NULL,
    current_longitude DECIMAL(11, 8) DEFAULT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Orders Table
CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    restaurant_id INT NOT NULL,
    driver_id INT,
    address_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    order_status VARCHAR(50) DEFAULT 'Pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rating INT DEFAULT NULL CHECK (rating >= 1 AND rating <= 5),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id),
    FOREIGN KEY (driver_id) REFERENCES Drivers(driver_id),
    FOREIGN KEY (address_id) REFERENCES Addresses(address_id)
);

-- Payments Table
CREATE TABLE Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
);

-- Menu Items Table
CREATE TABLE Menu_Items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image LONGBLOB,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (restaurant_id) REFERENCES Restaurants(restaurant_id)
);

-- Order Items Table
CREATE TABLE Order_Items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    price_per_item DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (item_id) REFERENCES Menu_Items(item_id)
);

-- =====================================================
-- STEP 3: INSERT SAMPLE DATA (DML)
-- =====================================================

-- Insert Sample Users
-- Passwords stored as plaintext for development/testing
-- Customer password: customer_pass123
-- Driver password: driver_pass123
-- Restaurant owner password: owner_pass123
INSERT INTO Users (first_name, last_name, email, password_hash, phone_num, user_type) VALUES
-- Customer users (IDs 1-5)
('John', 'Doe', 'john.doe@example.com', 'customer_pass123', 9876543210, 'customer'),
('Jane', 'Smith', 'jane.smith@example.com', 'customer_pass123', 9876543211, 'customer'),
('Alice', 'Johnson', 'alice.johnson@example.com', 'customer_pass123', 9876543212, 'customer'),
('Bob', 'Williams', 'bob.williams@example.com', 'customer_pass123', 9876543213, 'customer'),
('Charlie', 'Brown', 'charlie.brown@example.com', 'customer_pass123', 9876543214, 'customer'),
-- Driver users (IDs 6-10)
('Raj', 'Kumar', 'raj.kumar@driver.com', 'driver_pass123', 9123456789, 'driver'),
('Priya', 'Sharma', 'priya.sharma@driver.com', 'driver_pass123', 9123456790, 'driver'),
('Amit', 'Patel', 'amit.patel@driver.com', 'driver_pass123', 9123456791, 'driver'),
('Sunita', 'Gupta', 'sunita.gupta@driver.com', 'driver_pass123', 9123456792, 'driver'),
('Vikram', 'Singh', 'vikram.singh@driver.com', 'driver_pass123', 9123456793, 'driver'),
-- Restaurant owner users (IDs 11-17)
('Mario', 'Rossi', 'mario@pizzaparadise.com', 'owner_pass123', 9111111111, 'restaurant_owner'),
('David', 'Chen', 'david@burgerhub.com', 'owner_pass123', 9222222222, 'restaurant_owner'),
('Yuki', 'Tanaka', 'yuki@sushiworld.com', 'owner_pass123', 9333333333, 'restaurant_owner'),
('Priya', 'Kapoor', 'priya@spicekitchen.com', 'owner_pass123', 9444444444, 'restaurant_owner'),
('Carlos', 'Rodriguez', 'carlos@tacofiesta.com', 'owner_pass123', 9555555555, 'restaurant_owner'),
('Giovanni', 'Bianchi', 'giovanni@pastahouse.com', 'owner_pass123', 9666666666, 'restaurant_owner'),
('Ahmed', 'Khan', 'ahmed@bbqnation.com', 'owner_pass123', 9777777777, 'restaurant_owner');

-- Insert Sample Addresses
INSERT INTO Addresses (user_id, address, city, state, postal_code, latitude, longitude, is_default) VALUES
(1, '123 Main St, Apt 4B', 'Mumbai', 'Maharashtra', '400001', 19.0760, 72.8777, TRUE),
(1, '456 Park Ave', 'Mumbai', 'Maharashtra', '400002', 19.0550, 72.8320, FALSE),
(2, '789 Beach Rd', 'Goa', 'Goa', '403001', 15.2993, 74.1240, TRUE),
(3, '321 Hill View', 'Bangalore', 'Karnataka', '560001', 12.9716, 77.5946, TRUE),
(4, '654 Lake Side', 'Delhi', 'Delhi', '110001', 28.7041, 77.1025, TRUE),
(5, '987 Garden St', 'Pune', 'Maharashtra', '411001', 18.5204, 73.8567, TRUE);

-- Insert Sample Restaurants
INSERT INTO Restaurants (name, description, address, phone_num, rating, is_open, cuisine, latitude, longitude) VALUES
('Pizza Paradise', 'Best pizzas in town with authentic Italian recipes', '100 Food St, Mumbai', '02212345678', 4.5, TRUE, 'Italian', 19.0760, 72.8777),
('Burger Hub', 'Gourmet burgers made with premium ingredients', '200 Taste Ave, Mumbai', '02212345679', 4.2, TRUE, 'American', 19.0596, 72.8295),
('Sushi World', 'Fresh sushi and Japanese delicacies', '300 Ocean Rd, Mumbai', '02212345680', 4.8, TRUE, 'Japanese', 18.9220, 72.8347),
('Spice Kitchen', 'Authentic Indian curries and tandoor', '400 Masala St, Mumbai', '02212345681', 4.3, TRUE, 'Indian', 19.1136, 72.8697),
('Taco Fiesta', 'Mexican street food and tacos', '500 Salsa Blvd, Mumbai', '02212345682', 4.0, TRUE, 'Mexican', 19.0330, 73.0297),
('Pasta House', 'Handmade pasta and Italian wines', '600 Noodle Lane, Mumbai', '02212345683', 4.6, FALSE, 'Italian', 19.0176, 72.8562),
('BBQ Nation', 'All-you-can-eat BBQ buffet', '700 Grill St, Mumbai', '02212345684', 4.4, TRUE, 'BBQ', 19.1197, 72.9081);

-- Link Restaurant Owners to Restaurants
INSERT INTO Restaurant_Owners (user_id, restaurant_id) VALUES
(11, 1), -- Mario owns Pizza Paradise
(12, 2), -- David owns Burger Hub
(13, 3), -- Yuki owns Sushi World
(14, 4), -- Priya owns Spice Kitchen
(15, 5), -- Carlos owns Taco Fiesta
(16, 6), -- Giovanni owns Pasta House
(17, 7); -- Ahmed owns BBQ Nation

-- Insert Sample Drivers
INSERT INTO Drivers (user_id, first_name, last_name, phone_num, num_plate, current_location, current_latitude, current_longitude, is_available) VALUES
(6, 'Raj', 'Kumar', '9123456789', 'MH01AB1234', 'Andheri, Mumbai', 19.1136, 72.8697, TRUE),
(7, 'Priya', 'Sharma', '9123456790', 'MH02CD5678', 'Bandra, Mumbai', 19.0596, 72.8295, TRUE),
(8, 'Amit', 'Patel', '9123456791', 'MH03EF9012', 'Colaba, Mumbai', 18.9220, 72.8347, FALSE),
(9, 'Sunita', 'Gupta', '9123456792', 'MH04GH3456', 'Dadar, Mumbai', 19.0176, 72.8479, TRUE),
(10, 'Vikram', 'Singh', '9123456793', 'MH05IJ7890', 'Powai, Mumbai', 19.1197, 72.9081, TRUE);

-- Insert Sample Menu Items
INSERT INTO Menu_Items (restaurant_id, name, description, price, is_available) VALUES
-- Pizza Paradise
(1, 'Margherita Pizza', 'Classic tomato and mozzarella', 299.00, TRUE),
(1, 'Pepperoni Pizza', 'Spicy pepperoni with extra cheese', 399.00, TRUE),
(1, 'Veggie Supreme', 'Loaded with fresh vegetables', 349.00, TRUE),
(1, 'Garlic Bread', 'Crispy bread with garlic butter', 99.00, TRUE),
-- Burger Hub
(2, 'Classic Burger', 'Beef patty with lettuce and tomato', 249.00, TRUE),
(2, 'Chicken Burger', 'Grilled chicken with special sauce', 229.00, TRUE),
(2, 'Veggie Burger', 'Plant-based patty with avocado', 199.00, TRUE),
(2, 'French Fries', 'Crispy golden fries', 89.00, TRUE),
-- Sushi World
(3, 'California Roll', 'Crab, avocado, and cucumber', 450.00, TRUE),
(3, 'Salmon Nigiri', 'Fresh salmon on rice', 550.00, TRUE),
(3, 'Vegetable Tempura', 'Crispy fried vegetables', 350.00, TRUE),
(3, 'Miso Soup', 'Traditional Japanese soup', 150.00, TRUE),
-- Spice Kitchen
(4, 'Butter Chicken', 'Creamy tomato curry with chicken', 399.00, TRUE),
(4, 'Paneer Tikka Masala', 'Cottage cheese in spicy gravy', 349.00, TRUE),
(4, 'Garlic Naan', 'Soft bread with garlic', 49.00, TRUE),
(4, 'Biryani', 'Aromatic rice with meat/vegetables', 299.00, TRUE),
-- Taco Fiesta
(5, 'Chicken Tacos', 'Three tacos with salsa', 279.00, TRUE),
(5, 'Beef Burrito', 'Large burrito with beans and rice', 329.00, TRUE),
(5, 'Nachos Supreme', 'Loaded nachos with cheese', 249.00, TRUE),
(5, 'Guacamole', 'Fresh avocado dip', 99.00, TRUE);

-- Insert Sample Orders
INSERT INTO Orders (user_id, restaurant_id, driver_id, address_id, total_amount, order_status, rating) VALUES
(1, 1, 1, 1, 797.00, 'Delivered', 5),
(1, 2, 2, 1, 567.00, 'Delivered', 4),
(2, 3, 3, 3, 1450.00, 'Delivered', 5),
(3, 4, 1, 4, 797.00, 'Out for Delivery', NULL),
(4, 5, 2, 5, 607.00, 'Preparing', NULL),
(5, 1, NULL, 6, 448.00, 'Pending', NULL),
(1, 3, 4, 1, 1000.00, 'Confirmed', NULL);

-- Insert Sample Order Items
INSERT INTO Order_Items (order_id, item_id, quantity, price_per_item) VALUES
-- Order 1: Pizza Paradise
(1, 1, 2, 299.00),
(1, 4, 2, 99.00),
-- Order 2: Burger Hub
(2, 5, 2, 249.00),
(2, 8, 1, 89.00),
-- Order 3: Sushi World
(3, 9, 2, 450.00),
(3, 10, 1, 550.00),
-- Order 4: Spice Kitchen
(4, 13, 1, 399.00),
(4, 15, 2, 49.00),
(4, 16, 1, 299.00),
-- Order 5: Taco Fiesta
(5, 17, 1, 279.00),
(5, 19, 1, 249.00),
(5, 20, 1, 99.00),
-- Order 6: Pizza Paradise
(6, 2, 1, 399.00),
(6, 4, 1, 99.00),
-- Order 7: Sushi World
(7, 9, 1, 450.00),
(7, 10, 1, 550.00);

-- Insert Sample Payments
INSERT INTO Payments (order_id, payment_method, amount, status) VALUES
(1, 'UPI', 797.00, 'Completed'),
(2, 'Card', 567.00, 'Completed'),
(3, 'Cash', 1450.00, 'Completed'),
(4, 'UPI', 797.00, 'Completed'),
(5, 'Card', 607.00, 'Pending'),
(6, 'UPI', 448.00, 'Pending'),
(7, 'Card', 1000.00, 'Completed');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table counts
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM Users
UNION ALL
SELECT 'Addresses', COUNT(*) FROM Addresses
UNION ALL
SELECT 'Restaurants', COUNT(*) FROM Restaurants
UNION ALL
SELECT 'Drivers', COUNT(*) FROM Drivers
UNION ALL
SELECT 'Menu_Items', COUNT(*) FROM Menu_Items
UNION ALL
SELECT 'Orders', COUNT(*) FROM Orders
UNION ALL
SELECT 'Order_Items', COUNT(*) FROM Order_Items
UNION ALL
SELECT 'Payments', COUNT(*) FROM Payments;

-- Display sample data
SELECT 'Sample Users:' as Info;
SELECT user_id, first_name, last_name, email FROM Users LIMIT 3;

SELECT 'Sample Restaurants:' as Info;
SELECT restaurant_id, name, cuisine, rating FROM Restaurants LIMIT 3;

SELECT 'Sample Orders:' as Info;
SELECT order_id, user_id, restaurant_id, total_amount, order_status FROM Orders LIMIT 3;

SELECT '✓ Database setup completed successfully!' as Status;
