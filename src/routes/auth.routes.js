const router = require('express').Router();
const { register, login, getMe, verifyNustId } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/verify-nust-id', protect, verifyNustId);

module.exports = router;
