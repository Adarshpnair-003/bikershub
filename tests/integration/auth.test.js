// Must be first — before any app imports
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-minimum-32-chars!!";
process.env.JWT_REFRESH_SECRET = "refresh-secret-key-min-32-chars!!";
process.env.MONGO_URI = "mongodb://placeholder:27017/test";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.LOG_LEVEL = "error";

const request = require("supertest");
const express = require("express");

// Build routes without rate limiters to avoid 429s during testing.
// We wire the same controllers and validators as the real authRoutes.js,
// just without the authLimiter middleware.
const authController = require("../../controllers/authController");
const validate = require("../../middleware/validate");
const { registerSchema, loginSchema, refreshSchema, logoutSchema } = require("../../validators/authValidator");
const { protect } = require("../../middleware/auth");

const errorHandler = require("../../middleware/errorHandler");
const { createUser, defaultPassword } = require("../fixtures/users");
const authService = require("../../services/authService");

// Build a minimal test app — avoids importing server.js (which connects to real DB / starts server)
// Note: express-mongo-sanitize is incompatible with Express 5.x (req.query is a getter-only),
// so it is intentionally omitted from the test app.
// Rate limiters are also excluded so tests don't hit 429 from test traffic.
function buildApp() {
  const app = express();
  app.use(express.json());

  // Auth routes without rate limiter
  app.post("/api/auth/register", validate(registerSchema), authController.register);
  app.post("/api/auth/login", validate(loginSchema), authController.login);
  app.post("/api/auth/refresh", validate(refreshSchema), authController.refreshToken);
  app.post("/api/auth/logout", protect, validate(logoutSchema), authController.logout);

  app.use(errorHandler);
  return app;
}

const app = buildApp();

// ─── POST /api/auth/register ────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("201 with valid username, email, password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "newrider",
        email: "newrider@example.com",
        password: "SecurePass123!"
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("userId");
  });

  it("400 if email already registered", async () => {
    // Register once
    await request(app)
      .post("/api/auth/register")
      .send({
        username: "firstrider",
        email: "dup@example.com",
        password: "SecurePass123!"
      });

    // Register again with the same email
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "secondrider",
        email: "dup@example.com",
        password: "SecurePass123!"
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("400 if username missing (no name either)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        email: "noname@example.com",
        password: "SecurePass123!"
      });

    // Joi schema requires username OR name — missing both triggers 400
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 if password too short (min 6 chars per validator)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: "shortrider",
        email: "short@example.com",
        password: "12345" // only 5 chars, validator requires min 6
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST /api/auth/login ───────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await createUser({ email: "logintest@example.com" });
  });

  it("200 with token and refreshToken on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "logintest@example.com",
        password: defaultPassword
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("refreshToken");
    expect(res.body.data).toHaveProperty("user");
    expect(res.body.data.user.email).toBe("logintest@example.com");
  });

  it("401 with same message for wrong email and wrong password", async () => {
    const wrongEmailRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: defaultPassword });

    const wrongPasswordRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "logintest@example.com", password: "WrongPass!" });

    expect(wrongEmailRes.status).toBe(401);
    expect(wrongPasswordRes.status).toBe(401);
    // Error message must be identical — prevents user enumeration
    expect(wrongEmailRes.body.error.message).toBe(wrongPasswordRes.body.error.message);
    expect(wrongEmailRes.body.error.code).toBe(wrongPasswordRes.body.error.code);
  });

  it("400 if email field missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: defaultPassword }); // no email

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST /api/auth/refresh ─────────────────────────────────────────────────

describe("POST /api/auth/refresh", () => {
  let refreshToken;

  beforeEach(async () => {
    const user = await createUser({ email: "refreshtest@example.com" });
    const result = await authService.login({
      email: "refreshtest@example.com",
      password: defaultPassword
    });
    refreshToken = result.refreshToken;
  });

  it("200 with new token pair for valid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data).toHaveProperty("refreshToken");
    // New refresh token should be different from old one
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it("401 for invalid refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken: "totally-invalid-token-that-does-not-exist" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("400 if refreshToken field is missing", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({}); // missing refreshToken

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

// ─── POST /api/auth/logout ──────────────────────────────────────────────────

describe("POST /api/auth/logout", () => {
  let accessToken;
  let refreshToken;

  beforeEach(async () => {
    await createUser({ email: "logouttest@example.com" });
    const result = await authService.login({
      email: "logouttest@example.com",
      password: defaultPassword
    });
    accessToken = result.token;
    refreshToken = result.refreshToken;
  });

  it("200 with valid auth token and refreshToken in body", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("401 without auth token", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken }); // no Authorization header

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 if refreshToken is missing from body", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({}); // no refreshToken in body

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
