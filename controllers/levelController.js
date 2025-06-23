const LevelModel = require('../models/level_model');
const ApiResponse = require('../utils/apiResponse');

const levelController = {
  // Lấy tất cả levels
  getAllLevels: async (req, res) => {
    try {
      const levels = await LevelModel.getAllLevels();

      return ApiResponse.success(res, '200', 'Levels retrieved successfully',
        levels,
      );

    } catch (error) {
      console.error('Error getting all levels:', error);
      return ApiResponse.error(res, 500, 'Failed to get levels');
    }
  },

  // Lấy levels với statistics
  getLevelsWithStats: async (req, res) => {
    try {
      const levels = await LevelModel.getLevelsWithStats();

      return ApiResponse.success(res, '200', 'Levels with stats retrieved successfully', {
        contents: levels,
        total_count: levels.length
      });
    } catch (error) {
      console.error('Error getting levels with stats:', error);
      return ApiResponse.error(res, 500, 'Failed to get levels with stats');
    }
  },

  // Lấy level theo code
  getLevelByCode: async (req, res) => {
    try {
      const { level_code } = req.params;

      const level = await LevelModel.getLevelByCode(level_code);

      if (!level) {
        return ApiResponse.error(res, 404, 'Level not found');
      }

      return ApiResponse.success(res, '200', 'Level retrieved successfully', { level });
    } catch (error) {
      console.error('Error getting level by code:', error);
      return ApiResponse.error(res, 500, 'Failed to get level');
    }
  },

  // Lấy level theo điểm số
  getLevelByScore: async (req, res) => {
    try {
      const { score } = req.params;

      if (isNaN(score)) {
        return ApiResponse.error(res, 400, 'Invalid score format');
      }

      const level = await LevelModel.getLevelByScore(parseInt(score));

      if (!level) {
        return ApiResponse.error(res, 404, 'No level found for this score');
      }

      return ApiResponse.success(res, '200', 'Level retrieved successfully', { level });
    } catch (error) {
      console.error('Error getting level by score:', error);
      return ApiResponse.error(res, 500, 'Failed to get level by score');
    }
  },

  // Lấy level tiếp theo
  getNextLevel: async (req, res) => {
    try {
      const { current_level } = req.params;

      const nextLevel = await LevelModel.getNextLevel(current_level);

      if (!nextLevel) {
        return ApiResponse.success(res, '200', 'You are at the highest level', {
          next_level: null,
          message: 'Congratulations! You have reached the highest level.'
        });
      }

      return ApiResponse.success(res, '200', 'Next level retrieved successfully', {
        next_level: nextLevel
      });
    } catch (error) {
      console.error('Error getting next level:', error);
      return ApiResponse.error(res, 500, 'Failed to get next level');
    }
  },

  // Tạo level mới (Admin only)
  createLevel: async (req, res) => {
    try {
      const levelData = req.body;

      // Validation
      if (!levelData.level_code || !levelData.level_name) {
        return ApiResponse.error(res, 400, 'Level code and name are required');
      }

      // Check if level code already exists
      const exists = await LevelModel.levelExists(levelData.level_code);
      if (exists) {
        return ApiResponse.error(res, 400, 'Level code already exists');
      }

      const newLevel = await LevelModel.createLevel(levelData);

      return ApiResponse.success(res, 201, 'Level created successfully', { level: newLevel });
    } catch (error) {
      console.error('Error creating level:', error);
      return ApiResponse.error(res, 500, 'Failed to create level');
    }
  }
};

module.exports = levelController;
