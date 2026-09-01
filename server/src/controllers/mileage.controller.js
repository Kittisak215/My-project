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

        if (mileage_end_int < mileage_start) {
            return res.status(400).json({ message: `เลขไมล์ต้องมากกว่า ${mileage_start} กม.` });
        }

        const driverId = req.user.role === 'DRIVER' ? req.user.driver_id : parseInt(recorded_by);

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
        try {
            triggeredAlerts = await checkAndCreateMaintenanceAlerts(vid, mileage_end_int);
        } catch (alertErr) {
            console.error('Auto maintenance alert error:', alertErr.message);
        }

        res.status(201).json({ ...log, distance_km: mileage_end_int - mileage_start, triggeredAlerts });
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
    if (!vehicle) return [];

    const oilInterval   = vehicle.oil_change_interval_km  ?? vehicle.vehicleType?.oil_change_interval_km  ?? 10000;
    const tireInterval  = vehicle.tire_change_interval_km ?? vehicle.vehicleType?.tire_change_interval_km ?? 50000;

    const alertTypes = [
        { type: 'OIL_CHANGE',  interval: oilInterval },
        { type: 'TIRE_CHANGE', interval: tireInterval },
    ];

    let createdAlertTypes = [];

    for (const { type, interval } of alertTypes) {
        // ดึง alert ที่ยังไม่ถูก resolve ของรถนี้
        const existingAlert = await prisma.maintenanceAlert.findFirst({
            where: { vehicle_id: vehicleId, alert_type: type, is_resolved: false },
        });

        if (existingAlert) {
            // ถึงหรือเกินกำหนดบริการ → อัปเดต (ไม่สร้างซ้ำ)
            // แค่คงไว้ให้แจ้งเตือน ไม่ต้องทำอะไรเพิ่ม
            continue;
        }

        // ไม่มี alert ที่ pending → คำนวณว่าถึงรอบหรือยัง
        // หา last_service_mileage จาก resolved alert ล่าสุด (ถ้าไม่มีใช้ 0)
        const lastResolved = await prisma.maintenanceAlert.findFirst({
            where: { vehicle_id: vehicleId, alert_type: type, is_resolved: true },
            orderBy: { next_service_mileage: 'desc' },
        });

        const lastServiceMileage = lastResolved ? lastResolved.next_service_mileage : 0;
        const nextServiceMileage = lastServiceMileage + interval;

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

    // ยิง Socket Event ให้ทุก client รับทราบ
    if (createdAlertTypes.length > 0) {
        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }
    }
    
    return createdAlertTypes;
}
