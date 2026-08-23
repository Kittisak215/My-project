const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, is_active, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) where.OR = [{ full_name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
        if (is_active !== undefined) where.is_active = is_active === 'true';
        const [drivers, total] = await Promise.all([
            prisma.driver.findMany({
                where, skip, take: parseInt(limit),
                include: { vehicles: true, userAccount: { omit: { password_hash: true } } },
                orderBy: { driver_id: 'desc' },
            }),
            prisma.driver.count({ where }),
        ]);
        res.json({ data: drivers, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getById = async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { driver_id: parseInt(req.params.id) },
            include: { vehicles: true, userAccount: { omit: { password_hash: true } } },
        });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        res.json(driver);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const driver = await prisma.driver.create({ data: req.body, include: { vehicles: true } });
        res.status(201).json(driver);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        const { full_name, phone, is_active } = req.body;

        const operations = [
            prisma.driver.update({
                where: { driver_id: driverId },
                data: {
                    ...(full_name !== undefined ? { full_name } : {}),
                    ...(phone !== undefined ? { phone } : {}),
                    ...(is_active !== undefined ? { is_active } : {}),
                },
                include: { vehicles: true },
            })
        ];

        // If status changed to inactive, unassign vehicles and deactivate user account
        if (is_active === false) {
            operations.push(
                prisma.vehicle.updateMany({ where: { driver_id: driverId }, data: { driver_id: null } }),
                prisma.user.updateMany({ where: { driver_id: driverId }, data: { is_active: false } })
            );
        } else if (is_active === true) {
            operations.push(
                prisma.user.updateMany({ where: { driver_id: driverId }, data: { is_active: true } })
            );
        }

        const results = await prisma.$transaction(operations);
        res.json(results[0]);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        await prisma.$transaction([
            prisma.driver.update({ where: { driver_id: driverId }, data: { is_active: false } }),
            prisma.vehicle.updateMany({ where: { driver_id: driverId }, data: { driver_id: null } }),
            prisma.user.updateMany({ where: { driver_id: driverId }, data: { is_active: false } })
        ]);
        res.json({ message: 'Driver deactivated successfully' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
