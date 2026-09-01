const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) {
            const searchTerm = search.trim();
            where.OR = [
                { license_plate: { contains: searchTerm, mode: 'insensitive' } },
                { brand: { contains: searchTerm, mode: 'insensitive' } },
                { model: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }
        if (status) {
            if (status === 'INACTIVE') {
                where.is_active = false;
            } else {
                where.status = status;
                if (req.query.is_active === undefined) {
                    where.is_active = true;
                }
            }
        }
        if (req.query.is_active !== undefined && req.query.is_active !== '') {
            where.is_active = req.query.is_active === 'true';
        }

        const [vehicles, total] = await Promise.all([
            prisma.vehicle.findMany({
                where, skip, take: parseInt(limit),
                include: {
                    driver: true,
                    vehicleType: true,
                    mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 }
                },
                orderBy: { created_at: 'desc' },
            }),
            prisma.vehicle.count({ where }),
        ]);

        const vehiclesWithMileage = vehicles.map(v => ({
            ...v,
            current_mileage: v.mileageLogs?.[0]?.mileage_end || 0
        }));

        res.json({ data: vehiclesWithMileage, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getById = async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { vehicle_id: parseInt(req.params.id) },
            include: {
                driver: true,
                vehicleType: true,
                repairs: { orderBy: { created_at: 'desc' }, take: 5 },
                mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 6 },
                alerts: true
            },
        });
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        const current_mileage = vehicle.mileageLogs?.[0]?.mileage_end || 0;
        res.json({ ...vehicle, current_mileage });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { type_id, driver_id, ...rest } = req.body;

        // Fetch type to get default intervals
        const type = await prisma.vehicleType.findUnique({
            where: { type_id: parseInt(type_id) }
        });

        const vehicle = await prisma.vehicle.create({
            data: {
                ...rest,
                type_id: parseInt(type_id),
                ...(driver_id ? { driver_id: parseInt(driver_id) } : {}),
                oil_change_interval_km: rest.oil_change_interval_km || type?.oil_change_interval_km,
                tire_change_interval_km: rest.tire_change_interval_km || type?.tire_change_interval_km,
            },
            include: { driver: true, vehicleType: true }
        });
        res.status(201).json(vehicle);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const { type_id, driver_id, ...rest } = req.body;
        const vehicle = await prisma.vehicle.update({
            where: { vehicle_id: parseInt(req.params.id) },
            data: {
                ...rest,
                ...(type_id ? { type_id: parseInt(type_id) } : {}),
                driver_id: driver_id ? parseInt(driver_id) : null,
            },
            include: { driver: true, vehicleType: true },
        });
        res.json(vehicle);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        await prisma.vehicle.update({
            where: { vehicle_id: parseInt(req.params.id) },
            data: { is_active: false, driver_id: null }
        });
        res.json({ message: 'Vehicle deactivated' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
