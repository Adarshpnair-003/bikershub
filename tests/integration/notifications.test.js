process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-minimum-32-chars!!";
process.env.JWT_REFRESH_SECRET = "refresh-secret-key-min-32-chars!!";
process.env.MONGO_URI = "mongodb://placeholder/test";
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
const mongoose = require("mongoose");

const errorHandler = require("../../middleware/errorHandler");
const { createUser, defaultPassword } = require("../fixtures/users");
const authService = require("../../services/authService");
const Notification = require("../../models/Notification");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", require("../../routes/index"));
  app.use(errorHandler);
  return app;
}

async function loginToken(user) {
  const result = await authService.login({ email: user.email, password: defaultPassword });
  return result.token;
}

// ─── GET /api/notifications ───────────────────────────────────────────────────

describe("GET /api/notifications", () => {
  let app;
  let user, otherUser, token;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    otherUser = await createUser();
    token = await loginToken(user);
  });

  it("200 returns empty notifications for new user", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(0);
  });

  it("200 returns paginated notifications", async () => {
    // Create 3 notifications for the user
    await Notification.create([
      { recipient: user._id, sender: otherUser._id, type: "follow" },
      { recipient: user._id, sender: otherUser._id, type: "like" },
      { recipient: user._id, sender: otherUser._id, type: "comment" }
    ]);

    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(3);
    expect(res.body.pagination.total).toBe(3);
  });

  it("200 respects limit query parameter", async () => {
    await Notification.create([
      { recipient: user._id, sender: otherUser._id, type: "follow" },
      { recipient: user._id, sender: otherUser._id, type: "like" },
      { recipient: user._id, sender: otherUser._id, type: "comment" }
    ]);

    const res = await request(app)
      .get("/api/notifications?page=1&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
  });

  it("401 without auth", async () => {
    const res = await request(app).get("/api/notifications");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/notifications/unread-count ─────────────────────────────────────

describe("GET /api/notifications/unread-count", () => {
  let app;
  let user, otherUser, token;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    otherUser = await createUser();
    token = await loginToken(user);
  });

  it("200 returns 0 for new user", async () => {
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread).toBe(0);
  });

  it("returns correct unread count", async () => {
    // 2 unread, 1 already read
    await Notification.create([
      { recipient: user._id, sender: otherUser._id, type: "follow", isRead: false },
      { recipient: user._id, sender: otherUser._id, type: "like", isRead: false },
      { recipient: user._id, sender: otherUser._id, type: "comment", isRead: true }
    ]);

    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread).toBe(2);
  });

  it("401 without auth", async () => {
    const res = await request(app).get("/api/notifications/unread-count");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /api/notifications/:id/read ─────────────────────────────────────────

describe("PUT /api/notifications/:id/read", () => {
  let app;
  let user, otherUser, anotherUser, token, anotherToken, notif;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    otherUser = await createUser();
    anotherUser = await createUser();
    token = await loginToken(user);
    anotherToken = await loginToken(anotherUser);

    notif = await Notification.create({
      recipient: user._id,
      sender: otherUser._id,
      type: "follow",
      isRead: false
    });
  });

  it("200 marks notification as read", async () => {
    const res = await request(app)
      .put(`/api/notifications/${notif._id.toString()}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify persisted change
    const updated = await Notification.findById(notif._id);
    expect(updated.isRead).toBe(true);
  });

  it("403 another user cannot mark as read", async () => {
    const res = await request(app)
      .put(`/api/notifications/${notif._id.toString()}/read`)
      .set("Authorization", `Bearer ${anotherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Notification should still be unread
    const unchanged = await Notification.findById(notif._id);
    expect(unchanged.isRead).toBe(false);
  });

  it("404 for non-existent notification", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .put(`/api/notifications/${fakeId}/read`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).put(
      `/api/notifications/${notif._id.toString()}/read`
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /api/notifications/read-all ─────────────────────────────────────────

describe("PUT /api/notifications/read-all", () => {
  let app;
  let user, otherUser, token;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    otherUser = await createUser();
    token = await loginToken(user);
  });

  it("200 marks all notifications as read", async () => {
    await Notification.create([
      { recipient: user._id, sender: otherUser._id, type: "follow", isRead: false },
      { recipient: user._id, sender: otherUser._id, type: "like", isRead: false }
    ]);

    const res = await request(app)
      .put("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // All notifications for this user should now be read
    const unreadCount = await Notification.countDocuments({
      recipient: user._id,
      isRead: false
    });
    expect(unreadCount).toBe(0);
  });

  it("200 succeeds even with no notifications", async () => {
    const res = await request(app)
      .put("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("only marks notifications for the authenticated user", async () => {
    const otherNotif = await Notification.create({
      recipient: otherUser._id,
      sender: user._id,
      type: "follow",
      isRead: false
    });

    await request(app)
      .put("/api/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);

    // otherUser's notification must remain unread
    const unchanged = await Notification.findById(otherNotif._id);
    expect(unchanged.isRead).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).put("/api/notifications/read-all");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── DELETE /api/notifications/:id ───────────────────────────────────────────

describe("DELETE /api/notifications/:id", () => {
  let app;
  let user, otherUser, anotherUser, token, anotherToken, notif;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    otherUser = await createUser();
    anotherUser = await createUser();
    token = await loginToken(user);
    anotherToken = await loginToken(anotherUser);

    notif = await Notification.create({
      recipient: user._id,
      sender: otherUser._id,
      type: "follow"
    });
  });

  it("200 deletes own notification", async () => {
    const res = await request(app)
      .delete(`/api/notifications/${notif._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Confirm deletion
    const deleted = await Notification.findById(notif._id);
    expect(deleted).toBeNull();
  });

  it("403 another user cannot delete", async () => {
    const res = await request(app)
      .delete(`/api/notifications/${notif._id.toString()}`)
      .set("Authorization", `Bearer ${anotherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Notification must still exist
    const stillExists = await Notification.findById(notif._id);
    expect(stillExists).not.toBeNull();
  });

  it("404 for non-existent notification", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/api/notifications/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).delete(
      `/api/notifications/${notif._id.toString()}`
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
