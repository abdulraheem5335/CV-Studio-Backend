const router = require('express').Router();
const { createEvent, getEvents, getEvent, joinEvent, leaveEvent, markAttendance } = require('../controllers/event.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', getEvents);
router.get('/:id', getEvent);
router.post('/', protect, createEvent);
router.post('/:id/join', protect, joinEvent);
router.post('/:id/leave', protect, leaveEvent);
router.post('/:id/attendance', protect, markAttendance);

module.exports = router;
