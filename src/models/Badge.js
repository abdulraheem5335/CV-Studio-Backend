/**
 * Badge Model - MongoDB Schema
 * Handles achievement badges and their criteria
 */

const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  badgeId: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: [true, 'Badge name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Badge description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  
  // Visual
  icon: { type: String, required: true },
  color: { type: String, default: '#FFD700' },
  
  // Classification
  category: {
    type: String,
    enum: ['achievement', 'exploration', 'social', 'academic', 'sports', 'special', 'event', 'seasonal'],
    required: true,
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common',
  },
  
  // Requirements (auto-award criteria)
  criteria: {
    type: { 
      type: String, 
      enum: [
        'quest_complete', 'quest_category', 'zone_visits', 'zones_visited',
        'post_count', 'posts_count', 'xp_reached', 'level_reached', 
        'login_streak', 'event_attend', 'minigame_wins', 'late_night_activity',
        'manual'
      ],
    },
    value: Number,
    targetZone: String,
    minigameId: String,
    category: String,
  },
  
  // Stats
  earnedCount: { type: Number, default: 0 },
  
  // Status
  isActive: { type: Boolean, default: true },
  isSecret: { type: Boolean, default: false }, // Hidden until earned
  
}, {
  timestamps: true,
});

// Indexes
badgeSchema.index({ rarity: 1, category: 1 });
badgeSchema.index({ earnedCount: -1 }); // Popular badges

// Method to increment earned count
badgeSchema.methods.recordEarned = async function() {
  this.earnedCount += 1;
  await this.save();
};

// Static method to get visible badges
badgeSchema.statics.getVisible = async function() {
  return this.find({ isActive: true, isSecret: false })
    .sort({ rarity: 1, name: 1 })
    .lean();
};

// Static method to check criteria and award badge
badgeSchema.statics.checkAndAward = async function(user, criteriaType, value) {
  const badges = await this.find({
    isActive: true,
    'criteria.type': criteriaType,
  });
  
  const earnedBadges = [];
  
  for (const badge of badges) {
    // Check if user already has badge
    if (user.badges.includes(badge._id)) continue;
    
    // Check criteria
    let earned = false;
    const target = badge.criteria.target;
    
    switch (criteriaType) {
      case 'xp_reached':
        earned = user.xp >= target;
        break;
      case 'level_reached':
        earned = user.level >= target;
        break;
      case 'login_streak':
        earned = user.loginStreak >= target;
        break;
      case 'posts_count':
        earned = value >= target;
        break;
      case 'zone_visits':
        earned = value >= target.count;
        break;
      default:
        break;
    }
    
    if (earned) {
      user.badges.push(badge._id);
      badge.earnedCount += 1;
      await badge.save();
      earnedBadges.push(badge);
    }
  }
  
  if (earnedBadges.length > 0) {
    await user.save();
  }
  
  return earnedBadges;
};

module.exports = mongoose.model('Badge', badgeSchema);
