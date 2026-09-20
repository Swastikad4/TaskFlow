const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const { errorResponse } = require('../utils/apiResponse');

/**
 * Protect routes by verifying JWT in Authorization header and checking active session validity
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret_taskflow_2026'
      );

      // If token has a sessionId, verify session status in database
      if (decoded.sessionId) {
        const session = await Session.findById(decoded.sessionId);
        if (!session || session.isValid === false) {
          return errorResponse(
            res,
            401,
            'Session has been revoked or expired. Please sign in again.'
          );
        }

        // Debounce lastActive update: only update if older than 30 seconds
        const now = Date.now();
        if (!session.lastActive || now - new Date(session.lastActive).getTime() > 30000) {
          session.lastActive = new Date(now);
          session.save().catch(() => {});
        }

        req.sessionId = decoded.sessionId;
        req.session = session;
      }

      // Attach user from database without password
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return errorResponse(res, 401, 'Not authorized, user not found');
      }

      req.user = user;
      return next();
    } catch (error) {
      return errorResponse(res, 401, 'Not authorized, invalid or expired token');
    }
  }

  if (!token) {
    return errorResponse(res, 401, 'Not authorized, no token provided');
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Forbidden: Role '${req.user?.role}' is not authorized to access this resource`
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
