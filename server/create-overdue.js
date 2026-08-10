const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const prisma = new PrismaClient();
const log = (msg) => { console.log(msg); fs.appendFileSync('overdue_log.txt', msg + '\n'); };

async function main() {
    if (fs.existsSync('overdue_log.txt')) fs.unlinkSync('overdue_log.txt');
    log('⏳ Creating overdue maintenance scenario...');

    try {
        // 1. Create Driver
        const driver = await prisma.driver.create({
            data: {
                full_name: 'ประหยัด ขับไว',
                phone: '089-999-9999',
                is_active: true
            }
        });
        log(`   - Created Driver: ${driver.full_name}`);

        // 2. Create User
        const passwordHash = await bcrypt.hash('123456', 10);
        const user = await prisma.user.create({
            data: {
                username: 'driver_test',
                password_hash: passwordHash,
                role: 'DRIVER',
                full_name: 'ประหยัด ขับไว',
                driver_id: driver.driver_id
            }
        });
        log(`   - Created User: ${user.username}`);

        // 3. Create Vehicle (Van type_id: 1)
        const vehicle = await prisma.vehicle.create({
            data: {
                license_plate: 'ฮฮ 9999',
                type_id: 1, // Van
                driver_id: driver.driver_id,
                brand: 'Toyota',
                model: 'Commuter',
                year: 2022,
                color: 'เงิน',
                status: 'READY',
                oil_change_interval_km: 10000,
                tire_change_interval_km: 50000
            }
        });
        log(`   - Created Vehicle: ${vehicle.license_plate}`);

        // 4. Create Maintenance Alert (Overdue)
        await prisma.maintenanceAlert.create({
            data: {
                vehicle_id: vehicle.vehicle_id,
                alert_type: 'OIL_CHANGE',
                last_service_mileage: 0,
                next_service_mileage: 10000,
                is_resolved: false
            }
        });
        log(`   - Created Alert (Due at 10,000 km)`);

        // 5. Add Mileage Log (Current mileage 12,500 km -> Overdue!)
        await prisma.mileageLog.create({
            data: {
                vehicle_id: vehicle.vehicle_id,
                record_month: new Date(),
                mileage_start: 0,
                mileage_end: 12500,
                distance_km: 12500,
                recorded_by: driver.driver_id
            }
        });
        log(`   - Added Mileage Log: 12,500 km`);

        log('✅ Overdue scenario created successfully!');
    } catch (error) {
        log(`❌ Error: ${error.message}`);
    }
}

main()
    .catch(e => { log(`❌ Fatal: ${e.message}`); process.exit(1); })
    .finally(() => prisma.$disconnect());
