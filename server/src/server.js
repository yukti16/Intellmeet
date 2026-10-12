const http = require('http');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { Server } = require('socket.io');
const initSockets = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

initSockets(io);

// Start Server and Database Connection
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 INTELLMEET SERVER RUNNING ON PORT ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI Provider: ${process.env.OPENAI_API_KEY ? 'OpenAI GPT' : 'Dev Fallback Engine'}`);
    console.log(`====================================================`);
  });
};

startServer();

// Handle Unhandled Promise Rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});
