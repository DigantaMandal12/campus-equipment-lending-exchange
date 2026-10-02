const app = require('../app');
const connectDB = require('../config/db');

// Serverless function handler for Vercel
module.exports = async (req, res) => {
  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (err) {
      console.error('[VERCEL DB ERROR] Connection failed on request:', err.message);
    }
  }
  return app(req, res);
};
module.exports = app;