const express = require('express');
const router = express.Router();
const c = require('../controllers/vehicleType.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', c.getAll);
router.post('/', requireRole('ADMIN'), c.create);
router.put('/:id', requireRole('ADMIN'), c.update);
router.delete('/:id', requireRole('ADMIN'), c.remove);

module.exports = router;
