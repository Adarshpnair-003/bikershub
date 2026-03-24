// Set required environment variables BEFORE any app module is imported.
// config/env.js validates these on first require — they must be present early.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-32-chars-minimum-length!!";
process.env.JWT_REFRESH_SECRET = "refresh-test-secret-32-chars-min!!";
process.env.MONGO_URI = "mongodb://placeholder:27017/placeholder"; // overridden by in-memory server
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.LOG_LEVEL = "error"; // lowest verbosity allowed by config/env.js Joi schema

const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongod;

// Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

// Clean all collections between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Disconnect and stop after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
