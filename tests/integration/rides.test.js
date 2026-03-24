// Environment must be set before any app module is imported
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

// Mock geocode before any module that uses it is loaded
jest.mock("../../utils/geocode", () => async () => ({ type: "Point", coordinates: [72.877, 19.076] }));

const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");

const errorHandler = require("../../middleware/errorHandler");
const { createUser, defaultPassword } = require("../fixtures/users");
const { createRide } = require("../fixtures/rides");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", require("../../routes/index"));
  app.use(errorHandler);
  return app;
}

async function loginUser(email, password = defaultPassword) {
  const authService = require("../../services/authService");
  const { token } = await authService.login({ email, password });
  return token;
}

const ridePayload = {
  title: "Weekend Mountain Ride",
  description: "A great mountain ride",
  startLocation: "Mumbai",
  destination: "Pune",
  rideDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  maxParticipants: 10
};

describe("POST /api/rides", () => {
  let app;
  let token;

  beforeEach(async () => {
    app = buildApp();
    const user = await createUser();
    token = await loginUser(user.email);
  });

  it("201 creates ride with all required fields", async () => {
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(ridePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("title", ridePayload.title);
    expect(res.body.data).toHaveProperty("startLocation", "Mumbai");
    expect(res.body.data).toHaveProperty("destination", "Pune");
  });

  it("401 without auth", async () => {
    const res = await request(app).post("/api/rides").send(ridePayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 if title missing", async () => {
    const { title, ...withoutTitle } = ridePayload;
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(withoutTitle);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 if rideDate missing", async () => {
    const { rideDate, ...withoutDate } = ridePayload;
    const res = await request(app)
      .post("/api/rides")
      .set("Authorization", `Bearer ${token}`)
      .send(withoutDate);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/rides", () => {
  let app;
  let creator;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
  });

  it("200 returns paginated rides list", async () => {
    await createRide(creator._id);
    await createRide(creator._id);

    const res = await request(app).get("/api/rides");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("rides");
    expect(Array.isArray(res.body.data.rides)).toBe(true);
    expect(res.body.data.rides.length).toBe(2);
    expect(res.body.data).toHaveProperty("pagination");
  });

  it("returns empty array when no rides", async () => {
    const res = await request(app).get("/api/rides");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rides).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
  });
});

describe("GET /api/rides/:id", () => {
  let app;
  let creator;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
  });

  it("200 returns ride details", async () => {
    const ride = await createRide(creator._id);

    const res = await request(app).get(`/api/rides/${ride._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(ride._id.toString());
    expect(res.body.data.title).toBe(ride.title);
  });

  it("404 for non-existent ride", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/rides/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/rides/:id/join", () => {
  let app;
  let creator;
  let joiner;
  let joinerToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    joiner = await createUser();
    joinerToken = await loginUser(joiner.email);
    ride = await createRide(creator._id);
  });

  it("200 joins a ride successfully", async () => {
    const res = await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${joinerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/joined/i);
  });

  it("400 if already joined", async () => {
    // Join once
    await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${joinerToken}`);

    // Try to join again
    const res = await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${joinerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).post(`/api/rides/${ride._id}/join`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/rides/:id/leave", () => {
  let app;
  let creator;
  let creatorToken;
  let participant;
  let participantToken;
  let nonMember;
  let nonMemberToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    participant = await createUser();
    participantToken = await loginUser(participant.email);
    nonMember = await createUser();
    nonMemberToken = await loginUser(nonMember.email);
    ride = await createRide(creator._id);

    // Have participant join the ride
    await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${participantToken}`);
  });

  it("200 leaves a ride", async () => {
    const res = await request(app)
      .post(`/api/rides/${ride._id}/leave`)
      .set("Authorization", `Bearer ${participantToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/left/i);
  });

  it("400 if not a participant", async () => {
    const res = await request(app)
      .post(`/api/rides/${ride._id}/leave`)
      .set("Authorization", `Bearer ${nonMemberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 creator cannot leave", async () => {
    const res = await request(app)
      .post(`/api/rides/${ride._id}/leave`)
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/rides/:id/start", () => {
  let app;
  let creator;
  let creatorToken;
  let other;
  let otherToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    other = await createUser();
    otherToken = await loginUser(other.email);
    // Create ride with status upcoming (default)
    ride = await createRide(creator._id);
  });

  it("200 creator can start the ride", async () => {
    const res = await request(app)
      .put(`/api/rides/${ride._id}/start`)
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("status", "live");
  });

  it("403 non-creator cannot start", async () => {
    // Other user joins first
    await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${otherToken}`);

    const res = await request(app)
      .put(`/api/rides/${ride._id}/start`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/rides/:id/end", () => {
  let app;
  let creator;
  let creatorToken;
  let other;
  let otherToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    other = await createUser();
    otherToken = await loginUser(other.email);
    // Create and start a ride so it can be ended
    ride = await createRide(creator._id);
    await request(app)
      .put(`/api/rides/${ride._id}/start`)
      .set("Authorization", `Bearer ${creatorToken}`);
  });

  it("200 ends ride and returns stats (distance, duration, avgSpeed)", async () => {
    const res = await request(app)
      .put(`/api/rides/${ride._id}/end`)
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.distance).toBe("number");
    expect(typeof res.body.data.duration).toBe("number");
    expect(res.body.data).toHaveProperty("avgSpeed");
  });

  it("403 non-creator cannot end", async () => {
    // Other user joins
    await request(app)
      .post(`/api/rides/${ride._id}/join`)
      .set("Authorization", `Bearer ${otherToken}`);

    const res = await request(app)
      .put(`/api/rides/${ride._id}/end`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/rides/:id/route", () => {
  let app;
  let creator;
  let creatorToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    ride = await createRide(creator._id);
  });

  it("200 returns route coordinates array", async () => {
    const res = await request(app)
      .get(`/api/rides/${ride._id}/route`)
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("route");
    expect(Array.isArray(res.body.data.route)).toBe(true);
  });
});

describe("PUT /api/rides/:id", () => {
  let app;
  let creator;
  let creatorToken;
  let other;
  let otherToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    other = await createUser();
    otherToken = await loginUser(other.email);
    ride = await createRide(creator._id);
  });

  it("200 creator can update ride", async () => {
    const res = await request(app)
      .put(`/api/rides/${ride._id}`)
      .set("Authorization", `Bearer ${creatorToken}`)
      .send({ title: "Updated Ride Title" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("title", "Updated Ride Title");
  });

  it("403 non-creator cannot update", async () => {
    const res = await request(app)
      .put(`/api/rides/${ride._id}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ title: "Hacked Title" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("DELETE /api/rides/:id", () => {
  let app;
  let creator;
  let creatorToken;
  let other;
  let otherToken;
  let ride;

  beforeEach(async () => {
    app = buildApp();
    creator = await createUser();
    creatorToken = await loginUser(creator.email);
    other = await createUser();
    otherToken = await loginUser(other.email);
    ride = await createRide(creator._id);
  });

  it("200 creator can delete", async () => {
    const res = await request(app)
      .delete(`/api/rides/${ride._id}`)
      .set("Authorization", `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("403 non-creator cannot delete", async () => {
    const res = await request(app)
      .delete(`/api/rides/${ride._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});
