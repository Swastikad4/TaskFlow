const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getCommentsByTask,
  createComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getCommentsByTask)
  .post(createComment);

module.exports = router;
