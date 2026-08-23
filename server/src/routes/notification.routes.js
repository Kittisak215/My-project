const express = require('express');
const router = express.Router();
const c = require('../controllers/notification.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

router.use(authMiddleware);
router.get('/driver', requireRole('DRIVER', 'ADMIN'), c.getDriverNotifications);
router.get('/admin', requireRole('ADMIN'), c.getAdminNotifications);
router.get('/executive', requireRole('EXECUTIVE', 'ADMIN'), c.getExecutiveNotifications);

module.exports = router;
