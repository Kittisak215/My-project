const prisma = require('../lib/prisma');

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                user_id: true,
                username: true,
                full_name: true,
                email: true,
                role: true,
                is_active: true,
                last_login: true,
                driver: {
                    select: { driver_id: true }
                }
            },
            orderBy: { user_id: 'desc' }
        });
        res.json({ data: users });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// Update user role and status (Admin only)
exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active } = req.body;

        // Cannot deactivate yourself or change your own role to lock yourself out easily
        if (req.user.user_id === parseInt(id)) {
            return res.status(400).json({ message: 'ไม่สามารถเปลี่ยนระดับหรือปิดใช้งานบัญชีของตัวเองได้' });
        }

        const data = {};
        if (role) data.role = role;
        if (is_active !== undefined) data.is_active = is_active;

        const updated = await prisma.user.update({
            where: { user_id: parseInt(id) },
            data
        });

        res.json({ message: 'อัปเดตข้อมูลผู้ใช้งานสำเร็จ', user: { user_id: updated.user_id, role: updated.role, is_active: updated.is_active } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
