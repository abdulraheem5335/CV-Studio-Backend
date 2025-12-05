const router = require('express').Router();
const { getAvailableQuests, startQuest, updateQuestProgress, getMyQuests } = require('../controllers/quest.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAvailableQuests);
router.get('/my', protect, getMyQuests);
router.post('/:id/start', protect, startQuest);
router.put('/:id/progress', protect, updateQuestProgress);

module.exports = router;
