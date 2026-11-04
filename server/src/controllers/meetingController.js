const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Workspace = require('../models/Workspace');
const WorkspaceMember = require('../models/WorkspaceMember');
const { generateMeetingCode } = require('../utils/generateCode');
const { generateMeetingSummary, extractKeyPoints, extractActionItems } = require('../services/aiService');
const { parseDueDate } = require('../utils/dateUtils');
const { cleanActionTitle, normalizeTitle } = require('../utils/textUtils');

// @desc    Get meetings list with search/filter
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res, next) => {
  try {
    const { status, workspace, search } = req.query;
    let query = {};

    if (workspace && mongoose.Types.ObjectId.isValid(workspace)) {
      // Check workspace membership or global Admin
      const ws = await Workspace.findById(workspace);
      if (ws) {
        const isOwner = ws.owner.toString() === req.user._id.toString();
        const isMember = ws.members.some((m) => m.toString() === req.user._id.toString());
        const hasMembership = await WorkspaceMember.exists({ workspace: ws._id, user: req.user._id });
        const canAccessWorkspace = isOwner || isMember || Boolean(hasMembership) || req.user.role === 'Admin';

        if (!canAccessWorkspace) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view meetings for this workspace',
          });
        }
      }
      // When workspace filter is present, fetch meetings belonging to that workspace
      query.workspace = workspace;
    } else {
      // Global meetings: user is host or participant
      query.$or = [{ host: req.user._id }, { participants: req.user._id }];
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      const searchCondition = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { meetingCode: { $regex: search, $options: 'i' } },
        ],
      };
      if (query.$and) {
        query.$and.push(searchCondition);
      } else {
        query.$and = [searchCondition];
      }
    }

    const meetings = await Meeting.find(query)
      .populate('host', 'name email avatar jobTitle')
      .populate('participants', 'name email avatar jobTitle status')
      .populate('workspace', 'name')
      .populate('actionItems')
      .sort({ scheduledAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single meeting by ID or meetingCode
// @route   GET /api/meetings/:id
// @access  Private
const getMeetingById = async (req, res, next) => {
  try {
    const identifier = req.params.id;
    let meeting;

    if (identifier.startsWith('INT-') || identifier.length < 15) {
      meeting = await Meeting.findOne({ meetingCode: identifier.toUpperCase() });
    } else if (mongoose.Types.ObjectId.isValid(identifier)) {
      meeting = await Meeting.findById(identifier);
    } else {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found (invalid ID format)',
      });
    }

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    await meeting.populate('host', 'name email avatar jobTitle department');
    await meeting.populate('participants', 'name email avatar jobTitle status department');
    await meeting.populate('workspace', 'name description');
    await meeting.populate({
      path: 'actionItems',
      populate: { path: 'assignedTo', select: 'name email avatar' },
    });

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new meeting
// @route   POST /api/meetings
// @access  Private
const createMeeting = async (req, res, next) => {
  try {
    const { title, description, workspace, scheduledAt, duration, participantIds } = req.body;

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (!trimmedTitle || !/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmedTitle)) {
      return res.status(400).json({
        success: false,
        message: 'Valid meeting title containing letters or numbers is required',
      });
    }

    const cleanDescription =
      typeof description === 'string' && /[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(description)
        ? description.trim()
        : '';

    let code = generateMeetingCode();
    // Ensure code uniqueness
    let existing = await Meeting.findOne({ meetingCode: code });
    while (existing) {
      code = generateMeetingCode();
      existing = await Meeting.findOne({ meetingCode: code });
    }

    const participantsList = Array.isArray(participantIds) ? participantIds : [];
    if (!participantsList.includes(req.user._id.toString())) {
      participantsList.push(req.user._id);
    }

    let validatedWorkspace = null;
    if (workspace && mongoose.Types.ObjectId.isValid(workspace)) {
      const ws = await Workspace.findById(workspace);
      if (!ws) {
        return res.status(404).json({
          success: false,
          message: 'Specified workspace not found',
        });
      }

      const isOwner = ws.owner.toString() === req.user._id.toString();
      const isMember = ws.members.some((m) => m.toString() === req.user._id.toString());
      const hasMembership = await WorkspaceMember.exists({ workspace: ws._id, user: req.user._id });
      const isAuthorized = isOwner || isMember || Boolean(hasMembership) || req.user.role === 'Admin';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to schedule meetings in this workspace',
        });
      }

      validatedWorkspace = ws._id;
    }

    const meeting = await Meeting.create({
      title: trimmedTitle,
      description: cleanDescription,
      host: req.user._id,
      workspace: validatedWorkspace,
      participants: participantsList,
      scheduledAt: scheduledAt || new Date(),
      duration: duration || 30,
      meetingCode: code,
      status: 'scheduled',
    });

    // Notify invited participants
    for (const pId of participantsList) {
      if (pId.toString() !== req.user._id.toString() && mongoose.Types.ObjectId.isValid(pId)) {
        await Notification.create({
          user: pId,
          type: 'meeting_invite',
          title: `Invited to ${meeting.title}`,
          message: `${req.user.name} invited you to a meeting scheduled for ${new Date(meeting.scheduledAt).toLocaleString()}`,
          link: `/meetings/${meeting.meetingCode}`,
        });
      }
    }

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email avatar')
      .populate('participants', 'name email avatar')
      .populate('workspace', 'name');

    res.status(201).json({
      success: true,
      meeting: populatedMeeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Join meeting by ID or Code
// @route   POST /api/meetings/:id/join
// @access  Private
const joinMeeting = async (req, res, next) => {
  try {
    const identifier = req.params.id;
    let meeting;

    if (identifier.startsWith('INT-') || identifier.length < 15) {
      let code = identifier.toUpperCase();
      if (!code.startsWith('INT-')) {
        code = `INT-${code}`;
      }
      meeting = await Meeting.findOne({ meetingCode: code });
    } else if (mongoose.Types.ObjectId.isValid(identifier)) {
      meeting = await Meeting.findById(identifier);
    } else {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or invalid code format',
      });
    }

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or invalid code',
      });
    }

    // Add user to participants if not already included
    if (!meeting.participants.includes(req.user._id)) {
      meeting.participants.push(req.user._id);
    }

    if (meeting.status === 'scheduled') {
      meeting.status = 'live';
    }

    await meeting.save();

    await meeting.populate('host', 'name email avatar');
    await meeting.populate('participants', 'name email avatar status');

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End meeting and trigger AI analysis
// @route   POST /api/meetings/:id/end
// @access  Private
const endMeeting = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid meeting ID' });
    }

    const { transcript } = req.body;
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    // Ensure host or Admin
    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the meeting host or Admin can end the meeting',
      });
    }

    meeting.status = 'ended';
    if (transcript && Array.isArray(transcript) && transcript.length > 0) {
      meeting.transcript = transcript;
    }

    // Combine transcript text for AI processing
    const transcriptText = (meeting.transcript || [])
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    // Run AI analysis
    const aiSummary = await generateMeetingSummary(transcriptText);
    const keyPoints = await extractKeyPoints(transcriptText);
    const rawActionItems = await extractActionItems(transcriptText);

    meeting.summary = aiSummary;
    meeting.keyPoints = keyPoints;

    // Fetch existing action items linked to this meeting to protect user-created/edited tasks
    const existingActionItems = await ActionItem.find({ meeting: meeting._id });

    // Build map of existing tasks by normalized title to prevent duplicates and protect edits
    const existingByNormalizedTitle = new Map();
    existingActionItems.forEach((item) => {
      const norm = normalizeTitle(item.title);
      if (norm) {
        existingByNormalizedTitle.set(norm, item);
      }
    });

    const finalActionItemIds = existingActionItems.map((item) => item._id);

    // Resolve participants for assignee matching
    const allParticipantIds = [meeting.host, ...(meeting.participants || [])];
    const participantUsers = await User.find({ _id: { $in: allParticipantIds } }).select('_id name email');

    for (const item of rawActionItems) {
      const cleanTitle = cleanActionTitle(item.title, item.assignedTo);
      const normTitle = normalizeTitle(cleanTitle);
      if (!normTitle) continue;

      // Duplicate prevention: If a task with this normalized title already exists for this meeting, preserve it
      if (existingByNormalizedTitle.has(normTitle)) {
        continue;
      }

      // Resolve assignee: match extracted name only against actual meeting participants or host.
      // Default is null (Unassigned) — never arbitrarily assign to host!
      let targetAssignee = null;
      let matchedUser = null;
      if (item.assignedTo && typeof item.assignedTo === 'string' && item.assignedTo !== 'Unassigned') {
        const queryName = item.assignedTo.trim().toLowerCase();
        matchedUser = participantUsers.find((u) => {
          const uName = (u.name || '').toLowerCase();
          const parts = uName.split(/\s+/);
          return (
            uName === queryName ||
            parts.some((p) => p === queryName) ||
            uName.includes(queryName)
          );
        });

        if (matchedUser) {
          targetAssignee = matchedUser._id;
        }
      }

      // Preserve speaker and context in description
      let description = item.description || '';
      if (item.assignedTo && item.assignedTo !== 'Unassigned' && !matchedUser) {
        description = description
          ? `${description} (Intended for ${item.assignedTo})`
          : `Mentioned for ${item.assignedTo} (not present in meeting).`;
      }

      const actionDoc = await ActionItem.create({
        meeting: meeting._id,
        title: cleanTitle,
        description,
        assignedTo: targetAssignee,
        priority: item.priority || 'Medium',
        dueDate: parseDueDate(item.dueDate),
        status: item.status || 'Pending',
        source: 'ai',
        createdBy: req.user._id,
      });

      existingByNormalizedTitle.set(normTitle, actionDoc);
      finalActionItemIds.push(actionDoc._id);

      // Notify assigned user if different from the host
      if (targetAssignee && targetAssignee.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: targetAssignee,
          type: 'action_item_assigned',
          title: 'New Action Item Assigned',
          message: `${req.user.name} assigned you a task: "${cleanTitle}"`,
          link: `/meetings/${meeting._id}`,
        }).catch((err) => console.warn('[ActionItem Notification Error]', err.message));
      }
    }

    meeting.actionItems = finalActionItemIds;
    await meeting.save();

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('host', 'name email avatar jobTitle department')
      .populate('participants', 'name email avatar jobTitle status department')
      .populate('workspace', 'name description')
      .populate({
        path: 'actionItems',
        populate: { path: 'assignedTo', select: 'name email avatar' },
      });

    // Notify participants that summary is ready
    for (const pId of meeting.participants) {
      await Notification.create({
        user: pId,
        type: 'summary_ready',
        title: `AI Summary Ready: ${meeting.title}`,
        message: `Meeting has ended. Your AI summary and action items are now available.`,
        link: `/meetings/${meeting._id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Meeting ended and AI analysis completed',
      meeting: populatedMeeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update meeting details
// @route   PUT /api/meetings/:id
// @access  Private
const updateMeeting = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid meeting ID' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this meeting',
      });
    }

    const { title, description, scheduledAt, duration, status, transcript } = req.body;

    if (title !== undefined) {
      const trimmed = typeof title === 'string' ? title.trim() : '';
      if (!trimmed || !/[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(trimmed)) {
        return res.status(400).json({
          success: false,
          message: 'Valid meeting title containing letters or numbers is required',
        });
      }
      meeting.title = trimmed;
    }
    if (description !== undefined) {
      meeting.description =
        typeof description === 'string' && /[a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF]/.test(description)
          ? description.trim()
          : '';
    }
    if (scheduledAt) meeting.scheduledAt = scheduledAt;
    if (duration) meeting.duration = duration;
    if (status) meeting.status = status;
    if (transcript && Array.isArray(transcript)) meeting.transcript = transcript;

    await meeting.save();

    res.status(200).json({
      success: true,
      meeting,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private
const deleteMeeting = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Invalid meeting ID' });
    }

    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    if (meeting.host.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this meeting',
      });
    }

    await Meeting.findByIdAndDelete(req.params.id);
    await ActionItem.deleteMany({ meeting: req.params.id });

    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMeetings,
  getMeetingById,
  createMeeting,
  joinMeeting,
  endMeeting,
  updateMeeting,
  deleteMeeting,
};
