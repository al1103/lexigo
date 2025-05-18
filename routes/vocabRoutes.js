const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabularyController');
const { authenticateToken } = require('../middleware/auth');

// Initialize tables - admin only
router.post('/init', authenticateToken, vocabularyController.initializeVocabularyTables);

// Vocabulary CRUD routes
router.post('/', authenticateToken, vocabularyController.addVocabulary);
router.get('/', authenticateToken, vocabularyController.getAllVocabularies);
router.get('/:id', authenticateToken, vocabularyController.getVocabularyById);
router.put('/:id', authenticateToken, vocabularyController.updateVocabulary);
router.delete('/:id', authenticateToken, vocabularyController.deleteVocabulary);

// Category routes
router.post('/categories', authenticateToken, vocabularyController.addCategory);
router.get('/categories', authenticateToken, vocabularyController.getAllCategories);

module.exports = router; 