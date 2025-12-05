/**
 * Club Controller - MongoDB Version
 * Handles student clubs, membership, and activities
 */

const { Club, User } = require('../models');

// @desc    Get all clubs
// @route   GET /api/clubs
// @access  Public
exports.getClubs = async (req, res) => {
  try {
    const { category } = req.query;
    
    const query = { isActive: { $ne: false } };
    if (category) query.category = category;
    
    const clubs = await Club.find(query)
      .populate('president', 'nickname avatar')
      .select('-members -pendingRequests')
      .sort({ isFeatured: -1, memberCount: -1 })
      .lean();

    res.json({ success: true, clubs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single club
// @route   GET /api/clubs/:id
// @access  Public
exports.getClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('president', 'nickname avatar')
      .populate('admins', 'nickname avatar')
      .populate('members.user', 'nickname avatar level');

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    res.json({ success: true, club });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join a club
// @route   POST /api/clubs/:id/join
// @access  Private
exports.joinClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Check if already a member
    const isMember = club.members.some(m => m.user.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({ success: false, message: 'Already a member' });
    }

    const user = await User.findById(req.user.id);

    // Check membership requirements
    if (club.membershipRequirements?.minLevel > user.level) {
      return res.status(403).json({ 
        success: false, 
        message: `Requires level ${club.membershipRequirements.minLevel}` 
      });
    }

    if (club.membershipType === 'open') {
      await club.addMember(user._id, 'member');
      
      // Add club to user
      if (!user.clubs.includes(club._id)) {
        user.clubs.push(club._id);
        await user.save();
      }

      res.json({ success: true, message: 'Joined club successfully' });
    } else if (club.membershipType === 'approval') {
      // Add to pending requests
      club.pendingRequests = club.pendingRequests || [];
      club.pendingRequests.push({ user: user._id, message: req.body.message });
      await club.save();
      
      res.json({ success: true, message: 'Join request submitted' });
    } else {
      res.status(400).json({ success: false, message: 'Club is invite-only' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Leave a club
// @route   DELETE /api/clubs/:id/leave
// @access  Private
exports.leaveClub = async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ success: false, message: 'Club not found' });
    }

    // Can't leave if president
    if (club.president?.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'President cannot leave. Transfer ownership first.' });
    }

    await club.removeMember(req.user.id);

    // Remove club from user
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { clubs: club._id }
    });

    res.json({ success: true, message: 'Left club successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new club
// @route   POST /api/clubs
// @access  Private
exports.createClub = async (req, res) => {
  try {
    const club = await Club.create({
      ...req.body,
      president: req.user.id,
      admins: [req.user.id],
      members: [{ user: req.user.id, role: 'president' }]
    });

    // Add club to user
    await User.findByIdAndUpdate(req.user.id, {
      $push: { clubs: club._id }
    });

    res.status(201).json({ success: true, club });
  } catch (error) {
    // Handle duplicate name
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Club name already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};
