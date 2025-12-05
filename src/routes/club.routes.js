const router = require('express').Router();
const { getClubs, getClub, joinClub, leaveClub, createClub } = require('../controllers/club.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getClubs);
router.get('/:id', getClub);
router.post('/', protect, createClub);
router.post('/:id/join', protect, joinClub);
router.post('/:id/leave', protect, leaveClub);

module.exports = router;
