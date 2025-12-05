/**
 * Auth Controller - MongoDB Version
 * Handles user authentication (register, login, verify)
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'nust-campus-secret-key-2024', { 
    expiresIn: process.env.JWT_EXPIRE || '7d' 
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { email, password, nickname, userType } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user (password hashing handled by model pre-save hook)
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      nickname: nickname || `Student${Date.now().toString().slice(-4)}`,
      userType: userType || 'explorer'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        userType: user.userType,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Account is suspended' });
    }

    // Compare password using model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update login streak
    const now = new Date();
    const lastLogin = user.lastActive ? new Date(user.lastActive) : null;
    const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : 0;
    
    if (daysSinceLogin === 1) {
      user.loginStreak = (user.loginStreak || 0) + 1;
    } else if (daysSinceLogin > 1) {
      user.loginStreak = 1;
    }
    
    user.lastActive = now;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        userType: user.userType,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        points: user.points,
        currentZone: user.currentZone,
        position: user.position,
        loginStreak: user.loginStreak
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('badges', 'name description icon rarity')
      .populate('clubs', 'name description category color');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: {
        id: user._id,
        email: user.email,
        nickname: user.nickname,
        userType: user.userType,
        nustId: user.nustId,
        avatar: user.avatar,
        xp: user.xp,
        level: user.level,
        points: user.points,
        currentZone: user.currentZone,
        position: user.position,
        badges: user.badges,
        inventory: user.inventory,
        clubs: user.clubs,
        loginStreak: user.loginStreak,
        preferences: user.preferences,
        role: user.role,
        verification: user.verification,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify NUST ID
// @route   POST /api/auth/verify-nust-id
// @access  Private
exports.verifyNustId = async (req, res) => {
  try {
    const { nustId } = req.body;
    
    // Check if NUST ID already exists
    const existingUser = await User.findOne({ nustId });
    if (existingUser && existingUser._id.toString() !== req.user.id) {
      return res.status(400).json({ success: false, message: 'NUST ID already registered to another user' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        nustId,
        'verification.status': 'verified',
        'verification.isVerified': true,
        'verification.verifiedAt': new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'NUST ID verified successfully!',
      verificationStatus: 'verified'
    });
  } catch (error) {
    console.error('Verify NUST ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout (client-side, but can be used for cleanup)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Update last active
    await User.findByIdAndUpdate(req.user.id, { lastActive: new Date() });
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
