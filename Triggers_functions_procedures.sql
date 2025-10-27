DELIMITER //
CREATE TRIGGER validate_order_total
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.total_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Order total amount cannot be negative';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_restaurant_rating
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    UPDATE restaurants
    SET rating = (
        SELECT AVG(o.rating)
        FROM orders o
        WHERE o.restaurant_id = NEW.restaurant_id
        AND o.rating IS NOT NULL
    )
    WHERE restaurant_id = NEW.restaurant_id;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER check_restaurant_open
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    DECLARE is_restaurant_open BOOLEAN;
    
    SELECT is_open INTO is_restaurant_open
    FROM restaurants
    WHERE restaurant_id = NEW.restaurant_id;
    
    IF is_restaurant_open = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot place order - restaurant is currently closed';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER validate_payment_amount
BEFORE INSERT ON payments
FOR EACH ROW
BEGIN
    DECLARE order_total DECIMAL(10,2);
    
    SELECT total_amount INTO order_total
    FROM orders
    WHERE order_id = NEW.order_id;
    
    IF NEW.amount != order_total THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Payment amount must match order total';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER update_order_status_on_payment
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE orders
        SET order_status = 'confirmed'
        WHERE order_id = NEW.order_id;
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER check_item_availability
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    DECLARE item_available BOOLEAN;
    
    SELECT is_available INTO item_available
    FROM menu_items
    WHERE item_id = NEW.item_id;
    
    IF item_available = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Menu item is not available';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER check_user_active
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    DECLARE user_active BOOLEAN;
    
    SELECT is_active INTO user_active
    FROM users
    WHERE user_id = NEW.user_id;
    
    IF user_active = FALSE THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'User account is inactive';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE TRIGGER check_driver_available
BEFORE UPDATE ON orders
FOR EACH ROW
BEGIN
    DECLARE driver_available BOOLEAN;
    
    IF NEW.driver_id IS NOT NULL AND OLD.driver_id IS NULL THEN
        SELECT is_available INTO driver_available
        FROM drivers
        WHERE driver_id = NEW.driver_id;
        
        IF driver_available = FALSE THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Driver is not available';
        END IF;
    END IF;
END//
DELIMITER ;

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
    
    -- Create order
    INSERT INTO orders (user_id, restaurant_id, address_id, order_status, order_date)
    VALUES (p_user_id, p_restaurant_id, p_address_id, 'pending', NOW());
    
    SET p_order_id = LAST_INSERT_ID();
    
    -- Get items count
    SET v_items_count = JSON_LENGTH(p_items);
    
    -- Insert order items and calculate total
    WHILE v_idx < v_items_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].item_id')));
        SET v_quantity = JSON_UNQUOTE(JSON_EXTRACT(p_items, CONCAT('$[', v_idx, '].quantity')));
        
        SELECT price INTO v_price FROM menu_items WHERE item_id = v_item_id;
        
        INSERT INTO order_items (order_id, item_id, quantity, price_per_item)
        VALUES (p_order_id, v_item_id, v_quantity, v_price);
        
        SET v_total = v_total + (v_price * v_quantity);
        SET v_idx = v_idx + 1;
    END WHILE;
    
    -- Update order total
    UPDATE orders SET total_amount = v_total WHERE order_id = p_order_id;
    
    COMMIT;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE assign_driver_to_order(
    IN p_order_id INT,
    IN p_driver_id INT
)
BEGIN
    DECLARE v_driver_available BOOLEAN;
    
    SELECT is_available INTO v_driver_available
    FROM drivers
    WHERE driver_id = p_driver_id;
    
    IF v_driver_available = TRUE THEN
        UPDATE orders
        SET driver_id = p_driver_id,
            order_status = 'assigned'
        WHERE order_id = p_order_id;
        
        UPDATE drivers
        SET is_available = FALSE
        WHERE driver_id = p_driver_id;
    ELSE
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Driver is not available';
    END IF;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE complete_order(
    IN p_order_id INT,
    IN p_rating INT
)
BEGIN
    DECLARE v_driver_id INT;
    
    START TRANSACTION;
    
    SELECT driver_id INTO v_driver_id
    FROM orders
    WHERE order_id = p_order_id;
    
    UPDATE orders
    SET order_status = 'delivered',
        rating = p_rating
    WHERE order_id = p_order_id;
    
    IF v_driver_id IS NOT NULL THEN
        UPDATE drivers
        SET is_available = TRUE
        WHERE driver_id = v_driver_id;
    END IF;
    
    COMMIT;
END//
DELIMITER ;

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
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.restaurant_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN menu_items mi ON oi.item_id = mi.item_id
    WHERE o.user_id = p_user_id
    GROUP BY o.order_id
    ORDER BY o.order_date DESC
    LIMIT p_limit;
END//
DELIMITER ;

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
    FROM drivers
    WHERE is_available = TRUE
    ORDER BY driver_id;
END//
DELIMITER ;

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
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    AND order_status = 'delivered'
    AND DATE(order_date) BETWEEN p_start_date AND p_end_date;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE process_refund(
    IN p_order_id INT,
    IN p_reason VARCHAR(255)
)
BEGIN
    DECLARE v_payment_id INT;
    DECLARE v_amount DECIMAL(10,2);
    
    START TRANSACTION;
    
    SELECT payment_id, amount INTO v_payment_id, v_amount
    FROM payments
    WHERE order_id = p_order_id;
    
    UPDATE payments
    SET status = 'refunded'
    WHERE payment_id = v_payment_id;
    
    UPDATE orders
    SET order_status = 'cancelled'
    WHERE order_id = p_order_id;
    
    COMMIT;
END//
DELIMITER ;

DELIMITER //
CREATE PROCEDURE toggle_menu_item_availability(
    IN p_item_id INT,
    IN p_is_available BOOLEAN
)
BEGIN
    UPDATE menu_items
    SET is_available = p_is_available
    WHERE item_id = p_item_id;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION calculate_discount(
    p_total_amount DECIMAL(10,2),
    p_user_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_order_count INT;
    DECLARE v_discount DECIMAL(10,2) DEFAULT 0;
    
    -- Count user's previous orders
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    -- Apply discount based on order history
    IF v_order_count >= 50 THEN
        SET v_discount = p_total_amount * 0.15; -- 15% for 50+ orders
    ELSEIF v_order_count >= 25 THEN
        SET v_discount = p_total_amount * 0.10; -- 10% for 25+ orders
    ELSEIF v_order_count >= 10 THEN
        SET v_discount = p_total_amount * 0.05; -- 5% for 10+ orders
    END IF;
    
    RETURN v_discount;
END//
DELIMITER ;

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
    DECLARE v_estimated_distance INT DEFAULT 5; -- in km
    
    -- In real scenario, you'd calculate actual distance
    -- This is a simplified version
    
    RETURN v_base_fee + (v_estimated_distance * v_distance_multiplier);
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_user_loyalty_tier(
    p_user_id INT
)
RETURNS VARCHAR(20)
DETERMINISTIC
BEGIN
    DECLARE v_total_spent DECIMAL(10,2);
    DECLARE v_tier VARCHAR(20);
    
    SELECT COALESCE(SUM(total_amount), 0) INTO v_total_spent
    FROM orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    IF v_total_spent >= 1000 THEN
        SET v_tier = 'Platinum';
    ELSEIF v_total_spent >= 500 THEN
        SET v_tier = 'Gold';
    ELSEIF v_total_spent >= 100 THEN
        SET v_tier = 'Silver';
    ELSE
        SET v_tier = 'Bronze';
    END IF;
    
    RETURN v_tier;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_driver_rating(
    p_driver_id INT
)
RETURNS DECIMAL(3,2)
DETERMINISTIC
BEGIN
    DECLARE v_avg_rating DECIMAL(3,2);
    
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM orders
    WHERE driver_id = p_driver_id
    AND rating IS NOT NULL;
    
    RETURN v_avg_rating;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION is_restaurant_busy(
    p_restaurant_id INT
)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE v_pending_orders INT;
    DECLARE v_is_busy BOOLEAN DEFAULT FALSE;
    
    SELECT COUNT(*) INTO v_pending_orders
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    AND order_status IN ('pending', 'confirmed', 'preparing')
    AND order_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
    
    IF v_pending_orders >= 10 THEN
        SET v_is_busy = TRUE;
    END IF;
    
    RETURN v_is_busy;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION estimate_delivery_time(
    p_restaurant_id INT,
    p_address_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_prep_time INT DEFAULT 20; -- minutes
    DECLARE v_delivery_time INT DEFAULT 15; -- minutes
    DECLARE v_busy_multiplier DECIMAL(3,2) DEFAULT 1.0;
    
    IF is_restaurant_busy(p_restaurant_id) THEN
        SET v_busy_multiplier = 1.5;
    END IF;
    
    RETURN ROUND((v_prep_time + v_delivery_time) * v_busy_multiplier);
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION calculate_order_total_with_tax(
    p_order_id INT,
    p_tax_rate DECIMAL(5,4)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax DECIMAL(10,2);
    DECLARE v_delivery_fee DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    
    SELECT total_amount INTO v_subtotal
    FROM orders
    WHERE order_id = p_order_id;
    
    SET v_tax = v_subtotal * p_tax_rate;
    SET v_delivery_fee = 2.99; -- Could be dynamic
    SET v_total = v_subtotal + v_tax + v_delivery_fee;
    
    RETURN v_total;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_item_popularity_score(
    p_item_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_order_count INT;
    
    SELECT COUNT(*) INTO v_order_count
    FROM order_items
    WHERE item_id = p_item_id
    AND order_id IN (
        SELECT order_id FROM orders 
        WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    );
    
    RETURN v_order_count;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION is_valid_phone(
    p_phone VARCHAR(15)
)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    -- Basic validation: 10 digits
    IF p_phone REGEXP '^[0-9]{10}$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION calculate_restaurant_commission(
    p_order_amount DECIMAL(10,2),
    p_restaurant_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_commission_rate DECIMAL(5,4) DEFAULT 0.15; -- 15% default
    DECLARE v_restaurant_rating DECIMAL(3,2);
    
    SELECT rating INTO v_restaurant_rating
    FROM restaurants
    WHERE restaurant_id = p_restaurant_id;
    
    -- Lower commission for highly rated restaurants
    IF v_restaurant_rating >= 4.5 THEN
        SET v_commission_rate = 0.12; -- 12%
    ELSEIF v_restaurant_rating >= 4.0 THEN
        SET v_commission_rate = 0.13; -- 13%
    END IF;
    
    RETURN p_order_amount * v_commission_rate;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_peak_hour_multiplier()
RETURNS DECIMAL(3,2)
DETERMINISTIC
BEGIN
    DECLARE v_current_hour INT;
    DECLARE v_multiplier DECIMAL(3,2) DEFAULT 1.0;
    
    SET v_current_hour = HOUR(NOW());
    
    -- Lunch rush: 12 PM - 2 PM
    IF v_current_hour >= 12 AND v_current_hour < 14 THEN
        SET v_multiplier = 1.25;
    -- Dinner rush: 7 PM - 9 PM
    ELSEIF v_current_hour >= 19 AND v_current_hour < 21 THEN
        SET v_multiplier = 1.30;
    -- Late night: 10 PM - 12 AM
    ELSEIF v_current_hour >= 22 OR v_current_hour < 1 THEN
        SET v_multiplier = 1.15;
    END IF;
    
    RETURN v_multiplier;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_user_avg_order_value(
    p_user_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_avg_value DECIMAL(10,2);
    
    SELECT COALESCE(AVG(total_amount), 0) INTO v_avg_value
    FROM orders
    WHERE user_id = p_user_id
    AND order_status = 'delivered';
    
    RETURN v_avg_value;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION is_restaurant_open_now(
    p_restaurant_id INT
)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE v_is_open BOOLEAN;
    DECLARE v_current_hour INT;
    
    SET v_current_hour = HOUR(NOW());
    
    SELECT is_open INTO v_is_open
    FROM restaurants
    WHERE restaurant_id = p_restaurant_id;
    
    -- Additional time-based logic
    -- Assuming most restaurants open 10 AM - 11 PM
    IF v_is_open = TRUE AND v_current_hour >= 10 AND v_current_hour < 23 THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END//
DELIMITER ;

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

DELIMITER //
CREATE FUNCTION calculate_driver_earnings(
    p_driver_id INT,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_total_earnings DECIMAL(10,2);
    DECLARE v_base_rate DECIMAL(10,2) DEFAULT 5.00;
    DECLARE v_per_km_rate DECIMAL(10,2) DEFAULT 1.50;
    DECLARE v_completed_orders INT;
    
    SELECT COUNT(*) INTO v_completed_orders
    FROM orders
    WHERE driver_id = p_driver_id
    AND order_status = 'delivered'
    AND DATE(order_date) BETWEEN p_start_date AND p_end_date;
    
    -- Simplified calculation
    SET v_total_earnings = v_completed_orders * (v_base_rate + (5 * v_per_km_rate));
    
    RETURN v_total_earnings;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_avg_prep_time(
    p_restaurant_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_avg_time INT DEFAULT 20; -- Default 20 minutes
    DECLARE v_order_count INT;
    
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE restaurant_id = p_restaurant_id
    AND order_date >= DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Adjust based on volume
    IF v_order_count > 100 THEN
        SET v_avg_time = 15; -- Experienced, faster
    ELSEIF v_order_count < 20 THEN
        SET v_avg_time = 30; -- Slower, less experience
    END IF;
    
    RETURN v_avg_time;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION is_valid_email(
    p_email VARCHAR(255)
)
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    IF p_email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_order_item_subtotal(
    p_order_id INT
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    
    SELECT SUM(quantity * price_per_item) INTO v_subtotal
    FROM order_items
    WHERE order_id = p_order_id;
    
    RETURN COALESCE(v_subtotal, 0);
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_user_address_count(
    p_user_id INT
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_count INT;
    
    SELECT COUNT(*) INTO v_count
    FROM addresses
    WHERE user_id = p_user_id;
    
    RETURN v_count;
END//
DELIMITER ;

DELIMITER //
CREATE FUNCTION get_cuisine_popularity_rank(
    p_cuisine VARCHAR(50)
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE v_rank INT;
    
    -- Popular cuisines get better rank
    CASE p_cuisine
        WHEN 'Italian' THEN SET v_rank = 1;
        WHEN 'Chinese' THEN SET v_rank = 2;
        WHEN 'Indian' THEN SET v_rank = 3;
        WHEN 'Mexican' THEN SET v_rank = 4;
        WHEN 'Thai' THEN SET v_rank = 5;
        WHEN 'Japanese' THEN SET v_rank = 6;
        ELSE SET v_rank = 10;
    END CASE;
    
    RETURN v_rank;
END//
DELIMITER ;
