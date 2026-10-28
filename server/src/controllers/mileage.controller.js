const prisma = require('../lib/prisma');
const alertService = require('../services/alert.service');exports.getByVehicle = async (req, res) => {
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
            const alertRes = await alertService.checkAndCreateMaintenanceAlerts(vid, mileage_end_int);
            triggeredAlerts = alertRes.createdAlertTypes || [];
            maintenanceWarnings = alertRes.warnings || [];
        } catch (alertErr) {
            console.error('Auto maintenance alert error:', alertErr.message);
        }

        res.status(201).json({ ...log, distance_km: mileage_end_int - mileage_start, triggeredAlerts, maintenanceWarnings });
    } catch (err) { res.status(400).json({ message: err.message }); }
};

