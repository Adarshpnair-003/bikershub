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

const authService = require("../../services/authService");
const RefreshToken = require("../../models/RefreshToken");
const User = require("../../models/User");
const { createUser, defaultPassword } = require("../fixtures/users");

describe("authService", () => {
  // ─── register ──────────────────────────────────────────────────────────────

  describe("register", () => {
    it("creates a new user and returns userId", async () => {
      const result = await authService.register({
        username: "newrider",
        email: "newrider@example.com",
        password: "SecurePass123!"
      });

      expect(result).toHaveProperty("userId");
      expect(result.userId).toBeTruthy();

      const userInDb = await User.findById(result.userId).lean();
      expect(userInDb).not.toBeNull();
      expect(userInDb.email).toBe("newrider@example.com");
      expect(userInDb.username).toBe("newrider");
    });

    it("throws DUPLICATE_EMAIL if email already exists", async () => {
      await authService.register({
        username: "firstrider",
        email: "duplicate@example.com",
        password: "SecurePass123!"
      });

      await expect(
        authService.register({
          username: "secondrider",
          email: "duplicate@example.com",
          password: "AnotherPass123!"
        })
      ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL", statusCode: 400 });
    });

    it("throws error if username is missing (uses name fallback; empty string fails schema)", async () => {
      // Both username and name are empty — normalizedUsername will be ""
      // User model requires username (minlength: 3), so Mongoose validation fires
      await expect(
        authService.register({
          email: "noname@example.com",
          password: "SecurePass123!"
          // no username, no name
        })
      ).rejects.toThrow();
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    let registeredUser;

    beforeEach(async () => {
      registeredUser = await createUser({ email: "login_test@example.com" });
    });

    it("returns token and refreshToken on valid credentials", async () => {
      const result = await authService.login({
        email: "login_test@example.com",
        password: defaultPassword
      });

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("refreshToken");
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result).toHaveProperty("user");
      expect(result.user.email).toBe("login_test@example.com");
    });

    it("throws INVALID_CREDENTIALS if email not found", async () => {
      await expect(
        authService.login({
          email: "nobody@example.com",
          password: defaultPassword
        })
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", statusCode: 401 });
    });

    it("throws INVALID_CREDENTIALS if password wrong", async () => {
      await expect(
        authService.login({
          email: "login_test@example.com",
          password: "WrongPassword!"
        })
      ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", statusCode: 401 });
    });

    it("uses same error message for not-found and wrong-password (no enumeration)", async () => {
      let notFoundError;
      let wrongPasswordError;

      try {
        await authService.login({ email: "ghost@example.com", password: "any" });
      } catch (err) {
        notFoundError = err;
      }

      try {
        await authService.login({ email: "login_test@example.com", password: "wrong" });
      } catch (err) {
        wrongPasswordError = err;
      }

      expect(notFoundError).toBeDefined();
      expect(wrongPasswordError).toBeDefined();
      // Both errors must expose the exact same message to prevent user enumeration
      expect(notFoundError.message).toBe(wrongPasswordError.message);
      expect(notFoundError.code).toBe(wrongPasswordError.code);
    });
  });

  // ─── refreshToken ──────────────────────────────────────────────────────────

  describe("refreshToken", () => {
    let rawRefreshToken;
    let loginUser;

    beforeEach(async () => {
      loginUser = await createUser({ email: "refresh_test@example.com" });
      const result = await authService.login({
        email: "refresh_test@example.com",
        password: defaultPassword
      });
      rawRefreshToken = result.refreshToken;
    });

    it("returns new token pair for valid refresh token", async () => {
      const result = await authService.refreshToken(rawRefreshToken);

      expect(result).toHaveProperty("token");
      expect(result).toHaveProperty("refreshToken");
      expect(result.token).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      // New refresh token must differ from old one
      expect(result.refreshToken).not.toBe(rawRefreshToken);
    });

    it("throws INVALID_TOKEN if token not found in DB", async () => {
      const fakeToken = "a".repeat(80); // 80-char hex-like string, not in DB

      await expect(
        authService.refreshToken(fakeToken)
      ).rejects.toMatchObject({ code: "INVALID_TOKEN", statusCode: 401 });
    });

    it("throws TOKEN_EXPIRED if refresh token is expired", async () => {
      const crypto = require("crypto");

      // Manually create an expired refresh token record
      const rawExpired = crypto.randomBytes(40).toString("hex");
      const hash = crypto.createHash("sha256").update(rawExpired).digest("hex");
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      await RefreshToken.create({
        token: hash,
        userId: loginUser._id,
        family: crypto.randomUUID(),
        expiresAt: pastDate,
        revoked: false
      });

      await expect(
        authService.refreshToken(rawExpired)
      ).rejects.toMatchObject({ code: "TOKEN_EXPIRED", statusCode: 401 });
    });

    it("revokes entire family on reuse detection", async () => {
      // Use the token once to get a new pair
      const secondPair = await authService.refreshToken(rawRefreshToken);

      // Now attempt to use the ORIGINAL (now revoked) token — should trigger reuse detection
      await expect(
        authService.refreshToken(rawRefreshToken)
      ).rejects.toMatchObject({ code: "TOKEN_REUSE", statusCode: 401 });

      // The new token from secondPair should also be revoked (same family) — reuse detection fires again
      await expect(
        authService.refreshToken(secondPair.refreshToken)
      ).rejects.toMatchObject({ code: "TOKEN_REUSE", statusCode: 401 });
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe("logout", () => {
    let rawRefreshToken;
    let loggedInUser;

    beforeEach(async () => {
      loggedInUser = await createUser({ email: "logout_test@example.com" });
      const result = await authService.login({
        email: "logout_test@example.com",
        password: defaultPassword
      });
      rawRefreshToken = result.refreshToken;
    });

    it("revokes the refresh token", async () => {
      await authService.logout(rawRefreshToken, loggedInUser._id);

      // Attempting to use revoked token should fail (INVALID_TOKEN since revoked=true)
      await expect(
        authService.refreshToken(rawRefreshToken)
      ).rejects.toMatchObject({ code: "TOKEN_REUSE", statusCode: 401 });
    });

    it("does not throw if token not found (idempotent)", async () => {
      const fakeToken = "b".repeat(80); // Not in DB

      await expect(
        authService.logout(fakeToken, loggedInUser._id)
      ).resolves.not.toThrow();
    });
  });
});
