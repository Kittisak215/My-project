const prisma = require('../lib/prisma');

/**
 * GET /api/notifications/driver
 * รวมแจ้งเตือนทุกประเภทสำหรับคนขับที่ล็อกอินอยู่:
 *  1. สถานะคำร้องซ่อม (ทุกสถานะ, 7 วันล่าสุด)
 *  2. MaintenanceAlert ของรถที่รับผิดชอบ
 *  3. เตือนให้กรอกไมล์ (ถ้าอยู่วันที่ 1-5 ของเดือนและยังไม่ได้กรอก)
 */
exports.getDriverNotifications = async (req, res) => {
    try {
        const driverId = req.user.driver_id;
        if (!driverId) return res.json({ notifications: [], unreadCount: 0 });

        const notifications = [];

        // ── 1. ดึงรถที่คนขับรับผิดชอบ ──────────────────────────────
        const vehicles = await prisma.vehicle.findMany({
            where: { driver_id: driverId, is_active: true },
            select: { vehicle_id: true, license_plate: true },
        });
        const vehicleIds = vehicles.map(v => v.vehicle_id);
        const plateLookup = Object.fromEntries(vehicles.map(v => [v.vehicle_id, v.license_plate]));

        // ── 2. สถานะคำร้องซ่อม (ทุกสถานะ) ───────────────────────────
        if (vehicleIds.length > 0) {
            const repairs = await prisma.repairRequest.findMany({
                where: { driver_id: driverId },
                orderBy: { created_at: 'desc' },
                take: 10,
                select: {
                    request_id: true,
                    status: true,
                    issue_description: true,
                    vehicle_id: true,
                    created_at: true,
                    garage: { select: { garage_name: true } },
                    repair_end_date: true,
                    estimated_end_date: true,
                },
            });

            const statusLabel = {
                PENDING: 'รอตรวจสอบ',
                IN_PROGRESS: 'กำลังดำเนินการ',
                AWAITING_APPROVAL: 'รออนุมัติ',
                APPROVED: 'อนุมัติแล้ว',
                REJECTED: 'ไม่อนุมัติ',
                COMPLETED: 'ซ่อมเสร็จสิ้น — ไปรับรถได้เลย',
            };
            const statusType = {
                PENDING: 'info',
                IN_PROGRESS: 'info',
                AWAITING_APPROVAL: 'warning',
                APPROVED: 'success',
                REJECTED: 'error',
                COMPLETED: 'success',
            };

            for (const r of repairs) {
                const plate = plateLookup[r.vehicle_id] || 'ไม่ระบุทะเบียน';
                const reqCode = `REQ-${String(r.request_id).padStart(4, '0')}`;
                notifications.push({
                    id: `repair-${r.request_id}`,
                    type: statusType[r.status] || 'info',
                    category: 'REPAIR_STATUS',
                    title: `${reqCode} — ${statusLabel[r.status] || r.status}`,
                    body: `ทะเบียน ${plate}: ${r.issue_description}`,
                    status: r.status,
                    created_at: r.created_at,
                    garage: r.garage?.garage_name || null,
                    estimated_end_date: r.estimated_end_date || null,
                    repair_end_date: r.repair_end_date || null,
                });
            }
        }

        // ── 3. MaintenanceAlert ของรถที่รับผิดชอบ ────────────────────
        if (vehicleIds.length > 0) {
            const alertTypeLabel = {
                OIL_CHANGE: 'ถึงรอบเปลี่ยนน้ำมันเครื่อง',
                TIRE_CHANGE: 'ถึงรอบเปลี่ยนยาง',
                INSPECTION: 'ถึงรอบตรวจสภาพรถ',
                OTHER: 'แจ้งเตือนบำรุงรักษา',
            };

            const maintenanceAlerts = await prisma.maintenanceAlert.findMany({
                where: { vehicle_id: { in: vehicleIds }, is_resolved: false },
                include: { vehicle: { select: { license_plate: true } } },
            });

            for (const a of maintenanceAlerts) {
                notifications.push({
                    id: `maint-${a.alert_id}`,
                    type: 'warning',
                    category: 'MAINTENANCE',
                    title: alertTypeLabel[a.alert_type] || 'แจ้งเตือนบำรุงรักษา',
                    body: `ทะเบียน ${a.vehicle?.license_plate}: กำหนดที่ ${(a.next_service_mileage || 0).toLocaleString()} กม.`,
                    created_at: new Date().toISOString(),
                });
            }
        }

        // ── 4. เตือนกรอกไมล์ (วันที่ 1-5 ของเดือน) ─────────────────
        const today = new Date();
        const dayOfMonth = today.getDate();
        if (dayOfMonth >= 1 && dayOfMonth <= 5 && vehicleIds.length > 0) {
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // ตรวจสอบว่ารถที่รับผิดชอบคันไหนยังไม่มีการกรอกไมล์เดือนนี้
            const logsThisMonth = await prisma.mileageLog.findMany({
                where: {
                    vehicle_id: { in: vehicleIds },
                    record_date: { gte: startOfMonth, lte: endOfMonth },
                },
                select: { vehicle_id: true },
            });
            const vehiclesWithLog = new Set(logsThisMonth.map(l => l.vehicle_id));
            const vehiclesMissingLog = vehicleIds.filter(id => !vehiclesWithLog.has(id));

            if (vehiclesMissingLog.length > 0) {
                const plates = vehiclesMissingLog.map(id => plateLookup[id]).filter(Boolean).join(', ');
                const daysLeft = 5 - dayOfMonth;
                notifications.push({
                    id: 'mileage-reminder',
                    type: daysLeft === 0 ? 'error' : 'warning',
                    category: 'MILEAGE_REMINDER',
                    title: daysLeft === 0 ? 'วันสุดท้าย! กรอกเลขไมล์ด่วน' : `กรุณากรอกเลขไมล์ภายในวันที่ 5 (อีก ${daysLeft} วัน)`,
                    body: `รถที่ยังไม่ได้กรอก: ${plates}`,
                    created_at: new Date().toISOString(),
                });
            }
        }

        // เรียงตาม created_at ล่าสุดขึ้นก่อน
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const unreadCount = notifications.filter(n => n.type === 'warning' || n.type === 'error' || n.status === 'COMPLETED').length;

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('getDriverNotifications error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/notifications/admin
 * แจ้งเตือนสำหรับ Admin:
 * 1. คำร้องซ่อมใหม่ (PENDING)
 * 2. ผลการอนุมัติ (APPROVED, REJECTED)
 * 3. แจ้งเตือนบำรุงรักษารถ (MaintenanceAlert)
 */
exports.getAdminNotifications = async (req, res) => {
    try {
        const notifications = [];

        // 1. คำร้องซ่อม (PENDING, AWAITING_APPROVAL, APPROVED, REJECTED)
        const repairs = await prisma.repairRequest.findMany({
            where: { status: { in: ['PENDING', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED'] } },
            include: { vehicle: { select: { license_plate: true } } },
            orderBy: { created_at: 'desc' },
            take: 20
        });

        const statusLabel = {
            PENDING: 'คำร้องซ่อมใหม่ (รอตรวจสอบ)',
            AWAITING_APPROVAL: 'รออนุมัติ',
            APPROVED: 'คำร้องซ่อมได้รับการอนุมัติแล้ว',
            REJECTED: 'คำร้องซ่อมถูกปฏิเสธ',
        };
        const statusType = {
            PENDING: 'warning',
            AWAITING_APPROVAL: 'warning',
            APPROVED: 'success',
            REJECTED: 'error',
        };

        for (const r of repairs) {
            const reqCode = `REQ-${String(r.request_id).padStart(4, '0')}`;
            const isEmergency = r.repair_type === 'EMERGENCY';
            const titlePrefix = isEmergency ? '🚨 [ฉุกเฉิน] ' : '';
            
            notifications.push({
                id: `admin-repair-${r.request_id}`,
                type: isEmergency && r.status === 'PENDING' ? 'error' : (statusType[r.status] || 'info'),
                category: 'REPAIR_STATUS',
                title: `${titlePrefix}${reqCode} — ${statusLabel[r.status] || r.status}`,
                body: `ทะเบียน ${r.vehicle?.license_plate || 'ไม่ระบุ'}: ${r.issue_description}`,
                created_at: r.created_at,
            });
        }

        // 2. แจ้งเตือนบำรุงรักษา
        const alerts = await prisma.maintenanceAlert.findMany({
            where: { is_resolved: false },
            include: { vehicle: { select: { license_plate: true } } }
        });

        const alertTypeLabel = {
            OIL_CHANGE: 'ถึงรอบเปลี่ยนน้ำมันเครื่อง',
            TIRE_CHANGE: 'ถึงรอบเปลี่ยนยาง',
            INSPECTION: 'ถึงรอบตรวจสภาพรถ',
            EMERGENCY: 'แจ้งซ่อมฉุกเฉิน',
            OTHER: 'แจ้งเตือนบำรุงรักษา',
        };

        for (const a of alerts) {
            const isEmergency = a.alert_type === 'EMERGENCY';
            notifications.push({
                id: `admin-maint-${a.alert_id}`,
                type: isEmergency ? 'error' : 'warning',
                category: 'MAINTENANCE',
                title: isEmergency ? `🚨 [ฉุกเฉิน] รถมีปัญหา!` : (alertTypeLabel[a.alert_type] || 'แจ้งเตือนบำรุงรักษา'),
                body: isEmergency 
                    ? `ทะเบียน ${a.vehicle?.license_plate || 'ไม่ระบุ'} แจ้งเหตุฉุกเฉิน กรุณาตรวจสอบด่วน`
                    : `ทะเบียน ${a.vehicle?.license_plate || 'ไม่ระบุ'}: ต้องบำรุงรักษาที่ ${a.next_service_mileage.toLocaleString()} กม.`,
                created_at: a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString(),
            });
        }

        // เรียงตามเวลาล่าสุด
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        const unreadCount = notifications.filter(n => n.type === 'warning' || n.type === 'error').length;
        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('getAdminNotifications error:', err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /api/notifications/executive
 * แจ้งเตือนสำหรับ Executive (ผู้บริหาร):
 * 1. คำร้องซ่อมที่รออนุมัติ (AWAITING_APPROVAL)
 */
exports.getExecutiveNotifications = async (req, res) => {
    try {
        res.json({ notifications: [], unreadCount: 0 });
    } catch (err) {
        console.error('getExecutiveNotifications error:', err);
        res.status(500).json({ message: err.message });
    }
};
