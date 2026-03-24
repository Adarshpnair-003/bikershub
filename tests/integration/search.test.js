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

const errorHandler = require("../../middleware/errorHandler");
const { createUser } = require("../fixtures/users");
const User = require("../../models/User");
const Club = require("../../models/Club");
const Ride = require("../../models/Ride");
const Post = require("../../models/Post");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", require("../../routes/index"));
  app.use(errorHandler);
  return app;
}

// ─── Shared test data setup helpers ──────────────────────────────────────────

/** Minimal valid Ride document — avoids required-field validation errors. */
async function createRide(creatorId, overrides = {}) {
  return Ride.create({
    title: "Weekend Ride",
    description: "A fun ride",
    startLocation: "Point A",
    startCoords: { type: "Point", coordinates: [0, 0] },
    destination: "Point B",
    destinationCoords: { type: "Point", coordinates: [1, 1] },
    rideDate: new Date(Date.now() + 86400000),
    createdBy: creatorId,
    status: "upcoming",
    ...overrides
  });
}

// ─── GET /api/search ──────────────────────────────────────────────────────────

describe("GET /api/search", () => {
  let app;
  let owner;

  beforeEach(async () => {
    app = buildApp();

    // Create a user whose username is searchable
    owner = await User.create({
      username: "unicorn_rider",
      name: "unicorn_rider",
      email: "unicorn@example.com",
      password: "TestPass123!"
    });

    // Club with a unique, searchable name
    await Club.create({
      name: "Unicorn Riders Club",
      description: "Only unicorns allowed",
      owner: owner._id
    });

    // Post with searchable content
    await Post.create({
      content: "Unicorn riders unite!",
      author: owner._id
    });

    // Ride with a searchable title
    await createRide(owner._id, {
      title: "Unicorn Weekend Ride",
      status: "upcoming"
    });
  });

  it("200 returns results across all types with query", async () => {
    const res = await request(app).get("/api/search?q=unicorn");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data).toBeDefined();
    expect(Array.isArray(data.users)).toBe(true);
    expect(Array.isArray(data.clubs)).toBe(true);
    expect(Array.isArray(data.rides)).toBe(true);
    expect(Array.isArray(data.posts)).toBe(true);

    // All four entities should be found since they all contain "unicorn"
    expect(data.users.length).toBeGreaterThanOrEqual(1);
    expect(data.clubs.length).toBeGreaterThanOrEqual(1);
    expect(data.rides.length).toBeGreaterThanOrEqual(1);
    expect(data.posts.length).toBeGreaterThanOrEqual(1);
  });

  it("200 returns only users when type=users", async () => {
    const res = await request(app).get("/api/search?q=unicorn&type=users");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(Array.isArray(data.users)).toBe(true);
    expect(data.clubs).toBeUndefined();
    expect(data.rides).toBeUndefined();
    expect(data.posts).toBeUndefined();
    expect(data.users.length).toBeGreaterThanOrEqual(1);
  });

  it("200 returns only clubs when type=clubs", async () => {
    const res = await request(app).get("/api/search?q=unicorn&type=clubs");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.users).toBeUndefined();
    expect(Array.isArray(data.clubs)).toBe(true);
    expect(data.rides).toBeUndefined();
    expect(data.posts).toBeUndefined();
    expect(data.clubs.length).toBeGreaterThanOrEqual(1);
  });

  it("200 returns only rides when type=rides", async () => {
    const res = await request(app).get("/api/search?q=unicorn&type=rides");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.users).toBeUndefined();
    expect(data.clubs).toBeUndefined();
    expect(Array.isArray(data.rides)).toBe(true);
    expect(data.posts).toBeUndefined();
    expect(data.rides.length).toBeGreaterThanOrEqual(1);
  });

  it("200 returns only posts when type=posts", async () => {
    const res = await request(app).get("/api/search?q=unicorn&type=posts");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.users).toBeUndefined();
    expect(data.clubs).toBeUndefined();
    expect(data.rides).toBeUndefined();
    expect(Array.isArray(data.posts)).toBe(true);
    expect(data.posts.length).toBeGreaterThanOrEqual(1);
  });

  it("400 without q param", async () => {
    const res = await request(app).get("/api/search");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 if q is empty string", async () => {
    const res = await request(app).get("/api/search?q=");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 for invalid type value", async () => {
    const res = await request(app).get("/api/search?q=unicorn&type=invalidtype");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("200 filters rides by status", async () => {
    // Create a completed ride with the same keyword
    await createRide(owner._id, {
      title: "Unicorn Completed Ride",
      status: "completed"
    });

    const res = await request(app).get(
      "/api/search?q=unicorn&type=rides&status=completed"
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const rides = res.body.data.rides;
    expect(Array.isArray(rides)).toBe(true);
    expect(rides.length).toBeGreaterThanOrEqual(1);
    // Every returned ride must have status=completed
    rides.forEach((r) => expect(r.status).toBe("completed"));
  });

  it("200 returns empty arrays when no results match", async () => {
    const res = await request(app).get("/api/search?q=zzznomatchzzz");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.users.length).toBe(0);
    expect(data.clubs.length).toBe(0);
    expect(data.rides.length).toBe(0);
    expect(data.posts.length).toBe(0);
  });

  it("200 handles regex special characters safely (no ReDoS)", async () => {
    // If regex escaping is broken this would throw or hang
    const res = await request(app).get(
      "/api/search?q=" + encodeURIComponent("(unicorn|.*)+$")
    );

    // Should not crash — result doesn't matter
    expect([200, 400]).toContain(res.status);
  });
});
