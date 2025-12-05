/**
 * Zone Model - MongoDB Schema
 * Handles map zones, interactions, and visit tracking
 */

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  zoneId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Visual
  type: {
    type: String,
    enum: ['academic', 'library', 'cafeteria', 'hostel', 'sports', 'admin', 'gate', 'recreation', 'other', 'entrance', 'social', 'residential', 'administrative'],
    required: true,
  },
  icon: { type: String, default: '📍' },
  color: { type: String, default: '#3B82F6' },
  
  // Position
  bounds: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  center: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  
  // Connections to other zones
  connections: [{
    zoneId: String,
    pathPoints: [{
      x: Number,
      y: Number,
    }],
  }],
  
  // Interactive elements
  interactions: [{
    type: { type: String, enum: ['quest', 'post', 'event', 'minigame', 'npc', 'secret'] },
    name: String,
    isActive: { type: Boolean, default: true },
  }],
  
  // Minigames available
  minigames: [{
    gameId: String,
    name: String,
    rewards: {
      xp: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  }],
  
  // Secrets/Easter eggs
  secrets: [{
    secretId: String,
    description: String,
    reward: {
      xp: { type: Number, default: 0 },
      points: { type: Number, default: 0 },
      badge: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge' },
    },
    discoveredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  }],
  
  // Analytics
  visitCount: { type: Number, default: 0 },
  activeUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Status
  isActive: { type: Boolean, default: true },
  maintenanceMode: { type: Boolean, default: false },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
zoneSchema.index({ type: 1, isActive: 1 });
zoneSchema.index({ visitCount: -1 }); // Popular zones

// Method to increment visit count
zoneSchema.methods.recordVisit = async function(userId) {
  this.visitCount += 1;
  if (userId && !this.activeUsers.includes(userId)) {
    this.activeUsers.push(userId);
  }
  await this.save();
};

// Method to remove active user
zoneSchema.methods.removeActiveUser = async function(userId) {
  this.activeUsers = this.activeUsers.filter(id => !id.equals(userId));
  await this.save();
};

// Static method to get all zones for map
zoneSchema.statics.getMapData = async function() {
  return this.find({ isActive: true })
    .select('-secrets.discoveredBy -__v')
    .lean();
};

module.exports = mongoose.model('Zone', zoneSchema);
