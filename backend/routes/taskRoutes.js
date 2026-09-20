const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleFavorite,
  archiveTask,
  restoreTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const commentRouter = require('./commentRoutes');
const activityRouter = require('./activityRoutes');
const attachmentRouter = require('./attachmentRoutes');

// Re-route into sub-resource routers
router.use('/:taskId/comments', commentRouter);
router.use('/:id/comments', commentRouter);
router.use('/:id/activities', activityRouter);
router.use('/:taskId/attachments', attachmentRouter);
router.use('/:id/attachments', attachmentRouter);

// Protect all task routes
router.use(protect);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.put('/:id/favorite', toggleFavorite);
router.put('/:id/archive', archiveTask);
router.put('/:id/restore', restoreTask);

// Checklist subtask routes
router.post('/:id/checklist', addChecklistItem);
router.route('/:id/checklist/:itemId')
  .put(updateChecklistItem)
  .delete(deleteChecklistItem);

module.exports = router;
