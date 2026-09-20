/**
 * Parse client device and browser information from User-Agent string
 * @param {string} userAgent
 * @returns {string} Human-readable device/browser label
 */
const parseDeviceInfo = (userAgent = '') => {
  if (!userAgent) return 'Web Browser';

  const ua = userAgent.toLowerCase();

  let browser = 'Browser';
  if (ua.includes('edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';
  else if (ua.includes('postman')) browser = 'Postman Runtime';
  else if (ua.includes('insomnia')) browser = 'Insomnia';
  else if (ua.includes('curl') || ua.includes('node-fetch') || ua.includes('axios'))
    browser = 'API Client';

  let os = '';
  if (ua.includes('windows nt 10.0') || ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';

  return os ? `${browser} on ${os}` : browser;
};

/**
 * Extract client IP address safely
 * @param {Object} req - Express Request
 * @returns {string} Client IP address
 */
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
};

module.exports = {
  parseDeviceInfo,
  getClientIp,
};
