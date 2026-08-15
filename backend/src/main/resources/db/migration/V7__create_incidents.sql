CREATE TABLE incidents (
    id UUID PRIMARY KEY,
    shipment_id UUID NOT NULL REFERENCES shipments(id),
    type VARCHAR(30) NOT NULL CHECK (type IN ('TRAFFIC', 'VEHICLE', 'WEATHER', 'ADDRESS', 'CUSTOMER', 'OTHER')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    resolution_note TEXT,
    created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_severity ON incidents (severity);
CREATE INDEX idx_incidents_shipment ON incidents (shipment_id);
