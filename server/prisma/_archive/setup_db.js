/**
 * Direct DB setup script - creates all tables without prisma migrate
 * Run with: node prisma/setup_db.js
 */
require('dotenv').config();
const { Client } = require('pg');

const sql = `
-- Drop existing tables in correct order (FK constraints)
DROP TABLE IF EXISTS maintenance_alerts CASCADE;
DROP TABLE IF EXISTS repair_requests CASCADE;
DROP TABLE IF EXISTS mileage_logs CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS garages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicle_types CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "VehicleStatus" CASCADE;
DROP TYPE IF EXISTS "RepairType" CASCADE;
DROP TYPE IF EXISTS "RepairStatus" CASCADE;
DROP TYPE IF EXISTS "AlertType" CASCADE;

-- Enums
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DRIVER', 'VIEWER');
CREATE TYPE "VehicleStatus" AS ENUM ('READY', 'IN_REPAIR');
CREATE TYPE "RepairType" AS ENUM ('GENERAL', 'EMERGENCY', 'MAINTENANCE');
CREATE TYPE "RepairStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED', 'COMPLETED');
CREATE TYPE "AlertType" AS ENUM ('OIL_CHANGE', 'TIRE_CHANGE', 'INSPECTION', 'OTHER');

-- vehicle_types
CREATE TABLE vehicle_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL
);

-- drivers
CREATE TABLE drivers (
    driver_id SERIAL PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- users
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
    CONSTRAINT fk_user_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE SET NULL
);

-- vehicles
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
    CONSTRAINT fk_vehicle_type FOREIGN KEY (type_id) REFERENCES vehicle_types(type_id),
    CONSTRAINT fk_vehicle_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE SET NULL
);

-- garages
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

-- mileage_logs
CREATE TABLE mileage_logs (
    mileage_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    record_month DATE NOT NULL,
    mileage_start INTEGER NOT NULL,
    mileage_end INTEGER NOT NULL,
    distance_km INTEGER,
    recorded_by INTEGER NOT NULL,
    CONSTRAINT fk_mileage_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,
    CONSTRAINT fk_mileage_driver FOREIGN KEY (recorded_by) REFERENCES drivers(driver_id)
);

-- repair_requests
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
    CONSTRAINT fk_repair_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    CONSTRAINT fk_repair_driver FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
    CONSTRAINT fk_repair_garage FOREIGN KEY (garage_id) REFERENCES garages(garage_id) ON DELETE SET NULL
);

-- maintenance_alerts
CREATE TABLE maintenance_alerts (
    alert_id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL,
    alert_type "AlertType" NOT NULL,
    last_service_mileage INTEGER NOT NULL,
    next_service_mileage INTEGER NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT fk_alert_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id) ON DELETE CASCADE
);
`;

async function setup() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    try {
        await client.connect();
        console.log('✅ Connected to database:', process.env.DATABASE_URL.split('@')[1]);
        await client.query(sql);
        console.log('✅ All tables created successfully!');
        console.log('\nTables created:');
        console.log('  - vehicle_types');
        console.log('  - drivers');
        console.log('  - users');
        console.log('  - vehicles');
        console.log('  - garages');
        console.log('  - mileage_logs');
        console.log('  - repair_requests');
        console.log('  - maintenance_alerts');
        console.log('\n🚀 Now run: node prisma/seed.js');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

setup();
