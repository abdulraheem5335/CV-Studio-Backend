/**
 * Quest Model - MongoDB Schema
 * Handles quests, objectives, and progress tracking
 */

const mongoose = require('mongoose');

const objectiveSchema = new mongoose.Schema({
  objectiveId: { type: String, required: false },
  description: { type: String, required: true },
  type: {
    type: String,
    enum: ['visit_zone', 'post', 'react', 'comment', 'play_minigame', 'attend_event', 'join_club', 'collect_item', 'custom', 'create_post', 'visit_all_zones'],
    required: true,
  },
  target: {
    zone: String,
    minigameId: String,
    eventId: String,
    clubId: String,
    itemId: String,
    count: { type: Number, default: 1 },
  },
  isOptional: { type: Boolean, default: false },
});

const questSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quest title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Quest description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Quest classification
  type: {
    type: String,
    enum: ['story', 'daily', 'weekly', 'event', 'achievement', 'hidden', 'main'],
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['exploration', 'social', 'academic', 'sports', 'creative', 'special'],
    required: true,
  },
  
  // Objectives
  objectives: [objectiveSchema],
  
  // Requirements
  requirements: {
    minLevel: { type: Number, default: 1 },
    requiredQuests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quest' }],
    requiredBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    zones: [String], // Required zones to access
  },
  
  // Rewards
  rewards: {
    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  },
  
  // Time limits
  timeLimit: { type: Number, default: 0 }, // in seconds, 0 = no limit
  availableFrom: Date,
  availableUntil: Date,
  
  // Repeatability
  isRepeatable: { type: Boolean, default: false },
  cooldown: { type: Number, default: 0 }, // in seconds
  maxCompletions: { type: Number, default: 1 },
  
  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Order in quest chain
  chainOrder: { type: Number, default: 0 },
  nextQuest: { type: mongoose.Schema.Types.ObjectId, ref: 'Quest' },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
questSchema.index({ type: 1, isActive: 1 });
questSchema.index({ category: 1, isActive: 1 });
questSchema.index({ 'requirements.minLevel': 1 });

// Virtual for objective count
questSchema.virtual('objectiveCount').get(function() {
  return this.objectives.length;
});

// Static method to get available quests for user
questSchema.statics.getAvailableForUser = async function(userLevel, completedQuests = []) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    'requirements.minLevel': { $lte: userLevel },
    _id: { $nin: completedQuests },
    $or: [
      { availableFrom: { $exists: false } },
      { availableFrom: { $lte: now } },
    ],
    $or: [
      { availableUntil: { $exists: false } },
      { availableUntil: { $gte: now } },
    ],
  })
  .sort({ isFeatured: -1, type: 1, chainOrder: 1 })
  .lean();
};

// Static method to get daily/weekly quests
questSchema.statics.getRecurring = async function(type) {
  return this.find({
    type: type,
    isActive: true,
  })
  .sort({ createdAt: -1 })
  .lean();
};

module.exports = mongoose.model('Quest', questSchema);
