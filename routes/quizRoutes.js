const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateToken } = require('../middleware/auth');

// Quiz session routes
router.post('/start', authenticateToken, quizController.startQuizSession);
router.post('/submit-answer', authenticateToken, quizController.submitAnswer);
router.post('/complete', authenticateToken, quizController.completeQuiz);

// Bookmark routes
router.post('/bookmark', authenticateToken, quizController.bookmarkWord);
router.get('/bookmarks', authenticateToken, quizController.getBookmarks);

// History route
router.get('/history', authenticateToken, quizController.getQuizHistory);

module.exports = router;
