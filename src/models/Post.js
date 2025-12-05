/**
 * Post Model - MongoDB Schema
 * Handles feed posts, reactions, comments, and anonymous posting
 */

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: {
    type: String,
    required: true,
    maxlength: [500, 'Comment cannot exceed 500 characters'],
  },
  isAnonymous: { type: Boolean, default: false },
  displayName: String,
  reactions: [{
    type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  isHidden: { type: Boolean, default: false },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [1000, 'Post cannot exceed 1000 characters'],
  },
  
  // Anonymous posting
  isAnonymous: { type: Boolean, default: false },
  displayName: String, // For anonymous posts
  
  // Media
  images: [{ type: String }], // URLs
  
  // Location context
  location: {
    zone: String,
    zoneName: String,
    coordinates: {
      x: Number,
      y: Number,
    },
  },
  
  // Engagement
  reactions: [{
    type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'] },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  comments: [commentSchema],
  
  // Categorization
  type: {
    type: String,
    enum: ['general', 'question', 'event', 'meme', 'confession', 'announcement'],
    default: 'general',
  },
  tags: [{ type: String, lowercase: true }],
  
  // Moderation
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now },
  }],
  isHidden: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
postSchema.index({ createdAt: -1 }); // Feed sorting
postSchema.index({ 'location.zone': 1, createdAt: -1 }); // Zone-specific feeds
postSchema.index({ type: 1, createdAt: -1 }); // Type-based filtering
postSchema.index({ tags: 1 }); // Tag search

// Virtual for reaction counts
postSchema.virtual('reactionCounts').get(function() {
  const counts = {};
  this.reactions.forEach(r => {
    counts[r.type] = (counts[r.type] || 0) + 1;
  });
  return counts;
});

// Virtual for total reactions
postSchema.virtual('totalReactions').get(function() {
  return this.reactions.length;
});

// Virtual for comment count
postSchema.virtual('commentCount').get(function() {
  return this.comments.filter(c => !c.isHidden).length;
});

// Static method to get feed
postSchema.statics.getFeed = async function(options = {}) {
  const {
    zone,
    type,
    limit = 20,
    skip = 0,
    userId,
  } = options;
  
  const query = { isHidden: false };
  if (zone) query['location.zone'] = zone;
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('author', 'nickname avatar level')
    .lean();
};

// Instance method to add reaction
postSchema.methods.addReaction = async function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({ type: reactionType, user: userId });
  return this.save();
};

// Instance method to remove reaction
postSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

// Instance method to add comment
postSchema.methods.addComment = async function(commentData) {
  this.comments.push(commentData);
  return this.save();
};

module.exports = mongoose.model('Post', postSchema);
