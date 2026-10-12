const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const actionItemRoutes = require('./routes/actionItemRoutes');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles/scripts for Dev UI
}));

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Dev flexible fallback
    }
  },
  credentials: true,
}));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Root Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IntellMeet API Server is healthy and operational',
    timestamp: new Date().toISOString(),
    aiProvider: process.env.OPENAI_API_KEY ? 'OpenAI' : 'Dev Fallback Engine',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/action-items', actionItemRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
