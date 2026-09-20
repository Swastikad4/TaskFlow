const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/logout', protect, logoutUser);

// Session Management Endpoints
router.get('/sessions', protect, getSessions);
router.delete('/sessions/:id', protect, revokeSession);
router.post('/sessions/revoke-others', protect, revokeAllOtherSessions);

module.exports = router;
