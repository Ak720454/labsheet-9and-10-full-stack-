-- BTCS303T Problem 2: SQL Analytics and Concurrency
-- Dialect: PostgreSQL (parts (a) and (b) also run unchanged on MySQL 8+).
--
-- Schema
--   customers(id, name, city)
--   products(id, name, category, price, stock)
--   orders(id, customer_id, order_date)
--   order_items(order_id, product_id, qty)


-- =====================================================================
-- (a) Top 3 products by revenue within each category (ties included)
--     revenue = price x total quantity sold
-- =====================================================================
WITH product_revenue AS (
    SELECT p.id,
           p.name,
           p.category,
           SUM(p.price * oi.qty) AS revenue
    FROM products p
    JOIN order_items oi ON oi.product_id = p.id
    GROUP BY p.id, p.name, p.category
),
ranked AS (
    SELECT pr.*,
           DENSE_RANK() OVER (PARTITION BY pr.category ORDER BY pr.revenue DESC) AS rnk
    FROM product_revenue pr
)
SELECT category, id AS product_id, name, revenue, rnk
FROM ranked
WHERE rnk <= 3
ORDER BY category, rnk, name;


-- =====================================================================
-- (b) Customers who placed at least one order in EVERY month
--     from January to March 2025
-- =====================================================================
SELECT c.id, c.name
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.order_date >= DATE '2025-01-01'
  AND o.order_date <  DATE '2025-04-01'
GROUP BY c.id, c.name
HAVING COUNT(DISTINCT EXTRACT(MONTH FROM o.order_date)) = 3;


-- =====================================================================
-- (c) Place an order of :qty units of :product_id without overselling
--     (:customer_id is the customer placing the order)
-- =====================================================================
BEGIN;

-- Atomic check-and-decrement. The WHERE clause makes the stock check and the
-- update ONE statement, and the row lock taken by UPDATE makes concurrent
-- requests for the same product wait for each other.
UPDATE products
SET    stock = stock - :qty
WHERE  id = :product_id
  AND  stock >= :qty;

-- Application code now checks the affected-row count:
--   rows affected = 0  -> stock was insufficient (or the product does not exist):
--                         run ROLLBACK; and report failure to the caller.
--   rows affected = 1  -> continue below.

INSERT INTO orders (customer_id, order_date)
VALUES (:customer_id, CURRENT_DATE)
RETURNING id;                       -- use this id as :new_order_id

INSERT INTO order_items (order_id, product_id, qty)
VALUES (:new_order_id, :product_id, :qty);

COMMIT;

-- On any error or insufficient stock:  ROLLBACK;  (the stock change is undone too)


-- ---------------------------------------------------------------------
-- Optional: the same logic as one PostgreSQL function. The exception aborts
-- the transaction, so nothing is committed when stock is insufficient.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION place_order(p_customer_id INT, p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id INT;
BEGIN
    UPDATE products
    SET    stock = stock - p_qty
    WHERE  id = p_product_id
      AND  stock >= p_qty;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;

    INSERT INTO orders (customer_id, order_date)
    VALUES (p_customer_id, CURRENT_DATE)
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (order_id, product_id, qty)
    VALUES (v_order_id, p_product_id, p_qty);

    RETURN v_order_id;
END;
$$;

-- Why a plain SELECT followed by an UPDATE is unsafe:
--   Two concurrent requests can both SELECT the same stock value (say 1) before
--   either has written, both decide "enough stock", and both UPDATE, so stock goes
--   negative and the product is oversold (a check-then-act race condition).
--   Folding the check into the UPDATE's WHERE clause (or using SELECT ... FOR UPDATE)
--   makes the database serialise the two requests on the row lock, so the second one
--   re-evaluates the condition after the first one has committed and correctly fails.
