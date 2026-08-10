const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');
router.use(authMiddleware);
router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
});
module.exports = router;
