const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const types = await prisma.vehicleType.findMany({
            orderBy: { type_id: 'asc' }
        });
        res.json(types);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const {
            type_name,
            oil_interval_mineral_km,
            oil_interval_semi_synthetic_km,
            oil_interval_fully_synthetic_km,
            tire_change_interval_km
        } = req.body;

        if (!type_name || !type_name.trim()) {
            return res.status(400).json({ message: 'กรุณาระบุชื่อประเภทรถ' });
        }

        const mineral = parseInt(oil_interval_mineral_km);
        const semi = parseInt(oil_interval_semi_synthetic_km);
        const fully = parseInt(oil_interval_fully_synthetic_km);
        const tire = parseInt(tire_change_interval_km);

        if (isNaN(mineral) || mineral < 1000 || isNaN(semi) || semi < 1000 || isNaN(fully) || fully < 1000) {
            return res.status(400).json({ message: 'ระยะรอบเปลี่ยนน้ำมันเครื่องต้องไม่น้อยกว่า 1,000 กม.' });
        }
        if (isNaN(tire) || tire < 5000) {
            return res.status(400).json({ message: 'ระยะรอบเปลี่ยนยางต้องไม่น้อยกว่า 5,000 กม.' });
        }

        const newType = await prisma.vehicleType.create({
            data: {
                type_name: type_name.trim(),
                oil_interval_mineral_km: mineral,
                oil_interval_semi_synthetic_km: semi,
                oil_interval_fully_synthetic_km: fully,
                tire_change_interval_km: tire
            }
        });
        res.status(201).json(newType);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const {
            type_name,
            oil_interval_mineral_km,
            oil_interval_semi_synthetic_km,
            oil_interval_fully_synthetic_km,
            tire_change_interval_km
        } = req.body;

        const data = {};
        if (type_name !== undefined) {
            if (!type_name.trim()) return res.status(400).json({ message: 'กรุณาระบุชื่อประเภทรถ' });
            data.type_name = type_name.trim();
        }

        if (oil_interval_mineral_km !== undefined) {
            const val = parseInt(oil_interval_mineral_km);
            if (isNaN(val) || val < 1000) return res.status(400).json({ message: 'ระยะรอบเปลี่ยนน้ำมันเครื่อง Mineral ต้องไม่น้อยกว่า 1,000 กม.' });
            data.oil_interval_mineral_km = val;
        }
        if (oil_interval_semi_synthetic_km !== undefined) {
            const val = parseInt(oil_interval_semi_synthetic_km);
            if (isNaN(val) || val < 1000) return res.status(400).json({ message: 'ระยะรอบเปลี่ยนน้ำมันเครื่อง กึ่งสังเคราะห์ ต้องไม่น้อยกว่า 1,000 กม.' });
            data.oil_interval_semi_synthetic_km = val;
        }
        if (oil_interval_fully_synthetic_km !== undefined) {
            const val = parseInt(oil_interval_fully_synthetic_km);
            if (isNaN(val) || val < 1000) return res.status(400).json({ message: 'ระยะรอบเปลี่ยนน้ำมันเครื่อง สังเคราะห์แท้ ต้องไม่น้อยกว่า 1,000 กม.' });
            data.oil_interval_fully_synthetic_km = val;
        }
        if (tire_change_interval_km !== undefined) {
            const val = parseInt(tire_change_interval_km);
            if (isNaN(val) || val < 5000) return res.status(400).json({ message: 'ระยะรอบเปลี่ยนยางต้องไม่น้อยกว่า 5,000 กม.' });
            data.tire_change_interval_km = val;
        }

        const updatedType = await prisma.vehicleType.update({
            where: { type_id: parseInt(req.params.id) },
            data
        });
        res.json(updatedType);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    try {
        // Check if any vehicles are using this type
        const vehiclesCount = await prisma.vehicle.count({
            where: { type_id: parseInt(req.params.id) }
        });

        if (vehiclesCount > 0) {
            return res.status(400).json({ message: 'ไม่สามารถลบประเภทรถนี้ได้ เนื่องจากมียานพาหนะที่ผูกกับประเภทนี้อยู่' });
        }

        await prisma.vehicleType.delete({
            where: { type_id: parseInt(req.params.id) }
        });
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
