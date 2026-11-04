const mongoose = require('mongoose');
const ActionItem = require('../models/ActionItem');
const Meeting = require('../models/Meeting');
const Notification = require('../models/Notification');

// @desc    Get action items (user, workspace, or meeting specific)
// @route   GET /api/action-items
// @access  Private
const getActionItems = async (req, res, next) => {
  try {
    const { meeting, status, priority } = req.query;
    let query = {};

    if (meeting) {
      if (mongoose.Types.ObjectId.isValid(meeting)) {
        query.meeting = meeting;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid meeting ID format',
        });
      }
    }

    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;

    const actionItems = await ActionItem.find(query)
      .populate('meeting', 'title meetingCode scheduledAt')
      .populate('assignedTo', 'name email avatar jobTitle')
      .populate('createdBy', 'name email avatar')
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

// @desc    Create action item (standalone or meeting-linked)
// @route   POST /api/action-items
// @access  Private
const createActionItem = async (req, res, next) => {
  try {
    const { meeting, title, description, assignedTo, dueDate, priority, status } = req.body;

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: 'Action item title is required',
      });
    }

    // Optional meeting reference validation
    let validatedMeetingId = null;
    if (meeting !== undefined && meeting !== null && meeting !== '') {
      if (!mongoose.Types.ObjectId.isValid(meeting)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid meeting ID provided',
        });
      }

      const existingMeeting = await Meeting.findById(meeting);
      if (!existingMeeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found',
        });
      }
      validatedMeetingId = existingMeeting._id;
    }

    if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assigned user ID format',
      });
    }

    const actionItem = await ActionItem.create({
      meeting: validatedMeetingId,
      title: trimmedTitle,
      description: description ? description.trim() : '',
      assignedTo: assignedTo || req.user._id,
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      priority: priority || 'Medium',
      status: status || 'Pending',
      createdBy: req.user._id,
    });

    // If meeting linked, update meeting's actionItems array
    if (validatedMeetingId) {
      await Meeting.findByIdAndUpdate(validatedMeetingId, {
        $addToSet: { actionItems: actionItem._id },
      }).catch((err) =>
        console.warn('[ActionItem] Could not link to meeting document:', err.message)
      );
    }

    // Notify assigned member if different from creator
    if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: assignedTo,
        type: 'action_assigned',
        title: `Action Item Assigned: ${trimmedTitle}`,
        message: `${req.user.name} assigned you a task: "${trimmedTitle}"`,
        link: validatedMeetingId ? `/meetings/${validatedMeetingId}` : '/action-items',
      }).catch((err) =>
        console.warn('[ActionItem] Notification creation warning:', err.message)
      );
    }

    const populated = await ActionItem.findById(actionItem._id)
      .populate('meeting', 'title meetingCode scheduledAt')
      .populate('assignedTo', 'name email avatar jobTitle')
      .populate('createdBy', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Action item created successfully',
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action item ID format',
      });
    }

    const actionItem = await ActionItem.findById(req.params.id);

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
    }

    const { title, description, assignedTo, dueDate, priority, status, meeting } = req.body;

    if (title !== undefined) {
      const trimmed = typeof title === 'string' ? title.trim() : '';
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: 'Action item title cannot be empty',
        });
      }
      actionItem.title = trimmed;
    }

    if (description !== undefined) {
      actionItem.description = description ? description.trim() : '';
    }

    const oldAssignedTo = actionItem.assignedTo ? actionItem.assignedTo.toString() : null;
    let newAssignedTo = oldAssignedTo;

    if (assignedTo !== undefined) {
      if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assigned user ID format',
        });
      }
      newAssignedTo = assignedTo ? assignedTo.toString() : null;
      actionItem.assignedTo = assignedTo || null;
    }

    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      const parsed = new Date(dueDate);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format',
        });
      }
      actionItem.dueDate = parsed;
    }

    if (priority !== undefined) {
      const validPriorities = ['Low', 'Medium', 'High'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
        });
      }
      actionItem.priority = priority;
    }

    if (status !== undefined) {
      const validStatuses = ['Pending', 'In Progress', 'Completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        });
      }
      actionItem.status = status;
    }

    const oldMeetingId = actionItem.meeting ? actionItem.meeting.toString() : null;
    let meetingChanged = false;

    if (meeting !== undefined) {
      if (meeting === null || meeting === '') {
        actionItem.meeting = null;
        meetingChanged = oldMeetingId !== null;
      } else if (mongoose.Types.ObjectId.isValid(meeting)) {
        const targetMeeting = await Meeting.findById(meeting);
        if (!targetMeeting) {
          return res.status(404).json({
            success: false,
            message: 'Meeting not found',
          });
        }
        actionItem.meeting = targetMeeting._id;
        meetingChanged = oldMeetingId !== targetMeeting._id.toString();
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid meeting ID provided',
        });
      }
    }

    await actionItem.save();

    // Maintain bidirectional consistency with Meeting.actionItems array
    if (meetingChanged) {
      if (oldMeetingId) {
        await Meeting.findByIdAndUpdate(oldMeetingId, {
          $pull: { actionItems: actionItem._id },
        }).catch((err) =>
          console.warn('[ActionItem] Could not remove from old meeting document:', err.message)
        );
      }
      if (actionItem.meeting) {
        await Meeting.findByIdAndUpdate(actionItem.meeting, {
          $addToSet: { actionItems: actionItem._id },
        }).catch((err) =>
          console.warn('[ActionItem] Could not add to new meeting document:', err.message)
        );
      }
    }

    // Notify new assignee if assignment changed to another user
    if (
      newAssignedTo &&
      newAssignedTo !== oldAssignedTo &&
      req.user &&
      newAssignedTo !== req.user._id.toString()
    ) {
      await Notification.create({
        user: newAssignedTo,
        type: 'action_assigned',
        title: `Action Item Assigned: ${actionItem.title}`,
        message: `${req.user.name} assigned you a task: "${actionItem.title}"`,
        link: actionItem.meeting ? `/meetings/${actionItem.meeting}` : '/action-items',
      }).catch((err) =>
        console.warn('[ActionItem] Notification warning on update:', err.message)
      );
    }

    const populated = await ActionItem.findById(actionItem._id)
      .populate('meeting', 'title meetingCode scheduledAt')
      .populate('assignedTo', 'name email avatar jobTitle')
      .populate('createdBy', 'name email avatar');

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action item ID format',
      });
    }

    const actionItem = await ActionItem.findById(req.params.id);
    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found',
      });
    }

    if (actionItem.meeting) {
      await Meeting.findByIdAndUpdate(actionItem.meeting, {
        $pull: { actionItems: actionItem._id },
      }).catch((err) =>
        console.warn('[ActionItem] Could not remove from meeting document:', err.message)
      );
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
