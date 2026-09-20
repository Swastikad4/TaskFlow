const User = require('../models/User');
const Session = require('../models/Session');
const generateToken = require('../utils/generateToken');
const { parseDeviceInfo, getClientIp } = require('../utils/deviceHelper');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { emitSessionRevoked } = require('../sockets/socketHandler');

/**
 * Helper to record a new session for a user
 */
const createSessionRecord = async (user, req) => {
  const userAgent = req.headers['user-agent'] || '';
  const ipAddress = getClientIp(req);
  const device = parseDeviceInfo(userAgent);

  const session = await Session.create({
    user: user._id,
    device,
    ipAddress,
    userAgent,
    isValid: true,
    lastActive: new Date(),
  });

  return session;
};

/**
 * @desc    Register a new user & create initial session
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 400, 'Please provide name, email, and password');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return errorResponse(res, 400, 'User already exists with this email');
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'Team Member',
    });

    const session = await createSessionRecord(user, req);
    const token = generateToken(user._id, user.role, session._id);

    return successResponse(res, 201, 'User registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      sessionId: session._id,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user, create session & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 400, 'Please provide email and password');
    }

    // Find user with password field included
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    const session = await createSessionRecord(user, req);
    const token = generateToken(user._id, user.role, session._id);

    return successResponse(res, 200, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      sessionId: session._id,
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current authenticated user & active session info
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User profile fetched', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      currentSessionId: req.sessionId || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active sessions for current user
 * @route   GET /api/auth/sessions
 * @access  Private
 */
const getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({
      user: req.user._id,
      isValid: true,
    }).sort({ lastActive: -1, createdAt: -1 });

    const formattedSessions = sessions.map((s) => ({
      id: s._id,
      device: s.device,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
      isCurrent: req.sessionId ? s._id.toString() === req.sessionId.toString() : false,
    }));

    return successResponse(res, 200, 'Sessions retrieved successfully', {
      count: formattedSessions.length,
      currentSessionId: req.sessionId || null,
      sessions: formattedSessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke a specific session
 * @route   DELETE /api/auth/sessions/:id
 * @access  Private
 */
const revokeSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return errorResponse(res, 404, 'Session not found');
    }

    session.isValid = false;
    await session.save();

    // Broadcast sessionRevoked event to user's connected sockets
    emitSessionRevoked(req.user._id.toString(), {
      sessionId: session._id.toString(),
      message: 'This session has been revoked from another device.',
    });

    return successResponse(res, 200, 'Session revoked successfully', {
      revokedSessionId: session._id,
      isCurrentSession: req.sessionId ? session._id.toString() === req.sessionId.toString() : false,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Revoke all other sessions except the current one
 * @route   POST /api/auth/sessions/revoke-others
 * @access  Private
 */
const revokeAllOtherSessions = async (req, res, next) => {
  try {
    const query = {
      user: req.user._id,
      isValid: true,
    };

    if (req.sessionId) {
      query._id = { $ne: req.sessionId };
    }

    const result = await Session.updateMany(query, { $set: { isValid: false } });

    // Broadcast to user's sockets to sign out other devices
    emitSessionRevoked(req.user._id.toString(), {
      revokedOthers: true,
      exceptSessionId: req.sessionId ? req.sessionId.toString() : null,
      message: 'All other active sessions have been terminated.',
    });

    return successResponse(res, 200, 'All other sessions revoked successfully', {
      revokedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Log out and invalidate current session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res, next) => {
  try {
    if (req.sessionId) {
      await Session.findByIdAndUpdate(req.sessionId, { isValid: false });
    }

    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  logoutUser,
};
