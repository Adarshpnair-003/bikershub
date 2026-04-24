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
  location: { type: "Point", coordinates: [Number] },   // may be null if SOS before first fix
  updatedAt: Date,
  // NEW
  batteryLevel: { type: Number, default: null, min: 0, max: 1 },
  status: {                                             // NEW — advisory only (see below)
    type: String,
    enum: ["live", "stale", "offline"],
    default: "live"
  },
  sosRaisedAt: { type: Date, default: null }            // NEW
}]
```

No new collections. Existing caps (`riderLocations ≤ 50`, `route.coordinates ≤ 2000`) remain adequate.

**Advisory status caveat.** The per-rider `status` field is an optimisation for cold-start snapshots so that a client opening the page mid-ride knows which riders look offline before any live events arrive. It is **not** the source of truth — the reaper can miss a subdoc that was trimmed by the `pre("save")` cap, and a stale status lingering on a trimmed entry is harmless because the next ping/update recreates the entry. Clients primarily drive marker state from the real-time `riderPresenceChanged` events and only fall back to the snapshot's `status` on first render.

### Ride status machine (unchanged but documented)

`upcoming → live → completed` (primary path). `cancelled` possible from `upcoming` only. Transitions are host-triggered; auto-transitions are out of scope.

### Indexes
No new indexes required. `riderLocations.user` is accessed via array filter; `$ positional` update already in place.

---

## 5. Backend components

### 5.1 Presence reaper
New module `socket/presenceReaper.js`. A single `setInterval(10_000)` per server instance that runs a two-stage pass:

**Stage 1 — read.** One aggregation on `Ride` where `status === "live"`, `$unwind: riderLocations`, `$match` entries where `updatedAt < now - 30s AND status !== "offline"` (or the in-memory `lastPingMap[rideId:userId]` is also stale). Projects `{ rideId, userId, updatedAt, currentStatus, newStatus }` where `newStatus` is `"stale"` between 30–90 s and `"offline"` beyond 90 s.

**Stage 2 — write + fan-out.** One `bulkWrite` with per-entry `arrayFilters` to `$set riderLocations.$[x].status`. Then iterate the result set and `io.to("ride:{rideId}").emit("riderPresenceChanged", { userId, status })`.

The "single pipeline" claim in the earlier draft was misleading — nested-array status flips across many docs need a read-then-bulkWrite, and the socket fan-out needs the list of changes which a pure in-Mongo update cannot return.

Liveness input is the **union** of (a) `riderLocations.updatedAt` (persisted, from `rideLocationUpdate`) and (b) `lastPingMap` (in-memory, from `ridePing`). A parked rider who stops moving but keeps heartbeat-pinging is still considered `"live"`; the reaper checks the more recent of the two.

Throttles: bounded to the N most recently active live rides per tick (N = 100 for v1). If live rides exceed N, the remaining are handled on the next tick (still within 20 s of the threshold).

**Note on the capped `riderLocations` array (§4).** The `pre("save")` hook in `models/Ride.js` trims the array at 50 entries. A status written by the reaper on a subdoc that gets sliced off later is silently dropped. This is acceptable: status is an optimisation hint for clients; the next ping or position update will recreate the entry, and the reaper re-applies on the next tick. Clients should treat the absence of a rider's entry in a fresh snapshot as "unknown / offline" and key primarily off the presence events.

### 5.2 SOS handler
New event `rideSos` in `rideHandler.js`:
- verifies sender is a ride participant
- performs an atomic upsert mirroring `rideLocationUpdate`: first tries `$set riderLocations.$.sosRaisedAt = now` where `riderLocations.user === userId`; if no matching entry exists (rider SOS'd before ever sending a position), falls back to `$push { user, location: null, sosRaisedAt: now, updatedAt: now, status: "live" }`.
- emits `rideSosRaised` to `ride:{id}` with `{ userId, lat, lng, at }` (lat/lng null if the rider has no position yet — client shows a "location unknown" SOS banner in that case)
- creates a `Notification` with type `"ride_sos"` for all other participants
- rate-limit: 1 SOS per 60 s per user to prevent accidental mashing

A second event `rideSosClear` lets the same rider clear their own SOS; only the raiser or the host can clear it.

### 5.3 Ping / heartbeat
New event `ridePing` (lightweight, no coordinates):
- updates a module-scope `lastPingMap` (`userId → now`) for fast staleness checks
- does not hit the DB on the happy path; the reaper consolidates to DB

### 5.4 Disconnect cleanup (fixes known memory leak)

The handler maintains a per-`{rideId, userId}` socket reference count — `userSocketCount: Map<"rideId:userId", number>`. Incremented on `joinRide`, decremented on `leaveRide` and on socket `disconnect` for each room the socket was in.

On socket `disconnect`:
- for every ride room the disconnecting socket was in, decrement `userSocketCount["rideId:userId"]`
- if the count reaches 0:
  - delete `lastUpdateMap["rideId:userId"]`, `lastCoordMap["rideId:userId"]`, `lastPingMap["rideId:userId"]`
  - emit `riderPresenceChanged` with `status: "offline"` to `ride:{id}`
- if the count remains > 0 (user has another device still connected), emit nothing — the user is still live.

This resolves CLAUDE.md *remaining issue* #2 (maps never cleaned up) **and** reconciles the "two devices, same user: acceptable" case in §8 with the offline broadcast.

### 5.5 Validation hardening
`rideLocationUpdate` payload already rejects missing fields. Add:
- `typeof lat === "number" && typeof lng === "number"`
- `lat ∈ [-90, 90]`, `lng ∈ [-180, 180]`
- `batteryLevel` (optional) clamped to `[0, 1]`; reject out-of-range values
- reject if ride `status !== "live"`
- **Teleport filter:** reject if the *implied speed* from the last accepted coordinate exceeds **300 km/h**. Implied speed is `haversine(prev, curr) / (nowMs - prevAcceptedMs)`. Phrased this way because the existing 2-s debounce (`rideHandler.js:40`) guarantees `Δt ≥ 2 s` on the happy path, so a fixed-window "5 km in < 2 s" rule can never fire. The speed-based rule handles both the debounced cadence and longer gaps (reconnect, backgrounded app).

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

### REST

Rather than introduce a brand-new endpoint that duplicates `GET /:id/locations` + `GET /:id/route`, **extend `GET /api/rides/:id/locations`** to return the combined payload the client needs on cold start:

```json
{
  "success": true,
  "data": {
    "riders": [{ "userId", "username", "lat", "lng", "updatedAt", "status", "sosRaisedAt", "batteryLevel" }],
    "route": [[lng, lat], ...],
    "totalDistance": Number,
    "status": "upcoming" | "live" | "completed" | "cancelled"
  }
}
```

- Auth: participant-only (reuses `ride.participants.includes(req.user.id)` check already in `rideService.getLocations`).
- Rate limit: global rate-limiter tier suffices; no per-endpoint limit needed.
- `GET /:id/route` remains available for the post-ride summary page, but the live tracking page calls only the extended `/:id/locations` on mount, then joins the socket room for deltas.

No new URL. Existing `getLocations` service is extended to include `route` and `status`.

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
- **UX note on the distance number.** The live tracking page shows a running `totalDistance` fed by server `$inc` (which excludes offline-replayed frames, see §7.6). The summary hero shows the re-derived total from `route.coordinates` computed in `rideService.end`. On rides with significant offline-replay activity these two numbers can differ. Render the summary value **statically** — do **not** count-up-animate from the last running total — so the gap isn't visually surfaced. The summary value is the canonical one.

### 7.5 Battery / GPS strategy (client)

`utils/rideGps.js` — new.

| app state | speed | `watchPosition` cadence | heartbeat `ridePing` |
|---|---|---|---|
| foreground, moving (> 5 km/h) | — | 2 s | 10 s |
| foreground, stationary | — | 10 s | 10 s |
| foreground, battery < 20 % | any | 15 s | 10 s |
| background | any | 30 s (best-effort) | 10 s |
| stationary > 2 min | — | **pause** `watchPosition` | **10 s (continues)** |

- Uses `@capacitor/geolocation` `watchPosition` with `enableHighAccuracy: true`; falls back to `false` when battery is low.
- On position error (timeout / unavailable), `watchPosition` is reissued on the next tick, but `ridePing` keeps flowing unconditionally.
- The "stationary > 2 min" row is the subtle one: GPS fixing pauses, but the heartbeat continues every 10 s. The **presence reaper treats heartbeats as liveness** (§5.1), so the rider stays `"live"` for peers even with no position updates. Their marker simply stops moving — which is correct. The moment any position fix arrives (user moves, or watch re-enables on speed trigger), normal cadence resumes.
- Movement detection: if two consecutive low-cadence fixes indicate motion above a 2 km/h threshold, the watcher reopens at 2 s cadence before the 2 min timer expires.

### 7.6 Offline queue (client)

`utils/gpsQueue.js` — new.

- When socket is disconnected, positions are pushed into an in-memory ring buffer (cap 60 entries = ~2 min at 2 s cadence).
- On `socket.connect`, the queue is drained via a single batched `rideLocationUpdate` per entry, emitted **in `ts` ascending order**, throttled to one emit per 100 ms, **and** each entry carries its original client `ts`.
- Server rejects entries older than 5 min (prevents replay / backfill of arbitrary history).
- **Distance accumulation on replayed frames:** replayed entries (those with a client-supplied `ts` older than `nowMs - 10 s`) are persisted into `route.coordinates` and `riderLocations` but are **not** counted toward `$inc: totalDistance` on the server and do **not** advance `lastCoordMap`. This prevents inflated stats when clients flush a backlog. The canonical distance for the ride is re-derived from `route.coordinates` in `rideService.end` (sum of Haversine segments after sorting by insertion order), replacing the running `$inc`. Clients display the running `$inc` during the ride as a best-effort approximation and the re-derived value after `rideEnded`.

---

## 8. Error handling & edge cases

| case | behaviour |
|---|---|
| Participant opens app mid-ride | `GET /rides/:id/locations` (extended payload, §6) on mount, then `joinRide`, then live updates. |
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
- Disconnect emits `riderPresenceChanged(offline)` **only when the user's last socket disconnects** (second device open → no offline event).
- SOS persists `sosRaisedAt`, broadcasts event, creates notifications; SOS before any position update creates a `riderLocations` entry with null location.
- End ride freezes further updates (`RIDE_NOT_ACTIVE`).
- Teleport filter: a `rideLocationUpdate` whose implied speed from the previous accepted point exceeds 300 km/h is rejected and the client receives `rideError`.
- Offline queue replay: a batch of 10 positions with client `ts` spanning the last 30 s is persisted to `route.coordinates` in order, but `totalDistance` is not incremented by $inc for replayed frames; `rideService.end` then re-derives the correct total.
- Presence transitions: `live → stale` after 30 s without update/ping, `stale → offline` after 90 s, `offline → live` on next ping, `stale → live` on next update. All three boundary timings asserted with clock mocking.

### Socket
- Test with `socket.io-client` in integration suite: two clients, one host, one participant; assert event fan-out.

### Manual QA (mobile)
- Android APK tested while walking/cycling with deliberate signal loss in a building.
- Two phones in the same ride; observe both markers on both screens.
- Force-kill participant app; confirm status transitions to offline on host screen within 90 s.

---

## 11. Phasing

Six small, shippable slices. Dependencies between phases are explicit:

**P1 — Disconnect cleanup + error emission + `userSocketCount`.** CLAUDE.md remaining issues #1, #2. Pure backend. Independent. Introduces the per-`{rideId, userId}` socket count (§5.4) that P2 depends on.

**P2 — Presence (ping + reaper + status field).** Depends on **P1** — without the `userSocketCount` fix, P2 would emit spurious `offline` events on transient socket reconnects and on users with multiple devices. Backend + tiny client ping loop.

**P3 — Live map page (`ride-track.js`) + extended `GET /:id/locations`.** Depends on **P2** (reads presence status). Renders markers, listens to updates. No SOS, no offline queue yet.

**P4 — Adaptive GPS + offline queue.** Depends on **P2** — the server-side `ts` acceptance window (§5.5, §7.6) must already exist in the `rideLocationUpdate` validator. Predominantly client-side polish.

**P5 — SOS + SOS notifications.** Depends on **P3** (banner needs the live map UI). Backend event + UI button + peer banner.

**P6 — Replay + summary page + end-of-ride distance recomputation.** Depends on **P4** (otherwise recomputed distance will already match running `$inc` and the recomputation is unnecessary). UI on post-ride data only, but the server's `rideService.end` change to re-derive `totalDistance` from `route.coordinates` lands here.

Each phase is independently mergeable and leaves the app in a working state. Phases P3 onward require all prior phases; P1 ships alone.

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
socket/rideHandler.js                   MODIFY (ping, sos w/ upsert, disconnect cleanup
                                        w/ userSocketCount, error emit, teleport filter)
socket/presenceReaper.js                NEW (read aggregation + bulkWrite + fan-out)
services/rideService.js                 MODIFY (getLocations extended w/ route + status;
                                        end() re-derives totalDistance from route.coordinates)
controllers/rideController.js           MODIFY (getLocations payload change only)
validators/rideValidator.js             MODIFY (location schema: batteryLevel 0-1, ts)

frontend/src/pages/ride-track.js        NEW
frontend/src/pages/ride-summary.js      NEW
frontend/src/pages/ride-detail.js       MODIFY (Track/Start/End buttons)
frontend/src/utils/rideGps.js           NEW
frontend/src/utils/gpsQueue.js          NEW
frontend/src/utils/rideSocket.js        NEW (namespace-scoped client)

tests/unit/rideGps.test.js              NEW (cadence decision matrix)
tests/unit/gpsQueue.test.js             NEW (order, age filter, max-size eviction)
tests/integration/rideTracking.test.js  NEW (socket fan-out, presence transitions,
                                        multi-device disconnect, teleport, SOS upsert,
                                        offline replay distance semantics)
```

Total: 7 new files, 6 modified. No new REST route added — existing `GET /:id/locations` is extended.
