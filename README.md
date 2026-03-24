# Bikers Hub — Backend API

A Node.js/Express REST API and real-time backend for Bikers Hub, a social networking and ride management platform for motorcycle riders.

**Academic Project:** B.Tech CSE, Visat Engineering College (CSD415)
**Team:** VIT22CS002 (Abhirami), VIT22CS005 (Adarsh), VIT22CS024 (Govind), VIT22CS038 (Sidharth)
**Guide:** Mr. Jijo Joshy

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ with Express 5.x |
| Database | MongoDB 7+ with Mongoose 9.x (Atlas or self-hosted) |
| Real-time | Socket.IO 4.x with optional Redis adapter |
| Auth | JWT (access + refresh tokens) + Google OAuth2 |
| File Storage | Cloudinary |
| Validation | Joi |
| Testing | Jest + Supertest + mongodb-memory-server |
| Logging | Pino + pino-http |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas URI)
- A Cloudinary account
- A Google OAuth2 client ID

### Local development

```bash
# 1. Clone the repository
git clone <repo-url>
cd bikershub

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in all required values (see Environment Variables below)

# 4. Start the development server (with hot reload)
npm run dev
```

The server starts on the port configured in `PORT` (default `3000`). A health check is available at `GET /`.

### Production

```bash
npm start
```

---

## Docker Deployment

Docker Compose starts the API server, MongoDB, and Redis together.

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up --build -d

# Stop all services
docker-compose down
```

The API will be available at `http://localhost:3000`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values below. All variables marked **required** must be set before the server will start.

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development`, `production`, or `test` |
| `PORT` | No | HTTP port (default: `3000`) |
| `MONGO_URI` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | HS256 secret for access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | HS256 secret for refresh tokens (min 32 chars) |
| `JWT_ACCESS_EXPIRY` | No | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRY` | No | Refresh token TTL (default: `7d`) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth2 client ID |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `REDIS_URL` | No | Redis connection URI — enables Socket.IO Redis adapter for horizontal scaling |
| `LOG_LEVEL` | No | Pino log level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`) |
| `ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed CORS origins |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window in milliseconds (default: `900000`) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: `100`) |
| `GEOCODER_USER_AGENT` | No | User-Agent header for Nominatim geocoding requests |
| `WEATHER_API_KEY` | No | OpenWeatherMap API key (required only for weather features) |

---

## API Endpoints

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <access_token>`.

### Auth `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Register with username, email, and password |
| POST | `/login` | Login — returns access token + refresh token |
| POST | `/google` | Google OAuth login |
| POST | `/refresh` | Exchange refresh token for a new token pair |
| POST | `/logout` | Revoke refresh token |

### Users `/api/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | Yes | Current user profile |
| GET | `/:id` | No | Public user profile |
| PUT | `/me` | Yes | Update profile |
| PUT | `/follow/:id` | Yes | Follow a user |
| PUT | `/unfollow/:id` | Yes | Unfollow a user |

### Posts `/api/posts`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create post (up to 5 media files) |
| GET | `/` | No | Global feed (paginated) |
| GET | `/feed` | Yes | Personalized feed from followed users (cursor-based) |
| GET | `/:id` | No | Single post |
| PUT | `/:id` | Yes | Update post (owner only) |
| DELETE | `/:id` | Yes | Delete post (owner only) |
| PUT | `/:id/like` | Yes | Like/unlike post |

### Comments `/api/comments`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/:postId` | Yes | Create comment or reply |
| GET | `/:postId` | No | Get comments (paginated) |
| PUT | `/:id/like` | Yes | Like/unlike comment |
| DELETE | `/:id` | Yes | Delete comment (owner only) |

### Clubs `/api/clubs`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create club |
| GET | `/:id` | No | Club details |
| POST | `/:id/join` | Yes | Join or request to join |
| PUT | `/:id/leave` | Yes | Leave club |
| GET | `/:id/requests` | Yes | Pending join requests (admin/owner) |
| PUT | `/:id/approve/:userId` | Yes | Approve join request (admin/owner) |
| PUT | `/:id/reject/:userId` | Yes | Reject join request (admin/owner) |
| POST | `/:id/posts` | Yes | Create club post (member only) |
| GET | `/:id/posts` | No | Club posts |

### Rides `/api/rides`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | Yes | Create ride |
| GET | `/` | No | List rides (paginated) |
| GET | `/nearby` | Yes | Nearby rides (geospatial) |
| GET | `/:id` | No | Ride details |
| PUT | `/:id` | Yes | Update ride (creator only) |
| DELETE | `/:id` | Yes | Delete ride (creator only) |
| POST | `/:id/join` | Yes | Join ride |
| POST | `/:id/leave` | Yes | Leave ride |
| POST | `/:id/invite/:userId` | Yes | Invite user (creator only) |
| PUT | `/:id/start` | Yes | Start ride (creator only) |
| PUT | `/:id/location` | Yes | Update GPS location (participant only) |
| PUT | `/:id/end` | Yes | End ride and calculate stats (creator only) |
| GET | `/:id/route` | No | Ride route |
| GET | `/:id/locations` | Yes | Live rider locations |

### Notifications `/api/notifications`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Yes | List notifications (paginated) |
| GET | `/unread-count` | Yes | Unread count |
| PUT | `/:id/read` | Yes | Mark notification as read |
| PUT | `/read-all` | Yes | Mark all as read |
| DELETE | `/:id` | Yes | Delete notification |

### Chat `/api/chat` and `/api/conversations`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/conversations` | Yes | Create or get a DM conversation |
| GET | `/conversations` | Yes | List conversations |
| GET | `/conversations/:id` | Yes | Get conversation (participant only) |
| POST | `/chat/send` | Yes | Send message (participant only) |
| GET | `/chat/conversation/:id` | Yes | Get messages (participant only, paginated) |
| PUT | `/chat/read/:conversationId` | Yes | Mark conversation as read |
| GET | `/chat/unread` | Yes | Unread message count |

### Other
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/search` | No | Global search (users, posts, clubs, rides) |
| POST | `/upload` | Yes | Upload single file |
| POST | `/upload/multiple` | Yes | Upload multiple files (max 5) |
| POST | `/upload/profile` | Yes | Upload profile picture |
| DELETE | `/upload` | Yes | Delete file |

---

## Real-Time (Socket.IO)

Socket.IO connections require a valid JWT passed in the handshake:

```javascript
const socket = io("http://localhost:3000", {
  auth: { token: "<access_token>" }
});
```

**Events emitted by clients:**

| Event | Namespace | Description |
|---|---|---|
| `joinConversation` | `/` | Join a DM conversation room |
| `sendMessage` | `/` | Send a DM message (persisted to DB) |
| `joinClubChat` | `/` | Join a club chat room |
| `sendClubMessage` | `/` | Send a club message |
| `joinRide` | `/` | Join a ride tracking room |
| `rideLocationUpdate` | `/` | Broadcast GPS location (debounced, 1/2s) |
| `joinNotifications` | `/` | Subscribe to personal notification events |
| `joinPost` | `/` | Subscribe to real-time post events |

**Events emitted by the server:**

| Event | Description |
|---|---|
| `receiveMessage` | New DM message received |
| `receiveClubMessage` | New club chat message |
| `receiveRideMessage` | New ride chat message |
| `riderLocationUpdated` | Rider GPS update |
| `newNotification` | New notification for current user |
| `postLiked` | A post was liked |
| `newComment` | New comment on a post |

---

## Running Tests

```bash
# Run all tests
npm test

# Unit tests only (services, utilities)
npm run test:unit

# Integration tests only (API endpoints with Supertest)
npm run test:int

# Run with coverage report
npm run test:coverage
```

Tests use `mongodb-memory-server` — no real database connection is needed.

---

## Architecture

```
Request → Route → Validator (Joi) → Controller → Service → Model → MongoDB
                                        |
                                    AppError → errorHandler → JSON response
```

- **Controllers** are thin wrappers (~5–10 lines): extract input, call service, send response.
- **Services** contain all business logic and throw `AppError` for rule violations.
- **Validators** run Joi schemas before every protected route.
- **Middleware** stack (in order): helmet → CORS → body parsers → mongo-sanitize → pino-http → rate limiter → routes → 404 → errorHandler.

### Directory Layout

```
config/       — env validation, database, Cloudinary, logger
middleware/   — auth, error handler, rate limiter, validation, upload
models/       — Mongoose schemas
services/     — business logic (one file per resource)
controllers/  — thin HTTP handlers
routes/       — Express routers
validators/   — Joi schemas
socket/       — Socket.IO event handlers (chat, ride, notifications, posts)
utils/        — AppError, catchAsync, apiResponse, distance, geocode, sanitize
tests/        — Jest unit and integration tests
```

### Response Format

All responses follow a consistent envelope:

```jsonc
// Success
{ "success": true, "data": { ... }, "message": "..." }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```
