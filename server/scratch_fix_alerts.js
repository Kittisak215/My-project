require('dotenv').config();
const prisma = require('./src/lib/prisma');

async function clean() {
    await prisma.maintenanceAlert.updateMany({
        where: { is_resolved: false },
        data: { is_resolved: true }
    });
    console.log('Cleaned up all leftover alerts!');
}
clean().catch(console.error).finally(() => process.exit(0));
