const express = require('express');
const router = express.Router();
const grammarController = require('../controllers/grammarController');
const { adminAuth } = require('../middleware/roleAuth');

// Public routes - Không cần authentication
router.get('/', grammarController.getAllArticles);
router.get('/categories', grammarController.getCategories);
router.get('/popular', grammarController.getPopularArticles);
router.get('/search', grammarController.searchArticles);
router.get('/category/:category', grammarController.getArticlesByCategory);
router.get('/difficulty/:difficulty', grammarController.getArticlesByDifficulty);
router.get('/:id', grammarController.getArticleById);



module.exports = router;
