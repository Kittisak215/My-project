const express = require('express');
const router = express.Router();
const c = require('../controllers/mileage.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
router.use(authMiddleware);
router.post('/', c.addLog);
router.get('/:vehicleId', c.getByVehicle);
module.exports = router;
