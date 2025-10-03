-- Create Database
CREATE DATABASE project;

-- Switch to the database
USE project;

-- Users Table
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_num BIGINT,
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
    is_default BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Restaurants Table
CREATE TABLE Restaurants (
    restaurant_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    address VARCHAR(255) NOT NULL,
    phone_num VARCHAR(20),
    rating DECIMAL(2,1) DEFAULT 0.0,
    is_open BOOLEAN DEFAULT TRUE,
    cuisine VARCHAR(100)
);

-- Drivers Table
CREATE TABLE Drivers (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_num VARCHAR(20),
    num_plate VARCHAR(20) UNIQUE,
    current_location VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE
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


-- Insert into Users
INSERT INTO Users (first_name, last_name, email, password_hash, phone_num, is_active) VALUES
('Alice', 'Johnson', 'alice@example.com', 'hash123', 9876543210, TRUE),
('Bob', 'Smith', 'bob@example.com', 'hash456', 9876543211, TRUE),
('Charlie', 'Brown', 'charlie@example.com', 'hash789', 9876543212, FALSE);

-- Insert into Addresses
INSERT INTO Addresses (user_id, address, city, state, postal_code, is_default) VALUES
(1, '123 Main St', 'Bangalore', 'Karnataka', '560001', TRUE),
(2, '456 Park Ave', 'Mysore', 'Karnataka', '570002', FALSE),
(3, '789 Hill Rd', 'Mangalore', 'Karnataka', '575003', TRUE);

-- Insert into Restaurants
INSERT INTO Restaurants (name, description, address, phone_num, rating, is_open, cuisine) VALUES
('Spicy Bites', 'Indian street food restaurant', '12 MG Road, Bangalore', '9871111111', 4.5, TRUE, 'Indian'),
('Pasta Palace', 'Italian pasta and pizza', '45 Brigade Rd, Bangalore', '9872222222', 4.2, TRUE, 'Italian'),
('Sushi World', 'Authentic Japanese sushi', '78 Indiranagar, Bangalore', '9873333333', 4.8, FALSE, 'Japanese');

-- Insert into Drivers
INSERT INTO Drivers (first_name, last_name, phone_num, num_plate, current_location, is_available) VALUES
('David', 'Kumar', '9998887771', 'KA01AB1234', 'MG Road, Bangalore', TRUE),
('Esha', 'Nair', '9998887772', 'KA02CD5678', 'Koramangala, Bangalore', FALSE),
('Farhan', 'Ali', '9998887773', 'KA03EF9012', 'Indiranagar, Bangalore', TRUE);

-- Insert into Orders
INSERT INTO Orders (user_id, restaurant_id, driver_id, address_id, total_amount, order_status) VALUES
(1, 1, 1, 1, 450.00, 'Delivered'),
(2, 2, 2, 2, 800.50, 'On the Way'),
(3, 3, 3, 3, 1200.75, 'Pending');

-- Insert into Payments
INSERT INTO Payments (order_id, payment_method, amount, status) VALUES
(1, 'UPI', 450.00, 'Completed'),
(2, 'Credit Card', 800.50, 'Pending'),
(3, 'Cash', 1200.75, 'Completed');

-- Insert into Menu_Items
INSERT INTO Menu_Items (restaurant_id, name, description, price, image, is_available) VALUES
(1, 'Paneer Tikka', 'Grilled paneer with spices', 250.00, LOAD_FILE('/path/to/url1.jpg'), TRUE),
(2, 'Spaghetti Carbonara', 'Classic Italian pasta', 350.00, LOAD_FILE('/path/to/url2.jpg'), TRUE),
(3, 'Salmon Sushi', 'Fresh salmon with rice', 400.00, LOAD_FILE('/path/to/url3.jpg'), FALSE);

-- Insert into Order_Items
INSERT INTO Order_Items (order_id, item_id, quantity, price_per_item) VALUES
(1, 1, 2, 250.00),
(2, 2, 1, 350.00),
(3, 3, 3, 400.00);






