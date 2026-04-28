# Garage — Bike Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a garage feature where users can showcase the bikes they own on their profile, with full CRUD, set-primary, and a 2-column grid in a new Garage tab next to Posts.

**Architecture:** New `Bike` resource in the existing layered MVC backend (`models/Bike.js`, `services/bikeService.js`, `validators/bikeValidator.js`, `controllers/bikeController.js`, `routes/bikeRoutes.js`). Five new frontend pages following the v2 flat IG/X/Threads visual language (`add-bike`, `edit-bike`, `bike-detail`) plus garage-tab modifications to existing `profile` and `user-profile` pages. One small extension to `frontend/src/utils/api.js` to allow PUT multipart.

**Tech Stack:** Node 20 + Express 5 + Mongoose 9 + Cloudinary (backend), Vite 5 + Capacitor 8 + vanilla JS ES modules + Leaflet (frontend). Jest + supertest + mongodb-memory-server for tests. Cloudinary auto-mocked via `tests/__mocks__/cloudinary.js`.

**Spec:** `docs/superpowers/specs/2026-04-28-garage-bike-collection-design.md` (commits `95efd52`, `7c028aa`, `a00f941`).

---

## File Structure

### New backend files
- `models/Bike.js` — Mongoose schema with indexes
- `services/bikeService.js` — business logic, all authorization
- `validators/bikeValidator.js` — Joi schemas for create/update
- `controllers/bikeController.js` — thin `catchAsync` wrappers
- `routes/bikeRoutes.js` — express router with explicit middleware order

### New backend tests
- `tests/unit/bikeService.test.js` — unit tests per service method
- `tests/integration/bikes.test.js` — supertest integration tests
- `tests/fixtures/bikes.js` — `createBike`, `createBikes` helpers

### Modified backend files
- `routes/index.js` — register `/bikes` router (one line)

### New frontend files
- `frontend/src/utils/bikeApi.js` — thin wrapper
- `frontend/src/pages/add-bike.js` — full-screen create form
- `frontend/src/pages/edit-bike.js` — full-screen edit form
- `frontend/src/pages/bike-detail.js` — full bike detail view

### Modified frontend files
- `frontend/src/utils/api.js` — extend `upload()` to accept optional `method` arg
- `frontend/src/main.js` — three new imports + three `registerRoute` calls
- `frontend/src/pages/profile.js` — tab strip, garage grid, FAB
- `frontend/src/pages/user-profile.js` — tab strip, garage grid (read-only)

---

## Conventions reminder for the executor

- **`AppError` signature:** `new AppError(message, statusCode, code)`. Order matters; verify by reading `utils/AppError.js`.
- **Owner authorization in this feature returns 404**, not 403, to prevent existence probing. This is a deliberate departure from `rideService` (which returns 403). The spec at §4.3 documents this.
- **Cloudinary tests:** the mock at `tests/__mocks__/cloudinary.js` is auto-discovered by Jest. No explicit `jest.mock()` call is required in test files. Reset mock state with `jest.clearAllMocks()` in `beforeEach` if asserting on call args.
- **Test environment:** `tests/setup.js` sets all required env vars and starts mongodb-memory-server. Just write tests; the harness handles teardown.
- **Frontend has no test runner.** Frontend pages are verified by APK build + manual QA. No `*.test.js` files for pages.
- **Commit style:** prefix with `feat:`, `test:`, `refactor:`, `docs:`. Always sign with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

---

## Backend phase

### Task 1: Create Bike model

**Files:**
- Create: `models/Bike.js`
- Test: (covered by service tests in later tasks; no separate model test — Mongoose handles schema validation)

- [ ] **Step 1: Create `models/Bike.js`**

```javascript
const mongoose = require("mongoose");

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];

const bikeSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    brand: { type: String, required: true, trim: true, maxlength: 50 },
    model: { type: String, required: true, trim: true, maxlength: 50 },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear() + 1
    },
    type: { type: String, enum: TYPES, required: true, lowercase: true },
    engineCC: { type: Number, required: true, min: 50, max: 3000 },
    color: { type: String, required: true, trim: true, maxlength: 30 },
    nickname: { type: String, trim: true, maxlength: 40, default: "" },
    photo: {
      url: { type: String, required: true },
      public_id: { type: String, required: true }
    },
    isPrimary: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

// Compound index for fast garage listing queries
bikeSchema.index({ owner: 1, createdAt: -1 });
bikeSchema.index({ owner: 1, isPrimary: 1 });

bikeSchema.statics.TYPES = TYPES;

module.exports = mongoose.model("Bike", bikeSchema);
```

- [ ] **Step 2: Verify the model loads without syntax errors**

Run: `node -e "require('./models/Bike')"`
Expected: no output (success)

- [ ] **Step 3: Commit**

```bash
git add models/Bike.js
git commit -m "$(cat <<'EOF'
feat: add Bike model for garage feature

Mongoose schema with brand/model/year/type/engineCC/color/nickname/photo
and isPrimary flag. Compound indexes on (owner, createdAt) and
(owner, isPrimary) for fast garage listing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Create Bike validator

**Files:**
- Create: `validators/bikeValidator.js`

- [ ] **Step 1: Create `validators/bikeValidator.js`**

```javascript
const Joi = require("joi");

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];
const currentYear = new Date().getFullYear();

exports.createBikeSchema = Joi.object({
  brand: Joi.string().trim().min(1).max(50).required(),
  model: Joi.string().trim().min(1).max(50).required(),
  year: Joi.number().integer().min(1900).max(currentYear + 1).required(),
  type: Joi.string().lowercase().valid(...TYPES).required(),
  engineCC: Joi.number().integer().min(50).max(3000).required(),
  color: Joi.string().trim().min(1).max(30).required(),
  nickname: Joi.string().trim().max(40).allow("").optional()
});

exports.updateBikeSchema = Joi.object({
  brand: Joi.string().trim().min(1).max(50).optional(),
  model: Joi.string().trim().min(1).max(50).optional(),
  year: Joi.number().integer().min(1900).max(currentYear + 1).optional(),
  type: Joi.string().lowercase().valid(...TYPES).optional(),
  engineCC: Joi.number().integer().min(50).max(3000).optional(),
  color: Joi.string().trim().min(1).max(30).optional(),
  nickname: Joi.string().trim().max(40).allow("").optional()
}).min(1);
```

- [ ] **Step 2: Verify validator loads**

Run: `node -e "console.log(Object.keys(require('./validators/bikeValidator')))"`
Expected: `[ 'createBikeSchema', 'updateBikeSchema' ]`

- [ ] **Step 3: Commit**

```bash
git add validators/bikeValidator.js
git commit -m "$(cat <<'EOF'
feat: add Joi validator schemas for bike create/update

createBikeSchema requires all fields except nickname.
updateBikeSchema makes all fields optional but enforces .min(1)
so an empty body is rejected.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Bike fixture for tests

**Files:**
- Create: `tests/fixtures/bikes.js`

- [ ] **Step 1: Create `tests/fixtures/bikes.js`**

```javascript
const Bike = require("../../models/Bike");

const defaultPhoto = {
  url: "https://res.cloudinary.com/test/image/upload/test123.jpg",
  public_id: "test123"
};

/**
 * Create a single test bike for an owner. Optionally override fields.
 */
exports.createBike = async (ownerId, overrides = {}) => {
  return Bike.create({
    owner: ownerId,
    brand: "Yamaha",
    model: "MT-15",
    year: 2023,
    type: "naked",
    engineCC: 155,
    color: "Cyan",
    nickname: "",
    photo: { ...defaultPhoto },
    isPrimary: false,
    ...overrides
  });
};

/**
 * Create multiple bikes for an owner.
 */
exports.createBikes = async (ownerId, count = 3) => {
  const bikes = [];
  for (let i = 0; i < count; i++) {
    bikes.push(await exports.createBike(ownerId, { model: `Bike${i}` }));
  }
  return bikes;
};

exports.defaultPhoto = defaultPhoto;
```

- [ ] **Step 2: Commit**

```bash
git add tests/fixtures/bikes.js
git commit -m "$(cat <<'EOF'
test: add bike fixtures for garage tests

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: bikeService.createBike (TDD)

**Files:**
- Create: `services/bikeService.js` (initial version with `createBike` only)
- Test: `tests/unit/bikeService.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/bikeService.test.js`:

```javascript
const cloudinary = require("../../config/cloudinary");
const bikeService = require("../../services/bikeService");
const Bike = require("../../models/Bike");
const AppError = require("../../utils/AppError");
const { createUser } = require("../fixtures/users");
const { createBike } = require("../fixtures/bikes");

describe("bikeService.createBike", () => {
  let user;
  const fakeFile = { path: "/tmp/fake-bike.jpg" };
  const validFields = {
    brand: "Honda", model: "CBR250R", year: 2022,
    type: "sport", engineCC: 250, color: "Red", nickname: ""
  };

  beforeEach(async () => {
    user = await createUser();
    jest.clearAllMocks();
  });

  it("creates a bike with photo and returns it", async () => {
    const bike = await bikeService.createBike(user._id.toString(), validFields, fakeFile);
    expect(bike).toBeDefined();
    expect(bike.brand).toBe("Honda");
    expect(bike.model).toBe("CBR250R");
    expect(bike.photo.url).toBeDefined();
    expect(bike.photo.public_id).toBe("test123");
    expect(String(bike.owner)).toBe(String(user._id));
    expect(cloudinary.uploader.upload).toHaveBeenCalledWith(
      "/tmp/fake-bike.jpg",
      expect.objectContaining({ folder: "bikerhub/garage" })
    );
  });

  it("throws GARAGE_FULL when user already has 10 bikes", async () => {
    // Pre-seed 10 bikes for this user
    for (let i = 0; i < 10; i++) await createBike(user._id, { model: `B${i}` });

    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toThrow(AppError);
    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toMatchObject({ statusCode: 400, code: "GARAGE_FULL" });
  });

  it("destroys the uploaded photo if the Bike.create fails", async () => {
    const spy = jest.spyOn(Bike, "create").mockRejectedValueOnce(new Error("db down"));
    await expect(
      bikeService.createBike(user._id.toString(), validFields, fakeFile)
    ).rejects.toThrow();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("test123");
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/bikeService.test.js -t "createBike" --silent`
Expected: FAIL — "Cannot find module '../../services/bikeService'"

- [ ] **Step 3: Write the minimal implementation**

Create `services/bikeService.js`:

```javascript
const cloudinary = require("../config/cloudinary");
const Bike = require("../models/Bike");
const AppError = require("../utils/AppError");

const MAX_BIKES_PER_USER = 10;

async function uploadBikePhoto(file) {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: "bikerhub/garage",
    resource_type: "image",
    transformation: [{ width: 1200, crop: "limit" }],
    quality: "auto",
    fetch_format: "auto"
  });
  return { url: result.secure_url, public_id: result.public_id };
}

async function destroyPhoto(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Log and continue — orphaned media is recoverable, broken UX is not.
    // eslint-disable-next-line no-console
    console.warn("[bikeService] Failed to destroy Cloudinary asset", publicId, err.message);
  }
}

exports.createBike = async (userId, fields, photoFile) => {
  if (!photoFile) throw new AppError("Photo is required", 400, "PHOTO_REQUIRED");

  const count = await Bike.countDocuments({ owner: userId });
  if (count >= MAX_BIKES_PER_USER) {
    throw new AppError(
      "Garage limit reached (10 bikes). Delete one to add another.",
      400,
      "GARAGE_FULL"
    );
  }

  const photo = await uploadBikePhoto(photoFile);

  try {
    const bike = await Bike.create({ owner: userId, ...fields, photo });
    return bike;
  } catch (err) {
    // Mongo write failed after Cloudinary upload — clean up the orphan.
    await destroyPhoto(photo.public_id);
    throw err;
  }
};

exports.MAX_BIKES_PER_USER = MAX_BIKES_PER_USER;
exports._uploadBikePhoto = uploadBikePhoto; // exported for reuse in update
exports._destroyPhoto = destroyPhoto;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/bikeService.test.js -t "createBike" --silent`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add services/bikeService.js tests/unit/bikeService.test.js
git commit -m "$(cat <<'EOF'
feat: add bikeService.createBike with cap enforcement

- Enforces MAX_BIKES_PER_USER = 10
- Uploads photo to bikerhub/garage with width-limit transformation
- Destroys orphaned photo if Mongo create fails
- Three unit tests cover happy path, cap, and orphan cleanup

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: bikeService.listByUser + getById (TDD)

**Files:**
- Modify: `services/bikeService.js`
- Modify: `tests/unit/bikeService.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/bikeService.test.js`:

```javascript
describe("bikeService.listByUser", () => {
  it("returns bikes sorted by isPrimary desc, then createdAt desc", async () => {
    const user = await createUser();
    const oldest = await createBike(user._id, { model: "Old" });
    const middle = await createBike(user._id, { model: "Middle" });
    const primary = await createBike(user._id, { model: "Primary", isPrimary: true });

    const list = await bikeService.listByUser(user._id.toString());

    expect(list).toHaveLength(3);
    expect(list[0]._id.toString()).toBe(primary._id.toString()); // primary first
    expect(list[1]._id.toString()).toBe(middle._id.toString());  // then newest non-primary
    expect(list[2]._id.toString()).toBe(oldest._id.toString());
  });

  it("returns empty array if user has no bikes", async () => {
    const user = await createUser();
    const list = await bikeService.listByUser(user._id.toString());
    expect(list).toEqual([]);
  });
});

describe("bikeService.getById", () => {
  it("returns the bike with populated owner", async () => {
    const user = await createUser({ username: "rider1" });
    const bike = await createBike(user._id);

    const found = await bikeService.getById(bike._id.toString());

    expect(found._id.toString()).toBe(bike._id.toString());
    expect(found.owner.username).toBe("rider1");
  });

  it("throws NOT_FOUND for missing bike", async () => {
    const mongoose = require("mongoose");
    const fakeId = new mongoose.Types.ObjectId();
    await expect(bikeService.getById(fakeId.toString()))
      .rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx jest tests/unit/bikeService.test.js --silent`
Expected: FAIL — `bikeService.listByUser is not a function`

- [ ] **Step 3: Add implementations**

Append to `services/bikeService.js`:

```javascript
exports.listByUser = async (userId) => {
  return Bike.find({ owner: userId })
    .sort({ isPrimary: -1, createdAt: -1 })
    .lean();
};

exports.getById = async (bikeId) => {
  const bike = await Bike.findById(bikeId)
    .populate("owner", "username profilePic")
    .lean();
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  return bike;
};
```

- [ ] **Step 4: Run tests — verify passing**

Run: `npx jest tests/unit/bikeService.test.js --silent`
Expected: PASS — 7 tests now pass total

- [ ] **Step 5: Commit**

```bash
git add services/bikeService.js tests/unit/bikeService.test.js
git commit -m "$(cat <<'EOF'
feat: add bikeService.listByUser and getById

- listByUser sorts isPrimary first, then createdAt desc
- getById populates owner.username and profilePic
- 4 unit tests added

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: bikeService.updateBike (TDD)

**Files:**
- Modify: `services/bikeService.js`
- Modify: `tests/unit/bikeService.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/bikeService.test.js`:

```javascript
describe("bikeService.updateBike", () => {
  it("updates allowed fields", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);
    const updated = await bikeService.updateBike(
      user._id.toString(),
      bike._id.toString(),
      { color: "Black", nickname: "Beast" },
      null
    );
    expect(updated.color).toBe("Black");
    expect(updated.nickname).toBe("Beast");
  });

  it("ignores unknown fields", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);
    const updated = await bikeService.updateBike(
      user._id.toString(),
      bike._id.toString(),
      { color: "Black", owner: "ATTACK", isPrimary: true },
      null
    );
    expect(updated.color).toBe("Black");
    // owner mass-assignment must be blocked; isPrimary only via setPrimary
    expect(String(updated.owner)).toBe(String(user._id));
    expect(updated.isPrimary).toBe(false);
  });

  it("replaces photo and destroys old asset", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);
    const fakeFile = { path: "/tmp/new.jpg" };
    const oldPublicId = bike.photo.public_id;

    await bikeService.updateBike(
      user._id.toString(),
      bike._id.toString(),
      {},
      fakeFile
    );

    expect(cloudinary.uploader.upload).toHaveBeenCalled();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(oldPublicId);
  });

  it("throws 404 when caller is not owner (existence-probing prevention)", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const bike = await createBike(owner._id);

    await expect(
      bikeService.updateBike(attacker._id.toString(), bike._id.toString(), { color: "Black" }, null)
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });

  it("throws 404 when bike does not exist", async () => {
    const user = await createUser();
    const mongoose = require("mongoose");
    const fakeId = new mongoose.Types.ObjectId();

    await expect(
      bikeService.updateBike(user._id.toString(), fakeId.toString(), { color: "Black" }, null)
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx jest tests/unit/bikeService.test.js -t "updateBike" --silent`
Expected: FAIL — `bikeService.updateBike is not a function`

- [ ] **Step 3: Add implementation**

Append to `services/bikeService.js`:

```javascript
const ALLOWED_UPDATE_FIELDS = ["brand", "model", "year", "type", "engineCC", "color", "nickname"];

exports.updateBike = async (userId, bikeId, fields, photoFile) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    throw new AppError("Bike not found", 404, "NOT_FOUND"); // 404 not 403 — existence-probing prevention
  }

  // Allowlist update — never spread untrusted input
  for (const key of ALLOWED_UPDATE_FIELDS) {
    if (fields[key] !== undefined) bike[key] = fields[key];
  }

  // Optional photo replacement
  if (photoFile) {
    const oldPublicId = bike.photo?.public_id;
    const newPhoto = await uploadBikePhoto(photoFile);
    bike.photo = newPhoto;
    await bike.save();
    if (oldPublicId) await destroyPhoto(oldPublicId);
    return bike.toObject();
  }

  await bike.save();
  return bike.toObject();
};
```

- [ ] **Step 4: Run tests — verify passing**

Run: `npx jest tests/unit/bikeService.test.js -t "updateBike" --silent`
Expected: PASS — 5 new tests pass

- [ ] **Step 5: Commit**

```bash
git add services/bikeService.js tests/unit/bikeService.test.js
git commit -m "$(cat <<'EOF'
feat: add bikeService.updateBike with allowlist + photo replace

- Allowlist update prevents mass assignment (owner, isPrimary excluded)
- Photo replacement uploads new, saves doc, then destroys old
- Non-owner returns 404 (existence-probing prevention per spec 4.3)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: bikeService.setPrimary (TDD)

**Files:**
- Modify: `services/bikeService.js`
- Modify: `tests/unit/bikeService.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/bikeService.test.js`:

```javascript
describe("bikeService.setPrimary", () => {
  it("flips target to primary and unsets siblings", async () => {
    const user = await createUser();
    const a = await createBike(user._id, { model: "A", isPrimary: true });
    const b = await createBike(user._id, { model: "B" });

    const result = await bikeService.setPrimary(user._id.toString(), b._id.toString());

    expect(result.isPrimary).toBe(true);
    const aReloaded = await Bike.findById(a._id);
    expect(aReloaded.isPrimary).toBe(false);
  });

  it("is idempotent — calling on already-primary leaves state correct", async () => {
    const user = await createUser();
    const a = await createBike(user._id, { isPrimary: true });

    const result = await bikeService.setPrimary(user._id.toString(), a._id.toString());

    expect(result.isPrimary).toBe(true);
    const others = await Bike.find({ owner: user._id, isPrimary: true });
    expect(others).toHaveLength(1);
  });

  it("throws 404 when caller is not owner", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const bike = await createBike(owner._id);

    await expect(
      bikeService.setPrimary(attacker._id.toString(), bike._id.toString())
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx jest tests/unit/bikeService.test.js -t "setPrimary" --silent`
Expected: FAIL

- [ ] **Step 3: Add implementation**

Append to `services/bikeService.js`:

```javascript
exports.setPrimary = async (userId, bikeId) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    throw new AppError("Bike not found", 404, "NOT_FOUND");
  }

  // Unset any existing primary in this user's garage (excluding target)
  await Bike.updateMany(
    { owner: userId, _id: { $ne: bikeId }, isPrimary: true },
    { $set: { isPrimary: false } }
  );

  bike.isPrimary = true;
  await bike.save();
  return bike.toObject();
};
```

- [ ] **Step 4: Run tests — verify passing**

Run: `npx jest tests/unit/bikeService.test.js -t "setPrimary" --silent`
Expected: PASS — 3 new tests pass

- [ ] **Step 5: Commit**

```bash
git add services/bikeService.js tests/unit/bikeService.test.js
git commit -m "$(cat <<'EOF'
feat: add bikeService.setPrimary

Atomic-enough sibling unset + target set. No transaction (worst case
window is milliseconds; client retries idempotently).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: bikeService.deleteBike (TDD)

**Files:**
- Modify: `services/bikeService.js`
- Modify: `tests/unit/bikeService.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/unit/bikeService.test.js`:

```javascript
describe("bikeService.deleteBike", () => {
  it("deletes the bike and destroys Cloudinary asset", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);

    await bikeService.deleteBike(user._id.toString(), bike._id.toString());

    const found = await Bike.findById(bike._id);
    expect(found).toBeNull();
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(bike.photo.public_id);
  });

  it("does not auto-promote another bike when deleting the primary", async () => {
    const user = await createUser();
    const primary = await createBike(user._id, { isPrimary: true });
    const other = await createBike(user._id);

    await bikeService.deleteBike(user._id.toString(), primary._id.toString());

    const reloaded = await Bike.findById(other._id);
    expect(reloaded.isPrimary).toBe(false);
  });

  it("throws 404 when caller is not owner", async () => {
    const owner = await createUser();
    const attacker = await createUser();
    const bike = await createBike(owner._id);

    await expect(
      bikeService.deleteBike(attacker._id.toString(), bike._id.toString())
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
    // Bike must still exist
    const stillThere = await Bike.findById(bike._id);
    expect(stillThere).not.toBeNull();
  });

  it("succeeds even if Cloudinary destroy fails", async () => {
    const user = await createUser();
    const bike = await createBike(user._id);
    cloudinary.uploader.destroy.mockRejectedValueOnce(new Error("cloudinary down"));

    await bikeService.deleteBike(user._id.toString(), bike._id.toString());

    const found = await Bike.findById(bike._id);
    expect(found).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — verify failure**

Run: `npx jest tests/unit/bikeService.test.js -t "deleteBike" --silent`
Expected: FAIL

- [ ] **Step 3: Add implementation**

Append to `services/bikeService.js`:

```javascript
exports.deleteBike = async (userId, bikeId) => {
  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError("Bike not found", 404, "NOT_FOUND");
  if (String(bike.owner) !== String(userId)) {
    throw new AppError("Bike not found", 404, "NOT_FOUND");
  }

  // Try to destroy the Cloudinary asset, but don't block deletion if it fails.
  // No auto-promotion of another bike to primary on delete (per spec 7.1).
  await destroyPhoto(bike.photo?.public_id);
  await Bike.findByIdAndDelete(bikeId);
};
```

- [ ] **Step 4: Run tests — verify passing**

Run: `npx jest tests/unit/bikeService.test.js --silent`
Expected: PASS — full bikeService unit suite (~16 tests)

- [ ] **Step 5: Commit**

```bash
git add services/bikeService.js tests/unit/bikeService.test.js
git commit -m "$(cat <<'EOF'
feat: add bikeService.deleteBike

- Owner-only delete with 404 for non-owner
- Cloudinary destroy is best-effort (orphans logged, not fatal)
- No auto-promotion when deleting the primary bike

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Bike controller

**Files:**
- Create: `controllers/bikeController.js`

- [ ] **Step 1: Create `controllers/bikeController.js`**

```javascript
const bikeService = require("../services/bikeService");
const catchAsync = require("../utils/catchAsync");
const apiResponse = require("../utils/apiResponse");

exports.create = catchAsync(async (req, res) => {
  const bike = await bikeService.createBike(req.user.id, req.body, req.file);
  res.status(201).json(apiResponse.success(bike, "Bike added"));
});

exports.listByUser = catchAsync(async (req, res) => {
  const bikes = await bikeService.listByUser(req.params.userId);
  res.json(apiResponse.success(bikes));
});

exports.getById = catchAsync(async (req, res) => {
  const bike = await bikeService.getById(req.params.id);
  res.json(apiResponse.success(bike));
});

exports.update = catchAsync(async (req, res) => {
  const bike = await bikeService.updateBike(req.user.id, req.params.id, req.body, req.file);
  res.json(apiResponse.success(bike, "Bike updated"));
});

exports.setPrimary = catchAsync(async (req, res) => {
  const bike = await bikeService.setPrimary(req.user.id, req.params.id);
  res.json(apiResponse.success(bike, "Set as current ride"));
});

exports.remove = catchAsync(async (req, res) => {
  await bikeService.deleteBike(req.user.id, req.params.id);
  res.json(apiResponse.success(null, "Bike deleted"));
});
```

- [ ] **Step 2: Verify it loads**

Run: `node -e "console.log(Object.keys(require('./controllers/bikeController')))"`
Expected: `[ 'create', 'listByUser', 'getById', 'update', 'setPrimary', 'remove' ]`

- [ ] **Step 3: Commit**

```bash
git add controllers/bikeController.js
git commit -m "$(cat <<'EOF'
feat: add bikeController as thin catchAsync wrappers

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Bike routes (with explicit middleware ordering)

**Files:**
- Create: `routes/bikeRoutes.js`

**CRITICAL:** multer (`upload.single("photo")`) MUST run **before** `validate(schema)` because Joi validates `req.body`, which is empty until multer parses the multipart payload. Match the existing pattern from `routes/postRoutes.js`.

- [ ] **Step 1: Create `routes/bikeRoutes.js`**

```javascript
const express = require("express");
const router = express.Router();

const { protect, optionalAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const validate = require("../middleware/validate");
const { uploadLimiter } = require("../middleware/rateLimiter");

const bikeController = require("../controllers/bikeController");
const { createBikeSchema, updateBikeSchema } = require("../validators/bikeValidator");

/* CREATE BIKE (multipart) */
router.post(
  "/",
  uploadLimiter,
  protect,
  upload.single("photo"),
  validate(createBikeSchema),
  bikeController.create
);

/* LIST GARAGE FOR A USER */
router.get("/user/:userId", optionalAuth, bikeController.listByUser);

/* SINGLE BIKE */
router.get("/:id", optionalAuth, bikeController.getById);

/* UPDATE BIKE (multipart) */
router.put(
  "/:id",
  uploadLimiter,
  protect,
  upload.single("photo"),
  validate(updateBikeSchema),
  bikeController.update
);

/* SET PRIMARY */
router.put("/:id/primary", protect, bikeController.setPrimary);

/* DELETE BIKE */
router.delete("/:id", protect, bikeController.remove);

module.exports = router;
```

- [ ] **Step 2: Verify it loads**

Run: `node -e "require('./routes/bikeRoutes'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add routes/bikeRoutes.js
git commit -m "$(cat <<'EOF'
feat: add bike routes with multer-before-validate ordering

Multer parses multipart before Joi validates req.body. Matches
postRoutes pattern. uploadLimiter pinned on create + update routes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Register `/bikes` in routes/index.js

**Files:**
- Modify: `routes/index.js`

- [ ] **Step 1: Add the line**

Edit `routes/index.js` — add `router.use("/bikes", require("./bikeRoutes"));` next to the other resource registrations (after `/users`):

```javascript
router.use("/auth", require("./authRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/bikes", require("./bikeRoutes"));   // <-- new
router.use("/posts", require("./postRoutes"));
// ... rest unchanged
```

- [ ] **Step 2: Smoke test the express app loads**

Run: `node -e "require('./routes/index'); console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add routes/index.js
git commit -m "$(cat <<'EOF'
feat: mount bike routes at /api/bikes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Bike routes integration tests

**Files:**
- Create: `tests/integration/bikes.test.js`

Note: All bike create/update routes use multer for multipart. In supertest tests we exercise these via `.field()` + `.attach()`. We need a tiny dummy file to attach. We can use any small file (e.g., `package.json` or a buffer).

- [ ] **Step 1: Create the integration test file**

```javascript
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
const path = require("path");
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

// Tiny dummy file for multer attachments — package.json works as bytes
const dummyFile = path.join(__dirname, "..", "..", "package.json");

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
    req.attach("photo", dummyFile);

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
    req.attach("photo", dummyFile);

    const res = await req;
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("401 without auth", async () => {
    const req = request(app).post("/api/bikes");
    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));
    req.attach("photo", dummyFile);

    const res = await req;
    expect(res.status).toBe(401);
  });

  it("400 GARAGE_FULL when at cap", async () => {
    for (let i = 0; i < 10; i++) await createBike(user._id, { model: `Bike${i}` });

    const req = request(app)
      .post("/api/bikes")
      .set("Authorization", `Bearer ${token}`);
    Object.entries(validBikeFields).forEach(([k, v]) => req.field(k, v));
    req.attach("photo", dummyFile);

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
    await createBike(user._id, { model: "Middle" });
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
```

- [ ] **Step 2: Run integration tests**

Run: `npx jest tests/integration/bikes.test.js --silent`
Expected: PASS — all bike integration tests green

- [ ] **Step 3: Run full test suite to verify no regression**

Run: `npm test`
Expected: PASS — all existing tests still green plus the new bike suite

- [ ] **Step 4: Commit**

```bash
git add tests/integration/bikes.test.js
git commit -m "$(cat <<'EOF'
test: integration tests for bike routes

Covers POST/GET/PUT/DELETE happy paths, validation, auth (401),
ownership (404), and GARAGE_FULL cap.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Frontend phase

### Task 13: Extend `api.upload` to accept method param

**Files:**
- Modify: `frontend/src/utils/api.js`

- [ ] **Step 1: Read the current `upload()` function**

Read `frontend/src/utils/api.js:256-262`. Current implementation:
```javascript
async upload(url, formData) {
  return request(url, {
    method: 'POST',
    headers: buildHeaders(true),
    body: formData,
  });
},
```

- [ ] **Step 2: Modify to accept optional method**

Change the function to:
```javascript
async upload(url, formData, method = 'POST') {
  return request(url, {
    method,
    headers: buildHeaders(true),
    body: formData,
  });
},
```

- [ ] **Step 3: Verify existing callers still work**

Run: `cd frontend && grep -rn "api.upload" src/`
Expected: only `create-post.js` and `edit-profile.js` callers — both pass exactly 2 args, so the `'POST'` default applies. No regression.

- [ ] **Step 4: Run vite build to confirm syntax**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/api.js
git commit -m "$(cat <<'EOF'
feat(frontend): extend api.upload to accept optional method param

Default 'POST' keeps existing callers unchanged. Bike feature uses 'PUT'
for photo replacement on edit.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Create bikeApi utility

**Files:**
- Create: `frontend/src/utils/bikeApi.js`

- [ ] **Step 1: Create `frontend/src/utils/bikeApi.js`**

```javascript
/**
 * Bike API client — wraps the standard api utility.
 */

import { api } from './api.js';

export const bikeApi = {
  create(formData) {
    return api.upload('/api/bikes', formData);
  },
  listByUser(userId) {
    return api.get('/api/bikes/user/' + userId);
  },
  get(bikeId) {
    return api.get('/api/bikes/' + bikeId);
  },
  update(bikeId, formData) {
    return api.upload('/api/bikes/' + bikeId, formData, 'PUT');
  },
  setPrimary(bikeId) {
    return api.put('/api/bikes/' + bikeId + '/primary', {});
  },
  remove(bikeId) {
    return api.delete('/api/bikes/' + bikeId);
  },
};
```

- [ ] **Step 2: Run vite build**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/utils/bikeApi.js
git commit -m "$(cat <<'EOF'
feat(frontend): add bikeApi client utility

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: Create add-bike page

**Files:**
- Create: `frontend/src/pages/add-bike.js`

The page follows the v2 flat IG/X/Threads pattern: namespaced CSS prefix `.ab-`, sticky red-text-only Save header, divider rows for fields, photo picker at top.

- [ ] **Step 1: Create `frontend/src/pages/add-bike.js`**

```javascript
/**
 * Add Bike page — v2 flat. Required photo, brand, model, year, type, engineCC, color, optional nickname.
 */

import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;
const CAMERA_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];

let blobUrl = null;

export function render() {
  return `
    <style>
      .ab-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .ab-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .ab-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .ab-back:active { background: rgba(243,243,243,0.06); }
      .ab-title { flex: 1; font-size: 16px; font-weight: 700; }
      .ab-save { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 700; padding: 8px 10px; cursor: pointer; font-family: 'Poppins', sans-serif; }
      .ab-save:disabled { opacity: 0.4; cursor: not-allowed; }

      .ab-photo-picker { padding: 18px 16px 6px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .ab-photo-frame { width: 100%; max-width: 320px; aspect-ratio: 4/3; border-radius: 12px; background: #1E1E1E; border: 1px dashed rgba(243,243,243,0.18); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(243,243,243,0.5); }
      .ab-photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .ab-photo-cta { display: flex; align-items: center; gap: 8px; font-size: 13px; }

      .ab-error { margin: 0 16px 8px; padding: 10px 12px; border-radius: 10px; background: rgba(229,57,53,0.10); color: #E53935; font-size: 13px; font-weight: 500; }

      .ab-field { display: flex; flex-direction: column; padding: 12px 16px; border-bottom: 1px solid rgba(243,243,243,0.06); gap: 4px; }
      .ab-label { font-size: 12px; color: rgba(243,243,243,0.5); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
      .ab-input { background: transparent; border: none; outline: none; padding: 6px 0; color: #F3F3F3; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; width: 100%; }
      .ab-input::placeholder { color: rgba(243,243,243,0.35); }

      .ab-types { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 0 4px; }
      .ab-type { background: transparent; border: 1px solid rgba(243,243,243,0.18); color: rgba(243,243,243,0.85); font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500; padding: 7px 12px; border-radius: 999px; cursor: pointer; text-transform: capitalize; }
      .ab-type.active { background: #E53935; border-color: #E53935; color: #fff; }
    </style>

    <div class="ab-wrap">
      <header class="ab-nav">
        <button class="ab-back" id="ab-back" aria-label="Back">${BACK_ICON}</button>
        <div class="ab-title">New bike</div>
        <button class="ab-save" id="ab-save" disabled>Save</button>
      </header>

      <section class="ab-photo-picker">
        <div class="ab-photo-frame" id="ab-photo-frame">
          <div class="ab-photo-cta">${CAMERA_ICON}<span>Add photo</span></div>
        </div>
        <input type="file" id="ab-file" accept="image/*" style="display:none;" />
      </section>

      <div id="ab-error-wrap"></div>

      <form class="ab-form" id="ab-form" novalidate>
        <div class="ab-field">
          <label class="ab-label" for="ab-brand">Brand</label>
          <input class="ab-input" id="ab-brand" type="text" placeholder="Yamaha" maxlength="50" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-model">Model</label>
          <input class="ab-input" id="ab-model" type="text" placeholder="MT-15" maxlength="50" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-year">Year</label>
          <input class="ab-input" id="ab-year" type="number" inputmode="numeric" placeholder="2023" min="1900" max="${new Date().getFullYear() + 1}" />
        </div>
        <div class="ab-field">
          <label class="ab-label">Type</label>
          <div class="ab-types" id="ab-types">
            ${TYPES.map((t) => `<button type="button" class="ab-type" data-type="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-cc">Engine cc</label>
          <input class="ab-input" id="ab-cc" type="number" inputmode="numeric" placeholder="155" min="50" max="3000" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-color">Color</label>
          <input class="ab-input" id="ab-color" type="text" placeholder="Cyan" maxlength="30" />
        </div>
        <div class="ab-field">
          <label class="ab-label" for="ab-nickname">Nickname (optional)</label>
          <input class="ab-input" id="ab-nickname" type="text" placeholder="Beast" maxlength="40" />
        </div>
      </form>
    </div>
  `;
}

export function mount() {
  const $ = (id) => document.getElementById(id);
  const back = $('ab-back');
  const save = $('ab-save');
  const fileInput = $('ab-file');
  const photoFrame = $('ab-photo-frame');
  const errorWrap = $('ab-error-wrap');
  const types = $('ab-types');

  let selectedFile = null;
  let selectedType = '';

  if (back) back.addEventListener('click', () => navigate('/profile'));

  if (photoFrame && fileInput) {
    photoFrame.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      selectedFile = file;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(file);
      photoFrame.innerHTML = `<img src="${blobUrl}" alt="">`;
      updateSaveEnabled();
    });
  }

  if (types) {
    types.addEventListener('click', (e) => {
      const btn = e.target.closest('.ab-type');
      if (!btn) return;
      selectedType = btn.dataset.type;
      types.querySelectorAll('.ab-type').forEach((b) => b.classList.toggle('active', b === btn));
      updateSaveEnabled();
    });
  }

  ['ab-brand','ab-model','ab-year','ab-cc','ab-color'].forEach((id) => {
    const el = $(id);
    if (el) el.addEventListener('input', updateSaveEnabled);
  });

  function updateSaveEnabled() {
    const brand = $('ab-brand')?.value.trim();
    const model = $('ab-model')?.value.trim();
    const year = $('ab-year')?.value.trim();
    const cc = $('ab-cc')?.value.trim();
    const color = $('ab-color')?.value.trim();
    const ok = !!(selectedFile && brand && model && year && selectedType && cc && color);
    if (save) save.disabled = !ok;
  }

  function showError(msg) {
    if (errorWrap) errorWrap.innerHTML = `<div class="ab-error">${msg}</div>`;
  }
  function clearError() { if (errorWrap) errorWrap.innerHTML = ''; }

  if (save) {
    save.addEventListener('click', async () => {
      clearError();
      save.disabled = true;
      save.textContent = 'Saving';
      try {
        const fd = new FormData();
        fd.append('photo', selectedFile);
        fd.append('brand', $('ab-brand').value.trim());
        fd.append('model', $('ab-model').value.trim());
        fd.append('year', $('ab-year').value.trim());
        fd.append('type', selectedType);
        fd.append('engineCC', $('ab-cc').value.trim());
        fd.append('color', $('ab-color').value.trim());
        const nickname = $('ab-nickname').value.trim();
        if (nickname) fd.append('nickname', nickname);

        const res = await bikeApi.create(fd);
        if (res.success) navigate('/profile');
        else {
          showError(res.error?.message || 'Failed to save bike.');
          save.disabled = false;
          save.textContent = 'Save';
        }
      } catch {
        showError('Network error. Please try again.');
        save.disabled = false;
        save.textContent = 'Save';
      }
    });
  }
}

export function cleanup() {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
}
```

- [ ] **Step 2: Build to verify syntax**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/add-bike.js
git commit -m "$(cat <<'EOF'
feat(frontend): add add-bike page (v2 flat style)

Photo picker, type segmented selector, char-bounded inputs.
Save enables only when all required fields populated. Cleanup
revokes blob URL on navigation away.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: Create edit-bike page

**Files:**
- Create: `frontend/src/pages/edit-bike.js`

The edit page is the same form prefilled, with a different save handler that calls `bikeApi.update`.

- [ ] **Step 1: Create `frontend/src/pages/edit-bike.js`**

```javascript
/**
 * Edit Bike page — same form shape as add-bike, prefilled. v2 flat.
 */

import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;
const CAMERA_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

const TYPES = ["sport", "cruiser", "adventure", "naked", "tourer", "off-road", "scooter", "other"];

let blobUrl = null;
let pageContext = null;

export function render(ctx) {
  pageContext = ctx;
  return `
    <style>
      .eb-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .eb-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .eb-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .eb-back:active { background: rgba(243,243,243,0.06); }
      .eb-title { flex: 1; font-size: 16px; font-weight: 700; }
      .eb-save { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 700; padding: 8px 10px; cursor: pointer; font-family: 'Poppins', sans-serif; }
      .eb-save:disabled { opacity: 0.4; cursor: not-allowed; }

      .eb-photo-picker { padding: 18px 16px 6px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .eb-photo-frame { width: 100%; max-width: 320px; aspect-ratio: 4/3; border-radius: 12px; background: #1E1E1E; border: 1px dashed rgba(243,243,243,0.18); overflow: hidden; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(243,243,243,0.5); }
      .eb-photo-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .eb-photo-cta { display: flex; align-items: center; gap: 8px; font-size: 13px; }
      .eb-photo-replace { background: transparent; border: none; color: #E53935; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Poppins', sans-serif; padding: 4px 8px; }

      .eb-error { margin: 0 16px 8px; padding: 10px 12px; border-radius: 10px; background: rgba(229,57,53,0.10); color: #E53935; font-size: 13px; font-weight: 500; }

      .eb-field { display: flex; flex-direction: column; padding: 12px 16px; border-bottom: 1px solid rgba(243,243,243,0.06); gap: 4px; }
      .eb-label { font-size: 12px; color: rgba(243,243,243,0.5); font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
      .eb-input { background: transparent; border: none; outline: none; padding: 6px 0; color: #F3F3F3; font-size: 16px; font-weight: 500; font-family: 'Poppins', sans-serif; width: 100%; }
      .eb-input::placeholder { color: rgba(243,243,243,0.35); }

      .eb-types { display: flex; flex-wrap: wrap; gap: 8px; padding: 6px 0 4px; }
      .eb-type { background: transparent; border: 1px solid rgba(243,243,243,0.18); color: rgba(243,243,243,0.85); font-family: 'Poppins', sans-serif; font-size: 12px; font-weight: 500; padding: 7px 12px; border-radius: 999px; cursor: pointer; text-transform: capitalize; }
      .eb-type.active { background: #E53935; border-color: #E53935; color: #fff; }
    </style>

    <div class="eb-wrap">
      <header class="eb-nav">
        <button class="eb-back" id="eb-back" aria-label="Back">${BACK_ICON}</button>
        <div class="eb-title">Edit bike</div>
        <button class="eb-save" id="eb-save">Save</button>
      </header>

      <section class="eb-photo-picker">
        <div class="eb-photo-frame" id="eb-photo-frame">
          <div class="eb-photo-cta">${CAMERA_ICON}<span>Loading…</span></div>
        </div>
        <button class="eb-photo-replace" id="eb-photo-replace" type="button">Replace photo</button>
        <input type="file" id="eb-file" accept="image/*" style="display:none;" />
      </section>

      <div id="eb-error-wrap"></div>

      <form class="eb-form" id="eb-form" novalidate>
        <div class="eb-field">
          <label class="eb-label" for="eb-brand">Brand</label>
          <input class="eb-input" id="eb-brand" type="text" maxlength="50" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-model">Model</label>
          <input class="eb-input" id="eb-model" type="text" maxlength="50" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-year">Year</label>
          <input class="eb-input" id="eb-year" type="number" inputmode="numeric" min="1900" max="${new Date().getFullYear() + 1}" />
        </div>
        <div class="eb-field">
          <label class="eb-label">Type</label>
          <div class="eb-types" id="eb-types">
            ${TYPES.map((t) => `<button type="button" class="eb-type" data-type="${t}">${t}</button>`).join('')}
          </div>
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-cc">Engine cc</label>
          <input class="eb-input" id="eb-cc" type="number" inputmode="numeric" min="50" max="3000" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-color">Color</label>
          <input class="eb-input" id="eb-color" type="text" maxlength="30" />
        </div>
        <div class="eb-field">
          <label class="eb-label" for="eb-nickname">Nickname (optional)</label>
          <input class="eb-input" id="eb-nickname" type="text" maxlength="40" />
        </div>
      </form>
    </div>
  `;
}

export function mount(ctx) {
  pageContext = ctx;
  const bikeId = ctx?.params?.id;
  const $ = (id) => document.getElementById(id);

  const back = $('eb-back');
  const save = $('eb-save');
  const fileInput = $('eb-file');
  const photoFrame = $('eb-photo-frame');
  const replaceBtn = $('eb-photo-replace');
  const types = $('eb-types');
  const errorWrap = $('eb-error-wrap');

  let selectedFile = null;
  let selectedType = '';

  if (back) back.addEventListener('click', () => navigate('/profile'));

  loadBike();

  async function loadBike() {
    if (!bikeId) return;
    try {
      const res = await bikeApi.get(bikeId);
      if (res.success && res.data) {
        const b = res.data;
        $('eb-brand').value = b.brand || '';
        $('eb-model').value = b.model || '';
        $('eb-year').value = b.year || '';
        $('eb-cc').value = b.engineCC || '';
        $('eb-color').value = b.color || '';
        $('eb-nickname').value = b.nickname || '';
        selectedType = b.type || '';
        types?.querySelectorAll('.eb-type').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.type === selectedType);
        });
        if (b.photo?.url) {
          photoFrame.innerHTML = `<img src="${b.photo.url}" alt="">`;
        }
      }
    } catch {
      showError('Failed to load bike data.');
    }
  }

  if (replaceBtn && fileInput) {
    replaceBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      selectedFile = file;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      blobUrl = URL.createObjectURL(file);
      photoFrame.innerHTML = `<img src="${blobUrl}" alt="">`;
    });
  }

  if (types) {
    types.addEventListener('click', (e) => {
      const btn = e.target.closest('.eb-type');
      if (!btn) return;
      selectedType = btn.dataset.type;
      types.querySelectorAll('.eb-type').forEach((b) => b.classList.toggle('active', b === btn));
    });
  }

  function showError(msg) { if (errorWrap) errorWrap.innerHTML = `<div class="eb-error">${msg}</div>`; }
  function clearError() { if (errorWrap) errorWrap.innerHTML = ''; }

  if (save) {
    save.addEventListener('click', async () => {
      clearError();
      save.disabled = true;
      save.textContent = 'Saving';
      try {
        const fd = new FormData();
        if (selectedFile) fd.append('photo', selectedFile);
        fd.append('brand', $('eb-brand').value.trim());
        fd.append('model', $('eb-model').value.trim());
        fd.append('year', $('eb-year').value.trim());
        fd.append('type', selectedType);
        fd.append('engineCC', $('eb-cc').value.trim());
        fd.append('color', $('eb-color').value.trim());
        fd.append('nickname', $('eb-nickname').value.trim());

        const res = await bikeApi.update(bikeId, fd);
        if (res.success) navigate('/profile');
        else {
          showError(res.error?.message || 'Failed to update bike.');
          save.disabled = false;
          save.textContent = 'Save';
        }
      } catch {
        showError('Network error. Please try again.');
        save.disabled = false;
        save.textContent = 'Save';
      }
    });
  }
}

export function cleanup() {
  if (blobUrl) {
    URL.revokeObjectURL(blobUrl);
    blobUrl = null;
  }
}
```

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/edit-bike.js
git commit -m "$(cat <<'EOF'
feat(frontend): add edit-bike page (v2 flat style)

Prefills from bikeApi.get, sends multipart PUT with optional photo replace.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 17: Create bike-detail page

**Files:**
- Create: `frontend/src/pages/bike-detail.js`

- [ ] **Step 1: Create `frontend/src/pages/bike-detail.js`**

```javascript
/**
 * Bike Detail page — v2 flat. Hero photo + flat divider rows + owner actions.
 */

import { bikeApi } from '../utils/bikeApi.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser } from '../utils/auth.js';

const BACK_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>`;

export function render() {
  return `
    <style>
      .bd-wrap { min-height: 100dvh; background: #0C0C0C; color: #F3F3F3; font-family: 'Poppins', sans-serif; padding-bottom: 40px; }
      .bd-nav { position: sticky; top: 0; z-index: 10; background: #0C0C0C; border-bottom: 1px solid rgba(243,243,243,0.06); display: flex; align-items: center; padding: 10px 12px; gap: 8px; }
      .bd-back { width: 40px; height: 40px; border-radius: 50%; background: transparent; border: none; color: #F3F3F3; display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .bd-back:active { background: rgba(243,243,243,0.06); }
      .bd-title { flex: 1; font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      .bd-hero { width: 100%; max-height: 60vh; aspect-ratio: 4/3; background: #1E1E1E; }
      .bd-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }

      .bd-name { padding: 16px 20px 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
      .bd-nickname { padding: 0 20px 12px; font-size: 14px; color: rgba(243,243,243,0.6); }

      .bd-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(243,243,243,0.06); }
      .bd-row-label { font-size: 12px; color: rgba(243,243,243,0.5); text-transform: uppercase; letter-spacing: 0.02em; }
      .bd-row-value { font-size: 14.5px; color: #F3F3F3; font-weight: 600; text-transform: capitalize; }

      .bd-actions { display: flex; flex-direction: column; gap: 8px; padding: 18px 20px; }
      .bd-btn { width: 100%; height: 44px; border-radius: 10px; font-family: 'Poppins', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
      .bd-btn.primary { background: #E53935; color: #fff; border-color: #E53935; }
      .bd-btn.outline { background: transparent; color: #F3F3F3; border-color: rgba(243,243,243,0.18); }
      .bd-btn.danger { background: transparent; color: #E53935; border-color: rgba(229,57,53,0.35); }
      .bd-btn:active { opacity: 0.7; }

      .bd-loading { padding: 40px 20px; text-align: center; color: rgba(243,243,243,0.5); }
    </style>

    <div class="bd-wrap">
      <header class="bd-nav">
        <button class="bd-back" id="bd-back" aria-label="Back">${BACK_ICON}</button>
        <div class="bd-title" id="bd-title-text">Bike</div>
      </header>
      <div id="bd-content" class="bd-loading">Loading…</div>
    </div>
  `;
}

export function mount(ctx) {
  const bikeId = ctx?.params?.bikeId;
  const userId = ctx?.params?.userId;

  document.getElementById('bd-back')?.addEventListener('click', () => {
    if (userId) navigate('/user/' + userId); else navigate('/profile');
  });

  if (bikeId) loadBike(bikeId);

  async function loadBike(id) {
    try {
      const res = await bikeApi.get(id);
      if (!res.success || !res.data) {
        renderError(res.error?.message || 'Bike not found.');
        return;
      }
      renderBike(res.data);
    } catch {
      renderError('Network error.');
    }
  }

  function renderBike(b) {
    const me = getCurrentUser();
    const isOwner = me && b.owner && String(me.id || me._id) === String(b.owner._id || b.owner);
    const photoUrl = b.photo?.url;
    const titleText = `${b.brand || ''} ${b.model || ''}`.trim();
    document.getElementById('bd-title-text').textContent = titleText;

    const html = `
      <div class="bd-hero">
        ${photoUrl ? `<img src="${photoUrl}" alt="${escape(titleText)}">` : ''}
      </div>
      <div class="bd-name">${escape(titleText)}</div>
      ${b.nickname ? `<div class="bd-nickname">"${escape(b.nickname)}"</div>` : ''}
      <div class="bd-row"><span class="bd-row-label">Year</span><span class="bd-row-value">${b.year || ''}</span></div>
      <div class="bd-row"><span class="bd-row-label">Type</span><span class="bd-row-value">${escape(b.type || '')}</span></div>
      <div class="bd-row"><span class="bd-row-label">Engine</span><span class="bd-row-value">${b.engineCC || ''} cc</span></div>
      <div class="bd-row"><span class="bd-row-label">Color</span><span class="bd-row-value">${escape(b.color || '')}</span></div>
      ${isOwner ? `
        <div class="bd-actions">
          <button class="bd-btn primary" id="bd-edit">Edit</button>
          ${b.isPrimary ? '' : '<button class="bd-btn outline" id="bd-primary">Set as current ride</button>'}
          <button class="bd-btn danger" id="bd-delete">Delete</button>
        </div>
      ` : ''}
    `;
    document.getElementById('bd-content').className = '';
    document.getElementById('bd-content').innerHTML = html;

    if (isOwner) {
      document.getElementById('bd-edit')?.addEventListener('click', () => navigate('/edit-bike/' + b._id));
      document.getElementById('bd-primary')?.addEventListener('click', async () => {
        try {
          await bikeApi.setPrimary(b._id);
          navigate('/profile');
        } catch {
          alert('Failed to set as current ride.');
        }
      });
      document.getElementById('bd-delete')?.addEventListener('click', async () => {
        if (!confirm('Delete this bike? This cannot be undone.')) return;
        try {
          const r = await bikeApi.remove(b._id);
          if (r.success) navigate('/profile'); else alert(r.error?.message || 'Failed to delete.');
        } catch {
          alert('Network error.');
        }
      });
    }
  }

  function renderError(msg) {
    document.getElementById('bd-content').className = 'bd-loading';
    document.getElementById('bd-content').textContent = msg;
  }
}

export function cleanup() {
  // No persistent state — no-op for uniformity with other pages.
}

function escape(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
```

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/bike-detail.js
git commit -m "$(cat <<'EOF'
feat(frontend): add bike-detail page (v2 flat style)

Hero photo + flat divider rows for year/type/engine/color.
Owner-only actions: Edit, Set as current ride (hidden if already primary), Delete with confirm.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 18: Register bike pages in main.js router

**Files:**
- Modify: `frontend/src/main.js`

- [ ] **Step 1: Add three imports near the top of `main.js`** (next to other page imports around line 180):

```javascript
import { render as renderAddBike, mount as mountAddBike, cleanup as cleanupAddBike } from './pages/add-bike.js';
import { render as renderEditBike, mount as mountEditBike, cleanup as cleanupEditBike } from './pages/edit-bike.js';
import { render as renderBikeDetail, mount as mountBikeDetail, cleanup as cleanupBikeDetail } from './pages/bike-detail.js';
```

- [ ] **Step 2: Add three `registerRoute` calls** after the `/edit-profile` registration (around line 297):

```javascript
registerRoute('/add-bike', () => {
  if (!requireAuth()) return;
  showPage(renderAddBike, mountAddBike, {}, cleanupAddBike);
});

registerRoute('/edit-bike/:id', (ctx) => {
  if (!requireAuth()) return;
  showPage(() => renderEditBike(ctx), () => mountEditBike(ctx), {}, cleanupEditBike);
});

registerRoute('/garage/:userId/:bikeId', (ctx) => {
  showPage(() => renderBikeDetail(ctx), () => mountBikeDetail(ctx), {}, cleanupBikeDetail);
});
```

- [ ] **Step 3: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/main.js
git commit -m "$(cat <<'EOF'
feat(frontend): register garage routes in SPA router

/add-bike, /edit-bike/:id, /garage/:userId/:bikeId. All pass
cleanup as the showPage 4th arg for blob-URL teardown.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 19: Profile page — garage tab + grid + FAB

**Files:**
- Modify: `frontend/src/pages/profile.js`

This is the largest single change. Add a 2-tab strip below the existing actions row, swap content between Posts grid and Garage grid based on active tab, add FAB on Garage tab when at < cap.

- [ ] **Step 1: Read the current profile.js to find the right insertion points**

Run: `cd frontend && grep -n "pf-actions\|return \`\|\.pf-grid\|posts-grid\|export function mount" src/pages/profile.js | head -30`
Use the output to identify (a) where the action buttons block ends and the posts grid starts, and (b) where in `mount()` to wire tab clicks and garage fetch.

- [ ] **Step 2: Add tab strip CSS to the page's `<style>` block**

Inside `render()`'s `<style>` block, append:

```css
.pf-tabs { display: flex; border-top: 1px solid rgba(243,243,243,0.06); border-bottom: 1px solid rgba(243,243,243,0.06); }
.pf-tab { flex: 1; background: transparent; border: none; color: rgba(243,243,243,0.5); font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600; padding: 12px 0; cursor: pointer; position: relative; }
.pf-tab.active { color: #F3F3F3; }
.pf-tab.active::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 32px; height: 2px; background: #E53935; border-radius: 2px; }

.pf-garage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; padding: 2px; }
.pf-bike-card { aspect-ratio: 4/3; background: #1E1E1E; position: relative; overflow: hidden; border-radius: 4px; cursor: pointer; }
.pf-bike-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pf-bike-overlay { position: absolute; left: 0; right: 0; bottom: 0; padding: 8px 10px; background: rgba(0,0,0,0.55); }
.pf-bike-name { font-size: 13.5px; font-weight: 600; color: #F3F3F3; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pf-bike-spec { font-size: 11.5px; color: rgba(243,243,243,0.6); margin-top: 2px; }
.pf-bike-star { position: absolute; top: 8px; right: 8px; width: 22px; height: 22px; border-radius: 50%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: #E53935; }

.pf-empty { padding: 40px 24px; text-align: center; color: rgba(243,243,243,0.5); }
.pf-empty-cta { background: transparent; border: none; color: #E53935; font-size: 14px; font-weight: 600; margin-top: 8px; cursor: pointer; font-family: 'Poppins', sans-serif; }

.pf-fab { position: fixed; bottom: 80px; right: 16px; width: 56px; height: 56px; border-radius: 50%; background: #E53935; color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 5; }
.pf-fab:active { transform: scale(0.95); }
```

- [ ] **Step 3: Add tab strip + content host to the rendered HTML**

In `render()`, after the `</div>` that closes the actions row (`.pf-actions`), insert:

```html
<div class="pf-tabs">
  <button class="pf-tab active" id="pf-tab-posts" data-tab="posts">Posts</button>
  <button class="pf-tab" id="pf-tab-garage" data-tab="garage">Garage</button>
</div>
<div id="pf-tab-content"><!-- content swapped by mount() --></div>
<button class="pf-fab" id="pf-fab" aria-label="Add bike" style="display:none;">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
</button>
```

Move the existing posts-grid block into the `mount()` flow (it now renders into `#pf-tab-content` when the Posts tab is active).

- [ ] **Step 4: Wire tab switching + garage fetch in `mount()`**

Add at the bottom of `mount()`:

```javascript
import { bikeApi } from '../utils/bikeApi.js';  // top of file

let activeTab = 'posts';
let cachedBikes = null;

const tabPosts = document.getElementById('pf-tab-posts');
const tabGarage = document.getElementById('pf-tab-garage');
const tabContent = document.getElementById('pf-tab-content');
const fab = document.getElementById('pf-fab');

if (tabPosts) tabPosts.addEventListener('click', () => switchTab('posts'));
if (tabGarage) tabGarage.addEventListener('click', () => switchTab('garage'));
if (fab) fab.addEventListener('click', () => navigate('/add-bike'));

renderActiveTab();

async function switchTab(tab) {
  activeTab = tab;
  [tabPosts, tabGarage].forEach((b) => b?.classList.toggle('active', b?.dataset.tab === tab));
  renderActiveTab();
}

async function renderActiveTab() {
  if (!tabContent) return;
  if (activeTab === 'posts') {
    renderPostsTab();
    if (fab) fab.style.display = 'none';
    return;
  }
  await renderGarageTab();
}

function renderPostsTab() {
  // Re-render the existing posts grid HTML (extracted from prior render() into a helper).
  tabContent.innerHTML = currentPostsHtml(); // implement: returns the same posts grid markup currently in render()
}

async function renderGarageTab() {
  tabContent.innerHTML = '<div class="pf-empty">Loading garage…</div>';
  try {
    if (!cachedBikes) {
      const me = getCurrentUser();
      const res = await bikeApi.listByUser(me.id || me._id);
      cachedBikes = res.success ? (res.data || []) : [];
    }
    const tabBadge = document.getElementById('pf-tab-garage');
    if (tabBadge) tabBadge.textContent = `Garage · ${cachedBikes.length}`;

    if (fab) fab.style.display = cachedBikes.length >= 10 ? 'none' : 'flex';

    if (cachedBikes.length === 0) {
      tabContent.innerHTML = `
        <div class="pf-empty">
          <div>Your garage is empty</div>
          <button class="pf-empty-cta" id="pf-add-first">Add your first bike</button>
        </div>`;
      document.getElementById('pf-add-first')?.addEventListener('click', () => navigate('/add-bike'));
      return;
    }

    const me = getCurrentUser();
    const myId = me?.id || me?._id;
    tabContent.innerHTML = `
      <div class="pf-garage-grid">
        ${cachedBikes.map((b) => `
          <div class="pf-bike-card" data-id="${b._id}">
            <img src="${b.photo?.url || ''}" alt="">
            ${b.isPrimary ? '<div class="pf-bike-star">★</div>' : ''}
            <div class="pf-bike-overlay">
              <div class="pf-bike-name">${escapeText(b.brand)} ${escapeText(b.model)}</div>
              <div class="pf-bike-spec">${b.year} · ${b.engineCC}cc</div>
            </div>
          </div>
        `).join('')}
      </div>`;
    tabContent.querySelectorAll('.pf-bike-card').forEach((el) => {
      el.addEventListener('click', () => navigate('/garage/' + myId + '/' + el.dataset.id));
    });
  } catch {
    tabContent.innerHTML = '<div class="pf-empty">Couldn\'t load garage.</div>';
  }
}

function escapeText(s) { return String(s || '').replace(/[<>&"']/g, (c) => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;' }[c])); }
```

> **Note for the executor:** "Move the posts grid into a helper `currentPostsHtml()`" requires extracting the existing posts-grid markup from the current `render()` body. Read `pages/profile.js` carefully and refactor — keep the grid markup identical, just relocate it.

- [ ] **Step 5: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/profile.js
git commit -m "$(cat <<'EOF'
feat(frontend): add Garage tab to own profile

Tab strip below action buttons. Posts grid moved under Posts tab.
Garage tab fetches bikes via bikeApi, renders 2-col card grid with
isPrimary star, hooks card taps to /garage/:userId/:bikeId, FAB to
/add-bike (hidden on Posts and when garage at 10/10).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 20: User-profile page — read-only garage tab

**Files:**
- Modify: `frontend/src/pages/user-profile.js`

Same shape as Task 19 but no FAB, no 3-dot menu, and the bike card tap navigates to `/garage/:viewedUserId/:bikeId`.

- [ ] **Step 1: Apply the same tab + grid changes as Task 19**

Following the same pattern:
- Add CSS for `.up-tabs`, `.up-tab`, `.up-garage-grid`, `.up-bike-card`, etc. (use `.up-` prefix matching the existing user-profile namespace)
- Add tab strip + content host to `render()`
- In `mount()`, wire tab switching and `bikeApi.listByUser(viewedUserId)` fetch
- **No FAB**, **no 3-dot menu** — visitor can only tap to view detail
- The bike count badge updates the same way

- [ ] **Step 2: Build to verify**

Run: `cd frontend && npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/user-profile.js
git commit -m "$(cat <<'EOF'
feat(frontend): add read-only Garage tab to user-profile

Same tab strip and 2-col grid as own profile, but no FAB / no
3-dot menu. Card tap navigates to /garage/:userId/:bikeId.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 21: Build APK and verify end-to-end

**Files:** none

- [ ] **Step 1: Run full backend test suite**

Run: `npm test`
Expected: ALL tests green (existing + new bike unit + new bike integration). Total bike tests added: ~15 unit + ~12 integration.

- [ ] **Step 2: Vite production build**

Run: `cd frontend && npm run build`
Expected: built in <10s.

- [ ] **Step 3: Capacitor sync**

Run: `cd frontend && npx cap sync android`
Expected: Sync finishes successfully, web assets and plugins synced.

- [ ] **Step 4: Gradle assembleDebug**

Run (PowerShell): `Set-Location 'frontend\android'; .\gradlew.bat assembleDebug`
Expected: BUILD SUCCESSFUL. APK at `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

- [ ] **Step 5: Manual QA checklist (deploy APK to phone or emulator)**

Per spec §8.3:
- [ ] Login → Profile shows new "Posts | Garage" tabs.
- [ ] Tap Garage tab → empty state with "Add your first bike" button.
- [ ] Tap FAB or "Add your first bike" → `/add-bike` opens.
- [ ] Add bike happy path: select photo, fill all fields, Save → bike appears in garage grid.
- [ ] Open user-profile of another user → Garage tab is visible but read-only (no FAB).
- [ ] Tap bike card → bike-detail opens, with photo + spec rows + owner actions (or read-only for non-owner).
- [ ] Edit bike: replace photo → updates, old Cloudinary asset destroyed (verify in Cloudinary console).
- [ ] Set as current ride: star appears on the right card in the garage grid.
- [ ] Delete primary bike: garage updates, no star remains, no error.
- [ ] Garage at 10/10: FAB hidden.

- [ ] **Step 6: Final commit (no code change — just summary)**

If steps 1-5 all pass, the feature is complete. No additional commit needed unless QA reveals fixes.

If any QA finding requires a code fix, add it as a follow-up commit before declaring done.

---

## Acceptance criteria (review checklist before declaring complete)

- [ ] All backend unit tests pass: `npx jest tests/unit/bikeService.test.js` → green
- [ ] All backend integration tests pass: `npx jest tests/integration/bikes.test.js` → green
- [ ] Full test suite passes: `npm test` → green (no regressions in other tests)
- [ ] Frontend Vite build passes with no warnings
- [ ] Capacitor sync passes
- [ ] Gradle assembleDebug succeeds
- [ ] APK installs and Garage feature works end-to-end per QA checklist
- [ ] All 21 commits landed in order on the working branch
- [ ] Commit messages follow the repo convention (`feat:`, `test:`, `docs:` prefixes; Co-Authored-By trailer)
- [ ] No code uses 403 for non-owner on bike routes (must be 404 per spec §4.3)
- [ ] No `.includes(targetId)` for ObjectId comparison anywhere (must use `String(...)` per CLAUDE.md)
- [ ] No `fs.unlinkSync` (use `fs.promises.unlink` per CLAUDE.md)
- [ ] No raw `console.log` in service code (Pino logger used in non-test code)
