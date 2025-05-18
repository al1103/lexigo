const express = require('express');
const router = express.Router();
const userStatsController = require('../controllers/userStatsController');
const { authenticateToken } = require('../middleware/auth');

// Initialize tables - admin only
router.post('/init', authenticateToken, userStatsController.initializeUserStatsTables);

// User stats routes
router.post('/users/:userId', authenticateToken, userStatsController.initializeUserStats);
router.get('/users/:userId', authenticateToken, userStatsController.getUserStats);
router.put('/users/:userId/activity', authenticateToken, userStatsController.updateUserActivity);
router.post('/users/:userId/xp', authenticateToken, userStatsController.awardXP);

// User vocabulary routes
router.put('/users/:userId/vocab/:vocabularyId', authenticateToken, userStatsController.trackVocabularyLearning);
router.get('/users/:userId/vocab', authenticateToken, userStatsController.getUserVocabulary);
router.get('/users/:userId/vocab/review', authenticateToken, userStatsController.getVocabularyToReview);

// Achievements routes
router.get('/users/:userId/achievements', authenticateToken, userStatsController.getUserAchievements);
router.post('/achievements', authenticateToken, userStatsController.createAchievement);

// Leaderboard route
router.get('/leaderboard', authenticateToken, userStatsController.getLeaderboard);

module.exports = router;