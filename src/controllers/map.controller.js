/**
 * Map Controller - MongoDB Version
 * Handles campus zones, navigation, and secrets
 */

const { Zone, User } = require('../models');

// @desc    Get all zones
// @route   GET /api/map/zones
// @access  Public
exports.getAllZones = async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: { $ne: false } })
      .select('-secrets.discoveredBy')
      .lean();
    res.json({ success: true, zones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single zone
// @route   GET /api/map/zones/:zoneId
// @access  Public
exports.getZone = async (req, res) => {
  try {
    const zone = await Zone.findOne({ zoneId: req.params.zoneId });
    
    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    res.json({ success: true, zone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Enter a zone
// @route   POST /api/map/zones/:zoneId/enter
// @access  Private
exports.enterZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const zone = await Zone.findOne({ zoneId });

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const user = await User.findById(req.user.id);

    // Check level requirement
    if (zone.requirements?.minLevel > user.level) {
      return res.status(403).json({ 
        success: false, 
        message: `Requires level ${zone.requirements.minLevel}` 
      });
    }

    // Update user position
    user.currentZone = zoneId;
    user.position = zone.center;
    user.lastActive = new Date();
    
    // Award XP for zone visit
    await user.addXP(5);
    user.points = (user.points || 0) + 5;
    await user.save();

    // Record zone visit
    await zone.recordVisit();

    res.json({ 
      success: true, 
      zone,
      position: user.position 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get users in a zone
// @route   GET /api/map/zones/:zoneId/users
// @access  Public
exports.getZoneUsers = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const users = await User.find({
      currentZone: zoneId,
      lastActive: { $gte: fiveMinutesAgo },
      'preferences.showOnMap': { $ne: false }
    })
    .select('nickname avatar position level')
    .lean();

    const mappedUsers = users.map(u => ({
      id: u._id,
      nickname: u.nickname,
      avatar: u.avatar,
      position: u.position,
      level: u.level
    }));

    res.json({ success: true, users: mappedUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Discover a secret
// @route   POST /api/map/zones/:zoneId/secrets/:secretId
// @access  Private
exports.discoverSecret = async (req, res) => {
  try {
    const { zoneId, secretId } = req.params;
    const zone = await Zone.findOne({ zoneId });

    if (!zone) {
      return res.status(404).json({ success: false, message: 'Zone not found' });
    }

    const secret = zone.secrets?.find(s => s.secretId === secretId);
    if (!secret) {
      return res.status(404).json({ success: false, message: 'Secret not found' });
    }

    const user = await User.findById(req.user.id);

    // Check if already discovered
    if (secret.discoveredBy?.some(id => id.toString() === req.user.id)) {
      return res.json({ success: true, message: 'Already discovered', secret });
    }

    // Mark as discovered
    secret.discoveredBy = secret.discoveredBy || [];
    secret.discoveredBy.push(user._id);
    await zone.save();

    // Award rewards
    if (secret.reward?.xp) {
      await user.addXP(secret.reward.xp);
    }

    res.json({ 
      success: true, 
      message: 'Secret discovered!', 
      secret,
      reward: secret.reward 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create or update zone (Admin)
// @route   PUT /api/map/zones/:zoneId
// @access  Private (Admin)
exports.upsertZone = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const zoneData = req.body;

    const zone = await Zone.findOneAndUpdate(
      { zoneId },
      { ...zoneData, zoneId },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, zone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
