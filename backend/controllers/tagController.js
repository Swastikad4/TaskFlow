const Tag = require('../models/Tag');

const DEFAULT_TAGS = [
  { name: 'frontend', color: '#FF5B26' },
  { name: 'backend', color: '#3B82F6' },
  { name: 'bug', color: '#EF4444' },
  { name: 'urgent', color: '#DC2626' },
  { name: 'database', color: '#8B5CF6' },
  { name: 'documentation', color: '#10B981' },
  { name: 'testing', color: '#F59E0B' },
  { name: 'ui/ux', color: '#EC4899' },
  { name: 'api', color: '#06B6D4' },
];

/**
 * @desc    Get all reusable tags (auto-seeds defaults if empty)
 * @route   GET /api/tags
 * @access  Private
 */
const getTags = async (req, res) => {
  try {
    let tags = await Tag.find().sort({ name: 1 });

    if (tags.length === 0) {
      // Seed default tags
      await Tag.insertMany(DEFAULT_TAGS);
      tags = await Tag.find().sort({ name: 1 });
    }

    res.status(200).json({
      success: true,
      count: tags.length,
      tags,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching tags',
    });
  }
};

/**
 * @desc    Create a new reusable tag
 * @route   POST /api/tags
 * @access  Private
 */
const createTag = async (req, res) => {
  try {
    let { name, color } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tag name is required',
      });
    }

    name = name.trim().toLowerCase().replace(/^#/, '');

    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(200).json({
        success: true,
        message: 'Tag already exists',
        tag: existingTag,
      });
    }

    const tag = await Tag.create({
      name,
      color: color || '#FF5B26',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      tag,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating tag',
    });
  }
};

/**
 * @desc    Delete a tag
 * @route   DELETE /api/tags/:id
 * @access  Private (Admin / Manager)
 */
const deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    await tag.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting tag',
    });
  }
};

module.exports = {
  getTags,
  createTag,
  deleteTag,
};
