const router = require('express').Router();
const { getAllZones, getZone, enterZone, getZoneUsers, discoverSecret, upsertZone } = require('../controllers/map.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/zones', getAllZones);
router.get('/zones/:zoneId', getZone);
router.post('/zones/:zoneId/enter', protect, enterZone);
router.get('/zones/:zoneId/users', protect, getZoneUsers);
router.post('/zones/:zoneId/secrets/:secretId', protect, discoverSecret);
router.put('/zones/:zoneId', protect, authorize('admin'), upsertZone);

module.exports = router;
