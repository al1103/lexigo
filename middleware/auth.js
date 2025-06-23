const jwt = require('jsonwebtoken');
const UserModel = require('../models/user_model');
const ApiResponse = require('../utils/apiResponse');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return ApiResponse.error(res, 401, 'Access token is required');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lexigo_secret_key');

    // Get user from database to ensure they still exist
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      return ApiResponse.error(res, 401, 'User not found');
    }

    // Add user info to request object
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      level: user.level
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 401, 'Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 401, 'Token expired');
    } else {
      return ApiResponse.error(res, 500, 'Authentication failed');
    }
  }
};

// Optional auth - không throw error nếu không có token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lexigo_secret_key');
    const user = await UserModel.findById(decoded.userId);

    req.user = user ? {
      userId: user.id,
      username: user.username,
      email: user.email,
      level: user.level
    } : null;

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};
