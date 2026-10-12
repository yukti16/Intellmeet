/**
 * In-Meeting Chat Socket Handler
 */

const Message = require('../models/Message');

const chatSockets = (io, socket) => {
  // Send message event
  socket.on('send-message', async ({ meetingId, meetingCode, content, senderId }) => {
    try {
      if (meetingId && senderId && content) {
        const msg = await Message.create({
          meeting: meetingId,
          sender: senderId,
          content,
        });
        const populated = await Message.findById(msg._id).populate('sender', 'name email avatar jobTitle');

        const targetRoom = meetingCode || meetingId;
        io.in(targetRoom).emit('receive-message', populated);
      }
    } catch (err) {
      console.error('[Chat Socket Error] Failed to persist message:', err.message);
    }
  });

  // Edit message event
  socket.on('edit-message', async ({ meetingCode, messageId, content }) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.content = content;
        message.edited = true;
        await message.save();
        io.in(meetingCode).emit('message-edited', { messageId, content });
      }
    } catch (err) {
      console.error('[Chat Socket Error] Edit message failed:', err.message);
    }
  });

  // Delete message event
  socket.on('delete-message', async ({ meetingCode, messageId }) => {
    try {
      const message = await Message.findById(messageId);
      if (message) {
        message.deleted = true;
        message.content = 'This message was deleted.';
        await message.save();
        io.in(meetingCode).emit('message-deleted', { messageId });
      }
    } catch (err) {
      console.error('[Chat Socket Error] Delete message failed:', err.message);
    }
  });

  // Typing indicators
  socket.on('typing', ({ meetingCode, userName }) => {
    socket.to(meetingCode).emit('user-typing', { userName, socketId: socket.id });
  });

  socket.on('stop-typing', ({ meetingCode, userName }) => {
    socket.to(meetingCode).emit('user-stop-typing', { userName, socketId: socket.id });
  });
};

module.exports = chatSockets;
