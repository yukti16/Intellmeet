const Message = require('../models/Message');

// @desc    Get messages for a meeting
// @route   GET /api/meetings/:id/messages
// @access  Private
const getMeetingMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ meeting: req.params.id, deleted: { $ne: true } })
      .populate('sender', 'name email avatar jobTitle')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post message to a meeting
// @route   POST /api/meetings/:id/messages
// @access  Private
const createMessage = async (req, res, next) => {
  try {
    const { content, type } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required',
      });
    }

    const message = await Message.create({
      meeting: req.params.id,
      sender: req.user._id,
      content,
      type: type || 'text',
    });

    const populated = await Message.findById(message._id).populate('sender', 'name email avatar jobTitle');

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update/edit message
// @route   PUT /api/meetings/:id/messages/:messageId
// @access  Private
const updateMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this message',
      });
    }

    message.content = content || message.content;
    message.edited = true;
    await message.save();

    const populated = await Message.findById(message._id).populate('sender', 'name email avatar jobTitle');

    res.status(200).json({
      success: true,
      message: populated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete message
// @route   DELETE /api/meetings/:id/messages/:messageId
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.sender.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message',
      });
    }

    message.deleted = true;
    message.content = 'This message was deleted.';
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMeetingMessages,
  createMessage,
  updateMessage,
  deleteMessage,
};
