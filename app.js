const express = require('express');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');
const { isValidMongoUri, sanitizeMongoUri } = require('./config/db');
const { populateUserLocals, requireAuth } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Route modules
const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const borrowRoutes = require('./routes/borrowRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const equipmentController = require('./controllers/equipmentController');

const app = express();

// Trust proxy for Vercel / reverse proxy edge environments (enables secure cookies and correct protocol detection)
app.set('trust proxy', 1);

// Normalize request URL for Vercel serverless rewrites
// Ensures incoming paths match expected Express routes (/marketplace, /search, etc.)
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-matched-path'] || req.headers['x-forwarded-uri'];
  if (matchedPath && (req.url.startsWith('/api/index') || req.url === '/api')) {
    req.url = matchedPath;
  } else if (req.url === '/api/index' || req.url === '/api/index.js' || req.url === '/api') {
    req.url = '/';
  } else if (req.url.startsWith('/api/index/')) {
    req.url = req.url.replace(/^\/api\/index/, '');
  }
  next();
});

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing with 10MB limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Session setup with MongoStore support when valid MONGODB_URI is provided
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'campus-equipment-lending-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
  }
};

const rawMongoUri = process.env.MONGODB_URI;
if (isValidMongoUri(rawMongoUri)) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: sanitizeMongoUri(rawMongoUri),
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7,
  });
} else {
  console.log('[SESSION] Using in-memory session store for local/development mode.');
}

app.use(session(sessionConfig));

// Ensure DB is connected for incoming requests if valid URI is provided
app.use(async (req, res, next) => {
  try {
    if (isValidMongoUri(process.env.MONGODB_URI)) {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('[DB HOOK ERROR]', err.message);
    next();
  }
});

// Populate view locals & active navigation states
app.use(populateUserLocals);

// Direct API endpoint for asynchronous equipment image uploads
app.post('/api/upload-image', requireAuth, equipmentController.apiUploadImage);

// Mount application routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/equipment', equipmentRoutes);
app.use('/search', equipmentRoutes); // Route alias for Smart Search
app.use('/borrow', borrowRoutes);
app.use('/reviews', reviewRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);
app.use('/chatbot', chatRoutes); // Route alias for AI Hardware Assistant

// Handle 404 & Global errors
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;