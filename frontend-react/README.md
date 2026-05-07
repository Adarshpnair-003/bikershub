# Bikers Hub — React Playground

A side-by-side React experiment for evaluating a vanilla → React migration.
**Not shipped to production.** Just for comparison.

## What this is

The real app lives in `../frontend/` (Vanilla JS + Vite + Capacitor).
This folder is a tiny React app with the **same backend, same design, same auth flow** —
but a few key pages are converted to React so you can compare the code side by side.

## Run it

```bash
cd frontend-react
npm install     # one-time
npm run dev     # opens http://localhost:5174 in your browser
```

The vanilla app uses port 5173, this one uses 5174 — you can run both at the same time.

## Sign in

Use your existing Bikers Hub account — it points at the same Render backend.
Login, register, JWT refresh, and current-user storage all reuse the existing
`localStorage` keys so logging in here also signs you in for the vanilla app
in the same browser.

## What's converted

| Page | Status | File |
|---|---|---|
| Splash | ✅ | `src/pages/Splash.jsx` |
| Login | ✅ | `src/pages/Login.jsx` |
| Register | ✅ | `src/pages/Register.jsx` |
| Home (feed) | ✅ | `src/pages/Home.jsx` |
| Profile | ✅ | `src/pages/Profile.jsx` |
| All other pages | 🚧 placeholder | `src/pages/Placeholder.jsx` |

| Component | File |
|---|---|
| TabBar | `src/components/TabBar.jsx` |
| PostCard | `src/components/PostCard.jsx` |
| AppHeader | `src/components/AppHeader.jsx` |

## What to compare

Open these pairs side by side in your editor:

| Vanilla | React |
|---|---|
| `frontend/src/pages/home.js` | `frontend-react/src/pages/Home.jsx` |
| `frontend/src/pages/profile.js` | `frontend-react/src/pages/Profile.jsx` |
| `frontend/src/components/post-card.js` | `frontend-react/src/components/PostCard.jsx` |
| `frontend/src/components/tabbar.js` | `frontend-react/src/components/TabBar.jsx` |

Notice in the React versions:
- No `document.getElementById` / `addEventListener` / `innerHTML`
- State changes via `useState` automatically re-render
- `Link` component handles navigation (no manual hash router)
- JSX inline-conditional rendering vs string concatenation

## What's NOT here

- ❌ No Capacitor — runs in browser only
- ❌ No native plugins (geolocation, social login)
- ❌ No APK build path
- ❌ Most pages (most show a placeholder)

For the full feature set, run the vanilla app in `../frontend/`.

## File structure

```
frontend-react/
├── package.json              ← React + React Router + Vite
├── vite.config.js            ← React plugin
├── index.html                ← Mounts <App /> into #root
├── .env                      ← Same VITE_API_BASE_URL as vanilla
└── src/
    ├── main.jsx              ← ReactDOM.createRoot entry
    ├── App.jsx               ← <HashRouter> + <Routes> setup
    ├── pages/
    │   ├── Splash.jsx
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── Home.jsx
    │   ├── Profile.jsx
    │   └── Placeholder.jsx   ← shown for unconverted routes
    ├── components/
    │   ├── TabBar.jsx
    │   ├── PostCard.jsx
    │   └── AppHeader.jsx
    ├── utils/
    │   ├── api.js            ← copied as-is from vanilla
    │   ├── auth.js           ← copied as-is
    │   ├── mentions.js       ← copied as-is
    │   └── router.js         ← tiny shim so api.js navigate() still works
    └── styles/
        └── global.css        ← subset of vanilla style.css
```

## Tech notes

- **HashRouter not BrowserRouter** — matches the vanilla app's hash-based URLs
  (`#/home`, `#/profile`) so deep links work the same.
- **Shared `localStorage`** — same keys as vanilla, so a session in either app
  authenticates the other.
- **No state library** — `useState` and prop drilling are enough for this scope.
  A real migration would likely add Zustand or Redux Toolkit.
- **No CSS Modules / Tailwind** — uses plain CSS classes matching the vanilla
  app for visual parity. A real migration would likely switch to one of those.

## What this experiment tells you

**If reading the React code feels cleaner**, do the full migration.
**If it feels noisier or more complex**, stay with vanilla.

Either answer is valid — this is the cheapest way to find out.
