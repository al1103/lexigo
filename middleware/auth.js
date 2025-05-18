const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Verify token
    jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, decoded) => {
      if (err) {
        return res.status(403).json({ 
          success: false, 
          message: 'Invalid token.' 
        });
      }
      
      // Add user info to request
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error during authentication' 
    });
  }
};

// Optional middleware to check if user has admin role
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Admin rights required.' 
    });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  isAdmin
}; 