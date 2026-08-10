const prisma = require('../lib/prisma');

exports.adminDashboard = async (req, res) => {
    try {
        const [totalVehicles, readyVehicles, pendingRepairs, overdueAlerts, maintenanceAlerts, recentRepairs, monthlyExpenseAgg] = await Promise.all([
            prisma.vehicle.count(),
            prisma.vehicle.count({ where: { status: 'READY' } }),
            prisma.repairRequest.count({ where: { status: 'PENDING' } }),
            prisma.maintenanceAlert.count({ where: { is_resolved: false } }),
            prisma.maintenanceAlert.findMany({
                where: { is_resolved: false },
                include: { vehicle: { include: { driver: true } } },
                orderBy: { alert_id: 'desc' }, take: 10,
            }),
            prisma.repairRequest.findMany({
                orderBy: { created_at: 'desc' }, take: 8,
                include: { vehicle: true, driver: true, garage: true },
            }),
            prisma.repairRequest.aggregate({
                where: {
                    status: 'COMPLETED',
                    created_at: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
                },
                _sum: { total_cost: true }
            }),
        ]);

        res.json({
            stats: { totalVehicles, readyVehicles, pendingRepairs, overdueAlerts, monthlyExpense: monthlyExpenseAgg._sum.total_cost || 0 },
            maintenanceAlerts,
            recentRepairs,
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.executiveDashboard = async (req, res) => {
    try {
        const thisYear = new Date().getFullYear();
        const [yearlyAgg, totalVehicles, readyVehicles, pendingApprovals, topVehicles] = await Promise.all([
            prisma.repairRequest.aggregate({
                where: { status: 'COMPLETED', created_at: { gte: new Date(thisYear, 0, 1), lt: new Date(thisYear + 1, 0, 1) } },
                _sum: { total_cost: true }
            }),
            prisma.vehicle.count(),
            prisma.vehicle.count({ where: { status: 'READY' } }),
            prisma.repairRequest.count({ where: { status: 'AWAITING_APPROVAL' } }),
            prisma.repairRequest.groupBy({
                by: ['vehicle_id'],
                where: { status: 'COMPLETED', created_at: { gte: new Date(thisYear, 0, 1) } },
                _sum: { total_cost: true },
                _count: { request_id: true },
                orderBy: { _sum: { total_cost: 'desc' } },
                take: 5,
            }),
        ]);

        const topVehicleIds = topVehicles.map(t => t.vehicle_id);
        const vehicleDetails = await prisma.vehicle.findMany({
            where: { vehicle_id: { in: topVehicleIds } },
            include: { driver: true, vehicleType: true },
        });

        const tvMap = {};
        vehicleDetails.forEach(v => tvMap[v.vehicle_id] = v);

        const totalMileageAgg = await prisma.mileageLog.aggregate({ _sum: { distance_km: true } });

        res.json({
            stats: {
                yearlyExpense: yearlyAgg._sum.total_cost || 0,
                availabilityRate: totalVehicles > 0 ? Math.round((readyVehicles / totalVehicles) * 100) : 0,
                totalMileage: totalMileageAgg._sum.distance_km || 0,
                pendingApprovals,
            },
            topVehicles: topVehicles.map(t => ({
                vehicle: tvMap[t.vehicle_id],
                totalCost: t._sum.total_cost || 0,
                repairCount: t._count.request_id,
            }))
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.expenseReport = async (req, res) => {
    try {
        const { from, to, vehicleId, category, page = 1, limit = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = { status: { in: ['COMPLETED', 'APPROVED'] } };

        let dateFilter = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            dateFilter.lte = toDate;
        }
        if (Object.keys(dateFilter).length > 0) {
            where.created_at = dateFilter;
        }

        if (vehicleId && vehicleId !== 'all') where.vehicle_id = parseInt(vehicleId);
        if (category && category !== 'all') {
            const typeMap = { 'ซ่อมทั่วไป': 'GENERAL', 'บำรุงรักษาตามระยะ': 'MAINTENANCE', 'ซ่อมฉุกเฉิน': 'EMERGENCY' };
            if (typeMap[category]) where.repair_type = typeMap[category];
        }

        const [data, total, agg] = await Promise.all([
            prisma.repairRequest.findMany({ where, skip, take: parseInt(limit), include: { vehicle: true, garage: true }, orderBy: { created_at: 'desc' } }),
            prisma.repairRequest.count({ where }),
            prisma.repairRequest.aggregate({ where, _sum: { total_cost: true }, _avg: { total_cost: true } }),
        ]);
        res.json({ data, total, totalAmount: agg._sum.total_cost || 0, avgAmount: Number(agg._avg.total_cost) || 0 });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.pendingApprovals = async (req, res) => {
    try {
        const requests = await prisma.repairRequest.findMany({
            where: { status: 'AWAITING_APPROVAL' },
            include: { vehicle: { include: { driver: true } }, garage: true },
            orderBy: { created_at: 'desc' },
        });
        const totalAmount = requests.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
        res.json({ data: requests, totalAmount });
    } catch (err) { res.status(500).json({ message: err.message }); }
};
