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

async function myEquipment(req, res) {
  try {
    const user = req.session.user;

    if (!user) {
      return res.redirect(
        "/auth/login?error=Please+login+first."
      );
    }

    const equipment = await Equipment.find({
      owner: user._id
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.render(
      "equipment/mine",
      {
        title: "My Equipment",
        currentUser: user,
        equipment,
        success: req.query.success || null,
        error: req.query.error || null
      }
    );

  } catch (error) {
    console.error(
      "MY EQUIPMENT ERROR:",
      error
    );

    return res.status(500).render(
      "errors/500",
      {
        title: "My Equipment Error",
        message:
          "Unable to load your equipment."
      }
    );
  }
}

module.exports = {
  healthCheck
};