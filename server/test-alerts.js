const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const alerts = await prisma.maintenanceAlert.findMany({
            include: { vehicle: true }
        });
        console.log(`Total alerts: ${alerts.length}`);
        alerts.forEach(a => {
            console.log(`- Alert ID: ${a.alert_id} | Vehicle: ${a.vehicle?.license_plate} | Type: ${a.alert_type} | Next Mileage: ${a.next_service_mileage}`);
        });
    } catch (e) {
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
