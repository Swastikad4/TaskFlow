const mongoose = require('mongoose');
const Task = require('../models/Task');
const Team = require('../models/Team');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * @desc    Get high-performance productivity analytics via MongoDB aggregation
 * @route   GET /api/analytics
 * @access  Private
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { dateRange = '30d', startDate, endDate, teamId } = req.query;

    const now = new Date();
    const matchQuery = { isArchived: { $ne: true } };

    // 1. Role-based scoping
    if (req.user.role === 'Team Member') {
      matchQuery.$or = [
        { assignedTo: new mongoose.Types.ObjectId(req.user._id) },
        { createdBy: new mongoose.Types.ObjectId(req.user._id) },
      ];
    }

    // 2. Team filter
    if (teamId && mongoose.Types.ObjectId.isValid(teamId)) {
      matchQuery.team = new mongoose.Types.ObjectId(teamId);
    }

    // 3. Date range filtering for trends
    let rangeStart = null;
    let rangeEnd = new Date();

    if (dateRange === '7d') {
      rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '30d') {
      rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '90d') {
      rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'custom' && startDate) {
      rangeStart = new Date(startDate);
      if (endDate) {
        rangeEnd = new Date(endDate);
        rangeEnd.setHours(23, 59, 59, 999);
      }
    }

    const dateFilter = {};
    if (rangeStart) {
      dateFilter.$gte = rangeStart;
      dateFilter.$lte = rangeEnd;
    }

    // Faceted aggregation pipeline for lightning-fast single-roundtrip query
    const [result] = await Task.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          // Status counts
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],

          // Priority counts
          priorityCounts: [
            {
              $group: {
                _id: '$priority',
                count: { $sum: 1 },
              },
            },
          ],

          // Overdue tasks
          overdueTasks: [
            {
              $match: {
                dueDate: { $ne: null, $lt: now },
                status: { $ne: 'Completed' },
              },
            },
            { $count: 'count' },
          ],

          // Recurring tasks count
          recurringTasks: [
            {
              $match: {
                isRecurring: true,
              },
            },
            { $count: 'count' },
          ],

          // Completion over time (daily group for current range)
          dailyTimeline: [
            ...(rangeStart ? [{ $match: { createdAt: dateFilter } }] : []),
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                created: { $sum: 1 },
                completed: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],

          // Team Member Workload Breakdown
          memberWorkload: [
            {
              $match: {
                assignedTo: { $ne: null },
              },
            },
            {
              $group: {
                _id: '$assignedTo',
                totalAssigned: { $sum: 1 },
                completedCount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0],
                  },
                },
                inProgressCount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0],
                  },
                },
                todoCount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'To Do'] }, 1, 0],
                  },
                },
              },
            },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: '$user' },
            {
              $project: {
                userId: '$_id',
                name: '$user.name',
                email: '$user.email',
                role: '$user.role',
                totalAssigned: 1,
                completedCount: 1,
                inProgressCount: 1,
                todoCount: 1,
                completionRate: {
                  $cond: [
                    { $gt: ['$totalAssigned', 0] },
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ['$completedCount', '$totalAssigned'] },
                            100,
                          ],
                        },
                        1,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            { $sort: { totalAssigned: -1 } },
            { $limit: 10 },
          ],
        },
      },
    ]);

    // Format results cleanly
    const statusMap = { 'To Do': 0, 'In Progress': 0, 'Completed': 0 };
    let totalTasks = 0;
    (result.statusCounts || []).forEach((s) => {
      statusMap[s._id] = s.count;
      totalTasks += s.count;
    });

    const priorityMap = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    (result.priorityCounts || []).forEach((p) => {
      priorityMap[p._id] = p.count;
    });

    const completed = statusMap['Completed'] || 0;
    const inProgress = statusMap['In Progress'] || 0;
    const todo = statusMap['To Do'] || 0;
    const overdue = result.overdueTasks?.[0]?.count || 0;
    const recurring = result.recurringTasks?.[0]?.count || 0;
    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    const metrics = {
      totalTasks,
      completed,
      inProgress,
      todo,
      overdue,
      recurring,
      completionRate,
    };

    const statusDistribution = [
      { label: 'Completed', count: completed, percentage: totalTasks ? Math.round((completed / totalTasks) * 100) : 0, color: '#10B981' },
      { label: 'In Progress', count: inProgress, percentage: totalTasks ? Math.round((inProgress / totalTasks) * 100) : 0, color: '#3A86FF' },
      { label: 'To Do', count: todo, percentage: totalTasks ? Math.round((todo / totalTasks) * 100) : 0, color: '#F59E0B' },
    ];

    const priorityDistribution = [
      { label: 'Urgent', count: priorityMap.Urgent, color: '#EF4444' },
      { label: 'High', count: priorityMap.High, color: '#FF5B26' },
      { label: 'Medium', count: priorityMap.Medium, color: '#F59E0B' },
      { label: 'Low', count: priorityMap.Low, color: '#10B981' },
    ];

    return successResponse(res, 200, 'Productivity analytics aggregated successfully', {
      metrics,
      summary: metrics,
      statusDistribution,
      statusBreakdown: statusDistribution,
      priorityDistribution,
      priorityBreakdown: priorityDistribution,
      timeline: (result.dailyTimeline || []).map((t) => ({
        date: t._id,
        created: t.created,
        completed: t.completed,
      })),
      memberWorkload: result.memberWorkload || [],
      dateRange,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
};
