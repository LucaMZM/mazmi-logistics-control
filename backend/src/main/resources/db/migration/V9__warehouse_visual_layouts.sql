CREATE TABLE warehouse_visual_layouts (
    warehouse_id UUID PRIMARY KEY REFERENCES warehouses(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouse_visual_layout_items (
    warehouse_id UUID NOT NULL REFERENCES warehouse_visual_layouts(warehouse_id) ON DELETE CASCADE,
    object_id VARCHAR(40) NOT NULL,
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('RACK', 'DOCK', 'STAGING', 'PICKING')),
    grid_x INTEGER NOT NULL CHECK (grid_x BETWEEN -10 AND 10),
    grid_z INTEGER NOT NULL CHECK (grid_z BETWEEN -6 AND 6),
    orientation INTEGER NOT NULL CHECK (orientation IN (0, 90, 180, 270)),
    PRIMARY KEY (warehouse_id, object_id)
);
