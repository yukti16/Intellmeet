const ActionItem = require('../models/ActionItem');
const Notification = require('../models/Notification');

// @desc    Get action items (user or meeting specific)
// @route   GET /api/action-items
// @access  Private
const getActionItems = async (req, res, next) => {
  try {
    const { meeting, status, priority } = req.query;
    let query = {};

    if (meeting) {
      query.meeting = meeting;
    } else {
      query.$or = [{ assignedTo: req.user._id }, { assignedTo: { $exists: true } }];
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const actionItems = await ActionItem.find(query)
      .populate('meeting', 'title meetingCode scheduledAt')
      .populate('assignedTo', 'name email avatar jobTitle')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: actionItems.length,
      actionItems,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create action item
// @route   POST /api/action-items
// @access  Private
const createActionItem = async (req, res, next) => {
  try {
    const { meeting, title, description, assignedTo, dueDate, priority, status } = req.body;

    if (!title || !meeting) {
      return res.status(400).json({
        success: false,
        message: 'Title and meeting ID are required',
      });
    }

    const actionItem = await ActionItem.create({
      meeting,
      title,
      description: description || '',
      assignedTo: assignedTo || req.user._id,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: priority || 'Medium',
      status: status || 'Pending',
    });

    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: assignedTo,
        type: 'action_assigned',
        title: `Action Item Assigned: ${title}`,
        message: `${req.user.name} assigned you a task: "${title}"`,
        link: `/meetings/${meeting}`,
      });
    }

    const populated = await ActionItem.findById(actionItem._id)
      .populate('meeting', 'title meetingCode')
      .populate('assignedTo', 'name email avatar');

    res.status(201).json({
      success: true,
      actionItem: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update action item
// @route   PUT /api/action-items/:id
// @access  Private
const updateActionItem = async (req, res, next) => {
  try {
    const actionItem = await ActionItem.findById(req.params.id);

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
    }

    const { title, description, assignedTo, dueDate, priority, status } = req.body;

    if (title) actionItem.title = title;
    if (description !== undefined) actionItem.description = description;
    if (assignedTo) actionItem.assignedTo = assignedTo;
    if (dueDate) actionItem.dueDate = dueDate;
    if (priority) actionItem.priority = priority;
    if (status) actionItem.status = status;

    await actionItem.save();

    const populated = await ActionItem.findById(actionItem._id)
      .populate('meeting', 'title meetingCode')
      .populate('assignedTo', 'name email avatar');

    res.status(200).json({
      success: true,
      actionItem: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete action item
// @route   DELETE /api/action-items/:id
// @access  Private
const deleteActionItem = async (req, res, next) => {
  try {
    const actionItem = await ActionItem.findById(req.params.id);
    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
    }

    await ActionItem.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Action item deleted',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActionItems,
  createActionItem,
  updateActionItem,
  deleteActionItem,
};
