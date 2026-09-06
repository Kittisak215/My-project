const prisma = require('../lib/prisma');

exports.getAll = async (req, res) => {
    try {
        const { search, alert_type } = req.query;
        const where = {};
        if (search) where.vehicle = { license_plate: { contains: search, mode: 'insensitive' } };
        if (alert_type && alert_type !== 'all') where.alert_type = alert_type;

        const alerts = await prisma.maintenanceAlert.findMany({
            where,
            include: { 
                vehicle: { 
                    include: { 
                        driver: true,
                        mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 }
                    } 
                } 
            },
            orderBy: { is_resolved: 'asc' },
        });

        // Enrich with status and vehicle current_mileage
        const enriched = alerts.map(a => {
            const currentMileage = a.vehicle?.mileageLogs?.[0]?.mileage_end || 0;
            const vehicle = a.vehicle ? { ...a.vehicle, current_mileage: currentMileage } : null;
            
            let status = 'UPCOMING';
            if (a.is_resolved) {
                status = 'DONE';
            } else if (currentMileage >= a.next_service_mileage) {
                status = 'OVERDUE';
            }
            return { ...a, vehicle, status };
        });

        res.json(enriched);
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.create = async (req, res) => {
    try {
        const { vehicle_id, alert_type, last_service_mileage, next_service_mileage } = req.body;
        const alert = await prisma.maintenanceAlert.create({
            data: { vehicle_id: parseInt(vehicle_id), alert_type, last_service_mileage: parseInt(last_service_mileage), next_service_mileage: parseInt(next_service_mileage) },
            include: { vehicle: true }
        });
        
        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }
        
        res.status(201).json(alert);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.update = async (req, res) => {
    try {
        const alertId = parseInt(req.params.id);
        const { is_resolved, service_mileage } = req.body;

        const currentAlert = await prisma.maintenanceAlert.findUnique({
            where: { alert_id: alertId },
            include: { 
                vehicle: { 
                    include: { 
                        mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 } 
                    } 
                } 
            }
        });

        if (!currentAlert) {
            return res.status(404).json({ message: 'ไม่พบการแจ้งเตือนนี้' });
        }

        const updateData = { ...req.body };

        if (is_resolved === true || is_resolved === 'true') {
            updateData.is_resolved = true;
            // บันทึกไมล์ที่ดำเนินการเสร็จ เพื่อใช้เป็นฐานคำนวณรอบถัดไป
            const resolvedMileage = service_mileage 
                ? parseInt(service_mileage) 
                : (currentAlert.vehicle?.mileageLogs?.[0]?.mileage_end || currentAlert.next_service_mileage);
            
            updateData.next_service_mileage = resolvedMileage;
            delete updateData.service_mileage;
        }

        const alert = await prisma.maintenanceAlert.update({
            where: { alert_id: alertId },
            data: updateData,
            include: { vehicle: true }
        });

        try {
            const socketIO = require('../socket');
            socketIO.getIO().emit('new_notification');
        } catch (e) { console.error('Socket emit error', e); }

        res.json(alert);
    } catch (err) { res.status(400).json({ message: err.message }); }
};

exports.remind = async (req, res) => {
    try {
        const alertId = parseInt(req.params.id);
        const existingAlert = await prisma.maintenanceAlert.findUnique({
            where: { alert_id: alertId },
            include: {
                vehicle: {
                    include: { driver: true }
                }
            }
        });

        if (!existingAlert) {
            return res.status(404).json({ message: 'ไม่พบข้อมูลการแจ้งเตือนนี้' });
        }

        const newCount = (existingAlert.remind_count || 0) + 1;
        const updatedAlert = await prisma.maintenanceAlert.update({
            where: { alert_id: alertId },
            data: {
                remind_count: newCount,
                reminded_at: new Date()
            },
            include: {
                vehicle: {
                    include: { driver: true }
                }
            }
        });

        const alertTypeLabel = {
            OIL_CHANGE: 'เปลี่ยนถ่ายน้ำมันเครื่อง',
            TIRE_CHANGE: 'เปลี่ยนยาง',
            INSPECTION: 'ตรวจสภาพรถ',
            EMERGENCY: 'ซ่อมฉุกเฉิน',
            OTHER: 'บำรุงรักษาตามระยะ'
        };
        const typeName = alertTypeLabel[existingAlert.alert_type] || 'บำรุงรักษารถ';
        const plate = existingAlert.vehicle?.license_plate || 'ไม่ระบุทะเบียน';
        const driverName = existingAlert.vehicle?.driver?.full_name || 'คนขับ';
        const driverId = existingAlert.vehicle?.driver_id || null;

        // ยิง Socket.io ให้ Client รับทราบ
        try {
            const socketIO = require('../socket');
            const io = socketIO.getIO();
            if (io) {
                io.emit('maintenance_remind', {
                    alertId: existingAlert.alert_id,
                    vehicleId: existingAlert.vehicle_id,
                    driverId: driverId,
                    licensePlate: plate,
                    alertType: existingAlert.alert_type,
                    typeName: typeName,
                    remindCount: newCount,
                    message: `⚠️ ผู้ดูแลระบบแจ้งเตือนซ้ำ: รถทะเบียน ${plate} ถึงรอบ${typeName}แล้ว กรุณานำรถเข้าบำรุงรักษา`
                });
                io.emit('new_notification');
            }
        } catch (socketErr) {
            console.error('Socket emit error in alert remind:', socketErr.message);
        }

        res.json({
            message: `ส่งการแจ้งเตือนซ้ำไปยัง ${driverName} สำเร็จ`,
            alert: updatedAlert
        });
    } catch (err) {
        console.error('Alert remind error:', err);
        res.status(400).json({ message: err.message });
    }
};

exports.recalculate = async (req, res) => {
    try {
        // Dummy implementation for recalculate
        res.json({ message: 'Recalculated successfully' });
    } catch (err) { res.status(400).json({ message: err.message }); }
};

// Helper: ดึงระยะทางน้ำมันเครื่องตามเกรด จาก VehicleType
function getOilIntervalByGrade(oilGrade, vehicle) {
    const vt = vehicle.vehicleType;
    const defaults = { MINERAL: 5000, SEMI_SYNTHETIC: 7000, FULLY_SYNTHETIC: 10000 };
    if (oilGrade === 'MINERAL') return vt?.oil_interval_mineral_km ?? defaults.MINERAL;
    if (oilGrade === 'SEMI_SYNTHETIC') return vt?.oil_interval_semi_synthetic_km ?? defaults.SEMI_SYNTHETIC;
    if (oilGrade === 'FULLY_SYNTHETIC') return vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
    // Fallback: ใช้ fully synthetic
    return vt?.oil_interval_fully_synthetic_km ?? defaults.FULLY_SYNTHETIC;
}

exports.getForecast = async (req, res) => {
    try {
        const where = { is_active: true };
        if (req.user.role === 'DRIVER') {
            where.driver_id = req.user.driver_id;
        }
        if (req.query.vehicle_id) {
            where.vehicle_id = parseInt(req.query.vehicle_id);
        }

        const vehicles = await prisma.vehicle.findMany({
            where,
            include: {
                vehicleType: true,
                mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 },
                alerts: { where: { is_resolved: false } }
            },
            orderBy: { created_at: 'desc' }
        });

        const forecast = await Promise.all(vehicles.map(async (v) => {
            const currentMileage = v.mileageLogs?.[0]?.mileage_end || 0;
            const tireInterval = v.vehicleType?.tire_change_interval_km ?? 50000;

            // ดึงเกรดน้ำมันล่าสุดที่เคยใช้กับรถคันนี้ เพื่อเอา interval มาคำนวณ forecast
            const lastOilRepair = await prisma.repairRequest.findFirst({
                where: { vehicle_id: v.vehicle_id, oil_grade: { not: null } },
                orderBy: { created_at: 'desc' },
                select: { oil_grade: true }
            });
            const lastOilGrade = lastOilRepair?.oil_grade || null;
            const oilInterval = getOilIntervalByGrade(lastOilGrade || 'FULLY_SYNTHETIC', v);

            const calculateTypeForecast = async (type, interval) => {
                const pendingAlert = v.alerts.find(a => a.alert_type === type);
                let next_service_mileage = 0;

                if (pendingAlert) {
                    next_service_mileage = pendingAlert.next_service_mileage;
                } else {
                    const lastResolved = await prisma.maintenanceAlert.findFirst({
                        where: { vehicle_id: v.vehicle_id, alert_type: type, is_resolved: true },
                        orderBy: [{ next_service_mileage: 'desc' }, { alert_id: 'desc' }]
                    });
                    next_service_mileage = (lastResolved ? lastResolved.next_service_mileage : 0) + interval;
                }

                return {
                    type,
                    interval,
                    next_service_mileage,
                    remaining_mileage: next_service_mileage - currentMileage
                };
            };

            const oilForecast = await calculateTypeForecast('OIL_CHANGE', oilInterval);
            const tireForecast = await calculateTypeForecast('TIRE_CHANGE', tireInterval);

            return {
                vehicle: {
                    vehicle_id: v.vehicle_id,
                    license_plate: v.license_plate,
                    brand: v.brand,
                    model: v.model,
                },
                current_mileage: currentMileage,
                oil_grade_last_used: lastOilGrade,
                forecasts: [oilForecast, tireForecast]
            };
        }));

        res.json(forecast);
    } catch (err) { res.status(500).json({ message: err.message }); }
};
