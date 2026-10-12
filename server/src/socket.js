// server/src/socket.js
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket ${socket.id} connected`);

    // Track rooms this socket has left to avoid duplicate notifications
    const roomsLeft = new Set();

    // Store user info per socket for participant lists
    socket.userInfo = {};

    // --------------------------------------------------------------
    // Join a meeting room (client emits 'join-meeting')
    // --------------------------------------------------------------
    socket.on('join-meeting', ({ meetingCode, userId, userName }) => {
      const meetingId = meetingCode; // already normalized by client

      // Save user info for later use
      socket.userInfo = { userId, userName, meetingId };

      // Re‑join handling: clear any previous leave flag for this room
      if (roomsLeft.has(meetingId)) {
        roomsLeft.delete(meetingId);
      }

      socket.join(meetingId);

      // Notify existing participants about the newcomer
      socket.to(meetingId).emit('user-joined', {
        socketId: socket.id,
        userId,
        userName,
      });

      // Build list of existing participants (excluding self)
      const existing = Array.from(io.sockets.adapter.rooms.get(meetingId) || [])
        .filter((id) => id !== socket.id)
        .map((id) => {
          const s = io.sockets.sockets.get(id);
          const info = s?.userInfo || {};
          return {
            socketId: id,
            userId: info.userId || null,
            userName: info.userName || null,
          };
        });

      // Send the newcomer the list of participants
      socket.emit('existing-participants', { participants: existing });
    });

    // --------------------------------------------------------------
    // Signalling – forward WebRTC messages
    // --------------------------------------------------------------
    socket.on('offer', ({ target, sdp, caller }) => {
      socket.to(target).emit('offer', {
        socketId: socket.id,
        offer: sdp,
        caller,
      });
    });

    socket.on('answer', ({ target, sdp }) => {
      socket.to(target).emit('answer', {
        socketId: socket.id,
        answer: sdp,
      });
    });

    socket.on('ice-candidate', ({ target, candidate }) => {
      socket.to(target).emit('ice-candidate', {
        socketId: socket.id,
        candidate,
      });
    });

    // --------------------------------------------------------------
    // Explicit leave – idempotent broadcast of user-left per room
    // --------------------------------------------------------------
    socket.on('leave-meeting', () => {
      const meetingId = socket.userInfo.meetingId;
      if (!meetingId) return;
      if (roomsLeft.has(meetingId)) return;
      roomsLeft.add(meetingId);
      socket.leave(meetingId);
      socket.to(meetingId).emit('user-left', { socketId: socket.id });
    });

    // --------------------------------------------------------------
    // Unexpected disconnect – ensure a single user-left per room
    // --------------------------------------------------------------
    socket.on('disconnect', () => {
      socket.rooms.forEach((room) => {
        if (room === socket.id) return; // ignore private room
        if (roomsLeft.has(room)) return;
        roomsLeft.add(room);
        socket.to(room).emit('user-left', { socketId: socket.id });
      });
    });
  });
};
