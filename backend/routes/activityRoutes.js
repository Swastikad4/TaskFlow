const express = require('express');
const router = express.Router({ mergeParams: true });
const { getTaskActivities } = require('../controllers/activityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getTaskActivities);

module.exports = router;
