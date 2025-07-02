const jwt = require('jsonwebtoken');
const UserModel = require('../models/user_model');
const ApiResponse = require('../utils/apiResponse');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No token provided');
      return ApiResponse.error(res, 401, 'Access token is required');
    }

    console.log('🔍 Verifying token...');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lexigo_secret_key');

    console.log('✅ Token decoded:', { userId: decoded.userId, username: decoded.username });

    // Get user from database to ensure they still exist
    const user = await UserModel.findById(decoded.userId);

    if (!user) {
      console.log('❌ User not found in database for ID:', decoded.userId);
      return ApiResponse.error(res, 401, 'User not found');
    }

    console.log('✅ User found:', { id: user.id, username: user.username });

    // Add user info to request object
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      totalPoints: user.total_points,
      streakDays: user.streak_days
    };

    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);

    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 401, 'Invalid token', {
        error_type: 'INVALID_TOKEN',
        message: 'Please login again'
      });
    } else if (error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 401, 'Token expired', {
        error_type: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please login again',
        expired_at: error.expiredAt
      });
    } else {
      return ApiResponse.error(res, 500, 'Authentication failed', {
        error_type: 'AUTH_ERROR',
        message: 'Internal authentication error'
      });
    }
  }
};

// Optional auth - không throw error nếu không có token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('ℹ️ No token provided for optional auth');
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'lexigo_secret_key');
    const user = await UserModel.findById(decoded.userId);

    req.user = user ? {
      userId: user.id,
      username: user.username,
      email: user.email,
      level: user.level,
      totalPoints: user.total_points,
      streakDays: user.streak_days
    } : null;

    console.log('✅ Optional auth successful:', req.user ? req.user.username : 'anonymous');
    next();
  } catch (error) {
    console.log('ℹ️ Optional auth failed, continuing as anonymous:', error.message);
    req.user = null;
    next();
  }
};

// Middleware để check token expired và suggest refresh
const checkTokenExpiry = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    // Decode without verification to check expiry
    const decoded = jwt.decode(token);

    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;

      // If token expires within 5 minutes, add warning header
      if (timeUntilExpiry > 0 && timeUntilExpiry < 300) {
        res.set('X-Token-Warning', 'Token will expire soon');
        res.set('X-Token-Expires-In', timeUntilExpiry.toString());
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  checkTokenExpiry
};
