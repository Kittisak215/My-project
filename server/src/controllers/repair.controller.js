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
            parts_cost, labor_cost,
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

        // Cost & Mileage validations
        if (estimated_cost !== undefined && estimated_cost !== '' && estimated_cost !== null) {
            if (parseFloat(estimated_cost) < 0) return res.status(400).json({ message: 'ราคาประเมินต้องไม่ติดลบ' });
        }
        if (parts_cost !== undefined && parts_cost !== '' && parts_cost !== null) {
            if (parseFloat(parts_cost) < 0) return res.status(400).json({ message: 'ค่าอะไหล่ต้องไม่ติดลบ' });
        }
        if (labor_cost !== undefined && labor_cost !== '' && labor_cost !== null) {
            if (parseFloat(labor_cost) < 0) return res.status(400).json({ message: 'ค่าแรงช่างต้องไม่ติดลบ' });
        }
        if (total_cost !== undefined && total_cost !== '' && total_cost !== null) {
            if (parseFloat(total_cost) < 0) return res.status(400).json({ message: 'ค่าใช้จ่ายรวมต้องไม่ติดลบ' });
        }
        if (rest.mileage_at_repair !== undefined && rest.mileage_at_repair !== '' && rest.mileage_at_repair !== null) {
            if (parseInt(rest.mileage_at_repair) < 0) return res.status(400).json({ message: 'เลขไมล์ขณะเข้าซ่อมต้องไม่ติดลบ' });
        }

        const pCost = parts_cost !== undefined && parts_cost !== '' && parts_cost !== null ? parseFloat(parts_cost) : null;
        const lCost = labor_cost !== undefined && labor_cost !== '' && labor_cost !== null ? parseFloat(labor_cost) : null;
        let finalTotal = null;
        if (pCost !== null || lCost !== null) {
            finalTotal = (pCost || 0) + (lCost || 0);
        } else if (total_cost !== undefined && total_cost !== '' && total_cost !== null) {
            finalTotal = parseFloat(total_cost);
        }

        const repair = await prisma.repairRequest.create({
            data: {
                ...rest,
                status: status || 'PENDING',
                vehicle_id: parseInt(vehicle_id),
                driver_id: driverId,
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(finalTotal !== null ? { total_cost: finalTotal } : {}),
                ...(pCost !== null ? { parts_cost: pCost } : {}),
                ...(lCost !== null ? { labor_cost: lCost } : {}),
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
            parts_cost, labor_cost,
            repair_start_date, estimated_end_date, ...rest
        } = req.body;

        if (estimated_cost !== undefined && estimated_cost !== '' && estimated_cost !== null) {
            if (parseFloat(estimated_cost) < 0) return res.status(400).json({ message: 'ราคาประเมินต้องไม่ติดลบ' });
        }
        if (parts_cost !== undefined && parts_cost !== '' && parts_cost !== null) {
            if (parseFloat(parts_cost) < 0) return res.status(400).json({ message: 'ค่าอะไหล่ต้องไม่ติดลบ' });
        }
        if (labor_cost !== undefined && labor_cost !== '' && labor_cost !== null) {
            if (parseFloat(labor_cost) < 0) return res.status(400).json({ message: 'ค่าแรงช่างต้องไม่ติดลบ' });
        }
        if (total_cost !== undefined && total_cost !== '' && total_cost !== null) {
            if (parseFloat(total_cost) < 0) return res.status(400).json({ message: 'ค่าใช้จ่ายรวมต้องไม่ติดลบ' });
        }
        if (rest.mileage_at_repair !== undefined && rest.mileage_at_repair !== '' && rest.mileage_at_repair !== null) {
            if (parseInt(rest.mileage_at_repair) < 0) return res.status(400).json({ message: 'เลขไมล์ขณะเข้าซ่อมต้องไม่ติดลบ' });
        }

        const pCost = parts_cost !== undefined ? (parts_cost !== '' && parts_cost !== null ? parseFloat(parts_cost) : null) : undefined;
        const lCost = labor_cost !== undefined ? (labor_cost !== '' && labor_cost !== null ? parseFloat(labor_cost) : null) : undefined;
        let finalTotal = undefined;
        if (pCost !== undefined || lCost !== undefined) {
            if (pCost !== null || lCost !== null) {
                finalTotal = (pCost || 0) + (lCost || 0);
            } else {
                finalTotal = null;
            }
        } else if (total_cost !== undefined) {
            finalTotal = total_cost !== '' && total_cost !== null ? parseFloat(total_cost) : null;
        }

        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...rest,
                ...(vehicle_id ? { vehicle_id: parseInt(vehicle_id) } : {}),
                ...(driver_id ? { driver_id: parseInt(driver_id) } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(finalTotal !== undefined ? { total_cost: finalTotal } : {}),
                ...(pCost !== undefined ? { parts_cost: pCost } : {}),
                ...(lCost !== undefined ? { labor_cost: lCost } : {}),
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
            parts_cost, labor_cost,
            note, repair_detail, repair_start_date, repair_end_date,
            estimated_end_date, oil_grade, is_tire_changed
        } = req.body;

        if (estimated_cost !== undefined && estimated_cost !== '' && estimated_cost !== null) {
            if (parseFloat(estimated_cost) < 0) return res.status(400).json({ message: 'ราคาประเมินต้องไม่ติดลบ' });
        }
        if (parts_cost !== undefined && parts_cost !== '' && parts_cost !== null) {
            if (parseFloat(parts_cost) < 0) return res.status(400).json({ message: 'ค่าอะไหล่ต้องไม่ติดลบ' });
        }
        if (labor_cost !== undefined && labor_cost !== '' && labor_cost !== null) {
            if (parseFloat(labor_cost) < 0) return res.status(400).json({ message: 'ค่าแรงช่างต้องไม่ติดลบ' });
        }
        if (total_cost !== undefined && total_cost !== '' && total_cost !== null) {
            if (parseFloat(total_cost) < 0) return res.status(400).json({ message: 'ค่าใช้จ่ายรวมต้องไม่ติดลบ' });
        }
        if (repair_start_date && repair_end_date) {
            if (new Date(repair_end_date) < new Date(repair_start_date)) {
                return res.status(400).json({ message: 'วันที่ซ่อมเสร็จจริงต้องไม่เกิดขึ้นก่อนวันที่เข้าซ่อม' });
            }
        }

        const pCost = parts_cost !== undefined ? (parts_cost !== '' && parts_cost !== null ? parseFloat(parts_cost) : null) : undefined;
        const lCost = labor_cost !== undefined ? (labor_cost !== '' && labor_cost !== null ? parseFloat(labor_cost) : null) : undefined;
        let finalTotal = undefined;
        if (pCost !== undefined || lCost !== undefined) {
            if (pCost !== null || lCost !== null) {
                finalTotal = (pCost || 0) + (lCost || 0);
            } else {
                finalTotal = null;
            }
        } else if (total_cost !== undefined) {
            finalTotal = total_cost !== '' && total_cost !== null ? parseFloat(total_cost) : null;
        }

        const isTireBool = is_tire_changed !== undefined ? (is_tire_changed === 'true' || is_tire_changed === true) : undefined;

        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: {
                ...(status ? { status } : {}),
                ...(garage_id ? { garage_id: parseInt(garage_id) } : {}),
                ...(finalTotal !== undefined ? { total_cost: finalTotal } : {}),
                ...(pCost !== undefined ? { parts_cost: pCost } : {}),
                ...(lCost !== undefined ? { labor_cost: lCost } : {}),
                ...(estimated_cost !== undefined ? { estimated_cost: estimated_cost ? parseFloat(estimated_cost) : null } : {}),
                ...(note ? { note } : {}),
                ...(repair_detail ? { repair_detail } : {}),
                ...(repair_start_date ? { repair_start_date: new Date(repair_start_date) } : {}),
                ...(repair_end_date ? { repair_end_date: new Date(repair_end_date) } : {}),
                ...(estimated_end_date ? { estimated_end_date: new Date(estimated_end_date) } : {}),
                ...(oil_grade !== undefined ? { oil_grade: oil_grade || null } : {}),
                ...(isTireBool !== undefined ? { is_tire_changed: isTireBool } : {}),
            },
            include: repairIncludes,
        });

        // Auto-update Vehicle status based on repair status
        if (status && repair.vehicle_id) {
            if (status === 'IN_PROGRESS') {
                await prisma.vehicle.update({
                    where: { vehicle_id: repair.vehicle_id },
                    data: { status: 'IN_REPAIR' }
                });
            } else if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status)) {
                await prisma.vehicle.update({
                    where: { vehicle_id: repair.vehicle_id },
                    data: { status: 'READY' }
                });
            }
        }

        // Auto-update Maintenance Alert when repair is COMPLETED
        if (status === 'COMPLETED' && repair.vehicle_id) {
            let effectiveMileage = repair.mileage_at_repair;
            if (!effectiveMileage) {
                const latestLog = await prisma.mileageLog.findFirst({
                    where: { vehicle_id: repair.vehicle_id },
                    orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }]
                });
                effectiveMileage = latestLog ? latestLog.mileage_end : 0;
            }
            await autoUpdateMaintenanceAlerts(repair.vehicle_id, effectiveMileage, repair, oil_grade, is_tire_changed);
        }

        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }

        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

// Helper: ดึงระยะทางเปลี่ยนถ่ายน้ำมันเครื่องตามเกรด โดยอ้างอิงค่าจาก VehicleType
function getOilInterval(oilGrade, vehicle) {
    const vt = vehicle.vehicleType;
    const defaults = { MINERAL: 5000, SEMI_SYNTHETIC: 7000, FULLY_SYNTHETIC: 10000 };
    if (oilGrade === 'MINERAL') {
        return vt?.oil_interval_mineral_km ?? defaults.MINERAL;
    }
    if (oilGrade === 'SEMI_SYNTHETIC') {
        return vt?.oil_interval_semi_synthetic_km ?? defaults.SEMI_SYNTHETIC;
    }
    if (oilGrade === 'FULLY_SYNTHETIC') {
        return vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
    }
    // Fallback: ใช้ fully synthetic ของประเภทรถ
    return vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
}

/**
 * เมื่อซ่อมเสร็จ ให้อัปเดต MaintenanceAlert ของรถคันนั้นโดยอัตโนมัติ
 * นำ mileage_at_repair มาตั้งเป็น last_service_mileage และคำนวณ next_service_mileage ใหม่
 * หากมี oil_grade หรือ is_tire_changed ให้รีเซ็ตรอบบำรุงรักษา
 */
async function autoUpdateMaintenanceAlerts(vehicleId, mileageAtRepair, repair, rawOilGrade = null, rawIsTireChanged = null) {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { vehicle_id: vehicleId },
            include: {
                vehicleType: true,
                alerts: { where: { is_resolved: false } }
            }
        });
        if (!vehicle) return;

        const desc = `${repair?.issue_description || ''} ${repair?.repair_detail || ''}`.toLowerCase();

        // เช็คว่ามีการเปลี่ยนถ่ายน้ำมันเครื่องหรือไม่
        let oilShouldReset = false;
        if (rawOilGrade !== null && rawOilGrade !== undefined) {
            oilShouldReset = Boolean(rawOilGrade && String(rawOilGrade).trim() !== '');
        } else {
            oilShouldReset = desc.includes('น้ำมัน') || desc.includes('oil') || repair?.repair_type === 'MAINTENANCE';
        }

        // เช็คว่ามีการเปลี่ยนยาง 4 เส้นใหม่หรือไม่
        let tireShouldReset = false;
        if (rawIsTireChanged !== null && rawIsTireChanged !== undefined) {
            tireShouldReset = (rawIsTireChanged === 'true' || rawIsTireChanged === true);
        } else {
            tireShouldReset = desc.includes('ยาง') || desc.includes('tire') || desc.includes('ล้อ');
        }

        let oilAlertResolved = false;
        let tireAlertResolved = false;

        for (const alert of vehicle.alerts) {
            // ถ้ามีการเปลี่ยนน้ำมันเครื่อง
            if (alert.alert_type === 'OIL_CHANGE' && oilShouldReset) {
                await prisma.maintenanceAlert.update({
                    where: { alert_id: alert.alert_id },
                    data: {
                        is_resolved: true,
                        next_service_mileage: mileageAtRepair > 0 ? mileageAtRepair : alert.next_service_mileage,
                    }
                });
                oilAlertResolved = true;
            }

            // ถ้ามีการเปลี่ยนยาง 4 เส้นใหม่
            if (alert.alert_type === 'TIRE_CHANGE' && tireShouldReset) {
                await prisma.maintenanceAlert.update({
                    where: { alert_id: alert.alert_id },
                    data: {
                        is_resolved: true,
                        next_service_mileage: mileageAtRepair > 0 ? mileageAtRepair : alert.next_service_mileage,
                    }
                });
                tireAlertResolved = true;
            }

            // กรณี Alert อื่นๆ เช่น INSPECTION, OTHER, EMERGENCY
            if (['INSPECTION', 'OTHER', 'EMERGENCY'].includes(alert.alert_type)) {
                await prisma.maintenanceAlert.update({
                    where: { alert_id: alert.alert_id },
                    data: {
                        is_resolved: true,
                        next_service_mileage: mileageAtRepair > 0 ? mileageAtRepair : alert.next_service_mileage,
                    }
                });
            }
        }

        // กรณีที่เปลี่ยนน้ำมันเครื่อง "ก่อน" ที่ระบบจะแจ้งเตือน (ไม่มี alert ค้างอยู่)
        // ต้องสร้างประวัติการเปลี่ยนน้ำมันเครื่อง (resolved alert) ทิ้งไว้ 
        // เพื่อให้ mileage.controller ใช้เป็นฐาน (lastServiceMileage) ในการคำนวณรอบถัดไป
        if (oilShouldReset && !oilAlertResolved && mileageAtRepair > 0) {
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

        // กรณีที่เปลี่ยนยาง 4 เส้น "ก่อน" ที่ระบบจะแจ้งเตือน (ไม่มี alert ค้างอยู่)
        // ต้องสร้างประวัติการเปลี่ยนยาง (resolved alert) ทิ้งไว้ 
        // เพื่อให้ mileage.controller และ alert.controller ใช้เป็นฐาน (lastServiceMileage) ในการคำนวณรอบถัดไป
        if (tireShouldReset && !tireAlertResolved && mileageAtRepair > 0) {
            await prisma.maintenanceAlert.create({
                data: {
                    vehicle_id: vehicleId,
                    alert_type: 'TIRE_CHANGE',
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

        // If rejected, ensure the vehicle is READY
        if (!approved && repair.vehicle_id) {
            await prisma.vehicle.update({
                where: { vehicle_id: repair.vehicle_id },
                data: { status: 'READY' }
            });
        }

        res.json(repair);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.uploadReceipt = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
        const repair = await prisma.repairRequest.update({
            where: { request_id: parseInt(req.params.id) },
            data: { receipt_image: req.file.path },
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
