CREATE TABLE drivers (
    id UUID PRIMARY KEY,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    license_number VARCHAR(60) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'ON_ROUTE', 'OFF_DUTY')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY,
    registration_plate VARCHAR(20) NOT NULL UNIQUE,
    model VARCHAR(120) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('VAN', 'TRUCK', 'LARGE_TRUCK')),
    capacity_kg NUMERIC(10,3) NOT NULL CHECK (capacity_kg > 0),
    status VARCHAR(30) NOT NULL CHECK (status IN ('AVAILABLE', 'IN_SERVICE', 'MAINTENANCE')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
