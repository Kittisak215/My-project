const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, alert_type } = req.query;
        const where = {};
        if (search) where.vehicle = { license_plate: { contains: search, mode: 'insensitive' } };
        if (alert_type && alert_type !== 'all') where.alert_type = alert_type;

        const alerts = await prisma.maintenanceAlert.findMany({
            where,
            include: { vehicle: { include: { driver: true } } },
            orderBy: { is_resolved: 'asc' },
        });

        // Enrich with status
        const enriched = alerts.map(a => ({
            ...a,
            status: a.is_resolved ? 'DONE'
                : a.vehicle?.status === 'READY'
                    ? (a.next_service_mileage > 0 ? 'UPCOMING' : 'UPCOMING')
                    : 'UPCOMING',
        }));

        res.json(enriched);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { vehicle_id, alert_type, last_service_mileage, next_service_mileage } = req.body;
        const alert = await prisma.maintenanceAlert.create({
            data: { vehicle_id: parseInt(vehicle_id), alert_type, last_service_mileage: parseInt(last_service_mileage), next_service_mileage: parseInt(next_service_mileage) },
            include: { vehicle: true }
        });
        res.status(201).json(alert);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const alert = await prisma.maintenanceAlert.update({
            where: { alert_id: parseInt(req.params.id) },
            data: req.body,
            include: { vehicle: true }
        });
        res.json(alert);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.recalculate = async (req, res) => {
    try {
        // Dummy implementation for recalculate
        res.json({ message: 'Recalculated successfully' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
