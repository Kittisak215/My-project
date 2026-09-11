const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, specialization, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (search) where.OR = [{ garage_name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }];
        if (specialization) where.specialization = { has: specialization };
        if (req.query.is_active !== undefined && req.query.is_active !== '') {
            where.is_active = req.query.is_active === 'true';
        }

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
        const { specialization, is_active, ...rest } = req.body;

        if (!rest.garage_name || !rest.garage_name.trim()) {
            return res.status(400).json({ message: 'กรุณาระบุชื่ออู่/ศูนย์บริการ' });
        }

        if (!rest.phone || !/^0\d{8,9}$/.test(rest.phone.trim())) {
            return res.status(400).json({ message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0' });
        }

        if (rest.postal_code && rest.postal_code.trim() && !/^\d{5}$/.test(rest.postal_code.trim())) {
            return res.status(400).json({ message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' });
        }

        const garage = await prisma.garage.create({
            data: {
                ...rest,
                garage_name: rest.garage_name.trim(),
                phone: rest.phone.trim(),
                postal_code: rest.postal_code ? rest.postal_code.trim() : null,
                specialization: specialization || ['GENERAL'],
                is_active: is_active !== undefined ? (is_active === true || is_active === 'true') : true
            }
        });
        res.status(201).json(garage);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const { is_active, ...rest } = req.body;
        const data = { ...rest };

        if (rest.garage_name !== undefined) {
            if (!rest.garage_name.trim()) {
                return res.status(400).json({ message: 'กรุณาระบุชื่ออู่/ศูนย์บริการ' });
            }
            data.garage_name = rest.garage_name.trim();
        }

        if (rest.phone !== undefined) {
            if (!rest.phone || !/^0\d{8,9}$/.test(rest.phone.trim())) {
                return res.status(400).json({ message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0' });
            }
            data.phone = rest.phone.trim();
        }

        if (rest.postal_code !== undefined) {
            if (rest.postal_code && rest.postal_code.trim() && !/^\d{5}$/.test(rest.postal_code.trim())) {
                return res.status(400).json({ message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก' });
            }
            data.postal_code = rest.postal_code ? rest.postal_code.trim() : null;
        }

        if (is_active !== undefined) {
            data.is_active = is_active === true || is_active === 'true';
        }
        const garage = await prisma.garage.update({ where: { garage_id: parseInt(req.params.id) }, data });
        res.json(garage);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remove = async (req, res) => {
    try {
        const garageId = parseInt(req.params.id);

        // Check if there are repair requests linked to this garage
        const repairsCount = await prisma.repairRequest.count({
            where: { garage_id: garageId }
        });

        if (repairsCount > 0) {
            return res.status(400).json({ 
                message: 'ไม่สามารถลบอู่/ศูนย์บริการนี้ได้ เนื่องจากมีประวัติการส่งซ่อมในระบบแล้ว (แนะนำให้แก้ไขสถานะเป็นระงับการติดต่อแทน)' 
            });
        }

        await prisma.garage.delete({
            where: { garage_id: garageId }
        });

        res.json({ message: 'ลบข้อมูลอู่/ศูนย์บริการสำเร็จ' });
    } catch (err) { 
        res.status(400).json({ message: err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' }); 
    }
};
