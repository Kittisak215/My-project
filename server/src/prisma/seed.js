const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create Drivers
    const driver1 = await prisma.driver.upsert({
        where: { code: 'D001' },
        update: {},
        create: { code: 'D001', fullName: 'นายสมชาย ใจดี', phone: '081-234-5678', status: 'ACTIVE' },
    });
    const driver2 = await prisma.driver.upsert({
        where: { code: 'D002' },
        update: {},
        create: { code: 'D002', fullName: 'นายเอก พขร.', phone: '089-876-5432', status: 'ACTIVE' },
    });
    const driver3 = await prisma.driver.upsert({
        where: { code: 'D003' },
        update: {},
        create: { code: 'D003', fullName: 'นางสาวสมหญิง งานดี', phone: '083-444-5555', status: 'ACTIVE' },
    });

    // Create Users
    const adminPass = await bcrypt.hash('123456', 10);
    const execPass = await bcrypt.hash('123456', 10);
    const driverPass = await bcrypt.hash('123456', 10);

    for (const u of ['Admin', 'admin']) {
        await prisma.user.upsert({
            where: { username: u },
            update: {},
            create: { username: u, password: adminPass, role: 'ADMIN' },
        });
    }
    for (const u of ['Exec', 'exec']) {
        await prisma.user.upsert({
            where: { username: u },
            update: {},
            create: { username: u, password: execPass, role: 'EXECUTIVE' },
        });
    }
    for (const u of ['Driver', 'driver']) {
        await prisma.user.upsert({
            where: { username: u },
            update: {},
            create: { username: u, password: driverPass, role: 'DRIVER', driverProfileId: driver1.id },
        });
    }

    // Create Vehicles
    const v1 = await prisma.vehicle.upsert({
        where: { plateNumber: 'กข-1234' },
        update: {},
        create: { plateNumber: 'กข-1234', province: 'บุรีรัมย์', type: 'รถตู้ (Van)', brand: 'Toyota', model: 'Commuter', color: 'ขาว', year: 2020, status: 'READY', currentMileage: 15200, driverId: driver1.id, taxDueDate: new Date('2026-06-15') },
    });
    const v2 = await prisma.vehicle.upsert({
        where: { plateNumber: 'นข-9999' },
        update: {},
        create: { plateNumber: 'นข-9999', province: 'นครราชสีมา', type: 'รถกระบะ (Pickup)', brand: 'Isuzu', model: 'D-Max', color: 'เทา', year: 2018, status: 'IN_REPAIR', currentMileage: 49850, driverId: driver2.id },
    });
    const v3 = await prisma.vehicle.upsert({
        where: { plateNumber: 'บย-5555' },
        update: {},
        create: { plateNumber: 'บย-5555', province: 'บุรีรัมย์', type: 'รถเก๋ง (Sedan)', brand: 'Honda', model: 'Civic', color: 'ดำ', year: 2022, status: 'READY', currentMileage: 32100, driverId: driver3.id },
    });

    // Create Garages
    const g1 = await prisma.garage.upsert({
        where: { code: 'G001' },
        update: {},
        create: { code: 'G001', name: 'อู่ช่างเอก เซอร์วิส', phone: '044-111-222', address: '123/45 หมู่ 1 ถนนบุรีรัมย์-นางรอง ต.อิสาณ อ.เมือง จ.บุรีรัมย์ 31000', specialties: 'รับซ่อมช่วงล่าง, เครื่องยนต์' },
    });
    const g2 = await prisma.garage.upsert({
        where: { code: 'G002' },
        update: {},
        create: { code: 'G002', name: 'สมชาย แอร์ออโต้', phone: '081-999-8888', address: '99 ถนนธานี ต.ในเมือง อ.เมือง จ.บุรีรัมย์ 31000', specialties: 'ผู้เชี่ยวชาญระบบแอร์รถยนต์' },
    });

    // Create Repair Requests
    const r1 = await prisma.repairRequest.upsert({
        where: { repairNo: 'REP-001' },
        update: {},
        create: { repairNo: 'REP-001', vehicleId: v3.id, reportedById: admin.id, repairType: 'ซ่อมทั่วไป', description: 'แอร์ไม่เย็น มีแต่ลมร้อนออกมา ตรวจเช็คน้ำยาแอร์', garageId: g2.id, actualCost: 1200, status: 'COMPLETED', completedAt: new Date('2026-02-19'), mileageAtReport: 32100 },
    });
    const r2 = await prisma.repairRequest.upsert({
        where: { repairNo: 'REP-002' },
        update: {},
        create: { repairNo: 'REP-002', vehicleId: v2.id, reportedById: admin.id, repairType: 'ซ่อมทั่วไป', description: 'ยางหน้าซ้ายระเบิดขณะปฏิบัติหน้าที่ ต้องการเปลี่ยนยางด่วน', garageId: g1.id, status: 'IN_PROGRESS', mileageAtReport: 49850 },
    });
    const r3 = await prisma.repairRequest.upsert({
        where: { repairNo: 'REP-003' },
        update: {},
        create: { repairNo: 'REP-003', vehicleId: v1.id, reportedById: admin.id, repairType: 'บำรุงรักษาตามระยะ', description: 'ไฟแจ้งเตือนน้ำมันเครื่องโชว์หน้าปัด ถึงระยะเปลี่ยนถ่ายแล้ว', status: 'PENDING', mileageAtReport: 15200 },
    });

    // Create Maintenance Alerts
    await prisma.maintenanceAlert.upsert({
        where: { id: 1 },
        update: {},
        create: { vehicleId: v1.id, alertType: 'เปลี่ยนถ่ายน้ำมันเครื่อง', lastServiceMileage: 5000, targetMileage: 15000, status: 'OVERDUE' },
    });
    await prisma.maintenanceAlert.upsert({
        where: { id: 2 },
        update: {},
        create: { vehicleId: v2.id, alertType: 'เปลี่ยนยาง 4 เส้น', lastServiceMileage: 0, targetMileage: 50000, status: 'UPCOMING' },
    });
    await prisma.maintenanceAlert.upsert({
        where: { id: 3 },
        update: {},
        create: { vehicleId: v3.id, alertType: 'เปลี่ยนถ่ายน้ำมันเครื่อง', lastServiceMileage: 20000, targetMileage: 30000, status: 'DONE' },
    });

    // Create Mileage Logs
    await prisma.mileageLog.createMany({
        data: [
            { vehicleId: v1.id, driverId: driver1.id, recordMonth: '2026-01', mileage: 15200, previousMileage: 14000, distance: 1200 },
            { vehicleId: v1.id, driverId: driver1.id, recordMonth: '2025-12', mileage: 14000, previousMileage: 13050, distance: 950 },
        ],
        skipDuplicates: true,
    });

    console.log('✅ Seed completed!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
