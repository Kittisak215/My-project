const prisma = require('../lib/prisma');

exports.getByVehicle = async (req, res) => {
    try {
        const logs = await prisma.mileageLog.findMany({
            where: { vehicle_id: parseInt(req.params.vehicleId) },
            orderBy: { record_date: 'desc' },
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
            orderBy: { record_date: 'desc' },
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

        res.status(201).json({ ...log, distance_km: mileage_end_int - mileage_start });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
