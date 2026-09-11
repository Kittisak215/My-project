const prisma = require('../lib/prisma');

exports.getByVehicle = async (req, res) => {
    try {
        const logs = await prisma.mileageLog.findMany({
            where: { vehicle_id: parseInt(req.params.vehicleId) },
            orderBy: [
                { record_date: 'desc' },
                { mileage_id: 'desc' }
            ],
            include: { recordedBy: true },
        });
        res.json(logs);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addLog = async (req, res) => {
    try {
        const { vehicle_id, record_date, mileage_end, recorded_by } = req.body;
        const vid = parseInt(vehicle_id);

        // Get latest log or the vehicle's initial mileage
        const lastLog = await prisma.mileageLog.findFirst({
            where: { vehicle_id: vid },
            orderBy: [
                { record_date: 'desc' },
                { mileage_id: 'desc' }
            ],
        });
        const mileage_start = lastLog ? lastLog.mileage_end : 0;
        const mileage_end_int = parseInt(mileage_end);

        if (isNaN(mileage_end_int) || mileage_end_int < 0) {
            return res.status(400).json({ message: 'เลขไมล์ต้องเป็นตัวเลขที่ไม่ติดลบ' });
        }

        if (mileage_end_int < mileage_start) {
            return res.status(400).json({ message: `เลขไมล์ต้องมากกว่าหรือเท่ากับ ${mileage_start} กม.` });
        }

        let driverId = req.user.role === 'DRIVER' ? req.user.driver_id : parseInt(recorded_by);
        if (!driverId || isNaN(driverId)) {
            const v = await prisma.vehicle.findUnique({ where: { vehicle_id: vid }, select: { driver_id: true } });
            driverId = v?.driver_id;
        }
        if (!driverId || isNaN(driverId)) {
            const firstDriver = await prisma.driver.findFirst({ select: { driver_id: true } });
            driverId = firstDriver?.driver_id;
        }

        // Parse date: accept YYYY-MM-DD
        const parsedDate = record_date ? new Date(record_date) : new Date();

        const log = await prisma.mileageLog.create({
            data: {
                vehicle_id: vid,
                record_date: parsedDate,
                record_month: new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1),
                mileage_start,
                mileage_end: mileage_end_int,
                distance_km: mileage_end_int - mileage_start,
                recorded_by: driverId,
            },
        });

        // ── ตรวจสอบและสร้าง/อัปเดต MaintenanceAlert อัตโนมัติ ──────────
        let triggeredAlerts = [];
        let maintenanceWarnings = [];
        try {
            const alertRes = await checkAndCreateMaintenanceAlerts(vid, mileage_end_int);
            triggeredAlerts = alertRes.createdAlertTypes || [];
            maintenanceWarnings = alertRes.warnings || [];
        } catch (alertErr) {
            console.error('Auto maintenance alert error:', alertErr.message);
        }

        res.status(201).json({ ...log, distance_km: mileage_end_int - mileage_start, triggeredAlerts, maintenanceWarnings });
    } catch (err) { res.status(400).json({ message: err.message }); }
};

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
    const tireInterval = vt?.tire_change_interval_km ?? 50000;

    // ดึงเกรดน้ำมันล่าสุดที่ใช้กับรถคันนี้ เพื่อหา interval ที่ถูกต้อง
    const lastOilRepair = await prisma.repairRequest.findFirst({
        where: { vehicle_id: vehicleId, oil_grade: { not: null } },
        orderBy: { created_at: 'desc' },
        select: { oil_grade: true }
    });
    const lastOilGrade = lastOilRepair?.oil_grade || 'FULLY_SYNTHETIC';
    const oilIntervalMap = {
        MINERAL:         vt?.oil_interval_mineral_km         ?? 5000,
        SEMI_SYNTHETIC:  vt?.oil_interval_semi_synthetic_km  ?? 7000,
        FULLY_SYNTHETIC: vt?.oil_interval_fully_synthetic_km ?? 10000,
    };
    const oilInterval = oilIntervalMap[lastOilGrade] ?? oilIntervalMap.FULLY_SYNTHETIC;

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

            // แจ้งเตือนล่วงหน้า 10% ก่อนถึงรอบ (เช่น รอบ 10,000 → เริ่มแจ้งที่ 9,000)
            const warningThreshold = nextServiceMileage - Math.round(interval * 0.1);

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

        // เช็คเกณฑ์เตือนว่าเหลือน้อยกว่าหรือเท่ากับ 1,000 กม. หรือไม่ (หรือเลยกำหนดแล้ว)
        const remainingMileage = nextServiceMileage - currentMileage;
        if (remainingMileage <= 1000) {
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
