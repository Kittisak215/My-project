require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

exports.register = async (req, res) => {
    try {
        const { username, password, full_name, email, role, phone } = req.body;

        const exists = await prisma.user.findUnique({ where: { username } });
        if (exists) return res.status(400).json({ message: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' });

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const assignedRole = role || 'DRIVER';

        let newDriverId = null;
        if (assignedRole === 'DRIVER') {
            const driver = await prisma.driver.create({
                data: {
                    full_name: full_name || username,
                    phone: phone || '-',
                }
            });
            newDriverId = driver.driver_id;
        }

        const user = await prisma.user.create({
            data: {
                username,
                password_hash,
                full_name,
                email,
                role: assignedRole,
                ...(newDriverId ? { driver_id: newDriverId } : {}),
            },
        });

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จ' });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { username },
            include: { driver: true },
        });
        if (!user || !user.is_active) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

        // Update last login
        await prisma.user.update({ where: { user_id: user.user_id }, data: { last_login: new Date() } });

        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, role: user.role, driver_id: user.driver_id },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        const { password_hash, ...userOut } = user;
        res.json({ token, user: userOut });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMe = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { user_id: req.user.user_id },
            include: { driver: true },
        });
        if (!user) return res.status(404).json({ message: 'User not found' });
        const { password_hash, ...userOut } = user;
        res.json(userOut);
    } catch (err) { res.status(500).json({ message: err.message }); }
};
