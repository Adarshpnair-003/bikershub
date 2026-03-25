const Joi = require("joi");

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "production", "test").default("development"),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  MONGO_URI: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRY: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRY: Joi.string().default("7d"),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().uri().optional(),
  GEOCODER_USER_AGENT: Joi.string().default("BikersHub/1.0 (server geocoder)"),
  ALLOWED_ORIGINS: Joi.string().default("http://localhost:3000"),
  LOG_LEVEL: Joi.string().valid("trace", "debug", "info", "warn", "error").default("info"),
  WEATHER_API_KEY: Joi.string().optional(),
  ORS_API_KEY: Joi.string().optional(),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().default(900000),
  RATE_LIMIT_MAX: Joi.number().integer().default(100),
}).unknown(true); // allow other env vars (e.g., PATH, HOME)

const { error, value: env } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  const missing = error.details.map((d) => d.message).join("\n  ");
  console.error(`[env] Invalid environment variables:\n  ${missing}`);
  process.exit(1);
}

module.exports = env;
