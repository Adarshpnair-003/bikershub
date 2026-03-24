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
const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", require("../../routes/index"));
  app.use(errorHandler);
  return app;
}

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Login via authService directly (faster than HTTP).
 * Returns the JWT access token string.
 */
async function loginToken(user) {
  const result = await authService.login({ email: user.email, password: defaultPassword });
  return result.token;
}

// ─── POST /api/conversations ─────────────────────────────────────────────────

describe("POST /api/conversations", () => {
  let app;
  let userA, userB, tokenA;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    tokenA = await loginToken(userA);
  });

  it("201 creates a new DM conversation between two users", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ userId: userB._id.toString() });

    // conversationController returns 200 for createOrGet (no explicit 201)
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    const participants = res.body.data.participants.map((p) => p._id.toString());
    expect(participants).toContain(userA._id.toString());
    expect(participants).toContain(userB._id.toString());
  });

  it("200 returns existing conversation if already exists (idempotent)", async () => {
    // Create once
    const first = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ userId: userB._id.toString() });

    expect(first.status).toBe(200);
    const firstId = first.body.data._id;

    // Create again — should return same conversation
    const second = await request(app)
      .post("/api/conversations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ userId: userB._id.toString() });

    expect(second.status).toBe(200);
    expect(second.body.success).toBe(true);
    expect(second.body.data._id).toBe(firstId);
  });

  it("401 without auth", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .send({ userId: userB._id.toString() });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/conversations ──────────────────────────────────────────────────

describe("GET /api/conversations", () => {
  let app;
  let userA, userB, tokenA;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    tokenA = await loginToken(userA);
  });

  it("200 returns list of user conversations", async () => {
    // Create a conversation first
    await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });

    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it("returns empty array when no conversations", async () => {
    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it("401 without auth", async () => {
    const res = await request(app).get("/api/conversations");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/conversations/:id ──────────────────────────────────────────────

describe("GET /api/conversations/:id", () => {
  let app;
  let userA, userB, userC, tokenA, tokenC, conversation;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    userC = await createUser();
    tokenA = await loginToken(userA);
    tokenC = await loginToken(userC);

    conversation = await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });
  });

  it("200 returns conversation details for participant", async () => {
    const res = await request(app)
      .get(`/api/conversations/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id.toString()).toBe(conversation._id.toString());
  });

  it("403 non-participant cannot access", async () => {
    const res = await request(app)
      .get(`/api/conversations/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("404 for non-existent conversation", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/conversations/${fakeId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/chat/send ─────────────────────────────────────────────────────

describe("POST /api/chat/send", () => {
  let app;
  let userA, userB, userC, tokenA, tokenC, conversation;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    userC = await createUser();
    tokenA = await loginToken(userA);
    tokenC = await loginToken(userC);

    conversation = await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });
  });

  it("201 sends a message to a conversation", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ conversationId: conversation._id.toString(), text: "Hello there!" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.text).toBe("Hello there!");
    expect(res.body.data.conversation.toString()).toBe(conversation._id.toString());
  });

  it("403 non-participant cannot send messages", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${tokenC}`)
      .send({ conversationId: conversation._id.toString(), text: "Sneaky message" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .send({ conversationId: conversation._id.toString(), text: "No auth" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 if text is missing", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ conversationId: conversation._id.toString() });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 if conversationId is missing", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ text: "No conversation ID" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/chat/conversation/:id ──────────────────────────────────────────

describe("GET /api/chat/conversation/:id", () => {
  let app;
  let userA, userB, userC, tokenA, tokenC, conversation;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    userC = await createUser();
    tokenA = await loginToken(userA);
    tokenC = await loginToken(userC);

    conversation = await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });
  });

  it("200 returns paginated messages", async () => {
    // Seed two messages
    await Message.create({
      conversation: conversation._id,
      sender: userA._id,
      text: "First",
      readBy: [userA._id]
    });
    await Message.create({
      conversation: conversation._id,
      sender: userB._id,
      text: "Second",
      readBy: [userB._id]
    });

    const res = await request(app)
      .get(`/api/chat/conversation/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it("403 non-participant cannot read messages", async () => {
    const res = await request(app)
      .get(`/api/chat/conversation/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns empty messages array for new conversation", async () => {
    const res = await request(app)
      .get(`/api/chat/conversation/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });
});

// ─── PUT /api/chat/read/:conversationId ──────────────────────────────────────

describe("PUT /api/chat/read/:conversationId", () => {
  let app;
  let userA, userB, userC, tokenA, tokenC, conversation;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    userC = await createUser();
    tokenA = await loginToken(userA);
    tokenC = await loginToken(userC);

    conversation = await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });

    // userB sends a message that userA has not read yet
    await Message.create({
      conversation: conversation._id,
      sender: userB._id,
      text: "Unread message",
      readBy: [userB._id]
    });
  });

  it("200 marks messages as read", async () => {
    const res = await request(app)
      .put(`/api/chat/read/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the message now includes userA in readBy
    const msg = await Message.findOne({ conversation: conversation._id });
    const readByStrings = msg.readBy.map((id) => id.toString());
    expect(readByStrings).toContain(userA._id.toString());
  });

  it("403 non-participant cannot mark as read", async () => {
    const res = await request(app)
      .put(`/api/chat/read/${conversation._id.toString()}`)
      .set("Authorization", `Bearer ${tokenC}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).put(
      `/api/chat/read/${conversation._id.toString()}`
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/chat/unread ─────────────────────────────────────────────────────

describe("GET /api/chat/unread", () => {
  let app;
  let userA, userB, tokenA;

  beforeEach(async () => {
    app = buildApp();
    userA = await createUser();
    userB = await createUser();
    tokenA = await loginToken(userA);
  });

  it("200 returns unread count (0 for new user)", async () => {
    const res = await request(app)
      .get("/api/chat/unread")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread).toBe(0);
  });

  it("returns correct count after receiving messages", async () => {
    const conversation = await Conversation.create({
      type: "direct",
      participants: [userA._id, userB._id]
    });

    // userB sends two messages that userA hasn't read
    await Message.create({
      conversation: conversation._id,
      sender: userB._id,
      text: "Hey",
      readBy: [userB._id]
    });
    await Message.create({
      conversation: conversation._id,
      sender: userB._id,
      text: "Are you there?",
      readBy: [userB._id]
    });

    const res = await request(app)
      .get("/api/chat/unread")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unread).toBe(2);
  });

  it("401 without auth", async () => {
    const res = await request(app).get("/api/chat/unread");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
