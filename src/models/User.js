/**
 * User Model - MongoDB Schema
 * Handles user authentication, profiles, gamification stats, and preferences
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't include password in queries by default
  },
  nickname: {
    type: String,
    required: [true, 'Nickname is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Nickname must be at least 3 characters'],
    maxlength: [20, 'Nickname cannot exceed 20 characters'],
    index: true,
  },
  userType: {
    type: String,
    enum: ['explorer', 'creator', 'socialite', 'achiever'],
    default: 'explorer',
  },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  nustId: {
    type: String,
    sparse: true,
    index: true,
  },
  
  // Avatar customization
  avatar: {
    base: { type: String, default: 'default' },
    accessories: [{ type: String }],
    outfit: { type: String, default: 'casual' },
    color: { type: String, default: '#3B82F6' },
  },
  
  // Gamification
  xp: { type: Number, default: 0, index: true },
  level: { type: Number, default: 1 },
  points: { type: Number, default: 100 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  inventory: [{
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number, default: 1 },
    acquiredAt: { type: Date, default: Date.now },
  }],
  
  // Location
  currentZone: { type: String, default: 'main-gate' },
  position: {
    x: { type: Number, default: 400 },
    y: { type: Number, default: 500 },
  },
  
  // Social
  clubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Club' }],
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Quest progress
  activeQuests: [{
    quest: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest' },
    progress: [{
      objectiveId: String,
      current: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
    }],
    startedAt: { type: Date, default: Date.now },
  }],
  completedQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
  
  // Activity tracking
  lastActive: { type: Date, default: Date.now },
  loginStreak: { type: Number, default: 1 },
  lastLoginDate: { type: Date },
  totalPlayTime: { type: Number, default: 0 }, // in minutes
  
  // Preferences
  preferences: {
    showOnMap: { type: Boolean, default: true },
    defaultMode: { type: String, enum: ['game', 'portal'], default: 'game' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    theme: { type: String, default: 'nust-classic' },
  },
  
  // Admin
  role: {
    type: String,
    enum: ['student', 'moderator', 'admin'],
    default: 'student',
  },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  banExpires: Date,
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
userSchema.index({ xp: -1, level: -1 }); // Leaderboard queries
userSchema.index({ currentZone: 1 }); // Zone-based queries
userSchema.index({ lastActive: -1 }); // Activity queries

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate level from XP
userSchema.methods.calculateLevel = function() {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(this.xp / 100)) + 1;
};

// Add XP and update level
userSchema.methods.addXP = async function(amount) {
  this.xp += amount;
  this.level = this.calculateLevel();
  await this.save();
  return { xp: this.xp, level: this.level };
};

// Virtual for public profile
userSchema.virtual('publicProfile').get(function() {
  return {
    id: this._id,
    nickname: this.nickname,
    userType: this.userType,
    avatar: this.avatar,
    level: this.level,
    xp: this.xp,
    badges: this.badges,
    isVerified: this.isVerified,
  };
});

module.exports = mongoose.model('User', userSchema);
