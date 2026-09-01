const cron = require('node-cron');
const prisma = require('./lib/prisma');

const checkMaintenanceAlerts = async () => {
    try {
        console.log('Running monthly maintenance check...');
        const vehicles = await prisma.vehicle.findMany({
            where: { is_active: true },
            include: {
                vehicleType: true,
                mileageLogs: { orderBy: [{ record_date: 'desc' }, { mileage_id: 'desc' }], take: 1 },
                alerts: { where: { is_resolved: false } }
            }
        });

        let newAlertsCreated = 0;

        for (const v of vehicles) {
            const currentMileage = v.mileageLogs?.[0]?.mileage_end || 0;
            const oilInterval = v.oil_change_interval_km ?? v.vehicleType?.oil_change_interval_km ?? 10000;
            const tireInterval = v.tire_change_interval_km ?? v.vehicleType?.tire_change_interval_km ?? 50000;

            const checkType = async (type, interval) => {
                const pendingAlert = v.alerts.find(a => a.alert_type === type);
                if (pendingAlert) return; // Alert already exists

                const lastResolved = await prisma.maintenanceAlert.findFirst({
                    where: { vehicle_id: v.vehicle_id, alert_type: type, is_resolved: true },
                    orderBy: { next_service_mileage: 'desc' }
                });

                const next_service_mileage = (lastResolved ? lastResolved.next_service_mileage : 0) + interval;
                const remaining_mileage = next_service_mileage - currentMileage;

                // Threshold: create alert if remaining mileage is <= 2000 km
                if (remaining_mileage <= 2000) {
                    await prisma.maintenanceAlert.create({
                        data: {
                            vehicle_id: v.vehicle_id,
                            alert_type: type,
                            last_service_mileage: lastResolved ? lastResolved.next_service_mileage : 0,
                            next_service_mileage: next_service_mileage
                        }
                    });
                    newAlertsCreated++;
                }
            };

            await checkType('OIL_CHANGE', oilInterval);
            await checkType('TIRE_CHANGE', tireInterval);
        }

        console.log(`Monthly maintenance check completed. Created ${newAlertsCreated} new alerts.`);

        if (newAlertsCreated > 0) {
            try {
                const socketIO = require('./socket');
                const io = socketIO.getIO();
                if (io) io.emit('new_notification');
            } catch (e) {
                console.error('Socket emit error in cron', e.message);
            }
        }
    } catch (err) {
        console.error('Error in monthly maintenance check cron:', err);
    }
};

const initCron = () => {
    // Run at 08:00 AM on the 1st of every month
    cron.schedule('0 8 1 * *', () => {
        checkMaintenanceAlerts();
    });
    console.log('Cron jobs initialized.');
};

module.exports = { initCron, checkMaintenanceAlerts };
