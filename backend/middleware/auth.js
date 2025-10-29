/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information including user type
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 * Extracts userId, email, and userType from token and attaches to req.user
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token, access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Contains: userId, email, userType
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user has specific role
 * Usage: requireRole('restaurant_owner')
 * @param {string|Array<string>} roles - Required role(s)
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const userType = req.user?.userType || 'customer';
    
    if (!allowedRoles.includes(userType)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        currentRole: userType
      });
    }
    
    next();
  };
};

module.exports = { authMiddleware, requireRole };
