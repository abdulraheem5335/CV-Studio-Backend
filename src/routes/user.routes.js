const router = require('express').Router();
const { getProfile, updateProfile, updateAvatar, updatePosition, getLeaderboard, getActiveUsers } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/leaderboard', getLeaderboard);
router.get('/active', protect, getActiveUsers);
router.get('/:id', getProfile);
router.put('/profile', protect, updateProfile);
router.put('/avatar', protect, updateAvatar);
router.put('/position', protect, updatePosition);

module.exports = router;
