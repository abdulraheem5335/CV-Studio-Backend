const router = require('express').Router();
const { getMyStats, getBadges, getShopItems, purchaseItem, awardBadge } = require('../controllers/gamification.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/stats', protect, getMyStats);
router.get('/badges', protect, getBadges);
router.get('/shop', protect, getShopItems);
router.post('/shop/:itemId/purchase', protect, purchaseItem);
router.post('/badges/award', protect, authorize('admin', 'moderator'), awardBadge);

module.exports = router;
