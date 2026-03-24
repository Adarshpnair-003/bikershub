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
const Club = require("../../models/Club");
const { createUser, defaultPassword } = require("../fixtures/users");

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

const publicClubPayload = {
  name: "Mumbai Riders",
  description: "Riders from Mumbai",
  isPrivate: false
};

const privateClubPayload = {
  name: "Secret Riders",
  description: "A private riders club",
  isPrivate: true
};

describe("POST /api/clubs", () => {
  let app;
  let token;

  beforeEach(async () => {
    app = buildApp();
    const user = await createUser();
    token = await loginUser(user.email);
  });

  it("201 creates club with name and description", async () => {
    const res = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send(publicClubPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("name", publicClubPayload.name);
    expect(res.body.data).toHaveProperty("description", publicClubPayload.description);
  });

  it("401 without auth", async () => {
    const res = await request(app).post("/api/clubs").send(publicClubPayload);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("400 if name missing", async () => {
    const { name, ...withoutName } = publicClubPayload;
    const res = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${token}`)
      .send(withoutName);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/clubs/:id", () => {
  let app;
  let owner;
  let ownerToken;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
  });

  it("200 returns club details", async () => {
    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(publicClubPayload);

    const clubId = createRes.body.data._id;

    const res = await request(app).get(`/api/clubs/${clubId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(clubId);
    expect(res.body.data.name).toBe(publicClubPayload.name);
  });

  it("404 for non-existent club", async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/clubs/${fakeId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/clubs/:id/join", () => {
  let app;
  let owner;
  let ownerToken;
  let member;
  let memberToken;
  let clubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    member = await createUser();
    memberToken = await loginUser(member.email);

    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(publicClubPayload);
    clubId = createRes.body.data._id;
  });

  it("200 user joins a public club", async () => {
    const res = await request(app)
      .post(`/api/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("400 already a member", async () => {
    // Join once
    await request(app)
      .post(`/api/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${memberToken}`);

    // Try to join again
    const res = await request(app)
      .post(`/api/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const res = await request(app).post(`/api/clubs/${clubId}/join`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/clubs/:id/leave", () => {
  let app;
  let owner;
  let ownerToken;
  let member;
  let memberToken;
  let nonMember;
  let nonMemberToken;
  let clubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    member = await createUser();
    memberToken = await loginUser(member.email);
    nonMember = await createUser();
    nonMemberToken = await loginUser(nonMember.email);

    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send(publicClubPayload);
    clubId = createRes.body.data._id;

    // Have member join
    await request(app)
      .post(`/api/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${memberToken}`);
  });

  it("200 member can leave", async () => {
    const res = await request(app)
      .put(`/api/clubs/${clubId}/leave`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/left/i);
  });

  it("400 owner cannot leave their own club", async () => {
    const res = await request(app)
      .put(`/api/clubs/${clubId}/leave`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("400 non-member cannot leave", async () => {
    const res = await request(app)
      .put(`/api/clubs/${clubId}/leave`)
      .set("Authorization", `Bearer ${nonMemberToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/clubs/:id/requests", () => {
  let app;
  let owner;
  let ownerToken;
  let requester;
  let requesterToken;
  let nonAdmin;
  let nonAdminToken;
  let privateClubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    requester = await createUser();
    requesterToken = await loginUser(requester.email);
    nonAdmin = await createUser();
    nonAdminToken = await loginUser(nonAdmin.email);

    // Create a private club
    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...privateClubPayload, name: `Private Club ${Date.now()}` });
    privateClubId = createRes.body.data._id;

    // Have requester request to join (private club creates a join request)
    await request(app)
      .post(`/api/clubs/${privateClubId}/join`)
      .set("Authorization", `Bearer ${requesterToken}`);
  });

  it("200 owner can see join requests", async () => {
    const res = await request(app)
      .get(`/api/clubs/${privateClubId}/requests`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  it("403 non-admin cannot see requests", async () => {
    const res = await request(app)
      .get(`/api/clubs/${privateClubId}/requests`)
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/clubs/:id/approve/:userId", () => {
  let app;
  let owner;
  let ownerToken;
  let requester;
  let requesterToken;
  let nonAdmin;
  let nonAdminToken;
  let privateClubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    requester = await createUser();
    requesterToken = await loginUser(requester.email);
    nonAdmin = await createUser();
    nonAdminToken = await loginUser(nonAdmin.email);

    // Create a private club
    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...privateClubPayload, name: `Approve Club ${Date.now()}` });
    privateClubId = createRes.body.data._id;

    // Have requester request to join
    await request(app)
      .post(`/api/clubs/${privateClubId}/join`)
      .set("Authorization", `Bearer ${requesterToken}`);
  });

  it("200 owner approves a pending request", async () => {
    const res = await request(app)
      .put(`/api/clubs/${privateClubId}/approve/${requester._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/approved/i);

    // Verify requester is now a member
    const club = await Club.findById(privateClubId).lean();
    const isMember = club.members.some((m) => m.toString() === requester._id.toString());
    expect(isMember).toBe(true);
  });

  it("403 non-admin cannot approve", async () => {
    const res = await request(app)
      .put(`/api/clubs/${privateClubId}/approve/${requester._id}`)
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("PUT /api/clubs/:id/reject/:userId", () => {
  let app;
  let owner;
  let ownerToken;
  let requester;
  let requesterToken;
  let nonAdmin;
  let nonAdminToken;
  let privateClubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    requester = await createUser();
    requesterToken = await loginUser(requester.email);
    nonAdmin = await createUser();
    nonAdminToken = await loginUser(nonAdmin.email);

    // Create a private club
    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...privateClubPayload, name: `Reject Club ${Date.now()}` });
    privateClubId = createRes.body.data._id;

    // Have requester request to join
    await request(app)
      .post(`/api/clubs/${privateClubId}/join`)
      .set("Authorization", `Bearer ${requesterToken}`);
  });

  it("200 owner rejects a pending request", async () => {
    const res = await request(app)
      .put(`/api/clubs/${privateClubId}/reject/${requester._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/rejected/i);

    // Verify requester is not a member and request is removed
    const club = await Club.findById(privateClubId).lean();
    const isMember = club.members.some((m) => m.toString() === requester._id.toString());
    const stillRequesting = club.joinRequests.some((r) => r.toString() === requester._id.toString());
    expect(isMember).toBe(false);
    expect(stillRequesting).toBe(false);
  });

  it("403 non-admin cannot reject", async () => {
    const res = await request(app)
      .put(`/api/clubs/${privateClubId}/reject/${requester._id}`)
      .set("Authorization", `Bearer ${nonAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/clubs/:id/posts", () => {
  let app;
  let owner;
  let ownerToken;
  let member;
  let memberToken;
  let nonMember;
  let nonMemberToken;
  let clubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);
    member = await createUser();
    memberToken = await loginUser(member.email);
    nonMember = await createUser();
    nonMemberToken = await loginUser(nonMember.email);

    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...publicClubPayload, name: `Posts Club ${Date.now()}` });
    clubId = createRes.body.data._id;

    // Have member join the club
    await request(app)
      .post(`/api/clubs/${clubId}/join`)
      .set("Authorization", `Bearer ${memberToken}`);
  });

  it("201 member creates a club post", async () => {
    const res = await request(app)
      .post(`/api/clubs/${clubId}/posts`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ content: "Hello from the club!" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("content", "Hello from the club!");
  });

  it("403 non-member cannot post", async () => {
    const res = await request(app)
      .post(`/api/clubs/${clubId}/posts`)
      .set("Authorization", `Bearer ${nonMemberToken}`)
      .send({ content: "I should not be able to post" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/clubs/:id/posts", () => {
  let app;
  let owner;
  let ownerToken;
  let clubId;

  beforeEach(async () => {
    app = buildApp();
    owner = await createUser();
    ownerToken = await loginUser(owner.email);

    const createRes = await request(app)
      .post("/api/clubs")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ ...publicClubPayload, name: `Get Posts Club ${Date.now()}` });
    clubId = createRes.body.data._id;

    // Owner creates a post (owner is already a member)
    await request(app)
      .post(`/api/clubs/${clubId}/posts`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ content: "Club post content" });
  });

  it("200 returns club posts", async () => {
    const res = await request(app).get(`/api/clubs/${clubId}/posts`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("content", "Club post content");
  });
});

describe("GET /api/clubs/nearby", () => {
  let app;

  beforeEach(async () => {
    app = buildApp();
  });

  it("200 returns nearby clubs list (may be empty)", async () => {
    const res = await request(app).get("/api/clubs/nearby").query({ lat: 19.076, lng: 72.877 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("400 without lat/lng query params", async () => {
    const res = await request(app).get("/api/clubs/nearby");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
