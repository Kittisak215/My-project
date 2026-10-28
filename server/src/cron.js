const cron = require('node-cron');
const prisma = require('./lib/prisma');

const checkMaintenanceAlerts = async () => {
    // Currently disabled as mileage checking is handled in real-time by mileage.controller.js
    console.log('Monthly maintenance check is disabled for mileage (handled in real-time).');
};

const initCron = () => {
    // Run at 08:00 AM on the 1st of every month
    cron.schedule('0 8 1 * *', () => {
        checkMaintenanceAlerts();
    });
    console.log('Cron jobs initialized.');
};

module.exports = { initCron, checkMaintenanceAlerts };
