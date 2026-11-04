
/**
 * WebRTC Signaling & Meeting State Socket Handler
 */

const meetingSockets = (io, socket) => {
  // User joins a specific meeting room
  socket.on('join-meeting', ({ meetingCode, userId, userName }) => {
    if (!meetingCode) {
      console.error('[Socket] Cannot join meeting: meetingCode is missing');
      return;
    }

    console.log(
      `[Socket] join-meeting from socket ${socket.id} for meeting ${meetingCode} userId=${userId || 'undef'} userName=${userName || 'Guest'}`
    );

    socket.join(meetingCode);
    socket.meetingCode = meetingCode;
    socket.userId = userId;
    socket.userName = userName || 'Guest';

    console.log(
      `[Socket] User '${socket.userName}' (${userId || 'undef'}) joined room: ${meetingCode}`
    );

    // Get other clients already in the room
    const room = io.sockets.adapter.rooms.get(meetingCode);
    const clientsInRoom = Array.from(room || []).filter(
      (id) => id !== socket.id
    );

    // Send existing participants to the new user
    socket.emit('existing-participants', {
      participants: clientsInRoom.map((socketId) => {
        const peerSocket = io.sockets.sockets.get(socketId);

        return {
          socketId,
          userId: peerSocket?.userId,
          userName: peerSocket?.userName || 'Guest',
        };
      }),
    });

    // Notify existing participants
    socket.to(meetingCode).emit('user-joined', {
      socketId: socket.id,
      userId,
      userName: socket.userName,
    });
  });

  // WebRTC Offer
  socket.on('offer', ({ target, caller, offer }) => {
    if (!target || !offer) return;

    io.to(target).emit('offer', {
      caller,
      offer,
      socketId: socket.id,
    });
  });

  // WebRTC Answer
  socket.on('answer', ({ target, caller, answer }) => {
    if (!target || !answer) return;

    io.to(target).emit('answer', {
      caller,
      answer,
      socketId: socket.id,
    });
  });

  // ICE Candidate relay
  socket.on('ice-candidate', ({ target, candidate }) => {
    if (!target || !candidate) return;

    io.to(target).emit('ice-candidate', {
      candidate,
      socketId: socket.id,
    });
  });

  // Media Toggles
  socket.on('toggle-audio', ({ meetingCode, userId, muted }) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-toggled-audio', {
      userId: userId || socket.userId,
      socketId: socket.id,
      muted,
    });
  });

  socket.on('toggle-video', ({ meetingCode, userId, videoOff }) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-toggled-video', {
      userId: userId || socket.userId,
      socketId: socket.id,
      videoOff,
    });
  });

  // Screen Sharing
  socket.on('screen-share-started', ({ meetingCode, userId }) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-screen-share-started', {
      userId: userId || socket.userId,
      socketId: socket.id,
    });
  });

  socket.on('screen-share-stopped', ({ meetingCode, userId }) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-screen-share-stopped', {
      userId: userId || socket.userId,
      socketId: socket.id,
    });
  });

  // Live Transcript Entry Broadcast
  socket.on('transcript-entry', ({ meetingCode, entry }) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode || !entry || !entry.text) return;

    const sanitizedEntry = {
      speaker: String(entry.speaker || socket.userName || 'Participant').trim(),
      text: String(entry.text).trim(),
      timestamp: String(
        entry.timestamp ||
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
      ),
    };

    io.in(roomCode).emit('new-transcript-entry', sanitizedEntry);
  });

  // Host ends the meeting for everyone
  socket.on('end-meeting', ({ meetingCode } = {}) => {
    const roomCode = meetingCode || socket.meetingCode;
    if (!roomCode) return;

    io.in(roomCode).emit('meeting-ended-by-host');
  });

  // Leave room
  socket.on('leave-meeting', () => {
    const roomCode = socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-left', {
      socketId: socket.id,
      userId: socket.userId,
    });

    socket.leave(roomCode);
    socket.meetingCode = null;
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    const roomCode = socket.meetingCode;
    if (!roomCode) return;

    socket.to(roomCode).emit('user-left', {
      socketId: socket.id,
      userId: socket.userId,
    });

    socket.meetingCode = null;
  });
};

module.exports = meetingSockets;
