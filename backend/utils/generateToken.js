const jwt = require('jsonwebtoken');

/**
 * Generate signed JWT token
 * @param {string} id - User ID
 * @param {string} role - User Role
 * @param {string} sessionId - Optional Session ID
 * @returns {string} Signed JWT
 */
const generateToken = (id, role, sessionId = null) => {
  const payload = { id, role };
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback_secret_taskflow_2026',
    {
      expiresIn: '7d',
    }
  );
};

module.exports = generateToken;
