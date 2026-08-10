/*
  Warnings:

  - The values [INACTIVE] on the enum `VehicleStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `Driver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Garage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MaintenanceAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MileageLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RepairRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DRIVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "RepairType" AS ENUM ('GENERAL', 'EMERGENCY', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('OIL_CHANGE', 'TIRE_CHANGE', 'INSPECTION', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "VehicleStatus_new" AS ENUM ('READY', 'IN_REPAIR');
ALTER TABLE "public"."Vehicle" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "vehicles" ALTER COLUMN "status" TYPE "VehicleStatus_new" USING ("status"::text::"VehicleStatus_new");
ALTER TYPE "VehicleStatus" RENAME TO "VehicleStatus_old";
ALTER TYPE "VehicleStatus_new" RENAME TO "VehicleStatus";
DROP TYPE "public"."VehicleStatus_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT "MaintenanceAlert_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "MileageLog" DROP CONSTRAINT "MileageLog_driverId_fkey";

-- DropForeignKey
ALTER TABLE "MileageLog" DROP CONSTRAINT "MileageLog_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "RepairRequest" DROP CONSTRAINT "RepairRequest_garageId_fkey";

-- DropForeignKey
ALTER TABLE "RepairRequest" DROP CONSTRAINT "RepairRequest_reportedById_fkey";

-- DropForeignKey
ALTER TABLE "RepairRequest" DROP CONSTRAINT "RepairRequest_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_driverProfileId_fkey";

-- DropForeignKey
ALTER TABLE "Vehicle" DROP CONSTRAINT "Vehicle_driverId_fkey";

-- DropTable
DROP TABLE "Driver";

-- DropTable
DROP TABLE "Garage";

-- DropTable
DROP TABLE "MaintenanceAlert";

-- DropTable
DROP TABLE "MileageLog";

-- DropTable
DROP TABLE "RepairRequest";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "Vehicle";

-- DropEnum
DROP TYPE "AlertStatus";

-- DropEnum
DROP TYPE "DriverStatus";

-- DropEnum
DROP TYPE "Role";

-- CreateTable
CREATE TABLE "vehicle_types" (
    "type_id" SERIAL NOT NULL,
    "type_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("type_id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "driver_id" SERIAL NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "driver_id" INTEGER,
    "full_name" VARCHAR(200),
    "email" VARCHAR(200),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "vehicle_id" SERIAL NOT NULL,
    "license_plate" VARCHAR(20) NOT NULL,
    "type_id" INTEGER NOT NULL,
    "driver_id" INTEGER,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "year" INTEGER,
    "color" VARCHAR(50),
    "status" "VehicleStatus" NOT NULL DEFAULT 'READY',
    "oil_change_interval_km" INTEGER,
    "tire_change_interval_km" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "mileage_logs" (
    "mileage_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "record_month" DATE NOT NULL,
    "mileage_start" INTEGER NOT NULL,
    "mileage_end" INTEGER NOT NULL,
    "distance_km" INTEGER,
    "recorded_by" INTEGER NOT NULL,

    CONSTRAINT "mileage_logs_pkey" PRIMARY KEY ("mileage_id")
);

-- CreateTable
CREATE TABLE "garages" (
    "garage_id" SERIAL NOT NULL,
    "garage_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "address" VARCHAR(200),
    "sub_district" VARCHAR(100),
    "district" VARCHAR(100),
    "province" VARCHAR(100),
    "postal_code" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "garages_pkey" PRIMARY KEY ("garage_id")
);

-- CreateTable
CREATE TABLE "repair_requests" (
    "request_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "request_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issue_description" TEXT NOT NULL,
    "mileage_at_repair" INTEGER,
    "repair_type" "RepairType" NOT NULL DEFAULT 'GENERAL',
    "status" "RepairStatus" NOT NULL DEFAULT 'PENDING',
    "garage_id" INTEGER,
    "repair_start_date" DATE,
    "repair_end_date" DATE,
    "repair_detail" TEXT,
    "receipt_image" VARCHAR(500),
    "total_cost" DECIMAL(10,2),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "maintenance_alerts" (
    "alert_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "last_service_mileage" INTEGER NOT NULL,
    "next_service_mileage" INTEGER NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "maintenance_alerts_pkey" PRIMARY KEY ("alert_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_driver_id_key" ON "users"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "vehicle_types"("type_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mileage_logs" ADD CONSTRAINT "mileage_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_garage_id_fkey" FOREIGN KEY ("garage_id") REFERENCES "garages"("garage_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_alerts" ADD CONSTRAINT "maintenance_alerts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;
