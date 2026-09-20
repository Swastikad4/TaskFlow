const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const { initSocketIO } = require('./sockets/socketHandler');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { startReminderScheduler } = require('./services/reminderService');
const { startRecurringScheduler } = require('./services/recurringService');

const path = require('path');

// Route imports
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const tagRoutes = require('./routes/tagRoutes');
const directAttachmentRoutes = require('./routes/directAttachmentRoutes');
const teamRoutes = require('./routes/teamRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Initialize MongoDB connection
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Attach Socket.IO to event handlers
initSocketIO(io);

// Core Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Serve static upload directory
const uploadDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads');
app.use('/uploads', express.static(uploadDir));

// API Health Check & Info
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'TaskFlow API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/attachments', directAttachmentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 and Error Middleware
app.use(notFound);
app.use(errorHandler);

// Start periodic schedulers
startReminderScheduler(10 * 60 * 1000);
startRecurringScheduler(2 * 60 * 1000);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 TaskFlow Backend running on port ${PORT}`);
  console.log(`📡 Socket.IO Real-Time Server initialized`);
  console.log(`⏰ Due-Date Reminder Scheduler active`);
  console.log(`🔄 Recurring Task Engine active`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});
