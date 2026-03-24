const mongoose = require("mongoose");
const env = require("./env"); // ensure env validation runs first
const logger = require("./logger");

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

async function connectDB(attempt = 1) {
  try {
    await mongoose.connect(env.MONGO_URI);
    logger.info("[db] MongoDB connected");
  } catch (err) {
    logger.error({ attempt, err: err.message }, "[db] Connection failed");
    if (attempt >= MAX_RETRIES) {
      logger.fatal("[db] Max retries reached. Exiting.");
      process.exit(1);
    }
    logger.info({ retryIn: RETRY_DELAY_MS / 1000 }, "[db] Retrying");
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB(attempt + 1);
  }
}

mongoose.connection.on("error", (err) => {
  logger.error({ err: err.message }, "[db] MongoDB error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("[db] MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("[db] MongoDB reconnected");
});

module.exports = connectDB;
