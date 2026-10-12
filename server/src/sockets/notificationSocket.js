/**
 * Real-time Notification Socket Handler
 */

const notificationSockets = (io, socket) => {
  // User subscribes to their personal notification channel
  socket.on('subscribe-notifications', ({ userId }) => {
    socket.join(`user-notif-${userId}`);
  });

  socket.on('send-notification', ({ userId, notification }) => {
    io.to(`user-notif-${userId}`).emit('new-notification', notification);
  });
};

module.exports = notificationSockets;
