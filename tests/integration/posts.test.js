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

// Mock cloudinary before any service imports it
jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: "http://test.com/img.jpg",
        public_id: "test123",
        resource_type: "image"
      }),
      destroy: jest.fn().mockResolvedValue({ result: "ok" })
    }
  }
}));

const request = require("supertest");
const express = require("express");

const postRoutes = require("../../routes/postRoutes");
const errorHandler = require("../../middleware/errorHandler");
const { createUser, defaultPassword } = require("../fixtures/users");
const { createPost, createPosts } = require("../fixtures/posts");
const authService = require("../../services/authService");

// Build a minimal test app — avoids importing server.js (which connects to real DB / starts server)
// Note: express-mongo-sanitize is incompatible with Express 5.x (req.query is a getter-only),
// so it is intentionally omitted from the test app.
function buildApp() {
  const app = express();
  app.use(express.json());

  // Inject a null io so controllers don't fail when calling req.io
  app.use((req, res, next) => {
    req.io = null;
    next();
  });

  app.use("/api/posts", postRoutes);
  app.use(errorHandler);
  return app;
}

const app = buildApp();

/**
 * Get an access token for a user by calling authService directly.
 */
async function loginUser(email) {
  const result = await authService.login({ email, password: defaultPassword });
  return result.token;
}

// ─── GET /api/posts ─────────────────────────────────────────────────────────

describe("GET /api/posts", () => {
  it("200 with paginated posts array", async () => {
    const user = await createUser();
    await createPosts(user._id, 3);

    const res = await request(app).get("/api/posts");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination.total).toBe(3);
  });

  it("returns empty array when no posts", async () => {
    const res = await request(app).get("/api/posts");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("supports page and limit query params", async () => {
    const user = await createUser();
    await createPosts(user._id, 5);

    const res = await request(app).get("/api/posts?page=1&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    // Query params come in as strings; the service passes them through, so limit may be "2" or 2
    expect(Number(res.body.pagination.limit)).toBe(2);
    expect(res.body.pagination.total).toBe(5);
  });
});

// ─── POST /api/posts ────────────────────────────────────────────────────────

describe("POST /api/posts", () => {
  let token;

  beforeEach(async () => {
    const user = await createUser({ email: "postauthor@example.com" });
    token = await loginUser("postauthor@example.com");
  });

  it("201 creates post with content (no media)", async () => {
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ content: "My test ride post" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("content", "My test ride post");
    expect(res.body.data).toHaveProperty("author");
  });

  it("401 without auth token", async () => {
    const res = await request(app)
      .post("/api/posts")
      .send({ content: "Unauthorized post" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 if neither content nor files provided (Post model requires content)", async () => {
    // The Post model requires content — Mongoose validation error -> errorHandler returns 400
    const res = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({}); // no content, no files

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/posts/feed ────────────────────────────────────────────────────

describe("GET /api/posts/feed", () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await createUser({ email: "feeduser@example.com" });
    token = await loginUser("feeduser@example.com");
  });

  it("200 returns posts from followed users (includes own posts)", async () => {
    // Create posts by the user themselves (own posts appear in feed)
    await createPosts(user._id, 2);

    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("pagination");
    // Own posts should appear in feed
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("200 returns empty feed when user has no posts and follows nobody", async () => {
    const res = await request(app)
      .get("/api/posts/feed")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("401 without auth", async () => {
    const res = await request(app).get("/api/posts/feed");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/posts/:id ─────────────────────────────────────────────────────

describe("GET /api/posts/:id", () => {
  it("200 returns single post", async () => {
    const user = await createUser();
    const post = await createPost(user._id, { content: "Single post content" });

    const res = await request(app).get(`/api/posts/${post._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(post._id.toString());
    expect(res.body.data.content).toBe("Single post content");
  });

  it("404 for non-existent post id", async () => {
    const fakeId = "507f1f77bcf86cd799439011"; // valid ObjectId format, not in DB

    const res = await request(app).get(`/api/posts/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("400 for malformed post id", async () => {
    const res = await request(app).get("/api/posts/not-a-valid-id");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /api/posts/like/:id ────────────────────────────────────────────────
// Note: route is PUT /like/:id (not /:id/like) — see postRoutes.js

describe("PUT /api/posts/like/:id (toggle like)", () => {
  let token;
  let user;
  let post;

  beforeEach(async () => {
    user = await createUser({ email: "liker@example.com" });
    token = await loginUser("liker@example.com");
    post = await createPost(user._id, { content: "Likeable post" });
  });

  it("200 toggles like on", async () => {
    const res = await request(app)
      .put(`/api/posts/like/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("liked", true);
    expect(res.body.data.likesCount).toBe(1);
  });

  it("200 toggles like off (unlike)", async () => {
    // Like first
    await request(app)
      .put(`/api/posts/like/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    // Unlike
    const res = await request(app)
      .put(`/api/posts/like/${post._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("liked", false);
    expect(res.body.data.likesCount).toBe(0);
  });

  it("401 without auth", async () => {
    const res = await request(app).put(`/api/posts/like/${post._id}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── DELETE /api/posts/:id ──────────────────────────────────────────────────

describe("DELETE /api/posts/:id", () => {
  let ownerToken;
  let otherToken;
  let owner;
  let otherUser;
  let post;

  beforeEach(async () => {
    owner = await createUser({ email: "postowner@example.com" });
    otherUser = await createUser({ email: "notowner@example.com" });
    ownerToken = await loginUser("postowner@example.com");
    otherToken = await loginUser("notowner@example.com");
    post = await createPost(owner._id, { content: "Owner's post" });
  });

  it("200 deletes own post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm it's gone
    const checkRes = await request(app).get(`/api/posts/${post._id}`);
    expect(checkRes.status).toBe(404);
  });

  it("403 deleting another user's post", async () => {
    const res = await request(app)
      .delete(`/api/posts/${post._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("401 without auth", async () => {
    const res = await request(app).delete(`/api/posts/${post._id}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("404 for non-existent post", async () => {
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .delete(`/api/posts/${fakeId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
