const mongoose = require("mongoose");
require("./env"); // ensure env validation runs first

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

async function connectDB(attempt = 1) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[db] MongoDB connected");
  } catch (err) {
    console.error(`[db] Connection attempt ${attempt} failed: ${err.message}`);
    if (attempt >= MAX_RETRIES) {
      console.error("[db] Max retries reached. Exiting.");
      process.exit(1);
    }
    console.log(`[db] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    return connectDB(attempt + 1);
  }
}

mongoose.connection.on("error", (err) => {
  console.error("[db] MongoDB error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[db] MongoDB disconnected");
});

module.exports = connectDB;
