const prisma = require('../lib/prisma');

const repairIncludes = {
    vehicle: {
        include: {
            vehicleType: true,
            mileageLogs: { orderBy: { record_date: 'desc' }, take: 1 }
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
        const {
            vehicle_id, driver_id, garage_id, total_cost, estimated_cost,
            repair_start_date, estimated_end_date, ...rest
        } = req.body;

        // If driver, use their own driver_id
        const driverId = req.user.role === 'DRIVER' ? req.user.driver_id : parseInt(driver_id);

        // Validate: DRIVER can only submit repair for their own vehicles
        if (req.user.role === 'DRIVER') {
            const vehicle = await prisma.vehicle.findUnique({
                where: { vehicle_id: parseInt(vehicle_id) },
                select: { driver_id: true }
            });
            if (!vehicle || vehicle.driver_id !== driverId) {
                return res.status(403).json({ message: 'ไม่มีสิทธิ์แจ้งซ่อมยานพาหนะคันนี้' });
            }
        }

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
                ...(estimated_cost ? { estimated_cost: parseFloat(estimated_cost) } : {}),
                ...(repair_start_date ? { repair_start_date: new Date(repair_start_date) } : {}),
                ...(estimated_end_date ? { estimated_end_date: new Date(estimated_end_date) } : {}),
            },
            include: repairIncludes,
        });

        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }

        res.status(201).json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const {
            vehicle_id, driver_id, garage_id, total_cost, estimated_cost,
            repair_start_date, estimated_end_date, ...rest
        } = req.body;
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...rest,
                ...(vehicle_id ? { vehicle_id: parseInt(vehicle_id) } : {}),
                ...(driver_id ? { driver_id: parseInt(driver_id) } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(total_cost ? { total_cost: parseFloat(total_cost) } : {}),
                ...(estimated_cost !== undefined ? { estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null } : {}),
                ...(repair_start_date ? { repair_start_date: new Date(repair_start_date) } : {}),
                ...(estimated_end_date ? { estimated_end_date: new Date(estimated_end_date) } : {}),
            },
            include: repairIncludes,
        });
        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.updateStatus = async (req, res) => {
    try {
        const {
            status, garage_id, total_cost, estimated_cost,
            note, repair_detail, repair_start_date, repair_end_date,
            estimated_end_date, oil_grade, is_tire_changed
        } = req.body;

        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...(status ? { status } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(total_cost !== undefined ? { total_cost: parseFloat(total_cost) } : {}),
                ...(estimated_cost !== undefined ? { estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null } : {}),
                ...(note ? { note } : {}),
                ...(repair_detail ? { repair_detail } : {}),
                ...(repair_start_date ? { repair_start_date: new Date(repair_start_date) } : {}),
                ...(repair_end_date ? { repair_end_date: new Date(repair_end_date) } : {}),
                ...(estimated_end_date ? { estimated_end_date: new Date(estimated_end_date) } : {}),
                ...(oil_grade ? { oil_grade } : {}),
            },
            include: repairIncludes,
        });

        // Auto-update Maintenance Alert when repair is COMPLETED
        if (status === 'COMPLETED' && repair.mileage_at_repair && repair.vehicle_id) {
            await autoUpdateMaintenanceAlerts(repair.vehicle_id, repair.mileage_at_repair, repair.repair_type, oil_grade || null, is_tire_changed === 'true' || is_tire_changed === true);
        }

        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }

        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

// ระยะทางเปลี่ยนถ่ายน้ำมันเครื่องตามเกรด
const OIL_GRADE_INTERVALS = {
    MINERAL: 5000,
    SEMI_SYNTHETIC: 7000,
    FULLY_SYNTHETIC: 10000,
};

/**
 * เมื่อซ่อมเสร็จ ให้อัปเดต MaintenanceAlert ของรถคันนั้นโดยอัตโนมัติ
 * นำ mileage_at_repair มาตั้งเป็น last_service_mileage และคำนวณ next_service_mileage ใหม่
 * หากมี oil_grade ให้ใช้ระยะทางตามเกรดแทนค่า default ของประเภทรถ
 */
async function autoUpdateMaintenanceAlerts(vehicleId, mileageAtRepair, repairType, oilGrade = null, isTireChanged = false) {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { vehicle_id: vehicleId },
            include: {
                vehicleType: true,
                alerts: { where: { is_resolved: false } }
            }
        });
        if (!vehicle) return;

        const defaultOilInterval = vehicle.oil_change_interval_km || vehicle.vehicleType?.oil_change_interval_km || 10000;
        const tireInterval = vehicle.tire_change_interval_km || vehicle.vehicleType?.tire_change_interval_km || 50000;

        // ถ้ามีการระบุเกรดน้ำมัน ให้ใช้ระยะตามเกรด มิฉะนั้นใช้ค่า default ของประเภทรถ
        const oilInterval = oilGrade && OIL_GRADE_INTERVALS[oilGrade]
            ? OIL_GRADE_INTERVALS[oilGrade]
            : defaultOilInterval;

        // อัปเดตรอบระยะของรถ (Vehicle) ถ้ามีการระบุน้ำมันเครื่องเกรดใหม่
        if (oilGrade && OIL_GRADE_INTERVALS[oilGrade] && vehicle.oil_change_interval_km !== OIL_GRADE_INTERVALS[oilGrade]) {
            await prisma.vehicle.update({
                where: { vehicle_id: vehicleId },
                data: { oil_change_interval_km: OIL_GRADE_INTERVALS[oilGrade] }
            });
        }

        let oilAlertResolved = false;

        for (const alert of vehicle.alerts) {
            // ถ้ามีการเปลี่ยนน้ำมัน ให้อัปเดต OIL_CHANGE alert ให้สถานะเป็น "แก้ไขแล้ว" (Resolved)
            if (alert.alert_type === 'OIL_CHANGE' && oilGrade) {
                await prisma.maintenanceAlert.update({
                    where: { alert_id: alert.alert_id },
                    data: {
                        is_resolved: true,
                        // บันทึกไมล์ที่เพิ่งทำเสร็จไว้ใน next_service_mileage
                        // เพื่อให้ mileage.controller ใช้เป็นฐานในการบวกรอบถัดไป
                        next_service_mileage: mileageAtRepair, 
                    }
                });
                oilAlertResolved = true;
            }

            // ถ้ามีการเปลี่ยนยาง ให้อัปเดต TIRE_CHANGE alert ให้สถานะเป็น "แก้ไขแล้ว" (Resolved)
            if (alert.alert_type === 'TIRE_CHANGE' && isTireChanged) {
                await prisma.maintenanceAlert.update({
                    where: { alert_id: alert.alert_id },
                    data: {
                        is_resolved: true,
                        next_service_mileage: mileageAtRepair,
                    }
                });
            }
        }

        // กรณีที่เปลี่ยนน้ำมันเครื่อง "ก่อน" ที่ระบบจะแจ้งเตือน (ไม่มี alert ค้างอยู่)
        // ต้องสร้างประวัติการเปลี่ยนน้ำมันเครื่อง (resolved alert) ทิ้งไว้ 
        // เพื่อให้ mileage.controller ใช้เป็นฐาน (lastServiceMileage) ในการคำนวณรอบถัดไป
        if (oilGrade && !oilAlertResolved) {
            await prisma.maintenanceAlert.create({
                data: {
                    vehicle_id: vehicleId,
                    alert_type: 'OIL_CHANGE',
                    is_resolved: true,
                    last_service_mileage: mileageAtRepair,
                    next_service_mileage: mileageAtRepair,
                }
            });
        }
    } catch (err) {
        console.error('autoUpdateMaintenanceAlerts error:', err.message);
    }
}

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
