# Bikers Hub — Backend

## Project Overview

Bikers Hub is a mobile-based social networking and ride management platform for motorcycle riders. This is the Node.js/Express backend API serving a React Native mobile app.

**Academic Project:** B.Tech CSE, Visat Engineering College (CSD415)
**Team:** VIT22CS002 (Abhirami), VIT22CS005 (Adarsh), VIT22CS024 (Govind), VIT22CS038 (Sidharth)
**Guide:** Mr. Jijo Joshy

## Tech Stack

- **Runtime:** Node.js with Express 5.x
- **Database:** MongoDB with Mongoose 9.x (hosted on MongoDB Atlas)
- **Real-time:** Socket.IO 4.x with Redis adapter
- **Auth:** JWT (access + refresh tokens) + Google OAuth2
- **File Storage:** Cloudinary (images/videos)
- **Validation:** Joi
- **Testing:** Jest + Supertest + mongodb-memory-server
- **Logging:** Pino + Morgan

## Architecture

Layered MVC with Service Layer:

```
Request → Route → Validator → Controller → Service → Model → Database
                                              ↓
                                         AppError → ErrorHandler → Response
```

### Directory Structure

```
src/
  config/       — Database, Cloudinary, Socket.IO, env validation
  middleware/   — Auth, error handling, rate limiting, validation, upload
  models/       — Mongoose schemas (User, Post, Comment, Club, Ride, Notification, Conversation, Message, RefreshToken)
  services/     — Business logic (one per resource)
  controllers/  — Thin wrappers (validate → service → respond)
  routes/v1/    — API v1 endpoints
  validators/   — Joi schemas per resource
  socket/       — Socket.IO handlers (chat, ride tracking, notifications, posts)
  utils/        — AppError, catchAsync, apiResponse, distance, geocode, sanitize
tests/
  unit/         — Service and utility tests
  integration/  — API endpoint tests with Supertest
  fixtures/     — Seed data
```

## Commands

```bash
npm start          # Start production server (node server.js)
npm run dev        # Start dev server with nodemon
npm test           # Run all tests
npm run test:unit  # Run unit tests only
npm run test:int   # Run integration tests only
npm run lint       # Run ESLint
```

## Key Patterns

### Error Handling
- Use `AppError` class for operational errors: `throw new AppError("Not found", 404, "NOT_FOUND")`
- Wrap async controllers with `catchAsync()` — no try-catch needed in controllers
- Centralized error handler in `middleware/errorHandler.js` handles all error types
- Never expose stack traces or internal details in production responses

### Response Format
All API responses follow this structure:
```json
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

### Controllers
Controllers must be thin (5-10 lines). They:
1. Extract validated input from `req.body` / `req.params` / `req.query`
2. Call the appropriate service method
3. Send a standardized response via `apiResponse`

```javascript
// Example controller
const createRide = catchAsync(async (req, res) => {
  const ride = await rideService.create(req.user.id, req.body);
  res.status(201).json(apiResponse.success(ride, "Ride created"));
});
```

### Services
Services contain all business logic. They:
- Receive plain data (not req/res objects)
- Throw `AppError` for business rule violations
- Handle authorization checks
- Return data (not HTTP responses)

### Validation
- Every route has a Joi validator in `validators/`
- Validation runs via `validate` middleware before the controller
- Never trust client input — validate and sanitize everything

### Authentication & Authorization
- `auth.js` middleware verifies JWT access token from `Authorization: Bearer <token>`
- Access tokens: 15-minute expiry, HS256 algorithm with `JWT_SECRET`
- Refresh tokens: 7-day expiry, rotation on every refresh
- Passwords hashed with bcryptjs (12 salt rounds)
- Always check authorization (user owns resource, user is club admin, user is ride participant, etc.)
- Socket connections authenticated via JWT in handshake

### Database
- Never use `Object.assign(doc, req.body)` — explicitly pick allowed fields
- Use `.lean()` for read-only queries
- Use cursor-based pagination for feeds/timelines
- All frequently queried fields must have indexes
- Avoid unbounded arrays in documents

### File Uploads
- All upload/delete endpoints require authentication
- Multer handles temporary storage, then uploads to Cloudinary
- Use async `fs.promises.unlink` for temp file cleanup (never `unlinkSync`)
- Image limit: 10MB, Video limit: 50MB

### Socket.IO
- Three namespaces: `/chat`, `/ride-tracking`, `/notifications`
- All connections authenticated via JWT middleware
- All messages must be persisted to database (not just broadcast)
- GPS updates debounced to max 1 per 2 seconds per rider
- Room naming: `conversation:{id}`, `club:{id}`, `ride:{id}`

## Security Rules

1. **No wide-open CORS** — always specify allowed origins
2. **Helmet** — always first in middleware stack
3. **Rate limiting** — applied globally and per-endpoint
4. **Input sanitization** — `express-mongo-sanitize` strips `$` operators
5. **Regex safety** — always escape user input before using in `RegExp()`
6. **No mass assignment** — never spread `req.body` into DB operations
7. **Authorization on every endpoint** — verify user has permission to access/modify resource
8. **Consistent error messages** — same message for "user not found" and "wrong password" (prevent enumeration)
9. **Signed uploads** — never expose Cloudinary API secret to client

## Environment Variables

Required (see `.env.example`):
- `NODE_ENV`, `PORT`
- `MONGO_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `REDIS_URL`
- `WEATHER_API_KEY`
- `ALLOWED_ORIGINS`
- `LOG_LEVEL`

## API Endpoints (v1)

### Auth (`/api/v1/auth`)
- `POST /register` — Register with username/email/password
- `POST /login` — Login, returns access + refresh tokens
- `POST /google` — Google OAuth login
- `POST /refresh` — Refresh access token
- `POST /logout` — Revoke refresh token

### Users (`/api/v1/users`)
- `GET /me` — Current user profile (auth)
- `GET /:id` — Public user profile
- `PUT /me` — Update profile (auth)
- `PUT /follow/:id` — Follow user (auth)
- `PUT /unfollow/:id` — Unfollow user (auth)

### Posts (`/api/v1/posts`)
- `POST /` — Create post with media (auth, up to 5 files)
- `GET /` — Global feed (paginated)
- `GET /feed` — Smart feed from followed users (auth, cursor-based)
- `GET /:id` — Single post
- `PUT /:id` — Update post (auth, owner only)
- `DELETE /:id` — Delete post (auth, owner only)
- `PUT /:id/like` — Like/unlike (auth)

### Comments (`/api/v1/comments`)
- `POST /:postId` — Create comment/reply (auth)
- `GET /:postId` — Get comments (paginated)
- `PUT /:id/like` — Like/unlike comment (auth)
- `DELETE /:id` — Soft delete (auth, owner only)

### Clubs (`/api/v1/clubs`)
- `POST /` — Create club (auth)
- `GET /:id` — Club details
- `POST /:id/join` — Join/request to join (auth)
- `PUT /:id/leave` — Leave club (auth)
- `GET /:id/requests` — Get join requests (auth, admin/owner)
- `PUT /:id/approve/:userId` — Approve request (auth, admin/owner)
- `PUT /:id/reject/:userId` — Reject request (auth, admin/owner)
- `POST /:id/posts` — Create club post (auth, member)
- `GET /:id/posts` — Get club posts

### Rides (`/api/v1/rides`)
- `POST /` — Create ride (auth)
- `GET /` — List rides (paginated)
- `GET /nearby` — Nearby rides (geospatial, auth)
- `GET /:id` — Ride details
- `PUT /:id` — Update ride (auth, creator only)
- `DELETE /:id` — Delete ride (auth, creator only)
- `POST /:id/join` — Join ride (auth)
- `POST /:id/leave` — Leave ride (auth)
- `POST /:id/invite/:userId` — Invite user (auth, creator)
- `PUT /:id/start` — Start ride (auth, creator)
- `PUT /:id/location` — Update GPS location (auth, participant)
- `PUT /:id/end` — End ride, calculate stats (auth, creator)
- `GET /:id/route` — Get ride route
- `GET /:id/locations` — Get live rider locations

### Notifications (`/api/v1/notifications`)
- `GET /` — Get notifications (auth, paginated)
- `GET /unread-count` — Unread count (auth)
- `PUT /:id/read` — Mark as read (auth, owner)
- `PUT /read-all` — Mark all as read (auth)
- `DELETE /:id` — Delete notification (auth, owner)

### Chat (`/api/v1/chat`)
- `POST /send` — Send message (auth, participant only)
- `GET /conversation/:id` — Get messages (auth, participant only, paginated)
- `PUT /read/:conversationId` — Mark read (auth, participant only)
- `GET /unread` — Unread count (auth)

### Conversations (`/api/v1/conversations`)
- `POST /` — Create/get DM conversation (auth)
- `GET /` — List conversations (auth)
- `GET /:id` — Get conversation (auth, participant only)

### Search (`/api/v1/search`)
- `GET /` — Global search (sanitized regex, paginated)

### Upload (`/api/v1/upload`)
- `POST /` — Upload single file (auth)
- `POST /multiple` — Upload multiple files (auth, max 5)
- `POST /profile` — Upload profile picture (auth)
- `DELETE /` — Delete file (auth, owner only)

## Implementation Plan

Full rebuild in 8 phases. See `docs/superpowers/specs/2026-03-23-bikershub-full-rebuild-design.md` for complete spec.

### Phase 1: Foundation (Days 1-2)
- [ ] Restructure into `src/` directory — `git mv config/ src/config/`, `git mv controllers/ src/controllers/`, `git mv middleware/ src/middleware/`, `git mv models/ src/models/`, `git mv routes/ src/routes/`, `git mv socket/ src/socket/`; create `src/services/`, `src/validators/`, `src/utils/`; update `server.js` to require from `src/` paths
- [ ] Create `utils/AppError.js` — custom error class with statusCode, code, isOperational
- [ ] Create `utils/catchAsync.js` — async wrapper for controllers
- [ ] Create `utils/apiResponse.js` — standardized success/error response helpers
- [ ] Create `utils/sanitize.js` — `escapeRegex()` function to prevent ReDoS
- [ ] Create `utils/distance.js` — Haversine distance calculation (CRITICAL: currently missing, crashes ride features)
- [ ] Create `utils/geocode.js` — address geocoding using Nominatim/Google Maps API (CRITICAL: currently missing)
- [ ] Create `config/env.js` — Joi validation of all required env vars on startup
- [ ] Update `config/db.js` — add retry logic, connection event listeners (disconnected, error, reconnected)
- [ ] Create `middleware/errorHandler.js` — centralized handler for Mongoose, JWT, Multer, AppError, unknown errors
- [ ] Create `middleware/rateLimiter.js` — global (100/15min), auth (5/15min), upload (20/hr), search (30/min)
- [ ] Create `middleware/validate.js` — generic Joi validation runner middleware
- [ ] Add dependencies: helmet, express-rate-limit, joi, pino, pino-http, morgan, express-mongo-sanitize
- [ ] Update `server.js` — add helmet, rate limiter, mongo-sanitize, pino logger, fix error handler ordering, add body size limit, configure CORS with whitelist
- [ ] Create `.env.example` — document all required environment variables

### Phase 2: Schema Fixes (Days 3-4)
- [ ] Fix `User.js` — add username, followers, following, googleId, isSocialLogin fields; make password optional; add indexes on username, googleId; add pre-save password hash hook
- [ ] Fix `Conversation.js` — ensure field is `participants` everywhere; add compound index on participants
- [ ] Fix `Notification.js` — add "reply" to type enum; add compound index `{ recipient: 1, isRead: 1, createdAt: -1 }`
- [ ] Fix `Post.js` — add indexes on author, club; remove leftover `// ADD THIS BLOCK` comment
- [ ] Fix `Message.js` — add index on conversation field
- [ ] Fix `Club.js` — add indexes on owner, members
- [ ] Fix `Ride.js` — cap riderLocations array; plan for route data in separate collection for long rides
- [ ] Create `RefreshToken.js` model — token (hashed), userId, family, expiresAt (TTL index), revoked

### Phase 3: Security Hardening (Days 5-7)
- [ ] Implement JWT refresh token rotation in authService — issue access (15min) + refresh (7d) on login; `/refresh` endpoint validates refresh token, issues new pair, revokes old; reuse detection invalidates entire family
- [ ] Create `middleware/auth.js` — verify access token, attach user to req; separate `optionalAuth` for public endpoints that benefit from auth context
- [ ] Add Socket.IO JWT authentication — `io.use()` middleware verifies token on handshake, rejects unauthenticated connections, attaches user to socket
- [ ] Add authorization checks to chatService — verify user is participant before send/read/markRead
- [ ] Add authorization checks to clubService — verify user is owner/admin before approve/reject
- [ ] Add authorization checks to rideService — verify user is participant for location updates, creator for start/end
- [ ] Add authorization checks to notificationService — verify user is recipient before read/delete
- [ ] Add authorization checks to uploadService — verify user owns resource before delete
- [ ] Fix login response — same error message for "user not found" and "wrong password"
- [ ] Fix Google OAuth — create user without password, set isSocialLogin=true, store googleId
- [ ] Implement `express-mongo-sanitize` — strip `$` operators from all inputs
- [ ] Implement regex escaping — sanitize all user input before RegExp construction in search

### Phase 4: Service Layer + Controller Refactor (Days 8-12)
- [ ] Create `services/authService.js` — register, login, googleAuth, refreshToken, logout logic
- [ ] Create `services/userService.js` — getProfile, updateProfile, follow, unfollow logic; fix field name (username not name)
- [ ] Create `services/postService.js` — create, getAll (paginated), getFeed (cursor-based), like, update, delete logic; fix `io.emit` to room-based
- [ ] Create `services/commentService.js` — create, getByPost (paginated), like, delete logic; fix notification type to use valid enum
- [ ] Create `services/clubService.js` — create, join (with duplicate check), approve, reject, leave, createPost, getPosts logic; fix ObjectId comparison with `.toString()`
- [ ] Create `services/rideService.js` — CRUD, join (with capacity check), leave, start, updateLocation, end (stats calc), getNearby, getRoute logic; fix mass assignment vulnerability
- [ ] Create `services/chatService.js` — send (with participant auth), getMessages (paginated), markRead, getUnreadCount (scoped to user's conversations)
- [ ] Create `services/conversationService.js` — createOrGet, list, getById logic; fix field name to `participants`
- [ ] Create `services/notificationService.js` — getAll (paginated), getUnreadCount, markRead, markAllRead, delete logic
- [ ] Create `services/searchService.js` — global search with sanitized regex, correct field names (username not name, content not caption)
- [ ] Create `services/uploadService.js` — upload, uploadMultiple, uploadProfile, delete logic; fix profilePic to use req.user properly (query DB for user doc)
- [ ] Create all Joi validators — `validators/authValidator.js` (register, login), `validators/postValidator.js` (create, update), `validators/rideValidator.js` (create, update, location), `validators/clubValidator.js` (create), `validators/chatValidator.js` (send)
- [ ] Refactor all controllers — thin wrappers using catchAsync, calling services, returning apiResponse
- [ ] Create `routes/v1/index.js` — aggregate all route files under `/api/v1`
- [ ] Fix all route files — remove duplicate routes, consistent auth middleware on all protected endpoints, add validation middleware
- [ ] Remove dead code — duplicate getUserProfile, duplicate `/create` route, duplicate console.error calls
- [ ] Replace `fs.unlinkSync` with `fs.promises.unlink` in postController/uploadController

### Phase 5: Real-Time Features (Days 13-15)
- [ ] Refactor `socket/index.js` — create Socket.IO with namespaces (/chat, /ride-tracking, /notifications); add JWT auth middleware; configure CORS
- [ ] Create `socket/chatHandler.js` — handle joinConversation, sendMessage (PERSIST to DB), typing, stopTyping; handle club and ride chat with persistence
- [ ] Create `socket/rideHandler.js` — handle joinRide, leaveRide, rideLocationUpdate (debounced, use $set instead of save()); userId from verified token not client payload
- [ ] Create `socket/notificationHandler.js` — emit notifications to specific user rooms; handle joinNotifications
- [ ] Create `socket/postHandler.js` — handle joinPost, newPost (room-based not global broadcast), postLiked, newComment, commentLiked
- [ ] Fix room naming consistency — `conversation:{id}`, `club:{id}`, `ride:{id}`, `post:{id}`, `user:{id}` (for notifications)
- [ ] Ensure socket emit in controllers matches handler room names
- [ ] Configure Socket.IO Redis adapter (`@socket.io/redis-adapter`) for horizontal scaling support

### Phase 6: Missing Features (Days 16-19)
- [ ] Implement route planning — store routes as GeoJSON LineStrings; API to save, rate, and share routes
- [ ] Implement weather integration — OpenWeatherMap API; endpoint to get weather for ride location; show weather in ride details
- [ ] Implement nearby discovery — `$geoNear` aggregation for nearby riders, rides, clubs; configurable radius parameter
- [ ] Implement advanced search — MongoDB text indexes on Post.content, User.username, Club.name, Ride.title; filter by location, date, status
- [ ] Implement ride statistics — accurate distance (sum of Haversine segments), duration, average speed on ride end
- [ ] Add ride invitation notifications — create notification when user is invited to ride

### Phase 7: Testing (Days 20-23)
- [ ] Setup Jest + mongodb-memory-server — `tests/setup.js` with global beforeAll/afterAll; `jest.config.js` with setup file
- [ ] Create test fixtures — `tests/fixtures/users.js`, `tests/fixtures/posts.js`, `tests/fixtures/rides.js` with seed data factories
- [ ] Write unit tests for utils — distance.js (known coordinate pairs), sanitize.js (regex escape), AppError, apiResponse
- [ ] Write unit tests for services — authService (register, login, token refresh), rideService (create, join, stats calculation)
- [ ] Write integration tests for auth — register, login, Google auth, token refresh, logout, invalid credentials
- [ ] Write integration tests for posts — create, feed, like, delete, authorization failures
- [ ] Write integration tests for rides — create, join, start, location update, end, nearby query
- [ ] Write integration tests for clubs — create, join, approve, reject, leave, authorization failures
- [ ] Write integration tests for chat — send, read, unread count, authorization (non-participant rejected)
- [ ] Mock external services — Cloudinary upload/delete, weather API, geocoding API

### Phase 8: Deployment & Polish (Days 24-26)
- [ ] Create `Dockerfile` — multi-stage build with node:20-alpine; `npm ci --omit=dev`; HEALTHCHECK
- [ ] Create `docker-compose.yml` — app + MongoDB + Redis services; volume mounts for data persistence
- [ ] Create `.dockerignore` — node_modules, .env, .git, logs, tests
- [ ] Create GitHub Actions CI/CD — `.github/workflows/ci.yml`: lint, test, build on PR; deploy on main merge
- [ ] Replace all `console.log/error` with Pino logger — structured JSON logging
- [ ] Add Morgan HTTP request logging — dev format for development, combined for production
- [ ] Update `package.json` — add test, lint scripts; fix main field to server.js; add engine field
- [ ] Final code review — verify no dead code, no duplicate routes, consistent patterns, all issues resolved
- [ ] Add graceful shutdown handling — listen for SIGTERM/SIGINT, close MongoDB connection, drain Socket.IO, stop HTTP server
- [ ] Update README.md — setup instructions, API documentation link, architecture diagram

## Code Review Findings (Reference)

### Application-Breaking Bugs (MUST FIX)
1. `utils/distance.js` and `utils/geocode.js` don't exist — crashes ride features and socket
2. User schema `name` vs controller `username` — user creation stores wrong field
3. Conversation schema `participants` vs controller `members` — all chat broken
4. User schema missing `followers`, `following`, `profilePic`, `isSocialLogin`, `googleId`
5. `Post` model not imported in `userController.js` — crashes getUserProfile
6. Google auth creates user with `password: null` but schema requires password

### Security Vulnerabilities (MUST FIX)
1. No socket authentication — anyone can eavesdrop on chats and GPS
2. ReDoS via unsanitized regex in searchController
3. Mass assignment `Object.assign(ride, req.body)` in rideController
4. Unauthenticated file upload/delete endpoints
5. No authorization on chat (any user reads/sends to any conversation)
6. No authorization on club approve/reject
7. User enumeration in login (different error messages)
8. Wide-open CORS on Express and Socket.IO

### Performance Issues (SHOULD FIX)
1. No pagination on getAllPosts and getNotifications
2. Missing indexes on Notification.recipient, Message.conversation, Post.author
3. `fs.unlinkSync` blocks event loop
4. Unbounded arrays in Ride and Club documents
5. Socket GPS save() on every update causes write amplification
6. `io.emit("newPost")` broadcasts to ALL sockets globally

### Code Quality Issues (SHOULD FIX)
1. Duplicate route registrations (postRoutes `/create` twice, userRoutes `/:id` twice)
2. Duplicate function `getUserProfile` in userController (first is dead code)
3. Error handler ordering in server.js makes multer handler unreachable
4. Inconsistent response format (`{ error }` vs `{ msg }` vs `{ message }`)
5. Inconsistent auth middleware naming (`protect` vs `authMiddleware`)
6. Leftover development comments (`// ADD THIS BLOCK`)
7. `searchController` uses wrong field names (`caption` instead of `content` for Post search, `username` instead of `name` for User search — after rebuild both schema and controller will use `username` and `content`)
