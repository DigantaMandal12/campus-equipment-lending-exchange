const mongoose = require("mongoose");

let cachedConnection = global.__campusMongoConnection;

if (!cachedConnection) {
  cachedConnection = global.__campusMongoConnection = {
    promise: null
  };
}

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI environment variable is not configured."
    );
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection.promise) {
    return cachedConnection.promise;
  }

  cachedConnection.promise = mongoose
    .connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    })
    .then(() => {
      console.log("MongoDB connected successfully.");
      return mongoose.connection;
    })
    .catch((error) => {
      cachedConnection.promise = null;
      console.error(
        "MongoDB connection failed:",
        error.message
      );
      throw error;
    });

  return cachedConnection.promise;
}

module.exports = connectDB;