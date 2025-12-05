/**
 * User Controller - MongoDB Version
 * Handles user profile, position, and leaderboard
 */

const { User, Badge, Club } = require('../models');

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('badges', 'name description icon rarity')
      .populate('clubs', 'name logo category');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        nickname: user.nickname,
        userType: user.userType,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        points: user.points,
        badges: user.badges,
        clubs: user.clubs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { nickname, userType, preferences } = req.body;
    
    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (userType) updateData.userType = userType;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user avatar
// @route   PUT /api/users/avatar
// @access  Private
exports.updateAvatar = async (req, res) => {
  try {
    const { base, accessories, outfit, color } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: { base, accessories, outfit, color } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, avatar: user.avatar });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user position
// @route   PUT /api/users/position
// @access  Private
exports.updatePosition = async (req, res) => {
  try {
    const { x, y, zone } = req.body;
    
    const updateData = {
      position: { x, y },
      lastActive: new Date()
    };
    if (zone) updateData.currentZone = zone;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, position: user.position, zone: user.currentZone });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leaderboard
// @route   GET /api/users/leaderboard
// @access  Public
exports.getLeaderboard = async (req, res) => {
  try {
    const { type = 'xp', limit = 20 } = req.query;
    
    const sortField = type === 'points' ? 'points' : 'xp';
    const sortObj = {};
    sortObj[sortField] = -1;
    
    const users = await User.find({ isBanned: { $ne: true } })
      .select('nickname avatar level xp points')
      .sort(sortObj)
      .limit(parseInt(limit))
      .lean();

    const leaderboard = users.map((u, index) => ({
      rank: index + 1,
      id: u._id,
      nickname: u.nickname,
      avatar: u.avatar,
      level: u.level,
      xp: u.xp,
      points: u.points
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get active users
// @route   GET /api/users/active
// @access  Public
exports.getActiveUsers = async (req, res) => {
  try {
    const { zone } = req.query;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const query = {
      lastActive: { $gte: fiveMinutesAgo },
      'preferences.showOnMap': { $ne: false }
    };
    
    if (zone) query.currentZone = zone;
    
    const users = await User.find(query)
      .select('nickname avatar position currentZone level')
      .lean();

    const activeUsers = users.map(u => ({
      id: u._id,
      nickname: u.nickname,
      avatar: u.avatar,
      position: u.position,
      currentZone: u.currentZone,
      level: u.level
    }));

    res.json({ success: true, users: activeUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
