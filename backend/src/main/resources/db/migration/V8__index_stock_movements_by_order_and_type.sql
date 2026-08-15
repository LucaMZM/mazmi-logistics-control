CREATE INDEX idx_stock_movements_order_type
    ON stock_movements (order_id, type)
    WHERE order_id IS NOT NULL;
