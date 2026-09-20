const { errorResponse } = require('../utils/apiResponse');

/**
 * Restrict access to specific roles
 * @param  {...string} roles - e.g. 'Admin', 'Manager', 'Team Member'
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Role (${req.user ? req.user.role : 'Guest'}) is not authorized to access this resource`
      );
    }
    next();
  };
};

module.exports = { authorizeRoles };
