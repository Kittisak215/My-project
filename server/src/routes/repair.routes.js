const express = require('express');
const router = express.Router();
const c = require('../controllers/repair.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authMiddleware);
router.get('/', c.getAll);
router.get('/:id', c.getById);
router.post('/', c.create);
router.put('/:id', requireRole('ADMIN'), c.update);
router.patch('/:id/status', requireRole('ADMIN'), c.updateStatus);
router.patch('/:id/approve', requireRole('ADMIN'), c.approve);
router.post('/:id/receipt', upload.single('receipt'), c.uploadReceipt);
router.delete('/:id', requireRole('ADMIN'), c.remove);
module.exports = router;
