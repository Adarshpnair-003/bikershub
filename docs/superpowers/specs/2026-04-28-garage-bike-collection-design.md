# Garage — Bike Collection on User Profile

**Status:** Approved (brainstorming → spec)
**Author:** Claude (with Adarsh)
**Date:** 2026-04-28
**Project:** Bikers Hub

---

## 1. Summary

Add a **Garage** feature to user profiles. Users can add, edit, view, and delete the bikes they own. Each user's profile gains a second tab next to "Posts" — "Garage" — that displays a 2-column grid of bike cards with a hero photo and key specs. Tapping a bike opens a full detail page. Users can mark one bike as their "current ride" inside the garage tab.

The feature is implemented as a new `Bike` resource in the existing layered MVC backend, with five new frontend pages following the v2 flat IG/X/Threads visual language already established in the app.

---

## 2. Goals & non-goals

### Goals
- Let users showcase the bikes they own as part of their public identity.
- Match the existing layered MVC backend pattern (Model → Service → Validator → Controller → Routes).
- Match the existing v2 flat dark UI language (no gradients on chrome, no backdrop-blur, divider rows, red text-only header actions, namespaced page CSS).
- Keep mobile UX fast — the form must be filling-once-friendly on a phone.

### Non-goals (v1)
- Bike-level likes, comments, or social engagement
- Multi-photo gallery per bike
- Global search by bike brand/model
- Modifications, odometer, owned-since date, free-text story
- Drag-to-reorder garage grid
- Surfacing the primary bike outside the garage tab (e.g., on post/ride cards or profile header)
- Migrating legacy `bikeBrand/bikeModel/bikeYear` fields — they were referenced in old controller code but never persisted via the schema; nothing to migrate.

---

## 3. Data model

### 3.1 New collection: `bikes`

```javascript
// models/Bike.js
{
  owner:    { type: ObjectId, ref: "User", required: true, index: true },
  brand:    { type: String, required: true, trim: true, maxlength: 50 },
  model:    { type: String, required: true, trim: true, maxlength: 50 },
  year:     { type: Number, required: true, min: 1900, max: new Date().getFullYear() + 1 },
  type:     { type: String, enum: ["sport","cruiser","adventure","naked","tourer","off-road","scooter","other"], required: true },
  engineCC: { type: Number, required: true, min: 50, max: 3000 },
  color:    { type: String, required: true, trim: true, maxlength: 30 },
  nickname: { type: String, trim: true, maxlength: 40 },
  photo: {
    url:       { type: String, required: true },
    public_id: { type: String, required: true }
  },
  isPrimary: { type: Boolean, default: false, index: true },
  // timestamps: true → createdAt, updatedAt
}
```

### 3.2 Indexes
- `{ owner: 1, createdAt: -1 }` — compound index for fast garage listing.
- `{ owner: 1, isPrimary: 1 }` — supports the "current ride lookup" used in the garage list sort and inside `setPrimary`.

### 3.3 Constraints (enforced in `bikeService`)
- **Per-user cap of 10 bikes.** Hard-coded constant `MAX_BIKES_PER_USER = 10` in service. `Bike.countDocuments({ owner }) >= 10` on create → `throw new AppError("Garage limit reached (10 bikes). Delete one to add another.", 400, "GARAGE_FULL")`.
- **At most one primary bike per owner.** Enforced in `bikeService.setPrimary()`: `updateMany({ owner, _id: { $ne: bikeId } }, { isPrimary: false })` followed by `findByIdAndUpdate(bikeId, { isPrimary: true })`. Worst-case window is milliseconds — no transaction required.
- **Photo is required** at create time (validator + multer middleware).
- **No `User.garage` array.** The User document stays slim. Garage queries go directly against the `bikes` collection by owner id.

> **`AppError` constructor signature** is `new AppError(message, statusCode, code)` (see `utils/AppError.js`). All `AppError` invocations in this spec use that order.

---

## 4. API surface

All routes mounted at `/api/bikes` via `routes/bikeRoutes.js`, registered in `routes/index.js`.

| Method | Path | Auth | Validation | Purpose |
|---|---|---|---|---|
| `POST` | `/api/bikes` | required | multipart + Joi `createBikeSchema` | Create a bike. multipart/form-data with `photo` file + JSON fields. Returns 201 + the new bike doc. |
| `GET` | `/api/bikes/user/:userId` | optional | path id is mongo ObjectId | List a user's garage. Sort: `{ isPrimary: -1, createdAt: -1 }`. Public. |
| `GET` | `/api/bikes/:id` | optional | path id | Single bike detail. |
| `PUT` | `/api/bikes/:id` | required, owner | multipart + Joi `updateBikeSchema` | Update fields and/or replace photo. |
| `PUT` | `/api/bikes/:id/primary` | required, owner | none beyond auth | Set this bike as primary; unsets sibling primaries atomically. |
| `DELETE` | `/api/bikes/:id` | required, owner | none beyond auth | Delete bike + Cloudinary asset. |

### 4.1 Response format
All routes return the standard envelope:
```json
{ "success": true, "data": <bike or bikes[]>, "message": "<optional>" }
```

### 4.2 Rate limiting
- `POST /api/bikes` and `PUT /api/bikes/:id` (when photo present) → tagged with the existing `uploadLimiter` (20/hr per IP) since they include media uploads.
- Other bike routes → covered by the global limiter (100/15min).

### 4.3 Authorization rules
All authorization happens **inside the service layer**, not in middleware (matches the existing pattern in `rideService`, `clubService`).
- `updateBike`, `setPrimary`, `deleteBike` → `if (String(bike.owner) !== String(userId)) throw new AppError("Bike not found", 404, "NOT_FOUND")`. Note: returns 404 (not 403) to prevent existence probing — matches §7.1 below.
- Bike not found → `throw new AppError("Bike not found", 404, "NOT_FOUND")`. Same message in both cases.

---

## 5. Layered files (backend)

### 5.1 `models/Bike.js`
Schema as in §3.1. Pre-save hook normalizes `type` to lowercase. `timestamps: true`.

### 5.2 `services/bikeService.js`
Public methods:
- `createBike(userId, fields, photoFile)` — count check, Cloudinary upload, doc create. On Cloudinary success but Mongo failure, destroys the uploaded asset before rethrowing.
- `listByUser(userId)` — `Bike.find({ owner: userId }).sort({ isPrimary: -1, createdAt: -1 }).lean()`.
- `getById(id)` — single bike, populates `owner` with `username, profilePic` only.
- `updateBike(userId, bikeId, fields, newPhotoFile)` — auth check, allowlisted field update, optional photo replace (upload new → save → destroy old). Failure to destroy old photo logs and continues.
- `setPrimary(userId, bikeId)` — auth check, `updateMany` siblings to `false`, `findByIdAndUpdate` target to `true`. Returns updated bike.
- `deleteBike(userId, bikeId)` — auth check, Cloudinary destroy (try/catch — log if fails, still delete the doc), `findByIdAndDelete`.

Constants: `MAX_BIKES_PER_USER = 10`.

### 5.3 `validators/bikeValidator.js`
Joi schemas:
- `createBikeSchema` — all fields required except `nickname`.
- `updateBikeSchema` — all fields optional but `.min(1)` on the object so an empty body is rejected.
- `year`: `Joi.number().integer().min(1900).max(new Date().getFullYear() + 1)`.
- `type`: `Joi.string().valid(...TYPES).lowercase()`.
- `engineCC`: `Joi.number().integer().min(50).max(3000)`.
- `nickname`: `Joi.string().trim().max(40).allow("")`.

### 5.4 `controllers/bikeController.js`
Thin `catchAsync` wrappers. Each method extracts `req.user.id`, validated body, and `req.params.id`, calls the service, returns `apiResponse.success(...)`. Pattern identical to `rideController`.

### 5.5 `routes/bikeRoutes.js`

`routes/index.js` adds one line: `router.use("/bikes", require("./bikeRoutes"));`.

**Middleware ordering** — important: multer must run **before** `validate()` because Joi validates `req.body`, which is empty until multer parses the multipart payload. This matches the existing pattern in `routes/postRoutes.js`.

| Route | Middleware chain (in order) |
|---|---|
| `POST /api/bikes` | `uploadLimiter, protect, upload.single("photo"), validate(createBikeSchema), bikeController.create` |
| `GET /api/bikes/user/:userId` | `optionalAuth, bikeController.listByUser` |
| `GET /api/bikes/:id` | `optionalAuth, bikeController.getById` |
| `PUT /api/bikes/:id` | `uploadLimiter, protect, upload.single("photo"), validate(updateBikeSchema), bikeController.update` |
| `PUT /api/bikes/:id/primary` | `protect, bikeController.setPrimary` |
| `DELETE /api/bikes/:id` | `protect, bikeController.remove` |

Note: `uploadLimiter` is currently defined in `middleware/rateLimiter.js` but not yet applied to any existing route. Bike routes will be its first consumer; applying it to `/api/upload/*` is an out-of-scope follow-up.

### 5.6 Cloudinary integration
- Folder: `bikerhub/garage`.
- Upload call (matches `services/postService.js` pattern — params at upload time, not eager transformations):
  ```javascript
  cloudinary.uploader.upload(file.path, {
    folder: "bikerhub/garage",
    resource_type: "image",
    transformation: [{ width: 1200, crop: "limit" }],
    quality: "auto",
    fetch_format: "auto"
  })
  ```
  Caps long edge at 1200px to bound file size on slow networks while preserving display fidelity at 4:3 in the grid and at full resolution on detail page.
- Stored on bike doc as `{ url, public_id }` matching the existing `User.profilePic` shape.

---

## 6. Frontend integration

### 6.1 Profile page tab strip

**Files modified:** `frontend/src/pages/profile.js`, `frontend/src/pages/user-profile.js`.

Below the existing identity/stats/actions block, add:
- A 2-tab strip with "Posts" and "Garage · N" (where N is bike count, fetched from the garage list endpoint).
- Active tab indicator: 32px-wide red bar centered under the tab text (matching the `clubs.js` tab pattern).
- The grid below the tabs swaps content based on active tab.

When **Garage** tab is active, render a 2-column responsive grid of `.gar-card` items.

**Card spec**:
- 4:3 aspect bike photo (`aspect-ratio: 4/3`, `object-fit: cover`).
- Photo loading state: `#1E1E1E` solid skeleton block.
- Top-right corner: 24px star pill if `isPrimary` (filled red star). Hidden on visitor view.
- Bottom overlay (solid `rgba(0,0,0,0.55)`, 8px padding):
  - Line 1: `Brand Model` — 13.5px / 600 / `#F3F3F3`, ellipsis at 1 line.
  - Line 2: `Year · CCcc` (e.g., `2023 · 155cc`) — 11.5px / `rgba(243,243,243,0.6)`.
- Tap → `navigate('/garage/' + userId + '/' + bikeId)`.
- 3-dot menu icon (top-right, owner only) → action sheet with: **Set as current ride** (if not already primary), **Edit**, **Delete** (red, with confirm dialog).

**Empty states**:
- Owner viewing own empty garage: centered icon + heading "Your garage is empty" + 14px muted helper text + red text-only button **"Add your first bike"** → `navigate('/add-bike')`.
- Visitor viewing empty garage: muted "No bikes yet."

**Floating Add button (FAB)**:
- 56px round, red background `#E53935`, white plus icon, fixed bottom-right (above tab bar).
- Visible **only on the owner's profile when Garage tab is active**.
- Hidden on Posts tab (avoids duplicating the existing global compose button).
- Hidden when at the 10-bike cap (replaced by a small inline "Garage full (10/10)" hint above the grid).

### 6.2 New pages

| Route | File | CSS prefix | Purpose |
|---|---|---|---|
| `/add-bike` | `pages/add-bike.js` | `.ab-` | Full-screen create form. Header: back · "New bike" · red text-only **Save**. Photo picker (required, must be selected before Save enables). Brand, Model, Year (numeric), Type (segmented selector), Engine cc, Color, Nickname (optional, char count). |
| `/edit-bike/:id` | `pages/edit-bike.js` | `.eb-` | Identical form shape to add-bike, prefilled. Photo replacement keeps existing photo until new one is selected. On successful update, old Cloudinary asset destroyed server-side. |
| `/garage/:userId/:bikeId` | `pages/bike-detail.js` | `.bd-` | Full bike detail. Hero photo capped at 60vh. Title block: brand · model · nickname (if set). Flat divider rows for Year, Type, Engine, Color. Owner-only actions row: red **Edit**, outline **Set as current ride** (hidden if already primary), outline-red **Delete** (with confirm). |

All new pages namespace their CSS via class prefixes (`.ab-`, `.eb-`, `.bd-`) and embed a `<style>` block in their `render()` return — matches the v2 page convention.

**Cleanup exports.** Each new page that owns lifecycle resources exports a `cleanup()` function alongside `render()` and `mount()`:
- `add-bike.js` and `edit-bike.js` — revoke any blob URLs from `URL.createObjectURL` used for the photo preview.
- `bike-detail.js` — currently no timers/listeners requiring cleanup, but exports a no-op `cleanup()` so the route registration shape is uniform.

Route registrations (§6.4) pass `cleanup*` as the 4th arg to `showPage()` so `frontend/src/main.js` invokes them on navigation.

### 6.3 Shared utilities

**`frontend/src/utils/bikeApi.js`** — single export:
```javascript
export const bikeApi = {
  create(formData)         { return api.upload('/api/bikes', formData); },
  listByUser(userId)       { return api.get('/api/bikes/user/' + userId); },
  get(bikeId)              { return api.get('/api/bikes/' + bikeId); },
  update(bikeId, formData) { return api.upload('/api/bikes/' + bikeId, formData, 'PUT'); },
  setPrimary(bikeId)       { return api.put('/api/bikes/' + bikeId + '/primary', {}); },
  remove(bikeId)           { return api.delete('/api/bikes/' + bikeId); },
};
```

> **`api.upload` extension** — required change to `frontend/src/utils/api.js`:
>
> Current signature: `async upload(url, formData) → POST`.
> New signature: `async upload(url, formData, method = 'POST')`.
>
> Implementation: pass `method` through to the underlying `request(url, { method, headers, body })`. Only one new line of code. Verified safe: existing callers `create-post.js:168` and `edit-profile.js:180` both pass exactly two args, so the default keeps them on POST. Empty `{}` body passed to `api.put` for setPrimary keeps fetch from sending `body: undefined`.

### 6.4 Routes registration

`frontend/src/main.js` adds three imports and three `registerRoute` calls:
```javascript
import { render as renderAddBike, mount as mountAddBike, cleanup as cleanupAddBike } from './pages/add-bike.js';
import { render as renderEditBike, mount as mountEditBike, cleanup as cleanupEditBike } from './pages/edit-bike.js';
import { render as renderBikeDetail, mount as mountBikeDetail, cleanup as cleanupBikeDetail } from './pages/bike-detail.js';

registerRoute('/add-bike', () => {
  if (!requireAuth()) return;
  showPage(renderAddBike, mountAddBike, null, cleanupAddBike);
});

registerRoute('/edit-bike/:id', (ctx) => {
  if (!requireAuth()) return;
  showPage(() => renderEditBike(ctx), () => mountEditBike(ctx), null, cleanupEditBike);
});

registerRoute('/garage/:userId/:bikeId', (ctx) => {
  showPage(() => renderBikeDetail(ctx), () => mountBikeDetail(ctx), null, cleanupBikeDetail);
});
```

The 3rd `showPage` arg is unused for these pages (reserved by main.js convention). The 4th is the cleanup function — required for blob-URL teardown on add-bike/edit-bike.

### 6.5 Profile fetch flow

On profile mount, two parallel requests:
```javascript
const [profileRes, garageRes] = await Promise.all([
  api.get('/api/users/' + userId),
  api.get('/api/bikes/user/' + userId)
]);
```
Tab badge count comes directly from `garageRes.data.length`. No backend aggregation needed.

---

## 7. Edge cases & error handling

### 7.1 Backend
- **Cap exceeded** → `throw new AppError("Garage limit reached (10 bikes). Delete one to add another.", 400, "GARAGE_FULL")`.
- **Bike not found / not owned** → both surface as `throw new AppError("Bike not found", 404, "NOT_FOUND")`. Same message and status in both cases prevents existence probing.
- **Cloudinary upload fails before doc create** → 502 `UPLOAD_FAILED`, multer temp file cleaned via `fs.promises.unlink`, no doc created.
- **Cloudinary upload succeeds but Mongo create fails** → catch block destroys the orphaned asset, then rethrows.
- **PUT with new photo: upload new → save doc → destroy old.** If destroy fails, log warning, return success. Orphaned media is fixable; broken UX is not.
- **Concurrent setPrimary** → worst case is two bikes briefly flagged primary. Idempotent retries from the client converge. No transaction.
- **DELETE of primary bike** → no auto-promotion. The "Current ride" pin disappears; user explicitly sets a new one. Frontend treats "no bike has `isPrimary: true`" as a valid empty-primary state — no broken star, no error banner. Simpler, no surprise behavior.

### 7.2 Frontend
- **Unsaved changes guard** on add-bike/edit-bike: if user taps back with dirty form, confirm dialog "Discard changes?".
- **Blob preview cleanup**: on cleanup() and on unmount, revoke any `URL.createObjectURL` blob URLs created for photo preview.
- **Photo upload spinner**: same overlay pattern as `edit-profile.js` avatar upload (centered red spinner over photo placeholder).
- **Delete confirm dialog**: native `confirm("Delete this bike? This cannot be undone.")` for v1. Custom modal can come later.
- **Tab state on navigation**: resets to "Posts" when navigating away and back (acceptable for v1; can add `?tab=garage` query param later).
- **Loading state for garage tab**: skeleton 2-column grid (4 placeholder cards with `#1E1E1E` solid blocks) while fetching.
- **Network error**: red banner above grid, "Couldn't load garage. Tap to retry."

---

## 8. Testing plan

### 8.1 Unit tests (`tests/unit/bikeService.test.js`)
- `createBike` at cap throws `GARAGE_FULL`.
- `createBike` happy path returns doc with photo `{ url, public_id }`.
- `setPrimary` unsets siblings (verify with second bike).
- `setPrimary` is idempotent (calling twice on already-primary leaves correct state).
- `deleteBike` of primary doesn't promote another.
- Non-owner `updateBike` / `setPrimary` / `deleteBike` → `AppError("Bike not found", 404, "NOT_FOUND")` (existence-probing prevention; matches §4.3).
- `updateBike` with new photo destroys old `public_id`.

### 8.2 Integration tests (`tests/integration/bikeRoutes.test.js`)
Mock Cloudinary via `jest.mock('../../config/cloudinary')` returning fakes for `uploader.upload` and `uploader.destroy`.
- `POST /api/bikes` happy path → 201, body matches schema, Cloudinary upload called with `bikerhub/garage` folder.
- `POST /api/bikes` without photo → 400 VALIDATION_ERROR.
- `POST /api/bikes` with invalid type → 400 VALIDATION_ERROR.
- `POST /api/bikes` when at cap → 400 GARAGE_FULL.
- `GET /api/bikes/user/:userId` returns sorted with primary first, then by `createdAt desc`.
- `PUT /api/bikes/:id/primary` → only one primary remains across that user's bikes.
- `PUT /api/bikes/:id` with non-owner JWT → 404 NOT_FOUND (matches §4.3 existence-probing prevention).
- `DELETE /api/bikes/:id` calls Cloudinary destroy mock with the bike's `public_id`.
- `DELETE /api/bikes/:id` with non-owner JWT → 404 NOT_FOUND.

### 8.3 Manual QA on Android APK
- Add bike happy path with real photo upload.
- Edit bike replaces photo, old photo deleted from Cloudinary (verify in Cloudinary console).
- Set primary visually surfaces star on the right card.
- Delete primary → no other star auto-appears.
- Profile of another user shows their garage tab read-only (no FAB, no 3-dot menu).
- Garage at 10/10: FAB hidden, "Garage full" hint visible.

---

## 9. Migration & rollout

- **No data migration required.** No legacy bike data exists in the schema.
- **No User schema change required.** The `bikes` collection is independent.
- **Indexes auto-created** on first start by Mongoose (`autoIndex: true` in dev; production index creation runs at deploy time per existing pattern).
- **Backward compatibility**: existing clients that don't query `/api/bikes/*` continue to work unchanged. The garage tab renders only on profiles fetched by clients that know about it.
- **Feature flag**: not needed for v1 — the feature is additive and gated behind UI tabs that older clients won't render.

---

## 10. File inventory

### New files (10)
- `models/Bike.js`
- `services/bikeService.js`
- `validators/bikeValidator.js`
- `controllers/bikeController.js`
- `routes/bikeRoutes.js`
- `tests/unit/bikeService.test.js`
- `tests/integration/bikeRoutes.test.js`
- `frontend/src/utils/bikeApi.js`
- `frontend/src/pages/add-bike.js`
- `frontend/src/pages/edit-bike.js`
- `frontend/src/pages/bike-detail.js`

### Modified files (5)
- `routes/index.js` — register `/bikes` router.
- `frontend/src/main.js` — three new `registerRoute` calls + imports (with cleanup exports).
- `frontend/src/pages/profile.js` — tab strip, garage grid, FAB.
- `frontend/src/pages/user-profile.js` — tab strip, garage grid (read-only).
- `frontend/src/utils/api.js` — extend `upload()` to accept optional `method` parameter (`POST` default, allow `PUT`).

---

## 11. Open questions

None remaining at the time of this writing. All resolved during brainstorming:

| Q | Resolution |
|---|---|
| Field richness | "B" — Standard rider profile, dropping ownership status |
| UI placement | "A" — Tab next to Posts |
| Primary bike scope | "B" — Surfaced only inside garage tab |
| Photo requirement | "A" — Required at create time |
| Architecture | Separate `Bike` collection (matches existing pattern) |
| Per-user cap | 10 (default; easy to lift) |
| Aggregation on profile load | Two parallel requests (no aggregation) |
| Auto-promote primary on delete | No (explicit user action) |
