const prisma = require('../lib/prisma');

// Helper: ดึงระยะทางน้ำมันเครื่องตามเกรด
function getOilIntervalByGrade(oilGrade, vehicle) {
    const vt = vehicle.vehicleType;
    const defaults = { MINERAL: 5000, SEMI_SYNTHETIC: 7000, FULLY_SYNTHETIC: 10000 };
    if (oilGrade === 'MINERAL') return vehicle.oil_interval_mineral_km ?? vt?.oil_interval_mineral_km ?? defaults.MINERAL;
    if (oilGrade === 'SEMI_SYNTHETIC') return vehicle.oil_interval_semi_synthetic_km ?? vt?.oil_interval_semi_synthetic_km ?? defaults.SEMI_SYNTHETIC;
    if (oilGrade === 'FULLY_SYNTHETIC') return vehicle.oil_interval_fully_synthetic_km ?? vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
    // Fallback: ใช้ fully synthetic
    return vehicle.oil_interval_fully_synthetic_km ?? vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
}

/**
 * ตรวจสอบว่าเลขไมล์ปัจจุบันถึงเกณฑ์บำรุงรักษาหรือยัง
 * ถ้าถึงแล้ว: สร้าง/อัปเดต MaintenanceAlert และยิง Socket Event
 */
async function checkAndCreateMaintenanceAlerts(vehicleId, currentMileage) {
    // ดึงข้อมูลรถ (รวม VehicleType สำหรับ interval default)
    const vehicle = await prisma.vehicle.findUnique({
        where: { vehicle_id: vehicleId },
        include: { vehicleType: true },
    });
    if (!vehicle) return { createdAlertTypes: [], warnings: [] };

    const vt = vehicle.vehicleType;
    const tireInterval = vehicle.tire_change_interval_km ?? vt?.tire_change_interval_km ?? 50000;

    // ดึงเกรดน้ำมันล่าสุดที่ใช้กับรถคันนี้ เพื่อหา interval ที่ถูกต้อง
    const lastOilRepair = await prisma.repairRequest.findFirst({
        where: { vehicle_id: vehicleId, oil_grade: { not: null } },
        orderBy: { created_at: 'desc' },
        select: { oil_grade: true }
    });
    const lastOilGrade = lastOilRepair?.oil_grade || 'FULLY_SYNTHETIC';
    const oilInterval = getOilIntervalByGrade(lastOilGrade, vehicle);

    const alertTypes = [
        { type: 'OIL_CHANGE',  interval: oilInterval },
        { type: 'TIRE_CHANGE', interval: tireInterval },
    ];

    let createdAlertTypes = [];
    let warnings = [];

    for (const { type, interval } of alertTypes) {
        // ดึง alert ที่ยังไม่ถูก resolve ของรถนี้
        const existingAlert = await prisma.maintenanceAlert.findFirst({
            where: { vehicle_id: vehicleId, alert_type: type, is_resolved: false },
        });

        let nextServiceMileage = 0;

        if (existingAlert) {
            nextServiceMileage = existingAlert.next_service_mileage;
        } else {
            // ไม่มี alert ที่ pending → คำนวณว่าถึงรอบหรือยัง
            // หา last_service_mileage จาก resolved alert ล่าสุด (ถ้าไม่มีใช้ 0)
            const lastResolved = await prisma.maintenanceAlert.findFirst({
                where: { vehicle_id: vehicleId, alert_type: type, is_resolved: true },
                orderBy: [{ next_service_mileage: 'desc' }, { alert_id: 'desc' }],
            });

            const lastServiceMileage = lastResolved ? lastResolved.next_service_mileage : 0;
            nextServiceMileage = lastServiceMileage + interval;

            // แจ้งเตือนล่วงหน้า 2,000 กม. ก่อนถึงรอบ
            const warningThreshold = nextServiceMileage - 2000;

            if (currentMileage >= warningThreshold) {
                await prisma.maintenanceAlert.create({
                    data: {
                        vehicle_id: vehicleId,
                        alert_type: type,
                        last_service_mileage: lastServiceMileage,
                        next_service_mileage: nextServiceMileage,
                    },
                });
                createdAlertTypes.push(type);
            }
        }

        // เช็คเกณฑ์เตือน
        const warningThreshold = nextServiceMileage - 2000;
        const remainingMileage = nextServiceMileage - currentMileage;
        
        if (currentMileage >= warningThreshold) {
            warnings.push({
                type,
                next_service_mileage: nextServiceMileage,
                remaining_mileage: remainingMileage,
                is_overdue: remainingMileage <= 0,
                overdue_by: remainingMileage <= 0 ? Math.abs(remainingMileage) : 0
            });
        }
    }

    // ยิง Socket Event ให้ทุก client รับทราบ
    if (createdAlertTypes.length > 0) {
        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }
    }
    
    return { createdAlertTypes, warnings };
}

module.exports = {
    getOilIntervalByGrade,
    checkAndCreateMaintenanceAlerts
};
