# Bikers Hub — Full Rebuild Design Spec

**Date:** 2026-03-23
**Authors:** VIT22CS002 (Abhirami), VIT22CS005 (Adarsh), VIT22CS024 (Govind), VIT22CS038 (Sidharth)
**Guide:** Mr. Jijo Joshy, Assistant Professor, CSE, Visat Engineering College
**Status:** Approved

---

## 1. Project Overview

Bikers Hub is a mobile-based social networking and ride management platform for motorcycle riders. Built with React Native (frontend) + Node.js/Express (backend) + MongoDB + Socket.IO.

### Current State

The backend has **37 files, ~2,862 lines of code** with 6 application-breaking bugs, 8 critical security vulnerabilities, 6 performance issues, and significant code quality problems identified in the deep code review.

### Goal

Full rebuild following Layered MVC architecture with service layer, proper validation, security hardening, missing feature implementation, testing, and deployment infrastructure.

---

## 2. Architecture

### Pattern: Layered MVC with Service Layer

```
Request → Route → Validator → Controller → Service → Model → Database
                                              ↓
                                         AppError → ErrorHandler → Response
```

### Directory Structure

```
bikershub/
├── src/
│   ├── config/
│   │   ├── db.js                  # MongoDB connection with retry & event listeners
│   │   ├── cloudinary.js          # Cloudinary config
│   │   ├── socket.js              # Socket.IO setup with namespaces & auth
│   │   └── env.js                 # Environment validation (Joi)
│   ├── middleware/
│   │   ├── auth.js                # JWT access + refresh token verification
│   │   ├── errorHandler.js        # Centralized error handler
│   │   ├── rateLimiter.js         # express-rate-limit configs
│   │   ├── validate.js            # Joi validation runner
│   │   └── upload.js              # Multer (image: 10MB, video: 50MB)
│   ├── models/
│   │   ├── User.js                # Fixed: +username, +followers, +following, +googleId, +isSocialLogin, password optional
│   │   ├── Post.js                # Fixed: +indexes on author, club
│   │   ├── Comment.js             # Unchanged
│   │   ├── Club.js                # Fixed: +indexes on owner, members
│   │   ├── Ride.js                # Fixed: bounded arrays, subcollection for route
│   │   ├── Notification.js        # Fixed: +indexes, +"reply" type
│   │   ├── Conversation.js        # Fixed: field naming consistency (participants)
│   │   ├── Message.js             # Fixed: +index on conversation
│   │   └── RefreshToken.js        # NEW: refresh token rotation storage
│   ├── services/                  # Business logic layer
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── postService.js
│   │   ├── commentService.js
│   │   ├── clubService.js
│   │   ├── rideService.js
│   │   ├── chatService.js
│   │   ├── conversationService.js
│   │   ├── notificationService.js
│   │   ├── searchService.js
│   │   └── uploadService.js
│   ├── controllers/               # Thin wrappers: validate → service → respond
│   ├── routes/v1/                 # API v1 namespace
│   ├── validators/                # Joi schemas per resource
│   ├── socket/
│   │   ├── index.js               # Init + JWT auth middleware
│   │   ├── chatHandler.js         # DM + club + ride chat (persisted)
│   │   ├── rideHandler.js         # GPS tracking
│   │   ├── notificationHandler.js
│   │   └── postHandler.js
│   └── utils/
│       ├── AppError.js            # Custom error class
│       ├── catchAsync.js          # Async wrapper
│       ├── distance.js            # Haversine formula (CREATE)
│       ├── geocode.js             # Geocoding service (CREATE)
│       ├── apiResponse.js         # Standardized responses
│       └── sanitize.js            # Regex escape, input sanitization
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── fixtures/
│   └── setup.js
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── server.js
└── CLAUDE.md
```

---

## 3. Data Layer — Model Fixes

### 3.1 User Model (CRITICAL FIXES)

**Current bugs:**
- Schema has `name` but controllers use `username`
- Missing `followers`, `following` arrays
- Missing `googleId`, `isSocialLogin` fields
- `password` required but Google users have none
- `avatar` field but controllers reference `profilePic`

**Fixed schema:**
```javascript
{
  username:     { type: String, required: true, minlength: 3, trim: true, index: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, minlength: 6 },  // NOT required (Google OAuth users)
  phone:        { type: String },
  avatar:       { type: String, default: "" },
  bio:          { type: String, maxlength: 500 },
  role:         { type: String, enum: ["user", "admin"], default: "user" },
  googleId:     { type: String, sparse: true },   // NEW
  isSocialLogin:{ type: Boolean, default: false }, // NEW
  followers:    [{ type: ObjectId, ref: "User" }], // NEW
  following:    [{ type: ObjectId, ref: "User" }], // NEW
  ridesCreated: [{ type: ObjectId, ref: "Ride" }],
  ridesJoined:  [{ type: ObjectId, ref: "Ride" }],
  rideCreatedCount: { type: Number, default: 0 },
  rideJoinedCount:  { type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  ratingCount:  { type: Number, default: 0 },
  isVerified:   { type: Boolean, default: false }
}
// Indexes: email (unique), username, googleId (sparse)
// Pre-save hook: hash password if modified
```

### 3.2 Conversation Model (CRITICAL FIX)

**Current bug:** Schema defines `participants` but controllers query `members`. All conversation features are broken.

**Fix:** Standardize on `participants` everywhere. Update all controllers/services.

### 3.3 Notification Model

**Fix:** Add `"reply"` to type enum. Add compound index `{ recipient: 1, isRead: 1, createdAt: -1 }`.

### 3.4 Post Model

**Fix:** Add indexes on `author` and `club`. Remove leftover `// ADD THIS BLOCK` comment.

### 3.5 Message Model

**Fix:** Add index on `conversation` field.

### 3.6 Club Model

**Fix:** Add indexes on `owner` and `members`.

### 3.7 Ride Model

**Fix:** Cap `riderLocations` array (use `$slice` on updates). Store route in separate `RideRoute` collection for long rides.

### 3.8 NEW: RefreshToken Model

```javascript
{
  token:     { type: String, required: true, index: true },  // SHA-256 hash
  userId:    { type: ObjectId, ref: "User", required: true },
  family:    { type: String, required: true },  // For rotation detection
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  revoked:   { type: Boolean, default: false }
}
```

---

## 4. Security Architecture

### 4.1 Authentication Overhaul

- **Access tokens:** 15-minute expiry, HS256 algorithm with `JWT_SECRET`
- **Password hashing:** bcryptjs with 12 salt rounds
- **Refresh tokens:** 7-day expiry, stored hashed in RefreshToken collection
- **Rotation:** New refresh token on every refresh. Old one revoked immediately
- **Reuse detection:** If a revoked token is used, invalidate entire token family
- **Google OAuth:** Fix to create users with `isSocialLogin: true`, `password: undefined`

### 4.2 Authorization

Every endpoint that accesses a resource MUST verify the requesting user has permission:
- Chat: user must be conversation participant
- Club approve/reject: user must be club owner or admin
- Ride location update: user must be ride participant
- Post delete: user must be post author
- Upload delete: user must own the uploaded resource

### 4.3 Input Validation

- Every route has a corresponding Joi validator
- Regex inputs escaped with `sanitize.escapeRegex()` before use in MongoDB queries
- `req.body` never spread directly into queries — explicit field picking only
- `express-mongo-sanitize` strips `$` operators from inputs

### 4.4 Rate Limiting

| Endpoint Group | Window | Max Requests |
|---|---|---|
| Global | 15 min | 100 |
| Auth (login/register) | 15 min | 5 |
| File upload | 1 hour | 20 |
| Search | 1 min | 30 |

### 4.5 Security Headers

`helmet()` added as first middleware — X-Content-Type-Options, X-Frame-Options, HSTS, CSP.

### 4.6 CORS

Explicit origin whitelist. No `origin: "*"` in production.

### 4.7 Socket Authentication

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT, attach user to socket
});
```

---

## 5. API Design

### 5.1 Standardized Response Format

**Success:**
```json
{ "success": true, "data": { ... }, "message": "Ride created successfully" }
```

**Error:**
```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### 5.2 Pagination

Cursor-based for feeds/timelines:
```json
{ "success": true, "data": [...], "pagination": { "nextCursor": "...", "hasMore": true } }
```

Offset-based for admin/list endpoints:
```json
{ "pagination": { "page": 1, "limit": 20, "total": 150 } }
```

### 5.3 API Versioning

All routes under `/api/v1/`. Route aggregator in `routes/v1/index.js`.

---

## 6. Real-Time Architecture (Socket.IO)

### Namespaces

| Namespace | Purpose | Auth Required |
|---|---|---|
| `/chat` | DM + club + ride messaging | Yes |
| `/ride-tracking` | Live GPS updates | Yes |
| `/notifications` | Real-time notification delivery | Yes |

### Key Changes from Current

1. **All socket connections authenticated** via JWT middleware
2. **All messages persisted** to database (current socket handlers only broadcast, don't save)
3. **Room naming:** `conversation:{id}`, `club:{id}`, `ride:{id}`, `post:{id}`, `user:{id}` (consistent prefixes)
4. **GPS updates:** Debounce to max 1 update per 2 seconds per rider. Use `$set` with positional operator instead of `save()` to avoid write amplification
5. **userId from verified token**, not from client payload (prevents impersonation)

---

## 7. Missing Utilities (CREATE)

### 7.1 utils/distance.js — Haversine Formula

```javascript
function haversineDistance(coord1, coord2) {
  // [lat, lng] → distance in km
  const R = 6371; // Earth radius in km
  // Standard haversine implementation
}
```

### 7.2 utils/geocode.js — Address Geocoding

Use a free geocoding API (Nominatim/OpenStreetMap) or Google Maps Geocoding API:
```javascript
async function geocodeAddress(address) {
  // Returns { lat, lng } for a given address string
}
```

---

## 8. Missing Features (from Project Documents)

### 8.1 Route Planning & Navigation
- Store ride routes as GeoJSON LineStrings
- Rate and share routes with other riders
- Customizable parameters (road conditions, difficulty)

### 8.2 Weather Integration
- Integrate weather API (OpenWeatherMap free tier)
- Show weather for ride start/destination locations
- Weather alerts for upcoming rides

### 8.3 GPS-Based Discovery
- Find nearby riders (using `$geoNear` aggregation)
- Discover nearby events, clubs, points of interest
- Configurable radius (default 50km)

### 8.4 Advanced Search
- Full-text search with MongoDB text indexes
- Filter by location, date range, club, ride status
- Sanitized regex (escape special characters)

---

## 9. Error Handling Architecture

### AppError Class
```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}
```

### catchAsync Wrapper
```javascript
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### Centralized Error Handler
- Mongoose validation errors → 400
- Mongoose cast errors → 400
- Duplicate key errors → 409
- JWT errors → 401
- Multer errors → 400
- AppError → custom status code
- Unknown errors → 500 (no stack trace in production)

---

## 10. Testing Strategy

### Stack
- **Jest** — test runner
- **Supertest** — HTTP assertions
- **mongodb-memory-server** — in-memory MongoDB for tests
- **Jest mocks** — Cloudinary, external APIs

### Coverage Targets
- Services: 80%+ unit test coverage
- Routes: all endpoints have integration tests (happy path + error paths)
- Utils: 100% coverage

### Test Structure
```
tests/
  unit/
    services/authService.test.js
    services/rideService.test.js
    utils/distance.test.js
  integration/
    auth.test.js
    posts.test.js
    rides.test.js
    clubs.test.js
    chat.test.js
  fixtures/
    users.js
    posts.js
    rides.js
  setup.js          # Global: start/stop mongodb-memory-server
```

---

## 11. Deployment

### Docker
- Multi-stage Dockerfile (`node:20-alpine`)
- `docker-compose.yml` with app + MongoDB + Redis
- `.dockerignore` excludes node_modules, .env, .git, logs

### CI/CD (GitHub Actions)
- PR: lint → test → build
- Main branch: lint → test → build → deploy

### Environment
- `.env.example` documenting all required variables
- Separate configs for dev/test/production

### Logging
- Pino for structured JSON logging (replace all `console.log`)
- Morgan for HTTP request logging

---

## 12. Implementation Phases

### Phase 1: Foundation (Days 1-2)
- Restructure directories: `git mv config/ controllers/ middleware/ models/ routes/ socket/` into `src/`; create `src/services/`, `src/validators/`, `src/utils/`; update `server.js` imports
- Create utils (AppError, catchAsync, apiResponse, sanitize, distance, geocode)
- Create config (env validation, db with retry, socket setup)
- Create middleware (errorHandler, rateLimiter, validate)
- Add new dependencies (helmet, express-rate-limit, joi, pino, morgan, express-mongo-sanitize)

### Phase 2: Schema Fixes (Days 3-4)
- Fix User model (all missing fields, password optional, indexes)
- Fix Conversation model (participants consistency)
- Fix Notification model (add "reply" type, indexes)
- Fix Post, Message, Club models (add indexes)
- Fix Ride model (bounded arrays)
- Create RefreshToken model

### Phase 3: Security Hardening (Days 5-7)
- JWT refresh token rotation
- Socket.IO authentication middleware
- Authorization checks on all endpoints
- Rate limiting configuration
- CORS whitelist
- Helmet integration
- Input sanitization (mongo-sanitize, regex escape)

### Phase 4: Service Layer + Controller Refactor (Days 8-12)
- Extract business logic from controllers into services
- Create Joi validators for all routes
- Make controllers thin (validate → service → respond)
- Fix all field name mismatches
- Fix authorization on chat, club approve/reject
- Fix search (correct field names, sanitized regex)
- Remove duplicate routes and dead code
- Standardize response format

### Phase 5: Real-Time Features (Days 13-15)
- Socket.IO namespaces (/chat, /ride-tracking, /notifications)
- Authenticated socket connections
- Persist all socket messages to database
- GPS tracking with debounced updates
- Real-time notifications
- Configure Socket.IO Redis adapter for horizontal scaling

### Phase 6: Missing Features (Days 16-19)
- Route planning (GeoJSON LineString storage)
- Weather API integration
- Nearby discovery ($geoNear)
- Advanced search with text indexes
- Ride statistics calculation

### Phase 7: Testing (Days 20-23)
- Setup Jest + mongodb-memory-server
- Unit tests for services and utils
- Integration tests for all API endpoints
- Socket.IO event tests

### Phase 8: Deployment & Polish (Days 24-26)
- Dockerfile + docker-compose.yml
- GitHub Actions CI/CD pipeline
- .env.example documentation
- Replace console.log with Pino logger
- Graceful shutdown handling (SIGTERM/SIGINT — close DB, drain Socket.IO, stop HTTP server)
- Final code review and cleanup

---

## 13. New Dependencies

```json
{
  "dependencies": {
    "helmet": "^8.x",
    "express-rate-limit": "^7.x",
    "express-mongo-sanitize": "^2.x",
    "joi": "^17.x",
    "pino": "^9.x",
    "pino-http": "^10.x",
    "morgan": "^1.x",
    "ioredis": "^5.x",
    "@socket.io/redis-adapter": "^8.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "jest": "^30.x",
    "supertest": "^7.x",
    "mongodb-memory-server": "^10.x",
    "@types/jest": "^30.x"
  }
}
```

---

## 14. Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Redis (for Socket.IO scaling)
REDIS_URL=redis://localhost:6379

# Weather API
WEATHER_API_KEY=your-openweathermap-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006

# Logging
LOG_LEVEL=info
```
