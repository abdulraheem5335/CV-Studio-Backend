/**
 * Quest Controller - MongoDB Version
 * Handles quests, objectives, and progress tracking
 */

const { Quest, User, Badge } = require('../models');
const mongoose = require('mongoose');

// User Quest Progress Schema (embedded in memory for now, could be separate collection)
// For production, create a UserQuest model
const userQuestProgress = new Map();

// @desc    Get available quests
// @route   GET /api/quests
// @access  Private
exports.getAvailableQuests = async (req, res) => {
  try {
    const { type, category } = req.query;
    const user = await User.findById(req.user.id).lean();
    
    const query = { isActive: true };
    if (type) query.type = type;
    if (category) query.category = category;
    
    const quests = await Quest.find(query).lean();

    // Filter by level requirement
    const availableQuests = quests.filter(q => 
      !q.prerequisites?.minLevel || q.prerequisites.minLevel <= user.level
    );

    // Get user's quest progress
    const userProgress = userQuestProgress.get(req.user.id) || {};
    
    const questsWithStatus = availableQuests.map(q => {
      const progress = userProgress[q._id.toString()];
      return {
        ...q,
        id: q._id,
        userStatus: progress?.status || 'available',
        progress: progress?.objectives || null
      };
    });

    res.json({ success: true, quests: questsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Start a quest
// @route   POST /api/quests/:id/start
// @access  Private
exports.startQuest = async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({ success: false, message: 'Quest not found' });
    }

    // Get or create user progress map
    let userProgress = userQuestProgress.get(req.user.id);
    if (!userProgress) {
      userProgress = {};
      userQuestProgress.set(req.user.id, userProgress);
    }

    // Check if already started
    if (userProgress[quest._id.toString()]) {
      return res.status(400).json({ success: false, message: 'Quest already started' });
    }

    const user = await User.findById(req.user.id);

    // Check requirements
    if (quest.prerequisites?.minLevel && quest.prerequisites.minLevel > user.level) {
      return res.status(403).json({ success: false, message: 'Level too low' });
    }

    // Initialize quest progress
    const questProgress = {
      questId: quest._id,
      status: 'active',
      objectives: quest.objectives.map(obj => ({
        description: obj.description,
        type: obj.type,
        current: 0,
        target: obj.target,
        completed: false
      })),
      startedAt: new Date(),
      expiresAt: quest.timeLimit ? new Date(Date.now() + quest.timeLimit) : null
    };

    userProgress[quest._id.toString()] = questProgress;

    res.json({ success: true, userQuest: { quest, ...questProgress } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update quest progress
// @route   PUT /api/quests/:id/progress
// @access  Private
exports.updateQuestProgress = async (req, res) => {
  try {
    const { objectiveIndex, progress } = req.body;
    
    const userProgress = userQuestProgress.get(req.user.id);
    if (!userProgress) {
      return res.status(404).json({ success: false, message: 'No active quests' });
    }

    const questProgress = userProgress[req.params.id];
    if (!questProgress || questProgress.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Active quest not found' });
    }

    const quest = await Quest.findById(req.params.id);
    if (!quest) {
      return res.status(404).json({ success: false, message: 'Quest not found' });
    }

    // Update progress
    if (objectiveIndex < 0 || objectiveIndex >= questProgress.objectives.length) {
      return res.status(400).json({ success: false, message: 'Invalid objective index' });
    }

    const objective = questProgress.objectives[objectiveIndex];
    objective.current = progress;
    
    // Check if objective completed
    const questObj = quest.objectives[objectiveIndex];
    if (questObj && progress >= (questObj.target?.count || 1)) {
      objective.completed = true;
    }

    // Check if all objectives completed
    const allCompleted = questProgress.objectives.every(o => o.completed);
    if (allCompleted) {
      questProgress.status = 'completed';
      questProgress.completedAt = new Date();
      
      // Award rewards
      const user = await User.findById(req.user.id);
      const rewards = quest.rewards || {};
      
      if (rewards.xp) await user.addXP(rewards.xp);
      if (rewards.points) {
        user.points = (user.points || 0) + rewards.points;
        await user.save();
      }
      if (rewards.badgeId) {
        const badge = await Badge.findOne({ badgeId: rewards.badgeId });
        if (badge && !user.badges.includes(badge._id)) {
          user.badges.push(badge._id);
          await user.save();
        }
      }
    }

    res.json({ 
      success: true, 
      progress: questProgress,
      completed: allCompleted,
      rewards: allCompleted ? quest.rewards : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's quests
// @route   GET /api/quests/my
// @access  Private
exports.getMyQuests = async (req, res) => {
  try {
    const { status } = req.query;
    
    const userProgress = userQuestProgress.get(req.user.id) || {};
    let myQuests = Object.entries(userProgress).map(([questId, progress]) => ({
      questId,
      ...progress
    }));

    if (status) {
      myQuests = myQuests.filter(q => q.status === status);
    }

    // Populate quest details
    const questIds = myQuests.map(q => q.questId);
    const quests = await Quest.find({ _id: { $in: questIds } }).lean();
    
    const questsMap = quests.reduce((acc, q) => {
      acc[q._id.toString()] = q;
      return acc;
    }, {});

    const questsWithDetails = myQuests.map(q => ({
      ...q,
      quest: questsMap[q.questId]
    }));

    res.json({ success: true, quests: questsWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
