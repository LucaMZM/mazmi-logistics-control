CREATE TABLE shipments (
    id UUID PRIMARY KEY,
    tracking_number VARCHAR(40) NOT NULL UNIQUE,
    order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    status VARCHAR(30) NOT NULL CHECK (status IN ('CREATED', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
    delivery_health VARCHAR(20) NOT NULL CHECK (delivery_health IN ('ON_TIME', 'AT_RISK', 'DELAYED')),
    current_latitude NUMERIC(10,7),
    current_longitude NUMERIC(10,7),
    simulation_progress INTEGER NOT NULL DEFAULT 0 CHECK (simulation_progress BETWEEN 0 AND 100),
    simulation_active BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_delivery_at TIMESTAMPTZ,
    departed_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE tracking_events (
    id UUID PRIMARY KEY,
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('CREATED', 'ASSIGNED', 'DEPARTED', 'CHECKPOINT', 'DELAYED', 'INCIDENT', 'RESUMED', 'DELIVERED')),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    description VARCHAR(300) NOT NULL,
    event_time TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_shipments_tracking ON shipments (tracking_number);
CREATE INDEX idx_shipments_status ON shipments (status);
CREATE INDEX idx_shipments_health ON shipments (delivery_health);
CREATE INDEX idx_tracking_shipment_time ON tracking_events (shipment_id, event_time);
CREATE UNIQUE INDEX uq_active_driver_shipment ON shipments (driver_id) WHERE driver_id IS NOT NULL AND status IN ('ASSIGNED', 'IN_TRANSIT');
CREATE UNIQUE INDEX uq_active_vehicle_shipment ON shipments (vehicle_id) WHERE vehicle_id IS NOT NULL AND status IN ('ASSIGNED', 'IN_TRANSIT');
