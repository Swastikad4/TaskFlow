const path = require('path');
const fs = require('fs');
const Attachment = require('../models/Attachment');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { logActivity } = require('../services/activityService');
const {
  emitAttachmentAdded,
  emitAttachmentDeleted,
  emitNotificationCreated,
} = require('../sockets/socketHandler');

/**
 * @desc    Upload file attachment for a task
 * @route   POST /api/tasks/:taskId/attachments
 * @access  Private
 */
const uploadAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a file to upload',
      });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      // Remove uploaded file if task not found
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const ext = path.extname(req.file.originalname).replace('.', '').toUpperCase();

    const attachment = await Attachment.create({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: ext || 'FILE',
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user._id,
      task: task._id,
    });

    const populatedAttachment = await Attachment.findById(attachment._id).populate(
      'uploadedBy',
      'name email role'
    );

    // Log Activity
    await logActivity({
      taskId: task._id,
      userId: req.user._id,
      action: 'ATTACHMENT_ADDED',
      description: `${req.user.name} attached file "${req.file.originalname}" (${(
        req.file.size / 1024
      ).toFixed(1)} KB)`,
      metadata: {
        attachmentId: attachment._id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      },
    });

    // Notify assignee if not the uploader
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      const notif = await Notification.create({
        user: task.assignedTo,
        message: `${req.user.name} added an attachment to Task: ${task.title}`,
        type: 'ATTACHMENT_ADDED',
        task: task._id,
      });
      emitNotificationCreated(task.assignedTo.toString(), notif);
    }

    // Emit Socket.IO event
    emitAttachmentAdded(task._id.toString(), populatedAttachment);

    res.status(201).json({
      success: true,
      message: 'File attached successfully',
      attachment: populatedAttachment,
    });
  } catch (error) {
    // Cleanup file if DB insert fails
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Server error uploading attachment',
    });
  }
};

/**
 * @desc    Get all attachments for a task
 * @route   GET /api/tasks/:taskId/attachments
 * @access  Private
 */
const getAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const attachments = await Attachment.find({ task: taskId })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: attachments.length,
      attachments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching attachments',
    });
  }
};

/**
 * @desc    Delete an attachment
 * @route   DELETE /api/attachments/:id
 * @access  Private
 */
const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    const task = await Task.findById(attachment.task);

    // Permission check: uploader, task creator, or Admin/Manager
    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    const isCreator = task && task.createdBy.toString() === req.user._id.toString();
    const isManagerOrAdmin = req.user.role === 'Admin' || req.user.role === 'Manager';

    if (!isUploader && !isCreator && !isManagerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this attachment',
      });
    }

    // Delete disk file
    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');
    const filePath = path.join(uploadDir, attachment.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachment.deleteOne();

    // Log activity
    if (task) {
      await logActivity({
        taskId: task._id,
        userId: req.user._id,
        action: 'ATTACHMENT_DELETED',
        description: `${req.user.name} removed attachment "${attachment.originalName}"`,
        metadata: {
          attachmentId: attachment._id,
          fileName: attachment.originalName,
        },
      });

      emitAttachmentDeleted(task._id.toString(), id);
    }

    res.status(200).json({
      success: true,
      message: 'Attachment removed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting attachment',
    });
  }
};

/**
 * @desc    Download attachment file
 * @route   GET /api/attachments/:id/download
 * @access  Private
 */
const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const attachment = await Attachment.findById(id);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found',
      });
    }

    const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');
    const filePath = path.join(uploadDir, attachment.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical file not found on server',
      });
    }

    res.download(filePath, attachment.originalName);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error downloading attachment',
    });
  }
};

module.exports = {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  downloadAttachment,
};
