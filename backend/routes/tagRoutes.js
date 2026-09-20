const express = require('express');
const router = express.Router();
const { getTags, createTag, deleteTag } = require('../controllers/tagController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getTags)
  .post(protect, createTag);

router.route('/:id').delete(protect, authorize('Admin', 'Manager'), deleteTag);

module.exports = router;
