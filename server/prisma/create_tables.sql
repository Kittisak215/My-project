-- Drop all tables and types if exist
DROP TABLE IF EXISTS maintenance_alerts CASCADE;
DROP TABLE IF EXISTS repair_requests CASCADE;
DROP TABLE IF EXISTS mileage_logs CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS garages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicle_types CASCADE;

-- Drop enums if exist
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "VehicleStatus" CASCADE;
DROP TYPE IF EXISTS "RepairType" CASCADE;
DROP TYPE IF EXISTS "RepairStatus" CASCADE;
DROP TYPE IF EXISTS "AlertType" CASCADE;

-- Create ENUMs
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DRIVER', 'VIEWER');
CREATE TYPE "VehicleStatus" AS ENUM ('READY', 'IN_REPAIR');
CREATE TYPE "RepairType" AS ENUM ('GENERAL', 'EMERGENCY', 'MAINTENANCE');
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "AlertType" AS ENUM ('OIL_CHANGE', 'TIRE_CHANGE', 'INSPECTION', 'OTHER');

-- ประเภทยานพาหนะ
CREATE TABLE vehicle_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL
);

-- ผู้ขับรถ
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- ผู้ใช้งานระบบ
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role "UserRole" NOT NULL DEFAULT 'DRIVER',
    driver_id INTEGER UNIQUE,
    full_name VARCHAR(200),
    email VARCHAR(200),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE SET NULL
);

-- ยานพาหนะ
CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    type_id INTEGER NOT NULL,
    driver_id INTEGER,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    status "VehicleStatus" NOT NULL DEFAULT 'READY',
    oil_change_interval_km INTEGER,
    tire_change_interval_km INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (type_id) REFERENCES vehicle_types(type_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE SET NULL
);

-- อู่ซ่อมรถ
CREATE TABLE garages (
    garage_id SERIAL PRIMARY KEY,
    garage_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(200),
    sub_district VARCHAR(100),
    district VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- บันทึกระยะทาง
CREATE TABLE mileage_logs (
    mileage_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    record_month DATE NOT NULL,
    mileage_start INTEGER NOT NULL,
    mileage_end INTEGER NOT NULL,
    distance_km INTEGER,
    recorded_by INTEGER NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES drivers(driver_id)
);

-- คำร้องซ่อม
CREATE TABLE repair_requests (
    request_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    driver_id INTEGER NOT NULL,
    request_date TIMESTAMP NOT NULL DEFAULT NOW(),
    issue_description TEXT NOT NULL,
    mileage_at_repair INTEGER,
    repair_type "RepairType" NOT NULL DEFAULT 'GENERAL',
    status "RepairStatus" NOT NULL DEFAULT 'PENDING',
    garage_id INTEGER,
    repair_start_date DATE,
    repair_end_date DATE,
    repair_detail TEXT,
    receipt_image VARCHAR(500),
    total_cost DECIMAL(10,2),
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
    FOREIGN KEY (garage_id) REFERENCES garages(garage_id) ON DELETE SET NULL
);

-- การแจ้งเตือนบำรุงรักษา
CREATE TABLE maintenance_alerts (
    alert_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    alert_type "AlertType" NOT NULL,
    last_service_mileage INTEGER NOT NULL,
    next_service_mileage INTEGER NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);

-- Prisma migration tracking (so prisma knows the state)
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    checksum VARCHAR(64) NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    migration_name VARCHAR(255) NOT NULL,
    logs TEXT,
    rolled_back_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    applied_steps_count INTEGER NOT NULL DEFAULT 0
);

SELECT 'Tables created successfully!' AS result;
