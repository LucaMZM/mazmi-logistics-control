CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(180) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    weight_kg NUMERIC(10,3) NOT NULL CHECK (weight_kg > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE inventory_levels (
    id UUID PRIMARY KEY,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    product_id UUID NOT NULL REFERENCES products(id),
    on_hand INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_inventory_warehouse_product UNIQUE (warehouse_id, product_id),
    CONSTRAINT chk_inventory_non_negative CHECK (on_hand >= 0 AND reserved >= 0 AND reorder_level >= 0),
    CONSTRAINT chk_inventory_reserved CHECK (reserved <= on_hand)
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY,
    inventory_level_id UUID NOT NULL REFERENCES inventory_levels(id),
    order_id UUID,
    type VARCHAR(40) NOT NULL CHECK (type IN ('INITIAL', 'RECEIPT', 'RESERVATION', 'RESERVATION_RELEASE', 'DISPATCH', 'RETURN', 'ADJUSTMENT')),
    on_hand_delta INTEGER NOT NULL,
    reserved_delta INTEGER NOT NULL,
    note VARCHAR(300) NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_inventory_warehouse ON inventory_levels (warehouse_id);
CREATE INDEX idx_stock_movements_inventory_created ON stock_movements (inventory_level_id, created_at DESC);
