/**
 * Auth Middleware - MongoDB Version
 * Handles JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

// @desc    Protect routes - require authentication
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nust-campus-secret-key-2024');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: 'Account banned' });
    }

    req.user = { id: user._id.toString(), ...user.toObject() };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

// @desc    Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized for this action' });
    }
    next();
  };
};

// @desc    Optional authentication (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nust-campus-secret-key-2024');
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isBanned) {
        req.user = { id: user._id.toString(), ...user.toObject() };
      }
    }
    
    next();
  } catch (error) {
    // Token invalid but continue anyway
    next();
  }
};
