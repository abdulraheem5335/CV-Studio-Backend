/**
 * Item Model - MongoDB Schema
 * Handles shop items, consumables, and avatar customization
 */

const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Classification
  type: {
    type: String,
    enum: ['avatar_accessory', 'avatar_outfit', 'avatar_background', 'accessory', 'outfit', 'background', 'consumable', 'collectible', 'special'],
    required: true,
  },
  
  // For avatar items
  avatarSlot: {
    type: String,
    enum: ['head', 'face', 'body', 'background', 'effect'],
  },
  avatarAsset: String, // URL or asset ID
  
  // Rarity
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  
  // Cost
  cost: {
    points: { type: Number, default: 0 },
    coins: { type: Number, default: 0 }, // Premium currency
  },
  
  // For consumables
  effects: [{
    type: { type: String, enum: ['xp_boost', 'xp_multiplier', 'points_boost', 'points_multiplier', 'reveal_secret', 'teleport', 'custom'] },
    value: Number,
    duration: Number, // in seconds
  }],
  
  // Availability
  isLimited: { type: Boolean, default: false },
  stock: { type: Number, default: -1 }, // -1 = unlimited
  availableFrom: Date,
  availableUntil: Date,
  
  // Requirements
  requirements: {
    minLevel: { type: Number, default: 1 },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  },
  
  // Stats
  purchaseCount: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  
}, {
  timestamps: true,
});

// Indexes
itemSchema.index({ type: 1, isActive: 1 });
itemSchema.index({ 'cost.points': 1 });
itemSchema.index({ rarity: 1 });

// Virtual for availability
itemSchema.virtual('isAvailable').get(function() {
  if (!this.isActive) return false;
  if (this.stock === 0) return false;
  
  const now = new Date();
  if (this.availableFrom && this.availableFrom > now) return false;
  if (this.availableUntil && this.availableUntil < now) return false;
  
  return true;
});

// Method to purchase
itemSchema.methods.purchase = async function() {
  if (this.stock > 0) {
    this.stock -= 1;
  }
  this.purchaseCount += 1;
  await this.save();
};

// Static method to get shop items
itemSchema.statics.getShopItems = async function(userLevel = 1) {
  const now = new Date();
  
  return this.find({
    isActive: true,
    'requirements.minLevel': { $lte: userLevel },
    $or: [
      { stock: { $ne: 0 } },
      { isLimited: false },
    ],
    $or: [
      { availableFrom: { $exists: false } },
      { availableFrom: { $lte: now } },
    ],
    $or: [
      { availableUntil: { $exists: false } },
      { availableUntil: { $gte: now } },
    ],
  })
  .sort({ type: 1, rarity: 1, 'cost.points': 1 })
  .lean();
};

module.exports = mongoose.model('Item', itemSchema);
