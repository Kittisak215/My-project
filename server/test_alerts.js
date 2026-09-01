const prisma = require('./src/lib/prisma');

async function main() {
    const alerts = await prisma.maintenanceAlert.findMany({
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

    const enriched = alerts.map(a => {
        const currentMileage = a.vehicle?.mileageLogs?.[0]?.mileage_end || 0;
        const vehicle = a.vehicle ? { ...a.vehicle, current_mileage: currentMileage } : null;
        
        let status = 'UPCOMING';
        if (a.is_resolved) {
            status = 'DONE';
        } else if (currentMileage >= a.next_service_mileage) {
            status = 'OVERDUE';
        }
        return { 
            alert_id: a.alert_id, 
            type: a.alert_type,
            next: a.next_service_mileage,
            currentMileage,
            status 
        };
    });

    console.log(JSON.stringify(enriched, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
