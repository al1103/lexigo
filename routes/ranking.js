const express = require('express');
const router = express.Router();
const rankingController = require('../controllers/rankingController');
const authMiddleware = require('../middleware/auth');
const ApiResponse = require('../utils/apiResponse');

// =========================
// AUTHENTICATED ROUTES (Requires login)
// =========================

router.get('/my-all-rankings', authMiddleware.authenticateToken, rankingController.getMyAllRankings);



// Lấy leaderboard tổng quát
router.get('/leaderboard', authMiddleware.optionalAuth, rankingController.getLeaderboard);



router.get('/leaderboard/:type',  (req, res) => {
  const { type } = req.params;

  if (type === 'weekly') {
    return rankingController.getWeeklyLeaderboard(req, res);
  } else if (type === 'monthly') {
    return rankingController.getMonthlyLeaderboard(req, res);
  } else if (type === 'global') {
    req.query.type = 'global';
    return rankingController.getTopUsers(req, res);
  } else {
    return ApiResponse.error(res, 400, 'Invalid leaderboard type. Must be global, weekly, or monthly');
  }
});



module.exports = router;
