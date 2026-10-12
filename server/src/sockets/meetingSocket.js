/**
 * WebRTC Signaling & Meeting State Socket Handler
 */

const meetingSockets = (io, socket) => {
  // User joins a specific meeting room
  socket.on('join-meeting', ({ meetingCode, userId, userName }) => {
    socket.join(meetingCode);
    socket.meetingCode = meetingCode;
    socket.userId = userId;
    socket.userName = userName;

    console.log(`[Socket] User '${userName}' (${userId}) joined room: ${meetingCode}`);

    // Get list of all clients in the room
    const room = io.sockets.adapter.rooms.get(meetingCode);
    const clientsInRoom = Array.from(room || []).filter(id => id !== socket.id);

    // Send back list of existing participants to newly joined user
    socket.emit('existing-participants', {
      participants: clientsInRoom.map(socketId => {
        const peerSocket = io.sockets.sockets.get(socketId);
        return {
          socketId,
          userId: peerSocket?.userId,
          userName: peerSocket?.userName,
        };
      }),
    });

    // Notify other room members that a new user joined
    socket.to(meetingCode).emit('user-joined', {
      socketId: socket.id,
      userId,
      userName,
    });
  });

  // WebRTC Offer
  socket.on('offer', ({ target, caller, offer }) => {
    io.to(target).emit('offer', {
      caller,
      offer,
      socketId: socket.id,
    });
  });

  // WebRTC Answer
  socket.on('answer', ({ target, caller, answer }) => {
    io.to(target).emit('answer', {
      caller,
      answer,
      socketId: socket.id,
    });
  });

  // ICE Candidate relay
  socket.on('ice-candidate', ({ target, candidate }) => {
    io.to(target).emit('ice-candidate', {
      candidate,
      socketId: socket.id,
    });
  });

  // Media Toggles
  socket.on('toggle-audio', ({ meetingCode, userId, muted }) => {
    socket.to(meetingCode).emit('user-toggled-audio', {
      userId,
      socketId: socket.id,
      muted,
    });
  });

  socket.on('toggle-video', ({ meetingCode, userId, videoOff }) => {
    socket.to(meetingCode).emit('user-toggled-video', {
      userId,
      socketId: socket.id,
      videoOff,
    });
  });

  // Screen Sharing
  socket.on('screen-share-started', ({ meetingCode, userId }) => {
    socket.to(meetingCode).emit('user-screen-share-started', {
      userId,
      socketId: socket.id,
    });
  });

  socket.on('screen-share-stopped', ({ meetingCode, userId }) => {
    socket.to(meetingCode).emit('user-screen-share-stopped', {
      userId,
      socketId: socket.id,
    });
  });

  // Host End Meeting for All
  socket.on('end-meeting', ({ meetingCode }) => {
    io.in(meetingCode).emit('meeting-ended-by-host');
  });

  // Leave room handling
  socket.on('leave-meeting', () => {
    if (socket.meetingCode) {
      socket.to(socket.meetingCode).emit('user-left', {
        socketId: socket.id,
        userId: socket.userId,
      });
      socket.leave(socket.meetingCode);
      socket.meetingCode = null;
    }
  });

  // Disconnect cleanup
  socket.on('disconnect', () => {
    if (socket.meetingCode) {
      socket.to(socket.meetingCode).emit('user-left', {
        socketId: socket.id,
        userId: socket.userId,
      });
    }
  });
};

module.exports = meetingSockets;
