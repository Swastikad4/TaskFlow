const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { createNotification } = require('../services/notificationService');
const {
  emitTeamCreated,
  emitTeamUpdated,
  emitTeamDeleted,
} = require('../sockets/socketHandler');

/**
 * @desc    Get all teams accessible by current user
 * @route   GET /api/teams
 * @access  Private
 */
const getTeams = async (req, res, next) => {
  try {
    let filter = {};

    // Scoping for Team Member: return teams they belong to (or all teams read-only if desired)
    if (req.user.role === 'Team Member') {
      filter = {
        $or: [{ members: req.user._id }, { manager: req.user._id }],
      };
    } else if (req.user.role === 'Manager') {
      // Manager can see all teams or teams they manage/are member of
      // We allow managers to view all teams so they can collaborate, but edit only their own
    }

    const teams = await Team.find(filter)
      .populate('manager', 'name email role')
      .populate('members', 'name email role')
      .sort({ name: 1 });

    // Attach active task count to each team
    const teamIds = teams.map((t) => t._id);
    const taskCounts = await Task.aggregate([
      { $match: { team: { $in: teamIds }, isArchived: { $ne: true } } },
      { $group: { _id: '$team', count: { $sum: 1 } } },
    ]);

    const taskCountMap = {};
    taskCounts.forEach((tc) => {
      taskCountMap[tc._id.toString()] = tc.count;
    });

    const formattedTeams = teams.map((team) => {
      const teamObj = team.toObject();
      teamObj.taskCount = taskCountMap[team._id.toString()] || 0;
      teamObj.isManager =
        team.manager?._id?.toString() === req.user._id.toString() ||
        req.user.role === 'Admin';
      return teamObj;
    });

    return successResponse(res, 200, 'Teams retrieved successfully', {
      count: formattedTeams.length,
      teams: formattedTeams,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single team by ID with task overview
 * @route   GET /api/teams/:id
 * @access  Private
 */
const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    if (!team) {
      return errorResponse(res, 404, 'Team not found');
    }

    // Authorization check for Team Member
    if (
      req.user.role === 'Team Member' &&
      team.manager?._id?.toString() !== req.user._id.toString() &&
      !team.members.some((m) => m._id.toString() === req.user._id.toString())
    ) {
      return errorResponse(
        res,
        403,
        'Access denied: You are not a member of this team'
      );
    }

    // Fetch team tasks
    const tasks = await Task.find({
      team: team._id,
      isArchived: { $ne: true },
    })
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .sort({ updatedAt: -1 });

    const teamObj = team.toObject();
    teamObj.tasks = tasks;
    teamObj.taskCount = tasks.length;
    teamObj.isManager =
      team.manager?._id?.toString() === req.user._id.toString() ||
      req.user.role === 'Admin';

    return successResponse(res, 200, 'Team details retrieved', { team: teamObj });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new team
 * @route   POST /api/teams
 * @access  Private (Admin, Manager only)
 */
const createTeam = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      return errorResponse(
        res,
        403,
        'Forbidden: Only Admins and Managers are authorized to create teams'
      );
    }

    const { name, description, manager, members } = req.body;

    if (!name || !name.trim()) {
      return errorResponse(res, 400, 'Team name is required');
    }

    // Check duplicate name
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      return errorResponse(res, 400, 'A team with this name already exists');
    }

    // Determine team manager
    let managerId = req.user._id;
    if (req.user.role === 'Admin' && manager) {
      managerId = manager;
    }

    // Validate manager exists
    const managerUser = await User.findById(managerId);
    if (!managerUser) {
      return errorResponse(res, 404, 'Selected team manager not found');
    }

    const validMembers = Array.isArray(members) ? members : [];

    const team = await Team.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      manager: managerId,
      members: validMembers,
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    // Notify assigned manager if different from creator
    if (managerId.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: managerId.toString(),
        message: `You have been assigned as Manager for team "${team.name}"`,
        type: 'TEAM_ASSIGNED',
      });
    }

    // Notify members
    for (const memberId of validMembers) {
      if (memberId.toString() !== req.user._id.toString()) {
        await createNotification({
          userId: memberId.toString(),
          message: `You have been added to team "${team.name}"`,
          type: 'TEAM_MEMBER_ADDED',
        });
      }
    }

    emitTeamCreated(populatedTeam);

    return successResponse(res, 201, 'Team created successfully', {
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update team details
 * @route   PUT /api/teams/:id
 * @access  Private (Admin or Team Manager)
 */
const updateTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return errorResponse(res, 404, 'Team not found');
    }

    // Authorization: Admin or Manager of this specific team
    const isTeamManager = team.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isTeamManager) {
      return errorResponse(
        res,
        403,
        'Forbidden: You are not authorized to edit this team'
      );
    }

    const { name, description, manager } = req.body;

    if (name && name.trim()) {
      // Check if name is changed and conflicts
      if (name.trim() !== team.name) {
        const duplicate = await Team.findOne({ name: name.trim() });
        if (duplicate) {
          return errorResponse(res, 400, 'A team with this name already exists');
        }
        team.name = name.trim();
      }
    }

    if (description !== undefined) {
      team.description = description.trim();
    }

    // Only Admin can reassign manager
    if (isAdmin && manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return errorResponse(res, 404, 'Specified manager user not found');
      }
      if (team.manager.toString() !== manager.toString()) {
        team.manager = manager;
        await createNotification({
          userId: manager.toString(),
          message: `You have been appointed as Manager for team "${team.name}"`,
          type: 'TEAM_ASSIGNED',
        });
      }
    }

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    emitTeamUpdated(populatedTeam);

    return successResponse(res, 200, 'Team updated successfully', {
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete team
 * @route   DELETE /api/teams/:id
 * @access  Private (Admin only)
 */
const deleteTeam = async (req, res, next) => {
  try {
    if (req.user.role !== 'Admin') {
      return errorResponse(
        res,
        403,
        'Forbidden: Only Admins are authorized to delete teams'
      );
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return errorResponse(res, 404, 'Team not found');
    }

    // Unset team association from tasks
    await Task.updateMany({ team: team._id }, { $set: { team: null } });

    await Team.findByIdAndDelete(team._id);

    emitTeamDeleted(team._id.toString());

    return successResponse(res, 200, 'Team deleted successfully', {
      deletedTeamId: team._id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add member to team
 * @route   POST /api/teams/:id/members
 * @access  Private (Admin or Team Manager)
 */
const addTeamMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return errorResponse(res, 404, 'Team not found');
    }

    const isTeamManager = team.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isTeamManager) {
      return errorResponse(
        res,
        403,
        'Forbidden: You are not authorized to manage members for this team'
      );
    }

    const { userId } = req.body;
    if (!userId) {
      return errorResponse(res, 400, 'User ID is required to add member');
    }

    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return errorResponse(res, 404, 'User not found');
    }

    // Check if already a member
    if (team.members.some((m) => m.toString() === userId.toString())) {
      return errorResponse(res, 400, 'User is already a member of this team');
    }

    team.members.push(userId);
    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    await createNotification({
      userId: userId.toString(),
      message: `You have been added to team "${team.name}" by ${req.user.name}`,
      type: 'TEAM_MEMBER_ADDED',
    });

    emitTeamUpdated(populatedTeam);

    return successResponse(res, 200, 'Member added to team successfully', {
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove member from team
 * @route   DELETE /api/teams/:id/members/:userId
 * @access  Private (Admin or Team Manager)
 */
const removeTeamMember = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return errorResponse(res, 404, 'Team not found');
    }

    const isTeamManager = team.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isTeamManager) {
      return errorResponse(
        res,
        403,
        'Forbidden: You are not authorized to manage members for this team'
      );
    }

    const { userId } = req.params;

    const initialLength = team.members.length;
    team.members = team.members.filter((m) => m.toString() !== userId.toString());

    if (team.members.length === initialLength) {
      return errorResponse(res, 400, 'User was not a member of this team');
    }

    await team.save();

    const populatedTeam = await Team.findById(team._id)
      .populate('manager', 'name email role')
      .populate('members', 'name email role');

    await createNotification({
      userId: userId.toString(),
      message: `You have been removed from team "${team.name}"`,
      type: 'TEAM_MEMBER_REMOVED',
    });

    emitTeamUpdated(populatedTeam);

    return successResponse(res, 200, 'Member removed from team successfully', {
      team: populatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
};
