# Copilot Instructions for BikersHub Backend

## Project Scope

- Node.js + Express backend (CommonJS) with MongoDB (Mongoose) and Socket.IO.
- Entry point: `server.js`.
- API base groups: `/api/auth`, `/api/users`, `/api/posts`, `/api/comments`, `/api/clubs`, `/api/notifications`, `/api/rides`, `/api/search`, `/api/chat`, `/api/conversations`, `/api/upload`.

## Run and Dev Commands

- Install dependencies: `npm install`
- Run production-style server: `npm start`
- Run with auto-reload: `npm run dev`

Notes:

- There is no test script or lint script configured in `package.json`.
- Default port is `5000` unless `PORT` is set.

## Required Environment Variables

Create a `.env` with at least:

- `MONGO_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `GOOGLE_CLIENT_ID` (for Google auth)
- `PORT` (optional)

## Architecture and Boundaries

- Keep request flow as: route -> middleware -> controller -> model.
- Routes live in `routes/` and should stay thin.
- Business logic and DB writes belong in `controllers/`.
- Schemas and indexes belong in `models/`.
- Cross-cutting request concerns belong in `middleware/`.
- Infrastructure setup belongs in `config/`.
- Real-time event contracts belong in `socket/socket.js`.

## Existing Conventions to Follow

- Use `async/await` and `try/catch` in controllers.
- Return JSON errors in existing style (`{ msg: ... }` or `{ error: ... }`) instead of adding a new global response shape.
- Protect private routes with `middleware/authMiddleware.js` and read authenticated user from `req.user.id`.
- For request validation, use `express-validator` middleware arrays and return `400` with `errors: errors.array()`.
- For uploads, use `middleware/upload.js` (multer) and keep media filtering to image/video unless explicitly changing policy.
- Reuse Mongoose patterns already present (refs, enums, `timestamps`, schema indexes where needed).

## Socket.IO Guidance

- Socket server is initialized in `socket/socket.js` via `initSocket(server)`.
- If controller code needs to emit events, use `getIO()` from `socket/socket.js`.
- Maintain room naming conventions already used in socket handlers (`conversation:*`, `ride:*`, `club:*`, `rideChat:*`, `post:*`).
- When introducing new events, add both emit and listener naming consistently and avoid breaking existing client event names.

## Known Pitfalls in This Codebase

- `socket/socket.js` imports `../utils/distance`, but `utils/` may be missing in some checkouts. Verify this module exists before changing ride-tracking logic.
- `routes/postRoutes.js` currently includes duplicate `/create` route definitions and mixed middleware aliases (`protect` and `authMiddleware` point to the same file). Avoid adding more duplicates; cleanly extend existing routes.
- Socket CORS currently allows `origin: "*"`; do not broaden further in production-facing changes.

## Change Hygiene

- Prefer minimal, targeted edits and preserve existing API behavior unless the task requests breaking changes.
- When adding endpoints, update the relevant route file and its controller together in one change.
- If schema changes affect reads/writes, update both controller logic and query/populate behavior.

## Reference Docs

- Project readme: `README.md`

If more documentation is added (e.g., `docs/`, `CONTRIBUTING.md`, `ARCHITECTURE.md`), reference it here instead of duplicating details.
