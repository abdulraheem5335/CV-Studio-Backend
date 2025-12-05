/**
 * Post Controller - MongoDB Version
 * Handles feed posts, reactions, and comments
 */

const { Post, User } = require('../models');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content, isAnonymous, displayName, zone, type, tags, media } = req.body;
    const user = await User.findById(req.user.id);

    const post = await Post.create({
      author: req.user.id,
      content,
      isAnonymous: isAnonymous !== false,
      displayName: displayName || user.nickname,
      location: zone ? { zone, name: zone } : undefined,
      type: type || 'general',
      tags,
      media
    });

    // Award XP for posting
    await user.addXP(10);

    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { zone, type, page = 1, limit = 20 } = req.query;
    
    const query = { isHidden: { $ne: true } };
    if (zone) query['location.zone'] = zone;
    if (type) query.type = type;

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('author', 'nickname avatar level')
      .lean();

    // Map posts with author info
    const postsWithAuthor = posts.map(post => ({
      ...post,
      id: post._id,
      author: post.isAnonymous ? null : post.author
    }));

    res.json({
      success: true,
      posts: postsWithAuthor,
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total, 
        pages: Math.ceil(total / parseInt(limit)) 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'nickname avatar level')
      .populate('comments.author', 'nickname avatar');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add reaction to post
// @route   POST /api/posts/:id/react
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    await post.addReaction(req.user.id, type);

    res.json({ success: true, reactions: post.reactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { content, isAnonymous } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const user = await User.findById(req.user.id);

    await post.addComment({
      author: req.user.id,
      content,
      isAnonymous: isAnonymous !== false,
      displayName: isAnonymous ? 'Anonymous' : user.nickname
    });

    // Award XP for commenting
    await user.addXP(5);

    res.json({ success: true, comments: post.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Report a post
// @route   POST /api/posts/:id/report
// @access  Private
exports.reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Add report
    post.reports = post.reports || [];
    post.reports.push({ user: req.user.id, reason, createdAt: new Date() });
    
    // Auto-hide if too many reports
    if (post.reports.length >= 5) {
      post.isHidden = true;
    }

    await post.save();

    res.json({ success: true, message: 'Report submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const user = await User.findById(req.user.id);

    // Check authorization
    if (post.author.toString() !== req.user.id && user.role === 'student') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
