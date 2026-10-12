const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const ActionItem = require('../models/ActionItem');
const Notification = require('../models/Notification');
const { generateMeetingCode } = require('../utils/generateCode');
const { generateMeetingSummary, extractKeyPoints, extractActionItems } = require('../services/aiService');

// @desc    Get meetings list with search/filter
// @route   GET /api/meetings
// @access  Private
const getMeetings = async (req, res, next) => {
  try {
    const { status, workspace, search } = req.query;
    let query = {
      $or: [{ host: req.user._id }, { participants: req.user._id }],
    };

    if (status) {
      query.status = status;
    }
    if (workspace && mongoose.Types.ObjectId.isValid(workspace)) {
      query.workspace = workspace;
    }
    if (search) {
      query.$and = [
        { $or: [{ host: req.user._id }, { participants: req.user._id }] },
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { meetingCode: { $regex: search, $options: 'i' } },
          ],
        },
      ];
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

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title is required',
      });
    }

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

    const meeting = await Meeting.create({
      title,
      description: description || '',
      host: req.user._id,
      workspace: workspace && mongoose.Types.ObjectId.isValid(workspace) ? workspace : null,
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
    if (transcript && Array.isArray(transcript)) {
      meeting.transcript = transcript;
    }

    // Combine transcript text for AI processing
    const transcriptText = meeting.transcript
      .map(t => `${t.speaker}: ${t.text}`)
      .join('\n');

    // Run AI analysis
    const aiSummary = await generateMeetingSummary(transcriptText);
    const keyPoints = await extractKeyPoints(transcriptText);
    const rawActionItems = await extractActionItems(transcriptText);

    meeting.summary = aiSummary;
    meeting.keyPoints = keyPoints;

    // Create ActionItem documents
    const parseDueDate = (dueDateStr) => {
      if (!dueDateStr || dueDateStr === 'TBD') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const cleaned = String(dueDateStr).replace(/^(?:by|on|before|due)\s+/i, '').trim();
      const parsed = Date.parse(cleaned);
      return isNaN(parsed) ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : new Date(parsed);
    };

    const createdActionItemIds = [];
    for (const item of rawActionItems) {
      const actionDoc = await ActionItem.create({
        meeting: meeting._id,
        title: item.title,
        description: item.description || '',
        assignedTo: req.user._id, // default to host/user
        priority: item.priority || 'Medium',
        dueDate: parseDueDate(item.dueDate),
        status: item.status || 'Pending',
      });
      createdActionItemIds.push(actionDoc._id);
    }

    meeting.actionItems = createdActionItemIds;
    await meeting.save();

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
      meeting,
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

    if (title) meeting.title = title;
    if (description !== undefined) meeting.description = description;
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
