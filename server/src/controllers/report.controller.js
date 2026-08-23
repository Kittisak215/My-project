const prisma = require('../lib/prisma');

exports.adminDashboard = async (req, res) => {
    try {
        const [totalVehicles, readyVehicles, pendingRepairs, overdueAlerts, maintenanceAlerts, recentRepairs, monthlyExpenseAgg] = await Promise.all([
            prisma.vehicle.count(),
            prisma.vehicle.count({ where: { status: 'READY' } }),
            prisma.repairRequest.groupBy({ by: ['status'], _count: { status: true } }),
            prisma.maintenanceAlert.groupBy({ by: ['alert_type'], where: { is_resolved: false }, _count: { alert_type: true } }),
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

        const repairStats = pendingRepairs.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.status }), {});
        const alertStats = overdueAlerts.reduce((acc, curr) => ({ ...acc, [curr.alert_type]: curr._count.alert_type }), {});
        const totalPendingRepairs = (repairStats.PENDING || 0) + (repairStats.IN_PROGRESS || 0) + (repairStats.AWAITING_APPROVAL || 0);
        const totalAlerts = (alertStats.MILEAGE || 0) + (alertStats.TIME || 0);

        res.json({
            stats: { 
                totalVehicles, 
                readyVehicles, 
                pendingRepairs: totalPendingRepairs, 
                repairBreakdown: repairStats,
                overdueAlerts: totalAlerts, 
                alertBreakdown: alertStats,
                monthlyExpense: monthlyExpenseAgg._sum.total_cost || 0 
            },
            maintenanceAlerts,
            recentRepairs,
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.executiveDashboard = async (req, res) => {
    try {
        const thisYear = new Date().getFullYear();
        const [yearlyAgg, totalVehicles, readyVehicles, pendingApprovals, topVehicles, allCompletedRepairs] = await Promise.all([
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
            prisma.repairRequest.findMany({
                where: { status: 'COMPLETED' },
                select: { total_cost: true, created_at: true }
            })
        ]);

        const topVehicleIds = topVehicles.map(t => t.vehicle_id);
        const vehicleDetails = await prisma.vehicle.findMany({
            where: { vehicle_id: { in: topVehicleIds } },
            include: { driver: true, vehicleType: true },
        });

        const tvMap = {};
        vehicleDetails.forEach(v => tvMap[v.vehicle_id] = v);

        const totalMileageAgg = await prisma.mileageLog.aggregate({ _sum: { distance_km: true } });

        // Calculate yearly expenses breakdown from actual database records
        const yearlyExpenseMap = {};
        allCompletedRepairs.forEach(r => {
            const yr = new Date(r.created_at).getFullYear();
            yearlyExpenseMap[yr] = (yearlyExpenseMap[yr] || 0) + Number(r.total_cost || 0);
        });

        if (yearlyExpenseMap[thisYear] === undefined) {
            yearlyExpenseMap[thisYear] = Number(yearlyAgg._sum.total_cost || 0);
        }

        const yearlyExpenses = Object.keys(yearlyExpenseMap).sort().map(yr => {
            const yearNum = Number(yr);
            return {
                year: yearNum,
                yearTh: `ปี ${yearNum + 543}`,
                totalCost: yearlyExpenseMap[yr]
            };
        });

        res.json({
            stats: {
                yearlyExpense: Number(yearlyAgg._sum.total_cost || 0),
                availabilityRate: totalVehicles > 0 ? Math.round((readyVehicles / totalVehicles) * 100) : 0,
                totalMileage: Number(totalMileageAgg._sum.distance_km || 0),
                pendingApprovals,
                totalVehicles,
                readyVehicles,
                unavailableVehicles: Math.max(0, totalVehicles - readyVehicles),
            },
            yearlyExpenses,
            topVehicles: topVehicles.map(t => ({
                vehicle: tvMap[t.vehicle_id],
                totalCost: Number(t._sum.total_cost || 0),
                repairCount: t._count.request_id,
            }))
        });
    } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.expenseReport = async (req, res) => {
    try {
        const { from, to, vehicleId, category, page = 1, limit = 10, exportAll } = req.query;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.max(1, parseInt(limit) || 10);
        const skip = (pageNum - 1) * limitNum;
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
            const typeMap = {
                'GENERAL': 'GENERAL',
                'MAINTENANCE': 'MAINTENANCE',
                'EMERGENCY': 'EMERGENCY',
                'ซ่อมทั่วไป': 'GENERAL',
                'บำรุงรักษาตามระยะ': 'MAINTENANCE',
                'ซ่อมฉุกเฉิน': 'EMERGENCY',
                'เบิกฉุกเฉิน': 'EMERGENCY'
            };
            if (typeMap[category]) where.repair_type = typeMap[category];
        }

        const isExport = exportAll === 'true';

        const [data, total, agg, categoryBreakdown] = await Promise.all([
            prisma.repairRequest.findMany({
                where,
                ...(isExport ? {} : { skip, take: limitNum }),
                include: {
                    vehicle: { include: { driver: true, vehicleType: true } },
                    garage: true,
                    driver: true
                },
                orderBy: { created_at: 'desc' }
            }),
            prisma.repairRequest.count({ where }),
            prisma.repairRequest.aggregate({
                where,
                _sum: { total_cost: true },
                _avg: { total_cost: true },
                _max: { total_cost: true }
            }),
            prisma.repairRequest.groupBy({
                by: ['repair_type'],
                where,
                _sum: { total_cost: true },
                _count: { request_id: true }
            })
        ]);

        res.json({
            data,
            total,
            totalAmount: Number(agg._sum.total_cost || 0),
            avgAmount: Number(agg._avg.total_cost || 0),
            maxAmount: Number(agg._max.total_cost || 0),
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            categoryBreakdown: categoryBreakdown.map(c => ({
                type: c.repair_type,
                totalCost: Number(c._sum.total_cost || 0),
                count: c._count.request_id
            }))
        });
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
