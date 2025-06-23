const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.get('/', levelController.getAllLevels);
router.get('/with-stats', levelController.getLevelsWithStats);
router.get('/code/:level_code', levelController.getLevelByCode);
router.get('/score/:score', levelController.getLevelByScore);
router.get('/next/:current_level', levelController.getNextLevel);

// Protected routes (Admin only - add admin middleware later)
router.post('/', authenticateToken, levelController.createLevel);

module.exports = router;
