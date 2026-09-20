const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
} = require('../controllers/attachmentController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Tasks nested attachment routes: /api/tasks/:taskId/attachments
router
  .route('/')
  .post(protect, upload.single('file'), uploadAttachment)
  .get(protect, getAttachments);

module.exports = router;
