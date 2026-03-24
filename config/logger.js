const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: env.LOG_LEVEL || "info",
  ...(env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: { colorize: true, ignore: "pid,hostname" }
    }
  })
});

module.exports = logger;
