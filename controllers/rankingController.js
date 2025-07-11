const UserModel = require('../models/user_model');
const ApiResponse = require('../utils/apiResponse');

const rankingController = {
  // =========================
  // AUTHENTICATED ENDPOINTS
  // =========================

  // Lấy tất cả rankings của user
  getMyAllRankings: async (req, res) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return ApiResponse.error(res, 401, 'Authentication required');
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        return ApiResponse.error(res, 404, 'User not found');
      }

      const rankings = {};
      const types = ['global', 'weekly', 'monthly'];

      for (const type of types) {
        try {
          const rankInfo = await UserModel.getUserRank(userId, type);

          rankings[type] = {
            rank: rankInfo?.rank || null,
          };
        } catch (error) {
          console.warn(`Error getting ${type} ranking:`, error.message);
          rankings[type] = {
            rank: null,
            total_users: 0,
            percentile: 0
          };
        }
      }

      return ApiResponse.success(res, '200', 'All user rankings retrieved successfully', {

        contents: rankings
      });
    } catch (error) {
      console.error('Error getting all user rankings:', error);
      return ApiResponse.error(res, 500, 'Failed to get all user rankings: ' + error.message);
    }
  },



  // So sánh với user khác


  // Placeholder cho point history


  // Placeholder cho badges

  // =========================
  // EXISTING METHODS
  // =========================

  // Lấy user theo rank cụ thể

  // Lấy top users
  getTopUsers: async (req, res) => {
    try {
      const { limit = 10, type = 'global' } = req.query;
      const userId = req.user?.userId;

      if (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100) {
        return ApiResponse.error(res, 400, 'Limit must be between 1 and 100');
      }

      if (!['global', 'weekly', 'monthly'].includes(type)) {
        return ApiResponse.error(res, 400, 'Invalid ranking type. Must be global, weekly, or monthly');
      }

      const result = await UserModel.getTopUsersByRank(parseInt(limit), type, userId);

      const responseData = {
        contents: result.users.map(user => ({
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          level: user.level,
          total_points: user.total_points,
          period_points: user.period_points || user.total_points,
          streak_days: user.streak_days,
          rank: user.rank,
          is_current_user: user.is_current_user || false,
          weekly_quiz_completions: user.weekly_quiz_completions || 0,
          monthly_quiz_completions: user.monthly_quiz_completions || 0,
          weekly_lesson_completions: user.weekly_lesson_completions || 0,
          monthly_lesson_completions: user.monthly_lesson_completions || 0
        })),

      };

      // Add current user info if not in top list
      if (result.currentUserRank) {
        responseData.current_user_rank = {
          rank: result.currentUserRank.rank,
          points: result.currentUserRank.points,
          in_top_list: result.currentUserRank.in_top_list,
          user_info: {
            id: result.currentUserRank.id,
            username: result.currentUserRank.username,
            full_name: result.currentUserRank.full_name,
            level: result.currentUserRank.level
          }
        };
      }

      return ApiResponse.success(res, '200', 'Top users retrieved successfully', responseData);
    } catch (error) {
      console.error('Error getting top users:', error);
      return ApiResponse.error(res, 500, 'Failed to get top users: ' + error.message);
    }
  },

  // =========================
  // PLACEHOLDER METHODS (To be implemented)
  // =========================

  getLeaderboard: async (req, res) => {
    try {
      // Redirect to getTopUsers for now
      req.query.limit = req.query.limit || 20;
      return rankingController.getTopUsers(req, res);
    } catch (error) {
      return ApiResponse.error(res, 500, 'Failed to get leaderboard: ' + error.message);
    }
  },




  // Thêm method mới
  getWeeklyLeaderboard: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user?.userId; // Optional auth

      if (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100) {
        return ApiResponse.error(res, 400, 'Limit must be between 1 and 100');
      }

      const result = await UserModel.getTopUsersByRank(parseInt(limit), 'weekly', userId);

      // Lấy thông tin period hiện tại
      const currentWeek = await UserModel.getCurrentPeriod('weekly');

      const responseData = {

        constents: result.users.map(user => ({
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          level: user.level,
          weekly_points: user.period_points || 0,
          total_points: user.total_points,
          rank: user.rank,
          is_current_user: user.is_current_user || false,
          weekly_quiz_completions: user.weekly_quiz_completions || 0,
          weekly_lesson_completions: user.weekly_lesson_completions || 0
        })),
      };

      // Add current user info if not in top list
      if (result.currentUserRank) {
        responseData.current_user_rank = {
          rank: result.currentUserRank.rank,
          weekly_points: result.currentUserRank.points,
          in_top_list: false
        };
      }

      return ApiResponse.success(res, '200', 'Weekly leaderboard retrieved successfully', responseData);
    } catch (error) {
      console.error('Error getting weekly leaderboard:', error);
      return ApiResponse.error(res, 500, 'Failed to get weekly leaderboard: ' + error.message);
    }
  },

  getMonthlyLeaderboard: async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const userId = req.user?.userId; // Optional auth

      if (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100) {
        return ApiResponse.error(res, 400, 'Limit must be between 1 and 100');
      }

      const result = await UserModel.getTopUsersByRank(parseInt(limit), 'monthly', userId);

      // Lấy thông tin period hiện tại
      const currentMonth = await UserModel.getCurrentPeriod('monthly');

      const responseData = {

        constents: result.users.map(user => ({
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          level: user.level,
          monthly_points: user.period_points || 0,
          total_points: user.total_points,
          rank: user.rank,
          is_current_user: user.is_current_user || false,
          monthly_quiz_completions: user.monthly_quiz_completions || 0,
          monthly_lesson_completions: user.monthly_lesson_completions || 0
        })),
      };

      // Add current user info if not in top list
      if (result.currentUserRank) {
        responseData.current_user_rank = {
          rank: result.currentUserRank.rank,
          monthly_points: result.currentUserRank.points,
          in_top_list: false
        };
      }

      return ApiResponse.success(res, '200', 'Monthly leaderboard retrieved successfully', responseData);
    } catch (error) {
      console.error('Error getting monthly leaderboard:', error);
      return ApiResponse.error(res, 500, 'Failed to get monthly leaderboard: ' + error.message);
    }
  }
};

module.exports = rankingController;
