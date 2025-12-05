/**
 * Club Model - MongoDB Schema
 * Handles student clubs, membership, and activities
 */

const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    unique: true,
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  description: {
    type: String,
    required: [true, 'Club description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
  },
  shortDescription: {
    type: String,
    maxlength: [150, 'Short description cannot exceed 150 characters'],
  },
  
  // Classification
  category: {
    type: String,
    enum: ['technical', 'cultural', 'sports', 'arts', 'academic', 'social', 'religious', 'other'],
    required: true,
    index: true,
  },
  tags: [{ type: String, lowercase: true }],
  
  // Visual
  logo: String,
  coverImage: String,
  color: { type: String, default: '#3B82F6' },
  
  // Leadership
  president: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vicePresident: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Members
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['member', 'moderator', 'admin', 'president'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  memberCount: { type: Number, default: 0 },
  
  // Membership settings
  membershipType: {
    type: String,
    enum: ['open', 'approval', 'invite'],
    default: 'open',
  },
  membershipRequirements: {
    minLevel: { type: Number, default: 1 },
    requiredBadges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  },
  pendingRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: String,
    requestedAt: { type: Date, default: Date.now },
  }],
  
  // Activity
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  
  // Gamification
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  
  // Contact
  email: String,
  socialLinks: {
    website: String,
    instagram: String,
    facebook: String,
    linkedin: String,
    discord: String,
  },
  
  // Location
  meetingZone: String,
  meetingSchedule: String,
  
  // Status
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
clubSchema.index({ category: 1, isActive: 1 });
clubSchema.index({ memberCount: -1 }); // Popular clubs
clubSchema.index({ name: 'text', description: 'text' }); // Text search

// Pre-save hook to update member count
clubSchema.pre('save', function(next) {
  this.memberCount = this.members.length;
  next();
});

// Method to add member
clubSchema.methods.addMember = async function(userId, role = 'member') {
  const exists = this.members.some(m => m.user.equals(userId));
  if (exists) throw new Error('User is already a member');
  
  this.members.push({ user: userId, role });
  this.memberCount = this.members.length;
  await this.save();
};

// Method to remove member
clubSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => !m.user.equals(userId));
  this.memberCount = this.members.length;
  await this.save();
};

// Static method to get clubs
clubSchema.statics.getAll = async function(options = {}) {
  const { category, limit = 20, skip = 0 } = options;
  
  const query = { isActive: true };
  if (category) query.category = category;
  
  return this.find(query)
    .sort({ isFeatured: -1, memberCount: -1 })
    .skip(skip)
    .limit(limit)
    .populate('president', 'nickname avatar')
    .lean();
};

module.exports = mongoose.model('Club', clubSchema);
