const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const alerts = await prisma.maintenanceAlert.findMany({
        where: { vehicle: { license_plate: 'ฮฮ 9999' } },
        include: { vehicle: true }
    });
    console.log('--- Maintenance Alerts for ฮฮ 9999 ---');
    console.log(JSON.stringify(alerts, null, 2));

    const mileage = await prisma.mileageLog.findMany({
        where: { vehicle: { license_plate: 'ฮฮ 9999' } }
    });
    console.log('--- Mileage Logs for ฮฮ 9999 ---');
    console.log(JSON.stringify(mileage, null, 2));
}

check().finally(() => prisma.$disconnect());
