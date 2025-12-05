const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { initializeSocketServer } = require('./socket/socketServer');
const { connectDB, getConnectionStatus } = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time chat
const io = initializeSocketServer(server);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/events', require('./routes/event.routes'));
app.use('/api/map', require('./routes/map.routes'));
app.use('/api/gamification', require('./routes/gamification.routes'));
app.use('/api/clubs', require('./routes/club.routes'));
app.use('/api/quests', require('./routes/quest.routes'));

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = getConnectionStatus();
  res.json({ 
    status: 'ok', 
    message: 'NUST Campus API is running!',
    database: dbStatus
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 NUST Campus Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready for real-time connections`);
});

module.exports = { app, server, io };
