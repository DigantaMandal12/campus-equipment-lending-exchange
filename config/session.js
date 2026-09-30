const session = require("express-session");
const { MongoStore } = require("connect-mongo");

function createSessionMiddleware() {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET is missing. Add SESSION_SECRET to your .env file."
    );
  }

  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Add MONGODB_URI to your .env file."
    );
  }

  const isProduction =
    process.env.NODE_ENV === "production";

  return session({
    secret: process.env.SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60
    }),

    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  });
}

module.exports = createSessionMiddleware;