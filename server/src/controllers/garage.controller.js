const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, specialization, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) where.OR = [{ garage_name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
        if (specialization) where.specialization = { has: specialization };

        const [garages, total] = await Promise.all([
            prisma.garage.findMany({ where, skip, take: parseInt(limit), orderBy: { garage_id: 'desc' } }),
            prisma.garage.count({ where }),
        ]);
        res.json({ data: garages, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getById = async (req, res) => {
    try {
        const garage = await prisma.garage.findUnique({
            where: { garage_id: parseInt(req.params.id) },
            include: { repairs: { take: 5, orderBy: { created_at: 'desc' } } }
        });
        if (!garage) return res.status(404).json({ message: 'Garage not found' });
        res.json(garage);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { specialization, ...rest } = req.body;
        const garage = await prisma.garage.create({
            data: {
                ...rest,
                specialization: specialization || ['GENERAL']
            }
        });
        res.status(201).json(garage);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const garage = await prisma.garage.update({ where: { garage_id: parseInt(req.params.id) }, data: req.body });
        res.json(garage);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        const garageId = parseInt(req.params.id);

        // Clear garage_id from associated repair requests to avoid foreign key errors
        await prisma.repairRequest.updateMany({
            where: { garage_id: garageId },
            data: { garage_id: null }
        });

        await prisma.garage.delete({ where: { garage_id: garageId } });
        res.json({ message: 'Garage deleted' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
