const meetingSockets = require('./meetingSocket');
const chatSockets = require('./chatSocket');
const notificationSockets = require('./notificationSocket');

const initSockets = (io) => {
  io.on('connection', (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    meetingSockets(io, socket);
    chatSockets(io, socket);
    notificationSockets(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
};

module.exports = initSockets;
