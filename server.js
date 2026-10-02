const app = require('./app');
const connectDB = require('./config/db');
const { isValidMongoUri } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  const uri = process.env.MONGODB_URI;

  if (isValidMongoUri(uri)) {
    try {
      await connectDB();
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.error('[DB WARNING] Database connection error at startup:', err.message);
    }
  } else {
    console.warn('[SERVER NOTE] Running with in-memory session mode. Set MONGODB_URI in your .env file to persist data.');
  }

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Campus Equipment Lending Exchange Server is Running`);
    console.log(`Server running at:       http://localhost:${PORT}`);
    console.log(`Smart Search:            http://localhost:${PORT}/search`);
    console.log(`AI Hardware Assistant:   http://localhost:${PORT}/chatbot`);
    console.log(`====================================================`);
  });
}

startServer();
