require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const morgan = require("morgan");

const connectDB = require("./config/db");
const homeRoutes = require("./routes/homeRoutes");
const healthRoutes = require("./routes/healthRoutes");

const {
  notFoundHandler,
  errorHandler
} = require("./middleware/errorMiddleware");

const app = express();

const PORT = process.env.PORT || 3000;

// --------------------------------------------------
// VIEW ENGINE
// --------------------------------------------------

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// --------------------------------------------------
// SECURITY
// --------------------------------------------------

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

// --------------------------------------------------
// LOGGING
// --------------------------------------------------

app.use(
  morgan(
    process.env.NODE_ENV === "production"
      ? "combined"
      : "dev"
  )
);

// --------------------------------------------------
// BODY PARSERS
// --------------------------------------------------

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb"
  })
);

// --------------------------------------------------
// STATIC FILES
// --------------------------------------------------

app.use(
  express.static(
    path.join(__dirname, "public"),
    {
      maxAge:
        process.env.NODE_ENV === "production"
          ? "1d"
          : 0
    }
  )
);

// --------------------------------------------------
// ROUTES
// --------------------------------------------------

app.use("/", homeRoutes);

app.use("/health", healthRoutes);

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use(notFoundHandler);

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use(errorHandler);

// --------------------------------------------------
// LOCAL DEVELOPMENT
// --------------------------------------------------

async function startLocalServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing. Create a .env file before starting the server."
      );
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Server running at http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
}

// Vercel imports this file instead of starting app.listen().
if (
  require.main === module &&
  process.env.VERCEL !== "1"
) {
  startLocalServer();
}

module.exports = app;