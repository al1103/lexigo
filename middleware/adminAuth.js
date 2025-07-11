const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const adminAuth = async (req, res, next) => {
  try {
    // Get token from cookie
    const token = req.cookies.admin_token;

    if (!token) {
      return res.redirect('/admin/login');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default-secret');

    // Check if user is still in database (chỉ kiểm tra id, ép kiểu userId về số)
    const userResult = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [Number(decoded.userId)]
    );

    if (userResult.rows.length === 0) {
      res.clearCookie('admin_token');
      return res.redirect('/admin/login');
    }

    // Attach user to request
    req.adminUser = userResult.rows[0];
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.clearCookie('admin_token');
    res.redirect('/admin/login');
  }
};

// Middleware to redirect to dashboard if already logged in
const redirectIfLoggedIn = (req, res, next) => {
  try {
    const token = req.cookies.admin_token;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY || 'default-secret');
      return res.redirect('/admin/dashboard');
    }

    next();
  } catch (error) {
    // Invalid token, clear it and continue
    res.clearCookie('admin_token');
    next();
  }
};

module.exports = { adminAuth, redirectIfLoggedIn };
