const prisma = require('../lib/prisma');

const repairIncludes = {
    vehicle: {
        include: {
            vehicleType: true,
            mileageLogs: { orderBy: { mileage_id: 'desc' }, take: 1 }
        }
    },
    driver: true,
    garage: true,
};

exports.getAll = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status) where.status = status;
        if (search) {
            where.OR = [
                { vehicle: { license_plate: { contains: search, mode: 'insensitive' } } },
                { issue_description: { contains: search, mode: 'insensitive' } },
            ];
        }
        // Drivers can only see their own requests
        if (req.user.role === 'DRIVER' && req.user.driver_id) {
            where.driver_id = req.user.driver_id;
        }
        const [data, total] = await Promise.all([
            prisma.repairRequest.findMany({ where, skip, take: parseInt(limit), include: repairIncludes, orderBy: { created_at: 'desc' } }),
            prisma.repairRequest.count({ where }),
        ]);
        res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getById = async (req, res) => {
    try {
        const repair = await prisma.repairRequest.findUnique({
            where: { request_id: parseInt(req.params.id) }, include: repairIncludes
        });
        if (!repair) return res.status(404).json({ message: 'Not found' });
        res.json(repair);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { vehicle_id, driver_id, garage_id, total_cost, ...rest } = req.body;
        // If driver, use their own driver_id
        const driverId = req.user.role === 'DRIVER' ? req.user.driver_id : parseInt(driver_id);

        // Auto set to AWAITING_APPROVAL if emergency
        let status = rest.status;
        if (rest.repair_type === 'EMERGENCY') status = 'AWAITING_APPROVAL';

        const repair = await prisma.repairRequest.create({
            data: {
                ...rest,
                status: status || 'PENDING',
                vehicle_id: parseInt(vehicle_id),
                driver_id: driverId,
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(total_cost ? { total_cost: parseFloat(total_cost) } : {}),
            },
            include: repairIncludes,
        });
        res.status(201).json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const { vehicle_id, driver_id, garage_id, total_cost, ...rest } = req.body;
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...rest,
                ...(vehicle_id ? { vehicle_id: parseInt(vehicle_id) } : {}),
                ...(driver_id ? { driver_id: parseInt(driver_id) } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(total_cost ? { total_cost: parseFloat(total_cost) } : {}),
            },
            include: repairIncludes,
        });
        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
    try {
        const { status, garage_id, total_cost, note, repair_detail, repair_start_date, repair_end_date } = req.body;
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...(status ? { status } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(total_cost !== undefined ? { total_cost: parseFloat(total_cost) } : {}),
                ...(note ? { note } : {}),
                ...(repair_detail ? { repair_detail } : {}),
                ...(repair_start_date ? { repair_start_date: new Date(repair_start_date) } : {}),
                ...(repair_end_date ? { repair_end_date: new Date(repair_end_date) } : {}),
            },
            include: repairIncludes,
        });
        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.approve = async (req, res) => {
    try {
        const { approved, note } = req.body;
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                status: approved ? 'APPROVED' : 'REJECTED',
                note: note || undefined,
            },
            include: repairIncludes,
        });
        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.uploadReceipt = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: { receipt_image: `/uploads/${req.file.filename}` },
        });
        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        await prisma.repairRequest.delete({ where: { request_id: parseInt(req.params.id) } });
        res.json({ message: 'Deleted' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};
