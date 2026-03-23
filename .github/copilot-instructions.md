# Bikers Hub — Copilot Instructions

## Project Context

Bikers Hub is a Node.js/Express backend API for a motorcycle riders' social networking and ride management platform. It serves a React Native mobile app. The backend uses MongoDB (Mongoose), Socket.IO for real-time features, JWT authentication, and Cloudinary for media storage.

## Architecture

This project follows **Layered MVC with Service Layer**:

```
Request → Route → Validator → Controller → Service → Model → Database
```

- **Routes** (`src/routes/v1/`): Define endpoints, apply auth + validation middleware
- **Validators** (`src/validators/`): Joi schemas for input validation
- **Controllers** (`src/controllers/`): Thin wrappers — extract input, call service, send response
- **Services** (`src/services/`): All business logic lives here — authorization, data operations, error throwing
- **Models** (`src/models/`): Mongoose schemas with indexes
- **Middleware** (`src/middleware/`): Auth, error handling, rate limiting, validation, upload
- **Utils** (`src/utils/`): AppError, catchAsync, apiResponse, distance, geocode, sanitize

## Coding Standards

### Controllers — Keep Thin
Controllers should be 5-10 lines. They must NOT contain business logic.

```javascript
// GOOD
const createRide = catchAsync(async (req, res) => {
  const ride = await rideService.create(req.user.id, req.body);
  res.status(201).json(apiResponse.success(ride, "Ride created"));
});

// BAD — business logic in controller
const createRide = async (req, res) => {
  try {
    const existingRide = await Ride.findOne({ title: req.body.title });
    if (existingRide) return res.status(400).json({ error: "exists" });
    // ... more logic
  } catch (err) { ... }
};
```

### Services — Business Logic Home
Services receive plain data, not Express req/res objects. They throw AppError for business rule violations.

```javascript
// GOOD
async function create(userId, data) {
  const existing = await Ride.findOne({ title: data.title, createdBy: userId });
  if (existing) throw new AppError("You already have a ride with this title", 400, "DUPLICATE_RIDE");
  return Ride.create({ ...data, createdBy: userId });
}

// BAD — using req/res in service
async function create(req, res) { ... }
```

### Error Handling
- Use `AppError` for operational errors: `throw new AppError(message, statusCode, code)`
- Wrap async controllers with `catchAsync()` — never use try-catch in controllers
- Never expose stack traces in production
- Use consistent error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `DUPLICATE`

### Response Format
All responses MUST follow this structure:

```javascript
// Success
apiResponse.success(data, "Message")  // → { success: true, data, message }

// Error (handled by errorHandler middleware)
// → { success: false, error: { code, message } }
```

### Database Patterns
- Never use `Object.assign(doc, req.body)` — explicitly pick allowed fields
- Use `.lean()` for read-only queries (returns plain objects, faster)
- Use cursor-based pagination for feeds: `{ _id: { $lt: cursor } }` sorted by `{ _id: -1 }`
- Always add indexes for frequently queried fields
- Compare ObjectIds with `.toString()`: `doc.userId.toString() === id`
- Avoid unbounded array growth in documents

### Input Validation
- Every route must have a Joi validator
- Escape user input before using in `RegExp()`: `sanitize.escapeRegex(input)`
- Use `express-mongo-sanitize` to strip `$` operators
- Never trust client input — validate types, lengths, formats server-side

### Authentication & Authorization
- Access tokens: 15-minute expiry, HS256 algorithm with `JWT_SECRET`, in Authorization header
- Refresh tokens: 7-day expiry, rotation on every refresh
- Always verify user has permission to access/modify a resource
- Socket connections must be authenticated via JWT in handshake
- Same error message for "user not found" and "wrong password" (prevent enumeration)

### File Handling
- Use async `fs.promises.unlink` — never `fs.unlinkSync` (blocks event loop)
- All upload/delete endpoints require authentication
- Verify user owns the resource before allowing delete

### Socket.IO
- Three namespaces: `/chat`, `/ride-tracking`, `/notifications`
- All connections authenticated
- All messages MUST be persisted to database (not just broadcast)
- Room names: `conversation:{id}`, `club:{id}`, `ride:{id}`, `post:{id}`, `user:{id}`
- GPS updates debounced to max 1 per 2 seconds
- User identity from verified token, never from client payload

### Logging
- Use Pino logger — never `console.log` or `console.error`
- Structured JSON format
- Log levels: error, warn, info, debug

## Security Rules

1. No `cors()` without explicit origin whitelist
2. `helmet()` must be first in middleware stack
3. Rate limiting on all endpoints (stricter on auth/upload)
4. `express-mongo-sanitize` on all inputs
5. Escape regex before `new RegExp(userInput)`
6. Never spread `req.body` directly into DB operations
7. Authorization check on every protected endpoint
8. Never expose Cloudinary API secret to client
9. Passwords hashed with bcryptjs (12 rounds)
10. Refresh token rotation with reuse detection

## Environment Variables

Required (see `.env.example`):
- `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- `GOOGLE_CLIENT_ID`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `REDIS_URL`, `WEATHER_API_KEY`, `ALLOWED_ORIGINS`, `LOG_LEVEL`

## Testing

- **Stack:** Jest + Supertest + mongodb-memory-server
- **Unit tests:** Services and utils (`tests/unit/`)
- **Integration tests:** API endpoints (`tests/integration/`)
- **Mock externals:** Cloudinary, weather API, geocoding
- **Run:** `npm test` (all), `npm run test:unit`, `npm run test:int`

## Key Models

| Model | Key Fields | Indexes |
|-------|-----------|---------|
| User | username, email, password (optional), followers, following, googleId, isSocialLogin | email (unique), username, googleId (sparse) |
| Post | content, author, club, media[], likes[], commentsCount | author, club |
| Comment | content, author, post, parentComment, likes[], isDeleted | { post, createdAt }, author |
| Club | name (unique), description, owner, admins[], members[], joinRequests[] | owner, members |
| Ride | title, startLocation, destination, startCoords (2dsphere), destinationCoords (2dsphere), participants[], rideStatus, route (LineString) | startCoords, destinationCoords |
| Notification | recipient, sender, type, post, club, ride, isRead | { recipient, isRead, createdAt } |
| Conversation | participants[], type, lastMessage, lastMessageAt | participants |
| Message | conversation, sender, text, type, readBy[] | conversation |
| RefreshToken | token (hashed), userId, family, expiresAt (TTL), revoked | token, { expiresAt: TTL } |

## Common Pitfalls to Avoid

1. Using `name` instead of `username` in User queries (schema field is `username`)
2. Using `members` instead of `participants` in Conversation queries
3. Using `caption` instead of `content` in Post search
4. Using `profilePic` instead of `avatar` for User profile picture
5. Forgetting to add auth middleware to routes (especially upload/delete)
6. Broadcasting socket events globally instead of to specific rooms
7. Using `includes()` to compare ObjectIds (always use `.toString()` for consistency)
8. Forgetting to persist socket messages to database
9. Using synchronous file operations (`unlinkSync`)
10. Creating notifications with invalid type enum values
