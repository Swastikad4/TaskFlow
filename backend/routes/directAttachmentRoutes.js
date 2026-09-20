const express = require('express');
const router = express.Router();
const {
  deleteAttachment,
  downloadAttachment,
} = require('../controllers/attachmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:id').delete(protect, deleteAttachment);
router.route('/:id/download').get(protect, downloadAttachment);

module.exports = router;
