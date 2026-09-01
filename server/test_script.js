const prisma = require('./src/lib/prisma.js');

async function main() {
    console.log("=== Checking Admin Notifications ===");
    
    // 1. Check Repairs (PENDING, APPROVED, REJECTED)
    const repairs = await prisma.repairRequest.findMany({
        where: { status: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
        include: { vehicle: { select: { license_plate: true } } },
        orderBy: { created_at: 'desc' }
    });
    
    console.log(`Found ${repairs.length} repair notifications:`);
    repairs.forEach(r => {
        console.log(` - REQ-${String(r.request_id).padStart(4, '0')} | Status: ${r.status} | Vehicle: ${r.vehicle?.license_plate} | Desc: ${r.issue_description}`);
    });

    // 2. Check Maintenance Alerts
    const alerts = await prisma.maintenanceAlert.findMany({
        where: { is_resolved: false },
        include: { vehicle: { select: { license_plate: true } } }
    });
    
    console.log(`\nFound ${alerts.length} maintenance alerts:`);
    alerts.forEach(a => {
        console.log(` - Alert ID: ${a.alert_id} | Type: ${a.alert_type} | Vehicle: ${a.vehicle?.license_plate} | Next Service: ${a.next_service_mileage} km`);
    });

    console.log("\n=== Checking Driver Notifications ===");
    // Just to see if there are any active vehicles for drivers
    const activeVehicles = await prisma.vehicle.findMany({
        where: { is_active: true }
    });
    console.log(`Active Vehicles total: ${activeVehicles.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
