/**
 * Event Controller - MongoDB Version
 * Handles campus events, registrations, and attendance
 */

const { Event, User, Club } = require('../models');

// @desc    Create a new event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create({
      ...req.body,
      organizer: req.user.id
    });

    res.status(201).json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all events
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
  try {
    const { zone, type, status = 'upcoming', page = 1, limit = 20 } = req.query;
    const now = new Date();
    
    const query = {};
    if (zone) query['location.zone'] = zone;
    if (type) query.type = type;
    
    // Handle status filtering based on dates
    if (status === 'upcoming') {
      query.startDate = { $gt: now };
    } else if (status === 'ongoing') {
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === 'past') {
      query.endDate = { $lt: now };
    } else if (status) {
      query.status = status;
    }

    const total = await Event.countDocuments(query);
    const events = await Event.find(query)
      .sort({ startDate: status === 'past' ? -1 : 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('organizer', 'nickname avatar')
      .populate('organizingClub', 'name logo')
      .lean();

    res.json({
      success: true,
      events,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'nickname avatar')
      .populate('organizingClub', 'name logo')
      .populate('participants.user', 'nickname avatar');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join an event
// @route   POST /api/events/:id/join
// @access  Private
exports.joinEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await event.registerParticipant(req.user.id);

    res.json({ success: true, message: 'Registered successfully' });
  } catch (error) {
    if (error.message === 'Already registered' || error.message === 'Event is full') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Leave an event
// @route   DELETE /api/events/:id/leave
// @access  Private
exports.leaveEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await event.unregisterParticipant(req.user.id);

    res.json({ success: true, message: 'Unregistered successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark attendance
// @route   POST /api/events/:id/attendance
// @access  Private (Organizer/Admin)
exports.markAttendance = async (req, res) => {
  try {
    const { userId } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const user = await User.findById(req.user.id);

    // Only organizer or admin can mark attendance
    if (event.organizer.toString() !== req.user.id && user.role === 'student') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const participant = event.participants.find(p => p.user.toString() === userId);
    if (!participant) {
      return res.status(404).json({ success: false, message: 'Participant not found' });
    }

    participant.status = 'attended';
    participant.attendedAt = new Date();
    await event.save();

    // Award XP to attendee
    const attendee = await User.findById(userId);
    if (attendee && event.rewards) {
      await attendee.addXP(event.rewards.xp || 50);
      attendee.points = (attendee.points || 0) + (event.rewards.points || 25);
      await attendee.save();
    }

    res.json({ success: true, message: 'Attendance marked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
