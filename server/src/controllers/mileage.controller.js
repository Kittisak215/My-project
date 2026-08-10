const prisma = require('../lib/prisma');

exports.getByVehicle = async (req, res) => {
    try {
        const logs = await prisma.mileageLog.findMany({
            where: { vehicle_id: parseInt(req.params.vehicleId) },
            orderBy: { mileage_id: 'desc' },
            include: { recordedBy: true },
        });
        res.json(logs);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addLog = async (req, res) => {
    try {
        const { vehicle_id, record_month, mileage_end, recorded_by } = req.body;
        const vid = parseInt(vehicle_id);

        // Get latest log or the vehicle's initial mileage
        const lastLog = await prisma.mileageLog.findFirst({
            where: { vehicle_id: vid },
            orderBy: { mileage_id: 'desc' },
        });
        const mileage_start = lastLog ? lastLog.mileage_end : 0;
        const mileage_end_int = parseInt(mileage_end);

        if (mileage_end_int < mileage_start) {
            return res.status(400).json({ message: `เลขไมล์ต้องมากกว่า ${mileage_start} กม.` });
        }

        const driverId = req.user.role === 'DRIVER' ? req.user.driver_id : parseInt(recorded_by);

        const log = await prisma.mileageLog.create({
            data: {
                vehicle_id: vid,
                record_month: new Date(record_month + '-01'),
                mileage_start,
                mileage_end: mileage_end_int,
                distance_km: mileage_end_int - mileage_start,
                recorded_by: driverId,
            },
        });

        // Update vehicle alerts
        await checkAndUpdateAlerts(vid, mileage_end_int);

        res.status(201).json({ ...log, distance_km: mileage_end_int - mileage_start });
    } catch (err) { res.status(400).json({ message: err.message }); }
};

async function checkAndUpdateAlerts(vehicleId, currentMileage) {
    const alerts = await prisma.maintenanceAlert.findMany({
        where: { vehicle_id: vehicleId, is_resolved: false },
    });
    for (const alert of alerts) {
        if (currentMileage >= alert.next_service_mileage) {
            // Mark as needing resolution but don't auto-resolve
        }
    }
}
