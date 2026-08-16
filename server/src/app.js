const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const assignmentRoutes = require('./routes/assignments');
const attendanceRoutes = require('./routes/attendance');
const messageRoutes = require('./routes/messages');
const reportRoutes = require('./routes/reports');
const uploadRoutes = require('./routes/uploads');
const teamRoutes = require('./routes/teams');
const settingsRoutes = require('./routes/settings');
const eventsRoutes = require('./routes/events');
const companyRoutes = require('./routes/companies');
const adminRoutes = require('./routes/admins');
const shiftRoutes = require('./routes/shifts');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use('/api/', apiLimiter);

// Serve uploaded files (relaxed CSP for downloads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/companies', authLimiter, companyRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/events', eventsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
