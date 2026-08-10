const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const updated = await prisma.user.updateMany({
        where: { role: 'VIEWER' },
        data: { role: 'EXECUTIVE' },
    });
    console.log(`Updated ${updated.count} users from VIEWER to EXECUTIVE.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
