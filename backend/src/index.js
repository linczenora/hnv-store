require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const folderRoutes = require('./routes/folders');
const userRoutes = require('./routes/users');
const activityRoutes = require('./routes/activity');
const statsRoutes    = require('./routes/stats');
const analyzeRoutes  = require('./routes/analyze');
const catalogRoutes  = require('./routes/catalogs');
const searchRoutes   = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── CORS: phải đứng trước mọi route, xử lý cả preflight OPTIONS ──
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map(s => s.trim());

const corsOptions = {
  origin: (origin, cb) => {
    // Cho phép requests không có origin (Postman, curl) và origins đã đăng ký
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
// Trả lời ngay preflight OPTIONS cho mọi route
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files — thêm CORS header để frontend fetch được
app.use('/files', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  next();
}, express.static(path.resolve(uploadDir)));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/stats',    statsRoutes);
app.use('/api/analyze',  analyzeRoutes);
app.use('/api/catalogs', catalogRoutes);
app.use('/api/search',  searchRoutes);

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`DocVault API running on http://localhost:${PORT}`);
});
