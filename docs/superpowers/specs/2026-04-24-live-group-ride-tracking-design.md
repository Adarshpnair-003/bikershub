# Live Group Ride Tracking — Design

**Date:** 2026-04-24
**Status:** Draft for review
**Author:** Adarsh (VIT22CS005)
**Scope:** Real-time multi-rider GPS sharing on a shared map during an active ride

---

## 1. Overview

Riders on a joined ride need to see each other on a shared map in real time while the ride is in progress, from host-starts-ride through host-ends-ride. The feature covers live rider markers, the group's traced route, per-rider presence, host controls, and basic safety (SOS). It reuses the existing `Ride` model, `/ride-tracking` Socket.IO namespace, and Leaflet map layer.

### Goals
- Every participant sees every other participant's live position, updated within ~2–5 s.
- Clear presence indication: fresh, stale, disconnected.
- Works when a rider briefly loses signal (client queues and flushes on reconnect).
- One-tap SOS for a rider to signal distress to the group.
- Host starts and ends the ride; participants cannot.
- After the ride ends, every participant can replay the traced route and see summary stats.
- Battery- and network-respectful: polling adapts to speed, stationary state, and backgrounded app.

### Non-goals (explicit, v1)
- Public / shareable tracking links for non-participants.
- Waypoints, rally points, or turn-by-turn navigation.
- Multi-instance horizontal scaling of the socket layer (Redis pub/sub is already wired elsewhere; this feature doesn't block on it).
- Offline map tiles.
- Per-rider telemetry beyond position (speed, heading, altitude).
- In-ride text chat redesign (existing chat conversation for ride is reused as-is).

---

## 2. User stories

1. As a **host**, I tap **Start Ride** and the ride flips to `live`; all joined participants are pulled into a shared tracking view.
2. As a **participant**, I see every other rider as a coloured marker on a dark Leaflet map, with my own marker distinctly highlighted.
3. As a **participant**, I see each rider's name and time-since-last-update; riders that haven't pinged in a while appear visually "stale".
4. As a **participant**, I tap any rider's marker to lock the camera on them; tap again (or tap my own) to release follow-mode.
5. As a **host**, I tap **End Ride**; the group sees a summary card (distance, duration, avg speed) and can tap **Replay** to scrub through the traced route.
6. As a **participant**, I press a prominent **SOS** button; all participants receive an unmissable alert and my last known position.
7. As a **participant in a tunnel / dead zone**, my GPS points are queued locally and flushed to the server when I reconnect; the server never accepts back-dated points beyond a sane window.
8. As a **participant with a nearly-empty battery**, the app drops GPS cadence gracefully (≥ 15 s) and shows a low-power badge on my marker.

---

## 3. Architecture

```
Phone (Leaflet + Capacitor Geolocation)
  ├─ watchPosition → local GpsQueue
  ├─ adaptive cadence (speed/state/battery) → socket.emit("rideLocationUpdate")
  ├─ heartbeat every 10 s → socket.emit("ridePing")
  ├─ socket.on("riderLocationUpdated") → update marker
  ├─ socket.on("riderPresenceChanged") → update marker status (live / stale / offline)
  └─ socket.on("rideSosRaised" / "rideEnded") → banner / summary

Server (Socket.IO /ride-tracking namespace)
  ├─ authMiddleware (JWT on handshake)
  ├─ rideHandler.js
  │   ├─ joinRide → room "ride:{id}", emit current snapshot
  │   ├─ rideLocationUpdate → validate, debounce, persist, fan-out
  │   ├─ ridePing → update presence cache
  │   ├─ rideSos → persist SOS flag, fan-out to room + notifications
  │   └─ disconnect → cleanup in-memory keys, emit presenceChanged(offline)
  └─ presenceReaper (setInterval 10 s)
       └─ marks stale riders (> 30 s) and broadcasts
```

Room naming: `ride:{rideId}`. Existing. Unchanged.

---

## 4. Data model changes

Changes to `models/Ride.js` are additive and small.

```js
riderLocations: [{
  user: ObjectId,
  location: { type: "Point", coordinates: [Number] },
  updatedAt: Date,
  // NEW
  batteryLevel: { type: Number, default: null },       // 0..1 when available
  status: {                                             // NEW
    type: String,
    enum: ["live", "stale", "offline"],
    default: "live"
  },
  sosRaisedAt: { type: Date, default: null }            // NEW
}]
```

No new collections. Existing caps (`riderLocations ≤ 50`, `route.coordinates ≤ 2000`) remain adequate.

### Ride status machine (unchanged but documented)

`upcoming → live → completed` (primary path). `cancelled` possible from `upcoming` only. Transitions are host-triggered; auto-transitions are out of scope.

### Indexes
No new indexes required. `riderLocations.user` is accessed via array filter; `$ positional` update already in place.

---

## 5. Backend components

### 5.1 Presence reaper
New module `socket/presenceReaper.js`. A single `setInterval(10_000)` per server instance that:
- scans live rides (status === "live") with `riderLocations.updatedAt < now - 30s && status !== "offline"`
- flips such entries to `"stale"`; after 90 s of no update → `"offline"`
- emits `riderPresenceChanged` to `ride:{id}`

Implementation note: use a single aggregation pipeline with `$set` to avoid N queries; limit to a bounded number of live rides per tick.

### 5.2 SOS handler
New event `rideSos` in `rideHandler.js`:
- verifies sender is a ride participant
- sets `riderLocations.$.sosRaisedAt = now`
- emits `rideSosRaised` to `ride:{id}` with `{ userId, lat, lng, at }`
- creates a `Notification` with type `"ride_sos"` for all other participants
- rate-limit: 1 SOS per 60 s per user to prevent accidental mashing

A second event `rideSosClear` lets the same rider clear their own SOS; only the raiser or the host can clear it.

### 5.3 Ping / heartbeat
New event `ridePing` (lightweight, no coordinates):
- updates a module-scope `lastPingMap` (`userId → now`) for fast staleness checks
- does not hit the DB on the happy path; the reaper consolidates to DB

### 5.4 Disconnect cleanup (fixes known memory leak)
In `rideHandler.js` `disconnect` hook:
- for every ride room the socket was in, delete `lastUpdateMap` / `lastCoordMap` / `lastPingMap` keys for that `${rideId}:${userId}`
- emit `riderPresenceChanged` with `status: "offline"` to the relevant rooms

This resolves CLAUDE.md *remaining issue* #2 (`riderLocations` maps in socket handler not cleaned on disconnect).

### 5.5 Validation hardening
`rideLocationUpdate` payload already rejects missing fields. Add:
- `typeof lat === "number" && typeof lng === "number"`
- `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`
- reject if ride `status !== "live"`
- reject if delta from previous coord > 5 km in < 2 s (teleport filter)

The teleport filter prevents corrupt GPS spikes from polluting the route polyline.

---

## 6. Socket & REST contract

### Socket events (namespace `/ride-tracking`)

**Client → server**

| event | payload | auth |
|---|---|---|
| `joinRide` | `{ rideId }` | participant |
| `leaveRide` | `{ rideId }` | participant |
| `rideLocationUpdate` | `{ rideId, lat, lng, batteryLevel? }` | participant |
| `ridePing` | `{ rideId }` | participant |
| `rideSos` | `{ rideId }` | participant |
| `rideSosClear` | `{ rideId, targetUserId? }` | raiser or host |

**Server → client**

| event | payload |
|---|---|
| `rideSnapshot` | `{ rideId, riders: [{ userId, lat, lng, updatedAt, status, sosRaisedAt?, batteryLevel? }], route: [[lng,lat]] }` (sent on joinRide) |
| `riderLocationUpdated` | `{ userId, lat, lng, updatedAt }` |
| `riderPresenceChanged` | `{ userId, status }` |
| `rideSosRaised` | `{ userId, lat, lng, at }` |
| `rideSosCleared` | `{ userId }` |
| `rideStarted` | `{ rideId, startTime }` |
| `rideEnded` | `{ rideId, endTime, summary }` |
| `rideError` | `{ code, message }` (on auth failure — fixes remaining issue #1) |

### REST (unchanged, additive endpoint only)

- `GET /api/rides/:id/track` — returns current `rideSnapshot` as HTTP (used by the page on mount before the socket snapshot arrives, so the map has data even on cold start).

---

## 7. Frontend components

### 7.1 Pages
- `pages/ride-track.js` — new. The live map page. Mounted when the user navigates to a `live` ride.
- `pages/ride-summary.js` — new. Post-ride stats + replay; routed to automatically on `rideEnded`.
- `pages/ride-detail.js` — existing. Gets a **Track** button when ride is `live` and current user is a participant; **Start Ride** for host on `upcoming`.

### 7.2 Live map layout (`ride-track.js`)

```
┌──────────────────────────────────────┐
│  ←  Back                    Riders 4 │ ← .v2-nav (52px)
├──────────────────────────────────────┤
│                                      │
│            LEAFLET MAP               │
│  (CartoDB Dark Matter + polyline     │
│   of route; rider markers)           │
│                                      │
│                         ┌──────────┐ │
│                         │ follow:  │ │
│                         │ @adarsh  │ │ ← follow-lock pill (tap to release)
│                         └──────────┘ │
├──────────────────────────────────────┤
│  34.2 km   01:12:40   28.1 km/h      │ ← stats strip (live)
│                                      │
│  [  SOS  ]                           │ ← v2-btn primary, red, block
└──────────────────────────────────────┘
```

- Stats strip height ~72 px; SOS button height 48 px.
- Map fills everything between nav and stats strip.
- No bottom tab bar on this page (full-screen tracking).

### 7.3 Rider markers
- Circular avatar in a coloured ring, 36 px.
- Ring colour = deterministic per-user from the `AVATAR_GRADIENTS` palette already used in `post-card.js`, but as a solid ring colour (no gradient).
- Self marker: white 3 px ring.
- Stale (> 30 s no ping): 50 % opacity + grey ring.
- Offline (> 90 s): greyscale + dashed ring.
- SOS: red pulsing ring, always on top.
- Tap marker → `setView` with zoom 16 + follow-lock pill appears.

### 7.4 Post-ride summary (`ride-summary.js`)
- Hero: `distance · duration · avg speed` using `.v2-section-label` + large numbers.
- Map preview: `route` as polyline with start (green dot) and end (red dot) markers, non-interactive static view.
- **Replay** button → opens a modal with a scrubber; a marker animates along `route.coordinates` at 2×, 5×, 10× real-time.
- **Close** returns to `ride-detail`.

### 7.5 Battery / GPS strategy (client)

`utils/rideGps.js` — new.

| app state | speed | cadence |
|---|---|---|
| foreground, moving (> 5 km/h) | — | 2 s |
| foreground, stationary | — | 10 s |
| foreground, battery < 20 % | any | 15 s |
| background | any | 30 s (best-effort) |
| visible & joined but not moving > 2 min | — | pause GPS, rely on last-known |

- Uses `@capacitor/geolocation` `watchPosition` with `enableHighAccuracy: true`; falls back to `false` when battery is low.
- On position error (timeout / unavailable), emits `ridePing` only, so presence stays live even without a fresh fix.
- Heartbeat ping every 10 s regardless.

### 7.6 Offline queue (client)

`utils/gpsQueue.js` — new.

- When socket is disconnected, positions are pushed into an in-memory ring buffer (cap 60 entries = ~2 min at 2 s cadence).
- On `socket.connect`, the queue is drained via a single batched `rideLocationUpdate` per entry, throttled to one emit per 100 ms, **and** each entry carries its original `ts`.
- Server rejects entries older than 5 min (prevents replay / backfill of arbitrary history).

---

## 8. Error handling & edge cases

| case | behaviour |
|---|---|
| Participant opens app mid-ride | `GET /rides/:id/track` on mount, then `joinRide`, then live updates. |
| Host crashes mid-ride | Ride remains `live`; other participants keep seeing each other. Host rejoins and continues. A scheduled watchdog (out of scope for v1) would auto-end stuck rides after 24 h. |
| Rider closes app | `disconnect` → status `offline`. Re-opens → status flips back to `live`. |
| Two devices, same user | Last write wins on `riderLocations` (existing upsert). Both receive broadcasts. Acceptable. |
| Ride ends while rider offline | Rider gets `rideEnded` on reconnect and is routed to summary. |
| Corrupt GPS (teleport) | Rejected by teleport filter; not persisted to route. |
| SOS spam | Rate-limited to 1/min per user. |
| GPS permission denied | Banner: "Location needed to track. Enable in settings." User can still watch others. |
| Background restrictions (Android) | Best-effort; on devices that kill background GPS, marker goes stale within 30 s, which is correct behaviour. |

---

## 9. Security & authorization

- Socket JWT middleware already in place; verified on handshake.
- All new events validate `ride.participants.includes(socket.user.id)` with `.toString()` comparison.
- `rideSosClear` only accepted from the raiser or the ride creator.
- `Ride.status === "live"` required for any location write.
- Rate limits:
  - `rideLocationUpdate`: existing 2-s debounce, unchanged.
  - `ridePing`: 5 s minimum server-side.
  - `rideSos`: 60 s per user.
- Teleport filter (§5.5) hardens route integrity.
- No sensitive data in broadcast payloads beyond position + username (already in profile).

---

## 10. Testing strategy

### Unit
- `utils/rideGps.js` — cadence decision table (matrix of state × speed × battery).
- `utils/gpsQueue.js` — drain ordering, age filter, max-size eviction.
- Teleport filter — known coordinate pairs + deltas.

### Integration (Jest + Supertest + mongodb-memory-server)
- Host starts ride → status flips → participants can join socket room.
- Location update writes to `riderLocations` and pushes into `route.coordinates`.
- Non-participant's location update is rejected.
- Disconnect emits `riderPresenceChanged(offline)`.
- SOS persists `sosRaisedAt`, broadcasts event, creates notifications.
- End ride freezes further updates (`RIDE_NOT_ACTIVE`).

### Socket
- Test with `socket.io-client` in integration suite: two clients, one host, one participant; assert event fan-out.

### Manual QA (mobile)
- Android APK tested while walking/cycling with deliberate signal loss in a building.
- Two phones in the same ride; observe both markers on both screens.
- Force-kill participant app; confirm status transitions to offline on host screen within 90 s.

---

## 11. Phasing

Six small, shippable slices:

**P1 — Disconnect cleanup + error emission** (CLAUDE.md remaining issues #1, #2). Pure backend.
**P2 — Presence (ping + reaper + status field).** Backend + tiny client ping loop.
**P3 — Live map page (`ride-track.js`).** Reads snapshot, renders markers, listens to updates. No SOS, no offline queue.
**P4 — Adaptive GPS + offline queue.** Client-only polish.
**P5 — SOS + SOS notifications.** Backend + UI button + banner.
**P6 — Replay + summary page.** Uses already-persisted `route.coordinates`.

Each phase is independently mergeable and leaves the app in a working state.

---

## 12. Open questions / deferred

- **Multi-instance socket scaling.** Socket.IO Redis adapter is wired in the broader spec; not required for v1 ride counts. Revisit when concurrent live rides exceed single-instance capacity.
- **Shareable public tracking link.** Explicitly deferred. Would require a scoped, expiring JWT and a read-only socket path.
- **Turn-by-turn & waypoints.** Separate feature, separate spec.
- **Crash / fall detection.** Hardware-dependent; deferred.
- **Historical ride replay UX.** Basic scrub in v1; advanced timeline with events (rest stops, SOS markers) deferred.

---

## 13. Summary of file changes

```
models/Ride.js                          MODIFY (add 3 fields on riderLocations)
socket/rideHandler.js                   MODIFY (ping, sos, disconnect cleanup, error emit, teleport filter)
socket/presenceReaper.js                NEW
services/rideService.js                 MODIFY (track/summary helpers)
controllers/rideController.js           MODIFY (+ GET /:id/track)
routes/rideRoutes.js                    MODIFY (new route)
validators/rideValidator.js             MODIFY (location schema: batteryLevel, ts)

frontend/src/pages/ride-track.js        NEW
frontend/src/pages/ride-summary.js      NEW
frontend/src/pages/ride-detail.js       MODIFY (Track/Start/End buttons)
frontend/src/utils/rideGps.js           NEW
frontend/src/utils/gpsQueue.js          NEW
frontend/src/utils/rideSocket.js        NEW (namespace-scoped client)

tests/unit/rideGps.test.js              NEW
tests/unit/gpsQueue.test.js             NEW
tests/integration/rideTracking.test.js  NEW
```

Total: 7 new files, 7 modified.
