let mongoose;
try {
  mongoose = require('mongoose');
  // Disable 10-second command buffering so queries fail-fast or use graceful fallbacks
  // instead of hanging the entire server when MongoDB is offline or disconnected
  mongoose.set('bufferCommands', false);
  mongoose.set('bufferTimeoutMS', 2500);
} catch (e) {
  mongoose = null;
}

let cached = global.mongooseConnection;
if (!cached) {
  cached = global.mongooseConnection = { conn: null, promise: null };
}

function isDbConnected() {
  return Boolean(mongoose && mongoose.connection && mongoose.connection.readyState === 1);
}

/**
 * Sanitize MongoDB URI, automatically URL-encoding special characters like '#' in passwords
 * This prevents URI parsing crashes when passwords contain '#' or other symbols
 */
function sanitizeMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  let clean = uri.trim().replace(/^["']|["']$/g, '');
  
  const match = clean.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
  if (match) {
    const protocol = match[1];
    const username = match[2];
    let password = match[3];
    const rest = match[4];

    // If password contains raw '#' or special characters that break URI parsing
    if (password.includes('#') && !password.includes('%23')) {
      password = password.replace(/#/g, '%23');
    }
    clean = protocol + username + ':' + password + '@' + rest;
  }
  return clean;
}

function isValidMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = sanitizeMongoUri(uri);
  if (trimmed.includes('<username>') || trimmed.includes('<password>') || trimmed.includes('<db_password>')) {
    return false;
  }
  return trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://');
}

async function connectDB() {
  if (!mongoose) {
    console.warn('[DB WARNING] Mongoose package is not installed.');
    return null;
  }

  let uri = sanitizeMongoUri(process.env.MONGODB_URI);

  if (!uri || !isValidMongoUri(uri)) {
    console.warn('[DB WARNING] MONGODB_URI is not set or contains an unconfigured placeholder/invalid scheme.');
    console.warn('[DB TIP] For local MongoDB, set: MONGODB_URI=mongodb://127.0.0.1:27017/campus_lending');
    console.warn('[DB TIP] For MongoDB Atlas, replace <username> and <password> with your actual database credentials.');
    return null;
  }

  // If already connected with an active ready state, reuse connection (Serverless caching)
  if (cached.conn && isDbConnected()) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log('[DB] MongoDB Connected Successfully');
      return m;
    }).catch((err) => {
      console.error('[DB ERROR] MongoDB Connection Failed:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;
module.exports.isValidMongoUri = isValidMongoUri;
module.exports.isDbConnected = isDbConnected;
module.exports.sanitizeMongoUri = sanitizeMongoUri;