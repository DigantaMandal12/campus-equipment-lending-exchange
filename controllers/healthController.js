const mongoose = require("mongoose");
const connectDB = require("../config/db");

async function healthCheck(req, res) {
  let databaseStatus = "not_configured";

  if (process.env.MONGODB_URI) {
    try {
      await connectDB();

      databaseStatus =
        mongoose.connection.readyState === 1
          ? "connected"
          : "disconnected";
    } catch (error) {
      return res.status(503).json({
        success: false,
        message: "Server is running but database connection failed.",
        database: "error"
      });
    }
  }

  return res.status(200).json({
    success: true,
    message: "Server is running",
    database: databaseStatus,
    environment:
      process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  healthCheck
};