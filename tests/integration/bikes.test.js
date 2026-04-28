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
const { createBike } = require("../fixtures/bikes");
const Bike = require("../../models/Bike");

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

// Minimal valid 1x1 PNG buffer (67 bytes) — multer fileFilter accepts image/* mimetype
const tinyPng = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
  0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
  0x00, 0x00, 0x03, 0x00, 0x01, 0x5B, 0x8E, 0x00,
  0x1F, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
  0x44, 0xAE, 0x42, 0x60, 0x82
]);
const photoAttach = (req) => req.attach("photo", tinyPng, { filename: "test.png", contentType: "image/png" });

const validBikeFields = {
  brand: "Yamaha",
  model: "MT-15",
  year: "2023",
  type: "naked",
  engineCC: "155",
  color: "Cyan"
};

describe("POST /api/bikes", () => {
  let app, user, token;

  beforeEach(async () => {
    app = buildApp();
    user = await createUser();
    token = await loginUser(user.email);
  });

  it("201 creates a bike with photo", async () => {
    const req = request(app)
      .post("/api/bikes")
      .set("Authorization", `Bearer ${token}`);

    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));
    photoAttach(req);

    const res = await req;
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ brand: "Yamaha", model: "MT-15" });
    expect(res.body.data.photo).toHaveProperty("url");
    expect(res.body.data.photo).toHaveProperty("public_id");
  });

  it("400 when photo is missing", async () => {
    const req = request(app)
      .post("/api/bikes")
      .set("Authorization", `Bearer ${token}`);
    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 when type is invalid", async () => {
    const req = request(app)
      .post("/api/bikes")
      .set("Authorization", `Bearer ${token}`);
    Object.entries({ ...validBikeFields, type: "spaceship" }).forEach(([k, v]) => req.field(k, v));
    photoAttach(req);

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const req = request(app).post("/api/bikes");
    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));
    photoAttach(req);

    const res = await req;
    expect(res.status).toBe(401);
  });

  it("400 GARAGE_FULL when at cap", async () => {
    for (let i = 0; i < 10; i++) await createBike(user._id, { model: `Bike${i}` });

    const req = request(app)
      .post("/api/bikes")
      .set("Authorization", `Bearer ${token}`);
    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));
    photoAttach(req);

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("GARAGE_FULL");
  });
});

describe("GET /api/bikes/user/:userId", () => {
  let app;

  beforeEach(() => { app = buildApp(); });

  it("200 returns garage sorted with primary first", async () => {
    const user = await createUser();
    await createBike(user._id, { model: "Old" });
    await new Promise((r) => setTimeout(r, 5));
    await createBike(user._id, { model: "Middle" });
    await new Promise((r) => setTimeout(r, 5));
    await createBike(user._id, { model: "Primary", isPrimary: true });

    const res = await request(app).get(`/api/bikes/user/${user._id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].model).toBe("Primary");
  });

  it("200 returns empty array when no bikes", async () => {
    const user = await createUser();
    const res = await request(app).get(`/api/bikes/user/${user._id}`);
    expect(res.body.data).toEqual([]);
  });
});

describe("GET /api/bikes/:id", () => {
  let app;
  beforeEach(() => { app = buildApp(); });

  it("200 returns a single bike", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);
    const res = await request(app).get(`/api/bikes/${bike._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(bike._id.toString());
  });

  it("404 for missing bike", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/bikes/${fakeId}`);
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/bikes/:id", () => {
  let app, owner, ownerToken, attacker, attackerToken, bike;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    attacker = await createUser();
    attackerToken = await loginUser(attacker.email);
    bike = await createBike(owner._id);
  });

  it("200 owner can update fields without re-uploading photo", async () => {
    const res = await request(app)
      .put(`/api/bikes/${bike._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .field("color", "Black");
    expect(res.status).toBe(200);
    expect(res.body.data.color).toBe("Black");
  });

  it("404 non-owner cannot update", async () => {
    const res = await request(app)
      .put(`/api/bikes/${bike._id}`)
      .set("Authorization", `Bearer ${attackerToken}`)
      .field("color", "Hacked");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/bikes/:id/primary", () => {
  let app, owner, ownerToken;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
  });

  it("200 sets target as primary, unsets siblings", async () => {
    const a = await createBike(owner._id, { isPrimary: true });
    const b = await createBike(owner._id);

    const res = await request(app)
      .put(`/api/bikes/${b._id}/primary`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isPrimary).toBe(true);
    const aReloaded = await Bike.findById(a._id);
    expect(aReloaded.isPrimary).toBe(false);
  });
});

describe("DELETE /api/bikes/:id", () => {
  let app, owner, ownerToken, attacker, attackerToken, bike;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    attacker = await createUser();
    attackerToken = await loginUser(attacker.email);
    bike = await createBike(owner._id);
  });

  it("200 owner can delete", async () => {
    const res = await request(app)
      .delete(`/api/bikes/${bike._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const found = await Bike.findById(bike._id);
    expect(found).toBeNull();
  });

  it("404 non-owner cannot delete", async () => {
    const res = await request(app)
      .delete(`/api/bikes/${bike._id}`)
      .set("Authorization", `Bearer ${attackerToken}`);
    expect(res.status).toBe(404);
    const stillThere = await Bike.findById(bike._id);
    expect(stillThere).not.toBeNull();
  });
});
