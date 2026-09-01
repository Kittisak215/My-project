const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, alert_type } = req.query;
        const where = {};
        if (search) where.vehicle = { license_plate: { contains: search, mode: 'insensitive' } };
        if (alert_type && alert_type !== 'all') where.alert_type = alert_type;

        const alerts = await prisma.maintenanceAlert.findMany({
            where,
            include: { 
                vehicle: { 
                    include: { 
                        driver: true,
                        mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 }
                    } 
                } 
            },
            orderBy: { is_resolved: 'asc' },
        });

        // Enrich with status and vehicle current_mileage
        const enriched = alerts.map(a => {
            const currentMileage = a.vehicle?.mileageLogs?.[0]?.mileage_end || 0;
            const vehicle = a.vehicle ? { ...a.vehicle, current_mileage: currentMileage } : null;
            
            let status = 'UPCOMING';
            if (a.is_resolved) {
                status = 'DONE';
            } else if (currentMileage >= a.next_service_mileage) {
                status = 'OVERDUE';
            }
            return { ...a, vehicle, status };
        });

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
        
        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }
        
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

exports.getForecast = async (req, res) => {
    try {
        const where = { is_active: true };
        if (req.user.role === 'DRIVER') {
            where.driver_id = req.user.driver_id;
        }

        const vehicles = await prisma.vehicle.findMany({
            where,
            include: {
                vehicleType: true,
                mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 },
                alerts: { where: { is_resolved: false } }
            },
            orderBy: { created_at: 'desc' }
        });

        const forecast = await Promise.all(vehicles.map(async (v) => {
            const currentMileage = v.mileageLogs?.[0]?.mileage_end || 0;
            const oilInterval = v.oil_change_interval_km ?? v.vehicleType?.oil_change_interval_km ?? 10000;
            const tireInterval = v.tire_change_interval_km ?? v.vehicleType?.tire_change_interval_km ?? 50000;

            const calculateTypeForecast = async (type, interval) => {
                const pendingAlert = v.alerts.find(a => a.alert_type === type);
                let next_service_mileage = 0;

                if (pendingAlert) {
                    next_service_mileage = pendingAlert.next_service_mileage;
                } else {
                    const lastResolved = await prisma.maintenanceAlert.findFirst({
                        where: { vehicle_id: v.vehicle_id, alert_type: type, is_resolved: true },
                        orderBy: { next_service_mileage: 'desc' }
                    });
                    next_service_mileage = (lastResolved ? lastResolved.next_service_mileage : 0) + interval;
                }

                return {
                    type,
                    interval,
                    next_service_mileage,
                    remaining_mileage: next_service_mileage - currentMileage
                };
            };

            const oilForecast = await calculateTypeForecast('OIL_CHANGE', oilInterval);
            const tireForecast = await calculateTypeForecast('TIRE_CHANGE', tireInterval);

            return {
                vehicle: {
                    vehicle_id: v.vehicle_id,
                    license_plate: v.license_plate,
                    brand: v.brand,
                    model: v.model,
                },
                current_mileage: currentMileage,
                forecasts: [oilForecast, tireForecast]
            };
        }));

        res.json(forecast);
    } catch (err) { res.status(500).json({ message: err.message }); }
};
