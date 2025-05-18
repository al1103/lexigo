const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { authenticateToken } = require('../middleware/auth');

// Initialize tables - admin only
router.post('/init', authenticateToken, lessonController.initializeLessonTables);

// Lesson routes
router.post('/', authenticateToken, lessonController.createLesson);
router.get('/', authenticateToken, lessonController.getAllLessons);
router.get('/:id', authenticateToken, lessonController.getLessonById);
router.put('/:id', authenticateToken, lessonController.updateLesson);
router.delete('/:id', authenticateToken, lessonController.deleteLesson);

// Lesson section routes
router.post('/sections', authenticateToken, lessonController.addLessonSection);
router.put('/sections/:id', authenticateToken, lessonController.updateLessonSection);
router.delete('/sections/:id', authenticateToken, lessonController.deleteLessonSection);

// Quiz routes
router.post('/quizzes', authenticateToken, lessonController.createQuiz);
router.get('/quizzes/:id', authenticateToken, lessonController.getQuizById);

// User progress routes
router.put('/progress/:userId/:lessonId', authenticateToken, lessonController.updateUserProgress);
router.get('/progress/:userId', authenticateToken, lessonController.getUserProgress);
router.get('/progress/:userId/:lessonId', authenticateToken, lessonController.getUserProgress);

// Quiz attempt routes
router.post('/quiz-attempts/:userId/:quizId', authenticateToken, lessonController.startQuizAttempt);
router.post('/quiz-attempts/:attemptId/responses', authenticateToken, lessonController.submitQuizResponse);
router.put('/quiz-attempts/:attemptId/complete', authenticateToken, lessonController.completeQuizAttempt);
router.get('/quiz-attempts/:userId', authenticateToken, lessonController.getUserQuizResults);

module.exports = router; 