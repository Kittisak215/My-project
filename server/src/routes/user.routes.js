const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

// All user routes are restricted to ADMIN
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/', userController.getAllUsers);
router.put('/:id', userController.updateUser);

module.exports = router;
