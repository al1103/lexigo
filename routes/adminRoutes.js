const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminAuth, redirectIfLoggedIn } = require('../middleware/adminAuth');

// Public routes (no auth required)
router.get('/login', redirectIfLoggedIn, adminController.loginPage);
router.post('/login', redirectIfLoggedIn, adminController.login);

// Protected routes (auth required)
router.use(adminAuth); // Apply auth middleware to all routes below

// Dashboard
router.get('/', adminController.dashboard);
router.get('/dashboard', adminController.dashboard);

// Users Management
router.get('/users', adminController.usersIndex);
router.get('/users/:id', adminController.userShow);
router.post('/users/:id/delete', adminController.userDelete);

// Words Management
router.get('/words', adminController.wordsIndex);
router.get('/words/add', adminController.wordAddForm);
router.post('/words/add', adminController.wordAdd);
router.get('/words/:id/edit', adminController.wordEdit);
router.post('/words/:id/update', adminController.wordUpdate);
router.post('/words/:id/delete', adminController.wordDelete);

// Grammar Articles Management
router.get('/grammar', adminController.grammarIndex);
router.get('/grammar/add', adminController.grammarAddForm);
router.post('/grammar/add', adminController.grammarAdd);
router.get('/grammar/:id/edit', adminController.grammarEdit);
router.post('/grammar/:id/update', adminController.grammarUpdate);
router.post('/grammar/:id/delete', adminController.grammarDelete);

// Quiz Sessions Management
router.get('/quiz-sessions', adminController.quizSessionsIndex);

// Speaking Sessions Management
router.get('/speaking-sessions', adminController.speakingSessionsIndex);

// Export routes
router.get('/export/:table', adminController.exportData);

// Logout
router.post('/logout', adminController.logout);
router.get('/logout', adminController.logout);

module.exports = router;
