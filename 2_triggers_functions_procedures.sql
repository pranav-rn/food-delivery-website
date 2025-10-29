/**
 * TRIGGERS, FUNCTIONS, AND PROCEDURES
 * Complete collection of database logic and business rules
 * Run this file after 1_database_setup.sql
 */

USE project;

-- =====================================================
-- PART 1: TRIGGERS
-- =====================================================

-- Validate order total is non-negative
DELIMITER //
CREATE TRIGGER validate_order_total
BEFORE INSERT ON Orders
FOR EACH ROW
BEGIN
    IF NEW.total_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order total amount cannot be negative';
    END IF;
END//
DELIMITER ;

-- Update restaurant rating when order is rated
DELIMITER //
CREATE TRIGGER update_restaurant_rating
AFTER UPDATE ON Orders
FOR EACH ROW
BEGIN
    IF NEW.rating IS NOT NULL AND OLD.rating IS NULL THEN
        UPDATE Restaurants
        SET rating = (
            SELECT AVG(o.rating)
            FROM Orders o
            WHERE o.restaurant_id = NEW.restaurant_id
            AND o.rating IS NOT NULL
        )
        WHERE restaurant_id = NEW.restaurant_id;
    END IF;
END//
DELIMITER ;

-- Check restaurant is open before placing order
DELIMITER //
CREATE TRIGGER check_restaurant_open
BEFORE INSERT ON Orders
FOR EACH ROW
BEGIN
    DECLARE is_restaurant_open BOOLEAN;
    
    SELECT is_open INTO is_restaurant_open
    FROM Restaurants
    WHERE restaurant_id = NEW.restaurant_id;
    
    IF is_restaurant_open = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot place order - restaurant is currently closed';
    END IF;
END//
DELIMITER ;

-- Validate payment amount matches order total
DELIMITER //
CREATE TRIGGER validate_payment_amount
BEFORE INSERT ON Payments
FOR EACH ROW
BEGIN
    DECLARE order_total DECIMAL(10,2);
    
    SELECT total_amount INTO order_total
    FROM Orders
    WHERE order_id = NEW.order_id;
    
    IF NEW.amount < order_total THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Payment amount cannot be less than order total';
    END IF;
END//
DELIMITER ;

-- Update order status when payment is completed
DELIMITER //
CREATE TRIGGER update_order_status_on_payment
AFTER INSERT ON Payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE Orders
        SET order_status = 'confirmed'
        WHERE order_id = NEW.order_id;
    END IF;
END//
DELIMITER ;

-- Check menu item availability before adding to order
DELIMITER //
CREATE TRIGGER check_item_availability
BEFORE INSERT ON Order_Items
FOR EACH ROW
BEGIN
    DECLARE item_available BOOLEAN;
    
    SELECT is_available INTO item_available
    FROM Menu_Items
    WHERE item_id = NEW.item_id;
    
    IF item_available = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Menu item is not available';
    END IF;
END//
DELIMITER ;

-- Check user account is active before placing order
DELIMITER //
CREATE TRIGGER check_user_active
BEFORE INSERT ON Orders
FOR EACH ROW
BEGIN
    DECLARE user_active BOOLEAN;
    
    SELECT is_active INTO user_active
    FROM Users
    WHERE user_id = NEW.user_id;
    
    IF user_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User account is inactive';
    END IF;
END//
DELIMITER ;

-- Check driver availability before assignment
DELIMITER //
CREATE TRIGGER check_driver_available
BEFORE UPDATE ON Orders
FOR EACH ROW
BEGIN
    DECLARE driver_available BOOLEAN;
    
    IF NEW.driver_id IS NOT NULL AND OLD.driver_id IS NULL THEN
        SELECT is_available INTO driver_available
        FROM Drivers
        WHERE driver_id = NEW.driver_id;
        
        IF driver_available = FALSE THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Driver is not available';
        END IF;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- PART 2: STORED PROCEDURES
-- =====================================================

-- Place a new order with items
DELIMITER //
CREATE PROCEDURE place_order(
    IN p_user_id INT,
    IN p_restaurant_id INT,
    IN p_address_id INT,
    IN p_items JSON,
    OUT p_order_id INT
)
BEGIN
    DECLARE v_total DECIMAL(10,2) DEFAULT 0;
    DECLARE v_item_id INT;
    DECLARE v_quantity INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_items_count INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    SET v_items_count = JSON_LENGTH(p_items);
    
    -- Calculate total
    WHILE v_idx < v_items_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].item_id')));
        SET v_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].quantity')));
        
        SELECT price INTO v_price FROM Menu_Items WHERE item_id = v_item_id;
        SET v_total = v_total + (v_price * v_quantity);
        SET v_idx = v_idx + 1;
    END WHILE;
    
    -- Create order
    INSERT INTO Orders (user_id, restaurant_id, address_id, total_amount, order_status, order_date)
    VALUES (p_user_id, p_restaurant_id, p_address_id, v_total, 'pending', NOW());
    
    SET p_order_id = LAST_INSERT_ID();
    
    -- Insert order items
    SET v_idx = 0;
    WHILE v_idx < v_items_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].item_id')));
        SET v_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].quantity')));
        
        SELECT price INTO v_price FROM Menu_Items WHERE item_id = v_item_id;
        
        INSERT INTO Order_Items (order_id, item_id, quantity, price_per_item)
        VALUES (p_order_id, v_item_id, v_quantity, v_price);
        
        SET v_idx = v_idx + 1;
    END WHILE;
    
    COMMIT;
END//
DELIMITER ;

-- Assign a driver to an order
DELIMITER //
CREATE PROCEDURE assign_driver_to_order(
    IN p_order_id INT,
    IN p_driver_id INT
)
BEGIN
    DECLARE v_driver_available BOOLEAN;
    
    SELECT is_available INTO v_driver_available
    FROM Drivers
    WHERE driver_id = p_driver_id;
    
    IF v_driver_available = TRUE THEN
        UPDATE Orders
        SET driver_id = p_driver_id,
            order_status = 'assigned'
        WHERE order_id = p_order_id;
        
        UPDATE Drivers
        SET is_available = FALSE
        WHERE driver_id = p_driver_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Driver is not available';
    END IF;
END//
DELIMITER ;

-- Complete an order and free the driver
DELIMITER //
CREATE PROCEDURE complete_order(
    IN p_order_id INT,
    IN p_rating INT
)
BEGIN
    DECLARE v_driver_id INT;
    
    START TRANSACTION;
    
    SELECT driver_id INTO v_driver_id
    FROM Orders
    WHERE order_id = p_order_id;
    
    UPDATE Orders
    SET order_status = 'delivered',
        rating = p_rating
    WHERE order_id = p_order_id;
    
    IF v_driver_id IS NOT NULL THEN
        UPDATE Drivers
        SET is_available = TRUE
        WHERE driver_id = v_driver_id;
    END IF;
    
    COMMIT;
END//
DELIMITER ;

-- Get user's order history
DELIMITER //
CREATE PROCEDURE get_user_order_history(
    IN p_user_id INT,
    IN p_limit INT
)
BEGIN
    SELECT 
        o.order_id,
        o.order_date,
        o.order_status,
        o.total_amount,
        r.name AS restaurant_name,
        r.cuisine,
        GROUP_CONCAT(CONCAT(mi.name, ' x', oi.quantity) SEPARATOR ', ') AS items
    FROM Orders o
    JOIN Restaurants r ON o.restaurant_id = r.restaurant_id
    JOIN Order_Items oi ON o.order_id = oi.order_id
    JOIN Menu_Items mi ON oi.item_id = mi.item_id
    WHERE o.user_id = p_user_id
    GROUP BY o.order_id
    ORDER BY o.order_date DESC
    LIMIT p_limit;
END//
DELIMITER ;

-- Get available drivers
DELIMITER //
CREATE PROCEDURE get_available_drivers(
    IN p_location VARCHAR(255)
)
BEGIN
    SELECT 
        driver_id,
        CONCAT(first_name, ' ', last_name) AS driver_name,
        phone_num,
        num_plate,
        current_location
    FROM Drivers
    WHERE is_available = TRUE
    ORDER BY driver_id;
END//
DELIMITER ;

-- Calculate restaurant revenue
DELIMITER //
CREATE PROCEDURE calculate_restaurant_revenue(
    IN p_restaurant_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    OUT p_total_revenue DECIMAL(10,2),
    OUT p_order_count INT
)
BEGIN
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*)
    INTO p_total_revenue, p_order_count
    FROM Orders
    WHERE restaurant_id = p_restaurant_id
    AND order_status = 'delivered'
    AND DATE(order_date) BETWEEN p_start_date AND p_end_date;
END//
DELIMITER ;

-- Process a refund
DELIMITER //
CREATE PROCEDURE process_refund(
    IN p_order_id INT,
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_payment_id INT;
    
    START TRANSACTION;
    
    SELECT payment_id INTO v_payment_id
    FROM Payments
    WHERE order_id = p_order_id;
    
    UPDATE Payments
    SET status = 'refunded'
    WHERE payment_id = v_payment_id;
    
    UPDATE Orders
    SET order_status = 'cancelled'
    WHERE order_id = p_order_id;
    
    COMMIT;
END//
DELIMITER ;

-- Toggle menu item availability
DELIMITER //
CREATE PROCEDURE toggle_menu_item_availability(
    IN p_item_id INT,
    IN p_is_available BOOLEAN
)
BEGIN
    UPDATE Menu_Items
    SET is_available = p_is_available
    WHERE item_id = p_item_id;
END//
DELIMITER ;

-- Get all orders for a driver
DELIMITER //
CREATE PROCEDURE get_driver_orders(
    IN p_driver_id INT,
    IN p_status VARCHAR(50)
)
BEGIN
    IF p_status IS NULL THEN
        SELECT 
            o.order_id,
            o.order_date,
            o.order_status,
            o.total_amount,
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
        WHERE o.driver_id = p_driver_id
        ORDER BY o.order_date DESC;
    ELSE
        SELECT 
            o.order_id,
            o.order_date,
            o.order_status,
            o.total_amount,
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
        WHERE o.driver_id = p_driver_id
        AND o.order_status = p_status
        ORDER BY o.order_date DESC;
    END IF;
END//
DELIMITER ;

-- Get driver earnings
DELIMITER //
CREATE PROCEDURE get_driver_earnings(
    IN p_driver_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE,
    OUT p_total_earnings DECIMAL(10,2),
    OUT p_delivery_count INT,
    OUT p_avg_earnings_per_delivery DECIMAL(10,2)
)
BEGIN
    SELECT 
        COALESCE(SUM(o.total_amount * 0.10), 0),
        COUNT(*),
        COALESCE(AVG(o.total_amount * 0.10), 0)
    INTO 
        p_total_earnings,
        p_delivery_count,
        p_avg_earnings_per_delivery
    FROM Orders o
    WHERE o.driver_id = p_driver_id
    AND o.order_status = 'Delivered'
    AND DATE(o.order_date) BETWEEN p_start_date AND p_end_date;
    
    IF p_total_earnings IS NULL THEN
        SET p_total_earnings = 0;
        SET p_delivery_count = 0;
        SET p_avg_earnings_per_delivery = 0;
    END IF;
END//
DELIMITER ;

-- Get restaurant orders
DELIMITER //
CREATE PROCEDURE get_restaurant_orders(
    IN p_restaurant_id INT,
    IN p_status VARCHAR(50),
    IN p_limit INT
)
BEGIN
    DECLARE query_limit INT DEFAULT 100;
    
    IF p_limit IS NOT NULL THEN
        SET query_limit = p_limit;
    END IF;
    
    IF p_status IS NULL THEN
        SELECT 
            o.order_id,
            o.order_date,
            o.order_status,
            o.total_amount,
            o.rating,
            u.first_name as customer_first_name,
            u.last_name as customer_last_name,
            u.phone_num as customer_phone,
            a.address as delivery_address,
            a.city,
            a.state,
            d.first_name as driver_first_name,
            d.last_name as driver_last_name,
            (SELECT COUNT(*) FROM Order_Items WHERE order_id = o.order_id) as item_count
        FROM Orders o
        JOIN Users u ON o.user_id = u.user_id
        JOIN Addresses a ON o.address_id = a.address_id
        LEFT JOIN Drivers d ON o.driver_id = d.driver_id
        WHERE o.restaurant_id = p_restaurant_id
        ORDER BY o.order_date DESC
        LIMIT query_limit;
    ELSE
        SELECT 
            o.order_id,
            o.order_date,
            o.order_status,
            o.total_amount,
            o.rating,
            u.first_name as customer_first_name,
            u.last_name as customer_last_name,
            u.phone_num as customer_phone,
            a.address as delivery_address,
            a.city,
            a.state,
            d.first_name as driver_first_name,
            d.last_name as driver_last_name,
            (SELECT COUNT(*) FROM Order_Items WHERE order_id = o.order_id) as item_count
        FROM Orders o
        JOIN Users u ON o.user_id = u.user_id
        JOIN Addresses a ON o.address_id = a.address_id
        LEFT JOIN Drivers d ON o.driver_id = d.driver_id
        WHERE o.restaurant_id = p_restaurant_id
        AND o.order_status = p_status
        ORDER BY o.order_date DESC
        LIMIT query_limit;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- PART 3: FUNCTIONS
-- =====================================================

-- Calculate discount based on user loyalty
DELIMITER //
CREATE FUNCTION calculate_discount(
    p_total_amount DECIMAL(10,2),
    p_user_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_order_count INT;
    DECLARE v_discount DECIMAL(10,2) DEFAULT 0;
    
    SELECT COUNT(*) INTO v_order_count
    FROM Orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    IF v_order_count >= 50 THEN
        SET v_discount = p_total_amount * 0.15;
    ELSEIF v_order_count >= 25 THEN
        SET v_discount = p_total_amount * 0.10;
    ELSEIF v_order_count >= 10 THEN
        SET v_discount = p_total_amount * 0.05;
    END IF;
    
    RETURN v_discount;
END//
DELIMITER ;

-- Calculate delivery fee
DELIMITER //
CREATE FUNCTION calculate_delivery_fee(
    p_restaurant_id INT,
    p_address_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_base_fee DECIMAL(10,2) DEFAULT 2.99;
    DECLARE v_distance_multiplier DECIMAL(10,2) DEFAULT 0.50;
    DECLARE v_estimated_distance INT DEFAULT 5;
    
    RETURN v_base_fee + (v_estimated_distance * v_distance_multiplier);
END//
DELIMITER ;

-- Get user loyalty tier
DELIMITER //
CREATE FUNCTION get_user_loyalty_tier(
    p_user_id INT
)
RETURNS VARCHAR(20)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_spent DECIMAL(10,2);
    DECLARE v_tier VARCHAR(20);
    
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_spent
    FROM Orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    IF v_total_spent >= 10000 THEN
        SET v_tier = 'Platinum';
    ELSEIF v_total_spent >= 5000 THEN
        SET v_tier = 'Gold';
    ELSEIF v_total_spent >= 1000 THEN
        SET v_tier = 'Silver';
    ELSE
        SET v_tier = 'Bronze';
    END IF;
    
    RETURN v_tier;
END//
DELIMITER ;

-- Get driver rating
DELIMITER //
CREATE FUNCTION get_driver_rating(
    p_driver_id INT
)
RETURNS DECIMAL(3,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_avg_rating DECIMAL(3,2);
    
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM Orders
    WHERE driver_id = p_driver_id
    AND rating IS NOT NULL;
    
    RETURN v_avg_rating;
END//
DELIMITER ;

-- Calculate driver rating (alias for compatibility)
DELIMITER //
CREATE FUNCTION calculate_driver_rating(
    p_driver_id INT
)
RETURNS DECIMAL(3,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN get_driver_rating(p_driver_id);
END//
DELIMITER ;

-- Calculate restaurant rating
DELIMITER //
CREATE FUNCTION calculate_restaurant_rating(
    p_restaurant_id INT
)
RETURNS DECIMAL(3,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE restaurant_rating DECIMAL(3,2);
    
    SELECT COALESCE(AVG(rating), 0.0) INTO restaurant_rating
    FROM Orders
    WHERE restaurant_id = p_restaurant_id
    AND rating IS NOT NULL
    AND order_status = 'Delivered';
    
    RETURN restaurant_rating;
END//
DELIMITER ;

-- Check if restaurant is busy
DELIMITER //
CREATE FUNCTION is_restaurant_busy(
    p_restaurant_id INT
)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_pending_orders INT;
    
    SELECT COUNT(*) INTO v_pending_orders
    FROM Orders
    WHERE restaurant_id = p_restaurant_id
    AND order_status IN ('pending', 'confirmed', 'preparing')
    AND order_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    RETURN v_pending_orders >= 10;
END//
DELIMITER ;

-- Estimate delivery time
DELIMITER //
CREATE FUNCTION estimate_delivery_time(
    p_restaurant_id INT,
    p_address_id INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_prep_time INT DEFAULT 20;
    DECLARE v_delivery_time INT DEFAULT 15;
    DECLARE v_busy_multiplier DECIMAL(3,2) DEFAULT 1.0;
    
    IF is_restaurant_busy(p_restaurant_id) THEN
        SET v_busy_multiplier = 1.5;
    END IF;
    
    RETURN ROUND((v_prep_time + v_delivery_time) * v_busy_multiplier);
END//
DELIMITER ;

-- Calculate order total with tax
DELIMITER //
CREATE FUNCTION calculate_order_total_with_tax(
    p_order_id INT,
    p_tax_rate DECIMAL(5,4)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    
    SELECT total_amount INTO v_subtotal
    FROM Orders
    WHERE order_id = p_order_id;
    
    SET v_total = v_subtotal + (v_subtotal * p_tax_rate) + 2.99;
    
    RETURN v_total;
END//
DELIMITER ;

-- Get item popularity score
DELIMITER //
CREATE FUNCTION get_item_popularity_score(
    p_item_id INT
)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_order_count INT;
    
    SELECT COUNT(*) INTO v_order_count
    FROM Order_Items
    WHERE item_id = p_item_id
    AND order_id IN (
        SELECT order_id FROM Orders 
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    );
    
    RETURN v_order_count;
END//
DELIMITER ;

-- Calculate restaurant commission
DELIMITER //
CREATE FUNCTION calculate_restaurant_commission(
    p_order_amount DECIMAL(10,2),
    p_restaurant_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_commission_rate DECIMAL(5,4) DEFAULT 0.15;
    DECLARE v_restaurant_rating DECIMAL(3,2);
    
    SELECT rating INTO v_restaurant_rating
    FROM Restaurants
    WHERE restaurant_id = p_restaurant_id;
    
    IF v_restaurant_rating >= 4.5 THEN
        SET v_commission_rate = 0.12;
    ELSEIF v_restaurant_rating >= 4.0 THEN
        SET v_commission_rate = 0.13;
    END IF;
    
    RETURN p_order_amount * v_commission_rate;
END//
DELIMITER ;

-- Get user average order value
DELIMITER //
CREATE FUNCTION get_user_avg_order_value(
    p_user_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_avg_value DECIMAL(10,2);
    
    SELECT COALESCE(AVG(total_amount), 0) INTO v_avg_value
    FROM Orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    RETURN v_avg_value;
END//
DELIMITER ;

-- Check if restaurant is open now
DELIMITER //
CREATE FUNCTION is_restaurant_open_now(
    p_restaurant_id INT
)
RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_is_open BOOLEAN;
    DECLARE v_current_hour INT;
    
    SET v_current_hour = HOUR(NOW());
    
    SELECT is_open INTO v_is_open
    FROM Restaurants
    WHERE restaurant_id = p_restaurant_id;
    
    IF v_is_open = TRUE AND v_current_hour >= 10 AND v_current_hour < 23 THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END//
DELIMITER ;

-- Generate order reference number
DELIMITER //
CREATE FUNCTION generate_order_reference(
    p_order_id INT
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_reference VARCHAR(20);
    DECLARE v_date_part VARCHAR(8);
    
    SET v_date_part = DATE_FORMAT(NOW(), '%Y%m%d');
    SET v_reference = CONCAT('ORD', v_date_part, LPAD(p_order_id, 6, '0'));
    
    RETURN v_reference;
END//
DELIMITER ;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✓ All triggers, functions, and procedures created successfully!' as Status;
