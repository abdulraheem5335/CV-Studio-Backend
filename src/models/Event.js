/**
 * Event Model - MongoDB Schema
 * Handles campus events, RSVPs, and rewards
 */

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  
  // Timing
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true,
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  
  // Location
  location: {
    zone: { type: String, required: true },
    zoneName: String,
    venue: String,
    coordinates: {
      x: Number,
      y: Number,
    },
  },
  
  // Categorization
  type: {
    type: String,
    enum: ['academic', 'social', 'sports', 'cultural', 'competition', 'workshop', 'seminar', 'other'],
    required: true,
  },
  tags: [{ type: String, lowercase: true }],
  
  // Organizer
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  organizingClub: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
  },
  
  // Participation
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['going', 'interested', 'attended'], default: 'going' },
    registeredAt: { type: Date, default: Date.now },
  }],
  maxParticipants: { type: Number, default: 0 }, // 0 = unlimited
  
  // Rewards
  rewards: {
    xp: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  },
  
  // Media
  coverImage: String,
  images: [{ type: String }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed', 'upcoming', 'ongoing'],
    default: 'draft',
    index: true,
  },
  isFeatured: { type: Boolean, default: false },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
eventSchema.index({ startDate: 1, status: 1 }); // Upcoming events
eventSchema.index({ type: 1, status: 1 }); // Type filtering
eventSchema.index({ 'location.zone': 1 }); // Zone events

// Virtual for participant count
eventSchema.virtual('participantCount').get(function() {
  return this.participants.filter(p => p.status === 'going').length;
});

// Virtual for spots left
eventSchema.virtual('spotsLeft').get(function() {
  if (this.maxParticipants === 0) return Infinity;
  return Math.max(0, this.maxParticipants - this.participantCount);
});

// Virtual for event status check
eventSchema.virtual('isUpcoming').get(function() {
  return this.startDate > new Date() && this.status === 'published';
});

eventSchema.virtual('isOngoing').get(function() {
  const now = new Date();
  return this.startDate <= now && this.endDate >= now && this.status === 'published';
});

// Static method to get upcoming events
eventSchema.statics.getUpcoming = async function(options = {}) {
  const { zone, type, limit = 10 } = options;
  
  const query = {
    status: 'published',
    startDate: { $gte: new Date() },
  };
  if (zone) query['location.zone'] = zone;
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ isFeatured: -1, startDate: 1 })
    .limit(limit)
    .populate('organizingClub', 'name')
    .lean();
};

// Instance method to register participant
eventSchema.methods.registerParticipant = async function(userId, status = 'going') {
  // Check if already registered
  const existing = this.participants.find(p => p.user.toString() === userId.toString());
  if (existing) {
    throw new Error('Already registered');
  }
  
  // Check capacity
  if (this.maxParticipants > 0 && this.participants.filter(p => p.status === 'going').length >= this.maxParticipants) {
    throw new Error('Event is full');
  }
  
  this.participants.push({ user: userId, status });
  return this.save();
};

// Instance method to unregister participant
eventSchema.methods.unregisterParticipant = async function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this.save();
};

// Instance method to update participant status
eventSchema.methods.updateParticipantStatus = async function(userId, status) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.status = status;
    return this.save();
  }
  throw new Error('Participant not found');
};

module.exports = mongoose.model('Event', eventSchema);
