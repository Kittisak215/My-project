const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, is_active, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {
            NOT: {
                userAccount: {
                    role: { in: ['ADMIN', 'EXECUTIVE'] }
                }
            }
        };
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
        const { full_name, phone, is_active, username, password, email } = req.body;

        const trimmedName = full_name ? String(full_name).trim() : '';
        const trimmedPhone = phone ? String(phone).trim() : '';
        const trimmedEmail = email ? String(email).trim() : '';

        if (!trimmedName || trimmedName.length > 100) {
            return res.status(400).json({ message: 'ชื่อ-นามสกุลต้องไม่ว่างและไม่เกิน 100 ตัวอักษร' });
        }

        if (!/^0[689]\d{8}$/.test(trimmedPhone)) {
            return res.status(400).json({ message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09' });
        }

        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
        }

        // สร้างข้อมูลคนขับก่อน
        const driver = await prisma.driver.create({
            data: { full_name: trimmedName, phone: trimmedPhone, is_active: is_active !== undefined ? is_active : true },
        });

        // สร้างบัญชีล็อกอินควบคู่ไปด้วย
        const finalUsername = (username ? String(username).trim() : '') || trimmedPhone; // ถ้าไม่ได้กรอก username ให้ใช้เบอร์โทรแทน
        const finalPassword = (password ? String(password).trim() : '') || trimmedPhone; // ถ้าไม่ได้กรอก password ให้ใช้เบอร์โทรเป็นรหัสผ่านตั้งต้น

        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(finalPassword, salt);

        // เช็กว่า username ซ้ำไหม
        const exists = await prisma.user.findUnique({ where: { username: finalUsername } });
        if (exists) {
            // ถ้าซ้ำ ลบ driver ที่สร้างไปแล้ว แล้วส่ง error กลับ
            await prisma.driver.delete({ where: { driver_id: driver.driver_id } });
            return res.status(400).json({ message: `ชื่อผู้ใช้ "${finalUsername}" ถูกใช้งานแล้ว กรุณาระบุชื่อผู้ใช้อื่น` });
        }

        await prisma.user.create({
            data: {
                username: finalUsername,
                password_hash,
                full_name: trimmedName,
                role: 'DRIVER',
                driver_id: driver.driver_id,
                is_active: is_active !== undefined ? is_active : true,
                ...(trimmedEmail ? { email: trimmedEmail } : {}),
            },
        });

        const driverWithUser = await prisma.driver.findUnique({
            where: { driver_id: driver.driver_id },
            include: { vehicles: true, userAccount: { omit: { password_hash: true } } },
        });

        res.status(201).json({ ...driverWithUser, defaultPassword: finalPassword });
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        const { full_name, phone, is_active, email } = req.body;

        const dataUpdate = {};
        if (full_name !== undefined) {
            const trimmedName = String(full_name).trim();
            if (!trimmedName || trimmedName.length > 100) {
                return res.status(400).json({ message: 'ชื่อ-นามสกุลต้องไม่ว่างและไม่เกิน 100 ตัวอักษร' });
            }
            dataUpdate.full_name = trimmedName;
        }

        if (phone !== undefined) {
            const trimmedPhone = String(phone).trim();
            if (!/^0[689]\d{8}$/.test(trimmedPhone)) {
                return res.status(400).json({ message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09' });
            }
            dataUpdate.phone = trimmedPhone;
        }

        if (is_active !== undefined) {
            dataUpdate.is_active = is_active;
        }

        const operations = [
            prisma.driver.update({
                where: { driver_id: driverId },
                data: dataUpdate,
            }),
        ];

        // ถ้ามีการแก้อีเมล ให้อัปเดตตาราง User ด้วย
        if (email !== undefined) {
            const trimmedEmail = email ? String(email).trim() : null;
            if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
                return res.status(400).json({ message: 'รูปแบบอีเมลไม่ถูกต้อง' });
            }
            operations.push(
                prisma.user.updateMany({
                    where: { driver_id: driverId },
                    data: { 
                        email: trimmedEmail,
                        ...(dataUpdate.full_name ? { full_name: dataUpdate.full_name } : {}),
                        ...(dataUpdate.is_active !== undefined ? { is_active: dataUpdate.is_active } : {})
                    },
                })
            );
        }

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

exports.hardDelete = async (req, res) => {
    try {
        const driverId = parseInt(req.params.id);
        
        // Check if there are related records that shouldn't be deleted
        const driver = await prisma.driver.findUnique({
            where: { driver_id: driverId },
            include: { vehicles: true }
        });
        
        if (!driver) return res.status(404).json({ message: 'ไม่พบข้อมูลคนขับ' });
        
        // Hard delete user first due to foreign key
        await prisma.user.deleteMany({ where: { driver_id: driverId } });
        // Hard delete driver
        await prisma.driver.delete({ where: { driver_id: driverId } });
        
        res.json({ message: 'ลบข้อมูลคนขับถาวรสำเร็จ' });
    } catch (err) { 
        res.status(400).json({ message: 'ไม่สามารถลบถาวรได้ อาจมีประวัติผูกอยู่กับระบบ' }); 
    }
};
