require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
    console.log('🌱 Seeding database...');

    // ============================================
    // Vehicle Types
    // ============================================
    const types = await Promise.all([
        prisma.vehicleType.upsert({ where: { type_id: 1 }, update: {}, create: { type_name: 'รถตู้ (Van)', oil_change_interval_km: 10000, tire_change_interval_km: 50000 } }),
        prisma.vehicleType.upsert({ where: { type_id: 2 }, update: {}, create: { type_name: 'รถกระบะ (Pickup)', oil_change_interval_km: 7000, tire_change_interval_km: 40000 } }),
        prisma.vehicleType.upsert({ where: { type_id: 3 }, update: {}, create: { type_name: 'รถเก๋ง (Sedan)', oil_change_interval_km: 10000, tire_change_interval_km: 40000 } }),
        prisma.vehicleType.upsert({ where: { type_id: 4 }, update: {}, create: { type_name: 'รถบัส (Bus)', oil_change_interval_km: 15000, tire_change_interval_km: 60000 } }),
    ]);
    console.log(`✅ Created ${types.length} vehicle types`);

    // ============================================
    // Drivers
    // ============================================
    const driver1 = await prisma.driver.upsert({
        where: { driver_id: 1 }, update: {},
        create: { full_name: 'สมชาย ขับดี', phone: '081-234-5678', is_active: true },
    });
    const driver2 = await prisma.driver.upsert({
        where: { driver_id: 2 }, update: {},
        create: { full_name: 'สมหญิง ใจดี', phone: '082-345-6789', is_active: true },
    });
    console.log(`✅ Created 2 drivers`);

    // ============================================
    // Users
    // ============================================
    const adminHash = await bcrypt.hash('admin123', 10);
    const execHash = await bcrypt.hash('exec123', 10);
    const driverHash = await bcrypt.hash('driver123', 10);

    await prisma.user.upsert({
        where: { username: 'admin' }, update: {},
        create: { username: 'admin', password_hash: adminHash, role: 'ADMIN', full_name: 'ผู้ดูแลระบบ', is_active: true },
    });
    await prisma.user.upsert({
        where: { username: 'exec' }, update: {},
        create: { username: 'exec', password_hash: execHash, role: 'EXECUTIVE', full_name: 'ผู้อำนวยการ', is_active: true },
    });
    await prisma.user.upsert({
        where: { username: 'driver' }, update: {},
        create: { username: 'driver', password_hash: driverHash, role: 'DRIVER', full_name: driver1.full_name, driver_id: driver1.driver_id, is_active: true },
    });
    console.log(`✅ Created 3 users (admin/exec/driver)`);

    // ============================================
    // Vehicles
    // ============================================
    const vehicle1 = await prisma.vehicle.upsert({
        where: { license_plate: 'กข 1234' }, update: {},
        create: {
            license_plate: 'กข 1234', type_id: types[0].type_id, driver_id: driver1.driver_id,
            brand: 'Toyota', model: 'HiAce', year: 2020, color: 'ขาว',
            status: 'READY', oil_change_interval_km: 10000, tire_change_interval_km: 50000,
        },
    });
    const vehicle2 = await prisma.vehicle.upsert({
        where: { license_plate: 'คง 5678' }, update: {},
        create: {
            license_plate: 'คง 5678', type_id: types[1].type_id, driver_id: driver2.driver_id,
            brand: 'Isuzu', model: 'D-MAX', year: 2019, color: 'เทา',
            status: 'READY', oil_change_interval_km: 5000, tire_change_interval_km: 40000,
        },
    });
    console.log(`✅ Created 2 vehicles`);

    // ============================================
    // Garages
    // ============================================
    const garage1 = await prisma.garage.upsert({
        where: { garage_id: 1 }, update: {},
        create: {
            garage_name: 'ศูนย์บริการ Toyota สุขุมวิท', phone: '02-111-2222',
            specialization: ['GENERAL', 'ENGINE'],
            address: '123 ถ.สุขุมวิท', sub_district: 'คลองเตย', district: 'คลองเตย',
            province: 'กรุงเทพมหานคร', postal_code: '10110', is_active: true,
        },
    });
    const garage2 = await prisma.garage.upsert({
        where: { garage_id: 2 }, update: {},
        create: {
            garage_name: 'อู่ช่างเสกสรร', phone: '081-999-8888',
            specialization: ['SUSPENSION', 'TIRES'],
            address: '456 ถ.พระราม 4', sub_district: 'พระโขนง', district: 'คลองเตย',
            province: 'กรุงเทพมหานคร', postal_code: '10260', is_active: true,
        },
    });
    console.log(`✅ Created 2 garages`);

    // ============================================
    // Mileage Logs
    // ============================================
    await prisma.mileageLog.createMany({
        data: [
            { vehicle_id: vehicle1.vehicle_id, record_month: new Date('2025-11-01'), mileage_start: 45000, mileage_end: 47200, distance_km: 2200, recorded_by: driver1.driver_id },
            { vehicle_id: vehicle1.vehicle_id, record_month: new Date('2025-12-01'), mileage_start: 47200, mileage_end: 49800, distance_km: 2600, recorded_by: driver1.driver_id },
            { vehicle_id: vehicle1.vehicle_id, record_month: new Date('2026-01-01'), mileage_start: 49800, mileage_end: 52100, distance_km: 2300, recorded_by: driver1.driver_id },
        ],
        skipDuplicates: true,
    });
    console.log(`✅ Created mileage logs`);

    // ============================================
    // Repair Requests
    // ============================================
    await prisma.repairRequest.createMany({
        data: [
            {
                vehicle_id: vehicle1.vehicle_id, driver_id: driver1.driver_id,
                issue_description: 'เครื่องยนต์มีเสียงผิดปกติเมื่อเร่งเครื่อง และมีควันดำออกจากท่อไอเสีย',
                mileage_at_repair: 52100, repair_type: 'GENERAL', status: 'COMPLETED',
                garage_id: garage1.garage_id, total_cost: 8500,
                repair_detail: 'เปลี่ยนถ่ายน้ำมันเครื่อง, กรองน้ำมัน, ตรวจสอบระบบไอเสีย',
                repair_start_date: new Date('2026-01-15'), repair_end_date: new Date('2026-01-16'),
            },
            {
                vehicle_id: vehicle2.vehicle_id, driver_id: driver2.driver_id,
                issue_description: 'ยางแตกกลางทาง ต้องการเบิกค่าเปลี่ยนยางฉุกเฉิน',
                mileage_at_repair: 38000, repair_type: 'EMERGENCY', status: 'AWAITING_APPROVAL',
                total_cost: 12000, note: 'เร่งด่วน รอการอนุมัติจากผู้บริหาร',
            },
            {
                vehicle_id: vehicle1.vehicle_id, driver_id: driver1.driver_id,
                issue_description: 'ไฟหน้าดวงซ้ายขัดข้อง ไม่สามารถเปิดได้',
                mileage_at_repair: 52500, repair_type: 'GENERAL', status: 'PENDING',
            },
        ],
        skipDuplicates: true,
    });
    console.log(`✅ Created 3 repair requests`);

    // ============================================
    // Maintenance Alerts
    // ============================================
    await prisma.maintenanceAlert.createMany({
        data: [
            { vehicle_id: vehicle1.vehicle_id, alert_type: 'OIL_CHANGE', last_service_mileage: 45000, next_service_mileage: 55000, is_resolved: false },
            { vehicle_id: vehicle1.vehicle_id, alert_type: 'TIRE_CHANGE', last_service_mileage: 20000, next_service_mileage: 70000, is_resolved: false },
            { vehicle_id: vehicle2.vehicle_id, alert_type: 'OIL_CHANGE', last_service_mileage: 33000, next_service_mileage: 38000, is_resolved: false },
        ],
        skipDuplicates: true,
    });
    console.log(`✅ Created maintenance alerts`);

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('📋 Demo Login Accounts:');
    console.log('   Admin   : username=admin   password=admin123');
    console.log('   Executive: username=exec    password=exec123');
    console.log('   Driver  : username=driver  password=driver123');
}

main()
    .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
