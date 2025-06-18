const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');
const { authenticateToken } = require('../middleware/auth');

// ===============================
// LESSON CRUD ROUTES
// ===============================

// Initialize lesson tables (Admin only)
router.post('/init', authenticateToken, lessonController.initializeLessonTables);

// Create new lesson
router.post('/', authenticateToken, lessonController.createLesson);

// Get all lessons with filters
router.get('/', lessonController.getAllLessons);

// Get lesson by ID
router.get('/:id', lessonController.getLessonById);

// Update lesson
router.put('/:id', authenticateToken, lessonController.updateLesson);

// Delete lesson
router.delete('/:id', authenticateToken, lessonController.deleteLesson);

// ===============================
// QUIZ SUBMISSION (Simple approach)
// ===============================

// Submit quiz answers
router.post('/submit', authenticateToken, lessonController.submitQuiz);

// ===============================
// LESSON SECTION ROUTES (Placeholders)
// ===============================

// Add lesson section
router.post('/sections', authenticateToken, lessonController.addLessonSection);

// Update lesson section
router.put('/sections/:id', authenticateToken, lessonController.updateLessonSection);

// Delete lesson section
router.delete('/sections/:id', authenticateToken, lessonController.deleteLessonSection);

// ===============================
// QUIZ ROUTES
// ===============================

// Create quiz for lesson
router.post('/quiz', authenticateToken, lessonController.createQuiz);

// Get quiz by ID (with optional answers)
router.get('/quiz/:id', lessonController.getQuizById);

// ===============================
// USER PROGRESS ROUTES
// ===============================

// Update user progress for a lesson
router.put('/progress/:userId/:lessonId', authenticateToken, lessonController.updateUserProgress);

// Get user progress (specific lesson or all lessons)
router.get('/progress/:userId/:lessonId?', authenticateToken, lessonController.getUserProgress);

// ===============================
// QUIZ ATTEMPT ROUTES
// ===============================

// Start quiz attempt
router.post('/quiz/:quizId/attempts/:userId/start', authenticateToken, lessonController.startQuizAttempt);

// Submit quiz response
router.post('/quiz/attempts/:attemptId/response', authenticateToken, lessonController.submitQuizResponse);

// Complete quiz attempt
router.put('/quiz/attempts/:attemptId/complete', authenticateToken, lessonController.completeQuizAttempt);

// Get user quiz results
router.get('/quiz/results/:userId', authenticateToken, lessonController.getUserQuizResults);

module.exports = router;
