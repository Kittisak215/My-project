const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
    try {
        console.log('Cleaning up duplicate alerts and repairs...');

        // Quick and dirty way for seed data: Just delete all alerts and repairs and re-seed
        await prisma.maintenanceAlert.deleteMany({});
        console.log('✅ Cleared all Maintenance Alerts');

        await prisma.repairRequest.deleteMany({});
        console.log('✅ Cleared all Repair Requests');

        await prisma.mileageLog.deleteMany({});
        console.log('✅ Cleared all Mileage Logs');

        await prisma.vehicle.deleteMany({});
        console.log('✅ Cleared all Vehicles');

        await prisma.garage.deleteMany({});
        console.log('✅ Cleared all Garages');

        await prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } });
        console.log('✅ Cleared all non-admin Users');

        await prisma.driver.deleteMany({});
        console.log('✅ Cleared all Drivers');

        await prisma.vehicleType.deleteMany({});
        console.log('✅ Cleared all Vehicle Types');

    } catch (e) {
        console.error('❌ Cleanup failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

cleanDuplicates();
