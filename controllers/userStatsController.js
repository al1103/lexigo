const userStatsModel = require('../models/user_stats_model');

// Initialize database tables
const initializeUserStatsTables = async (req, res) => {
  try {
    await userStatsModel.createTables();
    res.status('200').json({ success: true, message: 'User stats tables created successfully' });
  } catch (error) {
    console.error('Error initializing user stats tables:', error);
    res.status(500).json({ success: false, message: 'Error initializing user stats database' });
  }
};

// Initialize user stats for a new user
const initializeUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    await userStatsModel.initializeUserStats(parseInt(userId));

    res.status('200').json({
      success: true,
      message: 'User stats initialized successfully'
    });
  } catch (error) {
    console.error('Error initializing user stats:', error);
    res.status(500).json({ success: false, message: 'Error initializing user stats' });
  }
};

// Get user stats
const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await userStatsModel.getUserStats(parseInt(userId));

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'User stats not found'
      });
    }

    res.status('200').json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching user stats' });
  }
};

// Update user activity and streak
const updateUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    await userStatsModel.updateUserActivity(parseInt(userId));

    // Get updated stats to return
    const stats = await userStatsModel.getUserStats(parseInt(userId));

    res.status('200').json({
      success: true,
      message: 'User activity updated successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
    res.status(500).json({ success: false, message: 'Error updating user activity' });
  }
};

// Award XP to user
const awardXP = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid XP amount is required'
      });
    }

    await userStatsModel.awardXP(parseInt(userId), parseInt(amount), reason);

    // Get updated stats to return
    const stats = await userStatsModel.getUserStats(parseInt(userId));

    res.status('200').json({
      success: true,
      message: 'XP awarded successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error awarding XP:', error);
    res.status(500).json({ success: false, message: 'Error awarding XP' });
  }
};

// Track vocabulary learning
const trackVocabularyLearning = async (req, res) => {
  try {
    const { userId, vocabularyId } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'learning', 'mastered'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (new, learning, or mastered)'
      });
    }

    await userStatsModel.trackVocabularyLearning(
      parseInt(userId),
      parseInt(vocabularyId),
      status
    );

    res.status('200').json({
      success: true,
      message: 'Vocabulary learning tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking vocabulary learning:', error);
    res.status(500).json({ success: false, message: 'Error tracking vocabulary learning' });
  }
};

// Get vocabulary to review
const getVocabularyToReview = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit } = req.query;

    const vocabulary = await userStatsModel.getVocabularyToReview(
      parseInt(userId),
      limit ? parseInt(limit) : 20
    );

    res.status('200').json({
      success: true,
      count: vocabulary.length,
      data: vocabulary
    });
  } catch (error) {
    console.error('Error fetching vocabulary to review:', error);
    res.status(500).json({ success: false, message: 'Error fetching vocabulary to review' });
  }
};

// Get user vocabulary
const getUserVocabulary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, familiarity_level, category_id, sort_by, limit, offset } = req.query;

    const filters = {
      status,
      familiarity_level: familiarity_level ? parseInt(familiarity_level) : null,
      category_id: category_id ? parseInt(category_id) : null,
      sort_by,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0
    };

    const vocabulary = await userStatsModel.getUserVocabulary(parseInt(userId), filters);

    res.status('200').json({
      success: true,
      count: vocabulary.length,
      data: vocabulary
    });
  } catch (error) {
    console.error('Error fetching user vocabulary:', error);
    res.status(500).json({ success: false, message: 'Error fetching user vocabulary' });
  }
};

// Get user achievements
const getUserAchievements = async (req, res) => {
  try {
    const { userId } = req.params;

    const achievements = await userStatsModel.getUserAchievements(parseInt(userId));

    res.status('200').json({
      success: true,
      count: achievements.length,
      data: achievements
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ success: false, message: 'Error fetching user achievements' });
  }
};

// Create a new achievement
const createAchievement = async (req, res) => {
  try {
    const achievementData = req.body;

    // Basic validation
    if (!achievementData.name || !achievementData.requirement_type || !achievementData.requirement_value) {
      return res.status(400).json({
        success: false,
        message: 'Name, requirement type, and requirement value are required'
      });
    }

    const result = await userStatsModel.createAchievement(achievementData);

    res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ success: false, message: 'Error creating achievement' });
  }
};

// Get leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const { limit } = req.query;

    const leaderboard = await userStatsModel.getLeaderboard(limit ? parseInt(limit) : 10);

    res.status('200').json({
      success: true,
      count: leaderboard.length,
      data: leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Error fetching leaderboard' });
  }
};

module.exports = {
  initializeUserStatsTables,
  initializeUserStats,
  getUserStats,
  updateUserActivity,
  awardXP,
  trackVocabularyLearning,
  getVocabularyToReview,
  getUserVocabulary,
  getUserAchievements,
  createAchievement,
  getLeaderboard
};
