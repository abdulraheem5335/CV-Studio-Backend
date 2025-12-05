/**
 * Gamification Controller - MongoDB Version
 * Handles XP, badges, shop items, and rewards
 */

const { User, Badge, Item } = require('../models');

// @desc    Get user stats
// @route   GET /api/gamification/stats
// @access  Private
exports.getMyStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('badges', 'name description icon rarity category')
      .lean();

    // Map inventory with item details
    const itemIds = (user.inventory || []).map(i => i.item);
    const items = await Item.find({ _id: { $in: itemIds } }).lean();
    const inventory = (user.inventory || []).map(inv => ({
      ...inv,
      item: items.find(i => i._id.toString() === inv.item.toString())
    }));

    res.json({
      success: true,
      stats: {
        xp: user.xp,
        level: user.level,
        points: user.points,
        badges: user.badges,
        inventory,
        loginStreak: user.loginStreak,
        xpToNextLevel: (user.level * 100) - (user.xp % 100)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all badges
// @route   GET /api/gamification/badges
// @access  Private
exports.getBadges = async (req, res) => {
  try {
    const { category, rarity } = req.query;
    
    const query = { isActive: { $ne: false } };
    if (category) query.category = category;
    if (rarity) query.rarity = rarity;
    
    const badges = await Badge.find(query).lean();

    const user = await User.findById(req.user.id).select('badges').lean();
    const userBadgeIds = (user.badges || []).map(b => b.toString());
    
    const badgesWithStatus = badges.map(b => ({
      ...b,
      id: b._id,
      earned: userBadgeIds.includes(b._id.toString())
    }));

    res.json({ success: true, badges: badgesWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get shop items
// @route   GET /api/gamification/shop
// @access  Private
exports.getShopItems = async (req, res) => {
  try {
    const { type, rarity } = req.query;
    
    const query = { isActive: true };
    if (type) query.type = type;
    if (rarity) query.rarity = rarity;
    
    const items = await Item.find(query).lean();
    const user = await User.findById(req.user.id).select('points').lean();

    res.json({ success: true, items, userPoints: user.points });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Purchase an item
// @route   POST /api/gamification/shop/:itemId/purchase
// @access  Private
exports.purchaseItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const user = await User.findById(req.user.id);

    // Check if enough points
    if (item.cost.points > user.points) {
      return res.status(400).json({ success: false, message: 'Not enough points' });
    }

    // Check level requirement
    if (item.requirements?.minLevel && item.requirements.minLevel > user.level) {
      return res.status(403).json({ success: false, message: 'Level too low' });
    }

    // Check stock for limited items
    if (item.isLimited && item.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Item out of stock' });
    }

    // Deduct points
    user.points -= item.cost.points;
    
    // Add item to inventory
    const existingItem = user.inventory.find(i => i.item.toString() === item._id.toString());
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.inventory.push({ item: item._id, quantity: 1 });
    }
    await user.save();

    // Decrease stock for limited items
    if (item.isLimited) {
      item.stock -= 1;
      await item.save();
    }

    res.json({ 
      success: true, 
      message: 'Item purchased!',
      remainingPoints: user.points 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Award badge to user (Admin)
// @route   POST /api/gamification/badges/award
// @access  Private (Admin)
exports.awardBadge = async (req, res) => {
  try {
    const { badgeId, userId } = req.body;
    
    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({ success: false, message: 'Badge not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already has badge
    if (!user.badges.some(b => b.toString() === badgeId)) {
      user.badges.push(badge._id);
      
      // Award rewards
      if (badge.rewards?.xp) await user.addXP(badge.rewards.xp);
      if (badge.rewards?.points) user.points = (user.points || 0) + badge.rewards.points;
      
      await user.save();
    }

    res.json({ success: true, message: 'Badge awarded' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
