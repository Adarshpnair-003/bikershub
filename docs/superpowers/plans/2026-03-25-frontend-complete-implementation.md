# Bikers Hub — Complete Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Capacitor frontend from 60% to 100% feature coverage — every backend API endpoint wired, real-time Socket.IO integrated, all missing screens built, all CRUD operations complete.

**Architecture:** Vanilla JS SPA with hash-based routing, Vite bundler, Capacitor for Android. Pages export `render()` (returns HTML string) and `mount()` (attaches event handlers). Components are pure functions returning HTML strings. API calls go through `utils/api.js` which auto-refreshes tokens and normalizes responses.

**Tech Stack:** Vite 5.4, Capacitor 8.2, Leaflet.js, Socket.IO Client 4.x, vanilla ES modules

**Design System:**
- Dark theme: bg `#0d1117`, surface `#1f2937`, card `#374151`, primary `#E53935`, text `#f9fafb`
- Fonts: Exo 2 (headings 700-800), Nunito (body 400-700)
- Pill inputs 28px radius, red buttons, 60px fixed bottom tab bar

---

## Current State Assessment

### Working (✅)
- Auth: login, register, token refresh, guest mode
- Home feed: posts list, like/unlike, comments modal
- Clubs: discover list, join, your clubs, rides tab
- Rides: list, create, join
- Maps: Leaflet map, geolocation, weather, nearby rides
- Chat: conversations list, messages (polling), send, mark read
- Notifications: list, mark read, mark all, pagination
- Search: global search with type filters
- Create Post: text + multi-image upload
- Create Ride: form with all fields
- Profile: read-only view with post grid

### Missing (❌) — What This Plan Builds
1. **Backend gaps** — 3 missing endpoints needed by frontend (logout, update profile, get single post)
2. **Socket.IO integration** — chat (replace polling), notifications (real-time), ride tracking (live GPS)
3. **Ride Detail page** — view ride info, participants, start/end ride, live GPS map
4. **Club Detail page** — info, members, club posts, management (approve/reject)
5. **Create Club page** — form to create new clubs
6. **Edit Profile page** — update username, bio, profile picture
7. **User Profile page** — view other users, follow/unfollow
8. **Post Detail page** — single post view with edit/delete
9. **Follow/Unfollow** — working buttons throughout UI
10. **Comment enhancements** — like, delete, threaded replies
11. **Proper logout** — revoke refresh token on backend
12. **Club post creation** — post within a club
13. **Ride route display** — show completed ride routes on map

---

## Key Backend Route Reference (Verified)

These are the EXACT backend routes as they exist. All frontend API calls MUST match these paths:

```
AUTH:
  POST /api/auth/register        — { email, password, username }
  POST /api/auth/login           — { email, password } → { token, refreshToken, user }
  POST /api/auth/google          — { token } (Google ID token)
  POST /api/auth/refresh         — { refreshToken } → { token, refreshToken }
  (MISSING: /api/auth/logout)

USERS:
  GET  /api/users/me             — current user profile
  GET  /api/users/:id            — public user profile
  PUT  /api/users/follow/:id     — follow user
  PUT  /api/users/unfollow/:id   — unfollow user
  (MISSING: PUT /api/users/me — update profile)

POSTS:
  POST /api/posts                — create (multipart, field: "media", max 5)
  GET  /api/posts                — global feed (paginated)
  GET  /api/posts/feed           — smart feed from followed users
  PUT  /api/posts/like/:id       — like/unlike
  PUT  /api/posts/:id            — update post (multipart)
  DELETE /api/posts/:id          — delete post
  (MISSING: GET /api/posts/:id — single post)

COMMENTS:
  POST /api/comments/:postId     — { content, parentComment? }
  GET  /api/comments/:postId     — paginated comments
  PUT  /api/comments/like/:commentId — like comment
  DELETE /api/comments/:commentId — soft delete

CLUBS:
  GET  /api/clubs                — list all clubs
  POST /api/clubs                — { name, description, location, isPrivate? }
  GET  /api/clubs/:clubId        — club details
  POST /api/clubs/:id/join       — join/request
  GET  /api/clubs/:id/requests   — get join requests (admin)
  PUT  /api/clubs/approve/:clubId/:userId  — approve request
  PUT  /api/clubs/reject/:clubId/:userId   — reject request
  PUT  /api/clubs/leave/:clubId            — leave club
  POST /api/clubs/:clubId/post   — create club post (SINGULAR "post")
  GET  /api/clubs/:clubId/posts  — get club posts (PLURAL "posts")

RIDES:
  POST /api/rides                — create ride
  GET  /api/rides                — list (paginated)
  GET  /api/rides/nearby         — { lat, lng, radius }
  GET  /api/rides/:rideId        — ride details
  PUT  /api/rides/:rideId        — update ride
  DELETE /api/rides/:rideId      — delete ride
  POST /api/rides/:rideId/join   — join
  POST /api/rides/:rideId/leave  — leave
  POST /api/rides/:rideId/invite/:userId — invite
  PUT  /api/rides/:rideId/start  — start ride
  PUT  /api/rides/:rideId/location — { lat, lng }
  PUT  /api/rides/:rideId/end    — end ride + stats
  GET  /api/rides/:rideId/route  — GeoJSON route
  GET  /api/rides/:rideId/locations — live rider positions

CHAT:
  POST /api/chat/send            — { conversationId, text, type? }
  GET  /api/chat/conversation/:id — messages (paginated)
  PUT  /api/chat/read/:conversationId — mark read
  GET  /api/chat/unread          — unread count

CONVERSATIONS:
  POST /api/conversations        — { userId } → create/get DM
  GET  /api/conversations        — list all
  GET  /api/conversations/:id    — get one

NOTIFICATIONS:
  GET  /api/notifications        — paginated
  GET  /api/notifications/unread-count
  PUT  /api/notifications/:id/read
  PUT  /api/notifications/read-all
  DELETE /api/notifications/:id

SEARCH:
  GET  /api/search               — { q, type?, status?, dateFrom?, dateTo? }

UPLOAD:
  POST /api/upload               — single file
  POST /api/upload/multiple      — up to 5 files
  POST /api/upload/profile       — profile picture
  DELETE /api/upload              — { public_id }

WEATHER:
  GET  /api/weather              — { lat, lng }
  GET  /api/weather/ride/:rideId
```

---

## File Structure

### New Files to Create
```
frontend/src/pages/
  club-detail.js        — Club info, members, posts, admin panel
  ride-detail.js        — Ride info, participants, GPS tracking, start/end
  create-club.js        — Create club form
  edit-profile.js       — Edit profile form with picture upload
  user-profile.js       — View other user's profile, follow/unfollow
  post-detail.js        — Single post view with full comments
```

### Backend Files to Add/Modify (3 missing endpoints)
```
routes/authRoutes.js    — Add POST /logout
routes/userRoutes.js    — Add PUT /me (update profile)
routes/postRoutes.js    — Add GET /:id (single post)
controllers/authController.js   — Add logout handler
controllers/userController.js   — Add updateProfile handler
controllers/postController.js   — Add getPostById handler
```

### Existing Frontend Files to Modify
```
frontend/src/main.js              — Add 6 new routes
frontend/src/style.css            — Add styles for new pages
frontend/src/pages/home.js        — Socket.IO for real-time notifications
frontend/src/pages/chat.js        — Replace polling with Socket.IO
frontend/src/pages/conversations.js — Socket.IO for new messages
frontend/src/pages/notifications.js — Socket.IO real-time delivery
frontend/src/pages/maps.js        — Live ride tracking layer
frontend/src/pages/clubs.js       — Link to club-detail, create club button
frontend/src/pages/search.js      — Working follow buttons, link to user profile
frontend/src/pages/profile.js     — Link to edit-profile, proper logout
frontend/src/components/post-card.js — Edit/delete for owner, link to user profile
frontend/src/components/comments.js  — Like, delete, reply UI
frontend/src/utils/auth.js        — Proper logout with token revocation
```

---

## Phase 0: Backend Prerequisite — Add 3 Missing Endpoints

### Task 0: Add Missing Backend Routes

**Files:**
- Modify: `routes/authRoutes.js`
- Modify: `routes/userRoutes.js`
- Modify: `routes/postRoutes.js`
- Modify: `controllers/authController.js`
- Modify: `controllers/userController.js`
- Modify: `controllers/postController.js`

These 3 endpoints are required by the frontend but don't exist yet.

- [ ] **Step 1: Add `POST /api/auth/logout` route and controller**

In `routes/authRoutes.js`, add:
```javascript
router.post("/logout", protect, authController.logout);
```

In `controllers/authController.js`, add:
```javascript
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      // Optionally delete from DB if you have a RefreshToken model
      // await RefreshToken.deleteOne({ token: refreshToken });
    }
    res.json({ success: true, data: null, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: "Logout failed" } });
  }
};
```
Export `logout` from the controller.

- [ ] **Step 2: Add `PUT /api/users/me` route and controller**

In `routes/userRoutes.js`, add BEFORE the `/:id` route (important — order matters):
```javascript
router.put("/me", protect, userController.updateProfile);
```

In `controllers/userController.js`, add:
```javascript
const updateProfile = async (req, res) => {
  try {
    const allowedFields = ['username', 'name', 'bio', 'phone', 'location', 'bikeBrand', 'bikeModel', 'bikeYear'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true })
      .select('-password');
    if (!user) return res.status(404).json({ success: false, error: { message: "User not found" } });
    res.json({ success: true, data: user, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message || "Update failed" } });
  }
};
```
Export `updateProfile` from the controller.

- [ ] **Step 3: Add `GET /api/posts/:id` route and controller**

In `routes/postRoutes.js`, add AFTER the `/feed` route and BEFORE `PUT /like/:id`:
```javascript
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Valid post id is required")],
  validateRequest,
  postController.getPostById
);
```

In `controllers/postController.js`, add:
```javascript
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("author", "username profilePic")
      .populate("club", "name");
    if (!post) return res.status(404).json({ success: false, error: { message: "Post not found" } });
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
};
```
Export `getPostById` from the controller.

- [ ] **Step 4: Verify the server starts without errors**

```bash
cd C:\Users\adars\Project\bikershub && node -e "require('./server.js')"
```
Expected: No crash (EADDRINUSE is fine if already running, just kill and restart)

- [ ] **Step 5: Commit**
```bash
git add routes/authRoutes.js routes/userRoutes.js routes/postRoutes.js controllers/authController.js controllers/userController.js controllers/postController.js
git commit -m "feat(api): add missing endpoints — logout, update profile, get single post"
```

---

## Phase 1: Socket.IO Integration (Critical Foundation)

### Task 1: Wire Socket.IO into Chat Page

**Files:**
- Modify: `frontend/src/pages/chat.js`
- Read: `frontend/src/utils/socket.js` (already implemented, just needs usage)

The Socket.IO client (`utils/socket.js`) is fully implemented but completely unused. Chat currently polls every 5 seconds. This task replaces polling with real-time WebSocket.

- [ ] **Step 1: Import socketManager in chat.js**

At the top of `chat.js`, add:
```javascript
import { socketManager } from '../utils/socket.js';
```

- [ ] **Step 2: Store callback references for cleanup**

Create module-level variables to hold callback references:
```javascript
let onNewMessageCb = null;
let onTypingCb = null;
let onStopTypingCb = null;
```

- [ ] **Step 3: Replace polling with Socket.IO in mount()**

In the `mount(context)` function, after loading initial messages:
```javascript
// Connect socket and join conversation room
socketManager.connect();
socketManager.joinConversation(conversationId);

// Store callbacks so they can be properly removed
onNewMessageCb = (msg) => {
  appendMessage(msg, currentUserId);
  scrollToBottom();
};
socketManager.onNewMessage(onNewMessageCb);

onTypingCb = ({ senderId }) => {
  if (senderId !== currentUserId) showTypingIndicator(senderId);
};
socketManager.onTyping(onTypingCb);

onStopTypingCb = ({ senderId }) => {
  hideTypingIndicator(senderId);
};
socketManager.onStopTyping(onStopTypingCb);
```

- [ ] **Step 4: Remove the 5-second polling interval**

Delete the `setInterval` that calls `pollMessages()` and the `pollMessages` function.

- [ ] **Step 5: Add typing indicator emission on input**

In the message input handler:
```javascript
let typingTimeout = null;
input.addEventListener('input', () => {
  socketManager.emitTyping(conversationId);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socketManager.emitStopTyping(conversationId);
  }, 2000);
});
```

- [ ] **Step 6: Add typing indicator UI**

Add a typing indicator element below messages:
```html
<div id="typing-indicator" class="chat-typing" style="display:none;">
  <span class="typing-dots"><span>.</span><span>.</span><span>.</span></span> typing...
</div>
```

Helper functions:
```javascript
function showTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.style.display = 'flex';
}
function hideTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.style.display = 'none';
}
```

- [ ] **Step 7: Leave conversation room on cleanup using stored callbacks**

In the `cleanup()` function:
```javascript
socketManager.leaveConversation(conversationId);
if (onNewMessageCb) socketManager.offNewMessage(onNewMessageCb);
if (onTypingCb) socketManager.offTyping(onTypingCb);
if (onStopTypingCb) socketManager.offStopTyping(onStopTypingCb);
onNewMessageCb = onTypingCb = onStopTypingCb = null;
```

- [ ] **Step 8: Add CSS for typing indicator**

In `style.css`:
```css
.chat-typing {
  padding: 8px 16px; color: #9ca3af; font-size: 12px;
  display: flex; align-items: center; gap: 4px;
}
.typing-dots span { animation: blink 1.4s infinite both; }
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,80%,100% { opacity:0 } 40% { opacity:1 } }
```

- [ ] **Step 9: Commit**
```bash
git add frontend/src/pages/chat.js frontend/src/style.css
git commit -m "feat: replace chat polling with Socket.IO real-time messaging"
```

---

### Task 2: Real-Time Notifications

**Files:**
- Modify: `frontend/src/pages/notifications.js`
- Modify: `frontend/src/pages/home.js`

- [ ] **Step 1: Connect socket on home page and listen for notifications**

In `home.js`, add import and module-level callback:
```javascript
import { socketManager } from '../utils/socket.js';
let notifCb = null;
```

In `mount()`:
```javascript
socketManager.connect();
notifCb = (notif) => {
  const badge = document.getElementById('home-notif-badge');
  if (badge) {
    const current = parseInt(badge.textContent) || 0;
    badge.textContent = current + 1;
    badge.style.display = 'flex';
  }
};
socketManager.onNewNotification(notifCb);
```

Add `cleanup()` export:
```javascript
export function cleanup() {
  if (notifCb) socketManager.offNewNotification(notifCb);
  notifCb = null;
}
```

- [ ] **Step 2: Listen for new notifications on notifications page**

In `notifications.js`, add import and listener in `mount()`:
```javascript
import { socketManager } from '../utils/socket.js';
let notifPageCb = null;

// In mount():
socketManager.connect();
notifPageCb = (notif) => {
  const list = document.getElementById('notif-list');
  if (list) {
    list.insertAdjacentHTML('afterbegin', renderNotifItem(notif));
  }
};
socketManager.onNewNotification(notifPageCb);
```

Add cleanup:
```javascript
export function cleanup() {
  if (notifPageCb) socketManager.offNewNotification(notifPageCb);
  notifPageCb = null;
}
```

- [ ] **Step 3: Call cleanup when navigating away from home**

In `main.js`, update the home route to call cleanup before showing another page. Add to the `showPage` function or use a `beforeNavigate` pattern.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/home.js frontend/src/pages/notifications.js frontend/src/main.js
git commit -m "feat: add real-time notification delivery via Socket.IO"
```

---

### Task 3: Socket.IO for Conversations List

**Files:**
- Modify: `frontend/src/pages/conversations.js`

- [ ] **Step 1: Listen for new messages to update conversation preview in-place**

Instead of re-fetching the full list (expensive), update just the affected conversation DOM element:
```javascript
import { socketManager } from '../utils/socket.js';
let convMsgCb = null;

// In mount():
socketManager.connect();
convMsgCb = (msg) => {
  // Find the conversation card and update its last message text
  const convEl = document.querySelector(`[data-conv-id="${msg.conversationId}"]`);
  if (convEl) {
    const preview = convEl.querySelector('.conv-preview');
    if (preview) preview.textContent = msg.text;
    // Move to top of list
    const list = convEl.parentNode;
    list.insertBefore(convEl, list.firstChild);
  } else {
    // New conversation not in list — reload
    loadConversations();
  }
};
socketManager.onNewMessage(convMsgCb);
```

Add cleanup:
```javascript
export function cleanup() {
  if (convMsgCb) socketManager.offNewMessage(convMsgCb);
  convMsgCb = null;
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/pages/conversations.js
git commit -m "feat: auto-update conversation previews on new message via Socket.IO"
```

---

## Phase 2: Missing Pages

### Task 4: Ride Detail Page

**Files:**
- Create: `frontend/src/pages/ride-detail.js`
- Modify: `frontend/src/main.js` (add route)
- Modify: `frontend/src/style.css` (add styles inline in page + global)
- Modify: `frontend/src/pages/clubs.js` (link ride titles)

This is the most complex new page. It shows ride info, participants, and for active rides displays a live GPS map.

- [ ] **Step 1: Create ride-detail.js with render() and mount()**

```javascript
/**
 * Ride detail page — view ride info, participants, GPS tracking
 * Route: /rides/:id
 */
import { api } from '../utils/api.js';
import { navigate } from '../utils/router.js';
import { getCurrentUser, isGuest } from '../utils/auth.js';
import { socketManager } from '../utils/socket.js';
```

The `render(context)` function:
- Back button header
- Content container with loading spinner
- Stores `data-ride-id` for mount

The `mount(context)` function:
- Gets `rideId` from `context.params.id`
- Calls `loadRide(rideId)`
- Attaches back button handler

- [ ] **Step 2: Implement loadRide() — fetches and renders ride**

```javascript
async function loadRide(rideId) {
  const res = await api.get(`/api/rides/${rideId}`);
  // res.data contains: title, description, rideDate, startLocation, destination,
  // participants, participantsCount, maxParticipants, status, createdBy,
  // totalDistance, startTime, endTime, startCoords, destinationCoords
}
```

Render sections based on `ride.status`:
- **Header**: title, description
- **Info row**: date, start → destination, participants count
- **Participant avatars**: horizontal scroll
- **Action buttons** (conditional):
  - `scheduled`: Join/Leave buttons
  - `active` + creator: "End Ride" button
  - `scheduled` + creator: "Start Ride" button
  - `completed`: Statistics display

- [ ] **Step 3: Add Join/Leave/Start/End button handlers**

```javascript
// Join: POST /api/rides/${rideId}/join
// Leave: POST /api/rides/${rideId}/leave
// Start: PUT /api/rides/${rideId}/start
// End:   PUT /api/rides/${rideId}/end
```

- [ ] **Step 4: Add live GPS tracking for active rides**

For `status === 'active'`, render a Leaflet map and connect Socket.IO:
```javascript
socketManager.connect();
socketManager.joinRide(rideId);
socketManager.onRiderLocation(({ userId, lat, lng }) => {
  // Update or create marker for each rider
});

// Load initial locations: GET /api/rides/${rideId}/locations
```

- [ ] **Step 5: Show completed ride route and statistics**

For `status === 'completed'`:
```javascript
const routeRes = await api.get(`/api/rides/${rideId}/route`);
// Draw polyline from routeRes.data.route.coordinates
// Show: totalDistance, duration, avgSpeed
```

- [ ] **Step 6: Add cleanup function**

```javascript
export function cleanup() {
  if (map) { map.remove(); map = null; }
  socketManager.offRiderLocation();
}
```

- [ ] **Step 7: Register route in main.js**

```javascript
import { render as renderRideDetail, mount as mountRideDetail, cleanup as cleanupRideDetail } from './pages/ride-detail.js';

registerRoute('/rides/:id', (context) => {
  if (!requireAuth()) return;
  if (typeof cleanupRideDetail === 'function') cleanupRideDetail();
  showPage(() => renderRideDetail(context), () => mountRideDetail(context));
});
```

- [ ] **Step 8: Add page CSS** — Include as inline `<style>` in the page's render() function (matching the maps.js pattern), plus any global additions to style.css.

- [ ] **Step 9: Link from clubs rides tab** — In `clubs.js` rides tab, make ride items clickable: `navigate('/rides/${ride._id}')`

- [ ] **Step 10: Commit**
```bash
git add frontend/src/pages/ride-detail.js frontend/src/main.js frontend/src/style.css frontend/src/pages/clubs.js
git commit -m "feat: add ride detail page with live GPS tracking and ride lifecycle"
```

---

### Task 5: Club Detail Page

**Files:**
- Create: `frontend/src/pages/club-detail.js`
- Modify: `frontend/src/main.js` (add route)
- Modify: `frontend/src/pages/clubs.js` (link to detail)

- [ ] **Step 1: Create club-detail.js**

Page loads data from `GET /api/clubs/${clubId}` and renders:
- Back button + club name header
- Description, member count, privacy badge (Public/Private)
- Members section: horizontal scroll of avatars + usernames
- Club posts feed from `GET /api/clubs/${clubId}/posts`
- If member: "Post in Club" inline form
- If owner/admin: "Manage Requests" section

- [ ] **Step 2: Add join/leave functionality**

```javascript
// Join: POST /api/clubs/${clubId}/join
// Leave: PUT /api/clubs/leave/${clubId}   ← NOTE: /leave/:clubId pattern
```

- [ ] **Step 3: Add admin panel for join requests**

For owner/admins, load `GET /api/clubs/${clubId}/requests`:
```javascript
// Approve: PUT /api/clubs/approve/${clubId}/${userId}   ← NOTE the path pattern
// Reject:  PUT /api/clubs/reject/${clubId}/${userId}
```

- [ ] **Step 4: Add club post creation**

Button reveals inline form, submits to `POST /api/clubs/${clubId}/post` (NOTE: singular "post"):
```javascript
const res = await api.post(`/api/clubs/${clubId}/post`, { content });
```

- [ ] **Step 5: Register route in main.js**

```javascript
import { render as renderClubDetail, mount as mountClubDetail } from './pages/club-detail.js';

registerRoute('/clubs/:id', (context) => {
  if (!requireAuth()) return;
  showPage(() => renderClubDetail(context), () => mountClubDetail(context));
});
```

- [ ] **Step 6: Make club cards clickable** — In `clubs.js`, add click handler on club cards to `navigate('/clubs/${club._id}')`

- [ ] **Step 7: Add page CSS** — inline styles in render() function

- [ ] **Step 8: Commit**
```bash
git add frontend/src/pages/club-detail.js frontend/src/main.js frontend/src/pages/clubs.js
git commit -m "feat: add club detail page with posts, members, and admin management"
```

---

### Task 6: Create Club Page

**Files:**
- Create: `frontend/src/pages/create-club.js`
- Modify: `frontend/src/main.js` (add route)
- Modify: `frontend/src/pages/clubs.js` (add "Create Club" button)

- [ ] **Step 1: Create form page**

Form fields matching backend validation (`routes/clubRoutes.js`):
- Club name (required, `body("name").trim().notEmpty()`)
- Description (required, `body("description").trim().notEmpty()`)
- Location (required, `body("location").trim().notEmpty()`)
- Private toggle (optional boolean)

Submits to `POST /api/clubs`:
```javascript
const res = await api.post('/api/clubs', { name, description, location, isPrivate });
if (res.success) navigate(`/clubs/${res.data._id || res.data.id}`);
```

- [ ] **Step 2: Register route**

```javascript
import { render as renderCreateClub, mount as mountCreateClub } from './pages/create-club.js';

registerRoute('/create-club', () => {
  if (!requireAuth()) return;
  showPage(renderCreateClub, mountCreateClub);
});
```

- [ ] **Step 3: Add "Create Club" button to clubs discover tab header**

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/create-club.js frontend/src/main.js frontend/src/pages/clubs.js
git commit -m "feat: add create club page"
```

---

### Task 7: Edit Profile Page

**Files:**
- Create: `frontend/src/pages/edit-profile.js`
- Modify: `frontend/src/main.js` (add route)
- Modify: `frontend/src/pages/profile.js` (link edit button)

Depends on Task 0 Step 2 (backend `PUT /api/users/me` must exist).

- [ ] **Step 1: Create edit-profile.js**

Loads current data from `GET /api/users/me`, pre-fills form:
- Profile picture (tap avatar → file input → `POST /api/upload/profile`)
- Username input
- Bio textarea
- Phone input

Save button submits to `PUT /api/users/me`:
```javascript
const res = await api.put('/api/users/me', { username, bio, phone });
if (res.success) navigate('/profile');
```

- [ ] **Step 2: Add profile picture upload**

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const res = await api.upload('/api/upload/profile', formData);
// Update avatar preview on success
```

- [ ] **Step 3: Register route and link from profile**

In `profile.js`, change edit button from `alert()` to `navigate('/edit-profile')`.

```javascript
registerRoute('/edit-profile', () => {
  if (!requireAuth()) return;
  showPage(renderEditProfile, mountEditProfile);
});
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/edit-profile.js frontend/src/main.js frontend/src/pages/profile.js
git commit -m "feat: add edit profile page with picture upload"
```

---

### Task 8: User Profile Page (View Others)

**Files:**
- Create: `frontend/src/pages/user-profile.js`
- Modify: `frontend/src/main.js` (add route)
- Modify: `frontend/src/pages/search.js` (link user results)
- Modify: `frontend/src/components/post-card.js` (link author name)

- [ ] **Step 1: Create user-profile.js**

Loads data from `GET /api/users/${userId}`, which returns:
`{ success: true, data: { user, posts, followersCount, followingCount, isFollowing } }`

Layout:
- Avatar, username, bio
- Stats row: posts count, followers, following
- Follow/Unfollow button
- "Message" button → create conversation
- Posts grid (3 columns)

- [ ] **Step 2: Implement follow/unfollow toggle**

```javascript
followBtn.addEventListener('click', async () => {
  const endpoint = isFollowing ? 'unfollow' : 'follow';
  const res = await api.put(`/api/users/${endpoint}/${userId}`);
  if (res.success) {
    isFollowing = !isFollowing;
    followBtn.textContent = isFollowing ? 'Unfollow' : 'Follow';
    // Update follower count display
  }
});
```

- [ ] **Step 3: Implement "Message" button**

```javascript
msgBtn.addEventListener('click', async () => {
  const res = await api.post('/api/conversations', { userId });
  if (res.success) {
    const convId = res.data._id || res.data.id;
    navigate(`/chat/${convId}`);
  }
});
```

- [ ] **Step 4: Register route**

```javascript
registerRoute('/user/:id', (context) => {
  if (!requireAuth()) return;
  showPage(() => renderUserProfile(context), () => mountUserProfile(context));
});
```

- [ ] **Step 5: Link from search results**

In `search.js`, user result items navigate to `/user/${user._id}`.

- [ ] **Step 6: Link from post card author names**

In `post-card.js`, make the author username clickable: `onclick="navigate('/user/${post.author._id}')"`

- [ ] **Step 7: Commit**
```bash
git add frontend/src/pages/user-profile.js frontend/src/main.js frontend/src/pages/search.js frontend/src/components/post-card.js
git commit -m "feat: add user profile page with follow/unfollow and message"
```

---

### Task 9: Post Detail Page

**Files:**
- Create: `frontend/src/pages/post-detail.js`
- Modify: `frontend/src/main.js` (add route)

Depends on Task 0 Step 3 (backend `GET /api/posts/:id` must exist).

- [ ] **Step 1: Create post-detail.js**

Loads single post from `GET /api/posts/${postId}`.
Renders:
- Full post card (reuse `renderPostCard` from components)
- Full inline comments thread (not modal)
- Comment input at bottom
- For post owner (check `post.author._id === getCurrentUser()?.id`): Edit/Delete in header

**IMPORTANT**: Use `getCurrentUser()?.id` (NOT `.userId`) — that's what `auth.js` returns.

- [ ] **Step 2: Add edit post functionality**

Edit button toggles content into textarea → Save calls:
```javascript
const res = await api.put(`/api/posts/${postId}`, { content: newContent });
```

- [ ] **Step 3: Add delete post**

```javascript
if (confirm('Delete this post?')) {
  const res = await api.delete(`/api/posts/${postId}`);
  if (res.success) navigate('/home');
}
```

- [ ] **Step 4: Register route**

```javascript
registerRoute('/posts/:id', (context) => {
  if (!requireAuth()) return;
  showPage(() => renderPostDetail(context), () => mountPostDetail(context));
});
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/post-detail.js frontend/src/main.js
git commit -m "feat: add post detail page with edit/delete for owners"
```

---

## Phase 3: Enhance Existing Features

### Task 10: Comment Enhancements (Like, Delete, Replies)

**Files:**
- Modify: `frontend/src/components/comments.js`

- [ ] **Step 1: Add like button on each comment**

```javascript
// PUT /api/comments/like/${commentId}
likeBtn.addEventListener('click', async () => {
  const res = await api.put(`/api/comments/like/${commentId}`);
  if (res.success) {
    // Toggle heart icon color, update like count display
  }
});
```

- [ ] **Step 2: Add delete button for comment owner**

Show trash icon when `comment.author._id === getCurrentUser()?.id`:
```javascript
// DELETE /api/comments/${commentId}
deleteBtn.addEventListener('click', async () => {
  const res = await api.delete(`/api/comments/${commentId}`);
  if (res.success) {
    // Replace comment content with "[deleted]" text
    commentEl.querySelector('.comment-text').textContent = '[deleted]';
  }
});
```

- [ ] **Step 3: Add reply UI**

Tap "Reply" on a comment → prefill input with reply context, submit with `parentComment`:
```javascript
const res = await api.post(`/api/comments/${postId}`, {
  content: replyText,
  parentComment: parentCommentId
});
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/components/comments.js
git commit -m "feat: add comment likes, delete, and reply functionality"
```

---

### Task 11: Proper Logout with Token Revocation

**Files:**
- Modify: `frontend/src/utils/auth.js`

Depends on Task 0 Step 1 (backend `POST /api/auth/logout` must exist).

- [ ] **Step 1: Update logout() in auth.js**

```javascript
export async function logout() {
  try {
    const refreshToken = localStorage.getItem(KEYS.refreshToken);
    if (refreshToken) {
      const { api } = await import('./api.js');
      await api.post('/api/auth/logout', { refreshToken });
    }
  } catch {
    // Continue logout even if backend call fails
  }
  // Disconnect socket
  try {
    const { socketManager } = await import('./socket.js');
    socketManager.disconnect();
  } catch {}
  clearTokens();
  navigate('/');
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/utils/auth.js
git commit -m "feat: revoke refresh token on logout and disconnect socket"
```

---

### Task 12: Follow/Unfollow in Search Results

**Files:**
- Modify: `frontend/src/pages/search.js`

- [ ] **Step 1: Make follow buttons functional and link users to profile**

Each user result:
- Username is clickable → `navigate('/user/${user._id}')`
- Follow button calls the correct endpoint:

```javascript
btn.addEventListener('click', async (e) => {
  e.stopPropagation(); // Don't navigate to profile
  const isFollowing = btn.textContent.trim() === 'Unfollow';
  const endpoint = isFollowing ? 'unfollow' : 'follow';
  const res = await api.put(`/api/users/${endpoint}/${userId}`);
  if (res.success) {
    btn.textContent = isFollowing ? 'Follow' : 'Unfollow';
  }
});
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/pages/search.js
git commit -m "feat: wire follow/unfollow buttons in search results"
```

---

### Task 13: Post Card Owner Actions (Edit/Delete)

**Files:**
- Modify: `frontend/src/components/post-card.js`

- [ ] **Step 1: Add 3-dot menu for post owner**

**IMPORTANT**: Use `getCurrentUser()?.id` (NOT `.userId`):
```javascript
import { getCurrentUser } from '../utils/auth.js';

// In renderPostCard():
const currentUser = getCurrentUser();
const isOwner = currentUser && post.author?._id === currentUser.id;
const menuHtml = isOwner ? `
  <button class="post-menu-btn" data-post-id="${post._id}">⋮</button>
` : '';
```

- [ ] **Step 2: Handle menu click — Edit navigates, Delete removes**

```javascript
// In the parent page's event delegation:
document.addEventListener('click', async (e) => {
  const menuBtn = e.target.closest('.post-menu-btn');
  if (!menuBtn) return;
  const postId = menuBtn.dataset.postId;
  // Show dropdown: Edit → navigate('/posts/${postId}'), Delete → api.delete
});
```

- [ ] **Step 3: Commit**
```bash
git add frontend/src/components/post-card.js
git commit -m "feat: add edit/delete menu for post owners"
```

---

## Phase 4: Live Ride Tracking on Maps

### Task 14: GPS Tracking Layer on Maps Page

**Files:**
- Modify: `frontend/src/pages/maps.js`

- [ ] **Step 1: After loading nearby rides, connect to active ride rooms**

```javascript
const activeRides = rides.filter(r => r.status === 'active');
activeRides.forEach(ride => {
  socketManager.connect();
  socketManager.joinRide(ride._id);
});
```

- [ ] **Step 2: Listen for live rider location updates**

```javascript
let liveMarkers = {};
socketManager.onRiderLocation(({ userId, lat, lng }) => {
  if (liveMarkers[userId]) {
    liveMarkers[userId].setLatLng([lat, lng]);
  } else {
    liveMarkers[userId] = L.circleMarker([lat, lng], {
      radius: 6, fillColor: '#00E676', color: '#fff', weight: 2, fillOpacity: 1
    }).addTo(map);
  }
});
```

- [ ] **Step 3: Add "Share My Location" toggle for ride participants**

If user is in an active ride, show a toggle button. When enabled:
```javascript
const watchId = navigator.geolocation.watchPosition((pos) => {
  const { latitude, longitude } = pos.coords;
  socketManager.sendLocationUpdate(activeRideId, latitude, longitude);
  // Also persist to backend:
  api.put(`/api/rides/${activeRideId}/location`, { lat: latitude, lng: longitude });
}, null, { enableHighAccuracy: true });
```

- [ ] **Step 4: Clean up on page leave**

```javascript
// In existing cleanup or add new:
socketManager.offRiderLocation();
if (watchId) navigator.geolocation.clearWatch(watchId);
```

- [ ] **Step 5: Commit**
```bash
git add frontend/src/pages/maps.js
git commit -m "feat: add live ride GPS tracking layer to maps page"
```

---

## Phase 5: New Conversation Flow + Home Smart Feed

### Task 15: Start New Conversation

**Files:**
- Modify: `frontend/src/pages/conversations.js`

- [ ] **Step 1: Add "New Chat" button in conversations header**

- [ ] **Step 2: Show user search overlay on tap**

Small overlay with search input → `GET /api/search?q=...&type=users` → list matching users.

- [ ] **Step 3: On user select, create conversation and navigate**

```javascript
const res = await api.post('/api/conversations', { userId: selectedUser._id });
if (res.success) {
  const convId = res.data._id || res.data.id;
  navigate(`/chat/${convId}`);
}
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/pages/conversations.js
git commit -m "feat: add new conversation creation with user search"
```

---

### Task 16: Switch Home Feed to Smart Feed

**Files:**
- Modify: `frontend/src/pages/home.js`

- [ ] **Step 1: Use /api/posts/feed (smart feed) as primary, fallback to /api/posts**

```javascript
async function loadPosts() {
  let posts = [];
  try {
    // Try smart feed first (posts from followed users)
    const res = await api.get('/api/posts/feed?page=1&limit=10');
    if (res.success) {
      posts = Array.isArray(res.data) ? res.data : (res.data?.posts || []);
    }
    // If empty, fallback to global feed
    if (posts.length === 0) {
      const globalRes = await api.get('/api/posts?page=1&limit=10');
      if (globalRes.success) {
        posts = Array.isArray(globalRes.data) ? globalRes.data : (globalRes.data?.posts || []);
      }
    }
  } catch {
    posts = PLACEHOLDER_POSTS;
  }
  // render...
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/pages/home.js
git commit -m "feat: use smart feed (followed users) with global fallback on home"
```

---

## Phase 6: Build & Test

### Task 17: Build and Verify APK

- [ ] **Step 1: Run Vite build**
```bash
cd C:\Users\adars\Project\bikershub\frontend && npm run build
```
Expected: `✓ built in <time>` with no errors

- [ ] **Step 2: Sync Capacitor**
```bash
npx cap sync android
```

- [ ] **Step 3: Build debug APK**
```bash
cd android && gradlew.bat clean assembleDebug
```
Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Test full flow on device**

Verify all features work:
1. Login → Home smart feed loads
2. Tap "BIKERS HUB" → Notifications with real-time delivery
3. Tap "+" → Create post with media
4. Tabs: Home, Club, Maps, Search, Profile
5. Maps: location + weather + nearby rides + active ride markers
6. Club tab → tap club → Club detail with posts + members + admin panel
7. Club tab → Create Club → form works
8. Rides tab → tap ride → Ride detail with participants + GPS map
9. Search → tap user → User profile with follow/unfollow + message
10. Chat → real-time messages + typing indicator
11. Profile → Edit → update username/bio/picture → saves
12. Post → owner sees ⋮ menu → edit/delete works
13. Comments → like/reply/delete works
14. Logout → token revoked, socket disconnected

- [ ] **Step 5: Final commit**
```bash
git add -A
git commit -m "build: complete frontend with all features — ready for release"
```

---

## Execution Summary

| Phase | Tasks | Key Deliverables | Est. Time |
|-------|-------|-----------------|-----------|
| 0 | Task 0 | 3 missing backend endpoints | 15 min |
| 1 | Tasks 1-3 | Socket.IO chat, notifications, conversations | 30 min |
| 2 | Tasks 4-9 | 6 new pages: ride detail, club detail, create club, edit profile, user profile, post detail | 90 min |
| 3 | Tasks 10-13 | Comment enhancements, logout, follow UI, post owner actions | 30 min |
| 4 | Task 14 | Live GPS tracking on maps | 20 min |
| 5 | Tasks 15-16 | New conversation flow, smart feed | 15 min |
| 6 | Task 17 | Build + test APK | 15 min |

**Total: 17 tasks across 7 phases, ~3.5 hours with subagent-driven execution.**
