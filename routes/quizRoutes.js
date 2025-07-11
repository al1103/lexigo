const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const { authenticateToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/roleAuth');

// Quiz session routes
router.post('/start', authenticateToken, quizController.startQuizSession);
router.post('/submit-answer', authenticateToken, quizController.submitAnswer);
router.post('/complete', authenticateToken, quizController.completeQuiz);

// Bookmark routes
router.post('/bookmark', authenticateToken, quizController.bookmarkWord);
router.delete('/bookmark', authenticateToken, quizController.deleteBookmark); // Thêm route xóa bookmark
router.get('/bookmarks', authenticateToken, quizController.getBookmarks);

// History route
router.get('/history', authenticateToken, quizController.getQuizHistory);

// ADMIN: Lấy tất cả quiz sessions
router.get('/admin/sessions', adminAuth, quizController.getAllQuizSessions);
// ADMIN: Xóa quiz session
router.delete('/admin/session/:id', adminAuth, quizController.deleteQuizSession);
// ADMIN: Thêm câu hỏi mới
router.post('/admin/question', adminAuth, quizController.createQuestion);
// ADMIN: Sửa câu hỏi
router.put('/admin/question/:id', adminAuth, quizController.updateQuestion);
// ADMIN: Xóa câu hỏi
router.delete('/admin/question/:id', adminAuth, quizController.deleteQuestion);

module.exports = router;
