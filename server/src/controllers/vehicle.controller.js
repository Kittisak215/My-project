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
                    mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 },
                    repairs: { 
                        where: { oil_grade: { not: null } }, 
                        orderBy: { created_at: 'desc' }, 
                        take: 1 
                    }
                },
                orderBy: { created_at: 'desc' },
            }),
            prisma.vehicle.count({ where }),
        ]);

        const vehiclesWithMileage = vehicles.map(v => {
            // Determine active oil grade from the last repair that changed oil
            const lastOilGrade = v.repairs?.[0]?.oil_grade || 'FULLY_SYNTHETIC';
            
            let currentOilInterval = 10000;
            let currentOilGradeLabel = "Fully";
            
            if (lastOilGrade === 'MINERAL') {
                currentOilInterval = v.vehicleType?.oil_interval_mineral_km || 5000;
                currentOilGradeLabel = "Mineral";
            } else if (lastOilGrade === 'SEMI_SYNTHETIC') {
                currentOilInterval = v.vehicleType?.oil_interval_semi_synthetic_km || 7000;
                currentOilGradeLabel = "Semi";
            } else {
                currentOilInterval = v.vehicleType?.oil_interval_fully_synthetic_km || 10000;
                currentOilGradeLabel = "Fully";
            }

            return {
                ...v,
                current_mileage: v.mileageLogs?.[0]?.mileage_end || 0,
                currentOilInterval,
                currentOilGradeLabel
            };
        });

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
        const {
            type_id, driver_id,
            oil_interval_mineral_km, oil_interval_semi_synthetic_km,
            oil_interval_fully_synthetic_km, tire_change_interval_km,
            ...rest
        } = req.body;

        if (rest.year !== undefined && rest.year !== null && rest.year !== '') {
            const yearNum = parseInt(rest.year);
            const maxYear = new Date().getFullYear() + 1;
            if (isNaN(yearNum) || yearNum < 1970 || yearNum > maxYear) {
                return res.status(400).json({ message: `ปีที่ผลิตต้องเป็นตัวเลข ค.ศ. ระหว่าง 1970 ถึง ${maxYear}` });
            }
            rest.year = yearNum;
        }

        if (rest.brand && rest.brand.length > 50) {
            return res.status(400).json({ message: 'ยี่ห้อต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }
        if (rest.model && rest.model.length > 50) {
            return res.status(400).json({ message: 'รุ่นต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }
        if (rest.color && rest.color.length > 50) {
            return res.status(400).json({ message: 'สีต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }

        const vehicle = await prisma.vehicle.create({
            data: {
                ...rest,
                type_id: parseInt(type_id),
                ...(driver_id ? { driver_id: parseInt(driver_id) } : {}),
                oil_interval_mineral_km: null,
                oil_interval_semi_synthetic_km: null,
                oil_interval_fully_synthetic_km: null,
                tire_change_interval_km: null,
            },
            include: { driver: true, vehicleType: true }
        });
        res.status(201).json(vehicle);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const {
            type_id, driver_id,
            oil_interval_mineral_km, oil_interval_semi_synthetic_km,
            oil_interval_fully_synthetic_km, tire_change_interval_km,
            ...rest
        } = req.body;

        if (rest.year !== undefined && rest.year !== null && rest.year !== '') {
            const yearNum = parseInt(rest.year);
            const maxYear = new Date().getFullYear() + 1;
            if (isNaN(yearNum) || yearNum < 1970 || yearNum > maxYear) {
                return res.status(400).json({ message: `ปีที่ผลิตต้องเป็นตัวเลข ค.ศ. ระหว่าง 1970 ถึง ${maxYear}` });
            }
            rest.year = yearNum;
        }

        if (rest.brand && rest.brand.length > 50) {
            return res.status(400).json({ message: 'ยี่ห้อต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }
        if (rest.model && rest.model.length > 50) {
            return res.status(400).json({ message: 'รุ่นต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }
        if (rest.color && rest.color.length > 50) {
            return res.status(400).json({ message: 'สีต้องมีความยาวไม่เกิน 50 ตัวอักษร' });
        }

        const vehicle = await prisma.vehicle.update({
            where: { vehicle_id: parseInt(req.params.id) },
            data: {
                ...rest,
                ...(type_id ? { type_id: parseInt(type_id) } : {}),
                driver_id: driver_id ? parseInt(driver_id) : null,
                oil_interval_mineral_km: null,
                oil_interval_semi_synthetic_km: null,
                oil_interval_fully_synthetic_km: null,
                tire_change_interval_km: null,
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
