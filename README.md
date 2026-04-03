# Beta Omega Chi — Club Website

React SPA for the Beta Omega Chi fraternity at Harding University.  Members
can view and manage events on a live calendar backed by Firebase Firestore.

## Features

- **Homepage** — hero section, about blurb, and next 5 upcoming events (live)
- **Calendar** — monthly grid with swipe, keyboard navigation, and live event indicators
- **Day view** — per-date event list; authenticated members can create, edit, and delete events
- **Auth** — Firebase email/password login; role-gated CRUD on all write operations
- **Real-time** — Firestore `onSnapshot` listeners keep all views in sync automatically
- **Responsive** — hamburger nav, swipe gestures, and accessible keyboard controls

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7 |
| Backend | Firebase Firestore + Firebase Auth |
| Build | Webpack 5, Babel 7 |
| Hosting | GitHub Pages (served from `/docs/`) |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/bowens5/BetaOmegaChi.git
cd BetaOmegaChi
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your Firebase project credentials:

```
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
FIREBASE_STORAGE_BUCKET=...
FIREBASE_MESSAGING_SENDER_ID=...
FIREBASE_APP_ID=...
FIREBASE_MEASUREMENT_ID=...
```

These are injected at build time by Webpack's `DefinePlugin` and never shipped
as a `.env` file — they become compile-time constants in the bundle.

### 3. Run the dev server

```bash
npm start
```

App is available at **http://localhost:8080**.  The dev server uses
`historyApiFallback` so all SPA routes work without a 404.

### 4. Production build

```bash
npm run build
```

Output goes to `/dist/`.

## Deployment

Pushing to `main` triggers the GitHub Actions workflow
(`.github/workflows/publish-docs.yml`), which:

1. Builds with Webpack → `/dist/`
2. Copies `/dist/` → `/docs/` (adds `404.html` for deep-link support, `.nojekyll`)
3. Commits and pushes `/docs/`
4. GitHub Pages serves from `/docs/`

The router uses `basename="/BetaOmegaChi"` to match the GitHub Pages path prefix.

## Project Structure

```
src/
  main.jsx          React entry point
  App.jsx           Router + layout shell (NavBar, Routes, Footer)
  firebase.js       Firebase app init — exports db and auth
  auth.js           Auth helper functions (signIn, logOut, watchUser)
  logger.js         Dev-only debug logger (no-ops in production)

  HomePage.jsx      Hero, about section, upcoming events list
  CalendarPage.jsx  Monthly grid with live event indicators
  ViewDatePage.jsx  Day view with event CRUD (auth required for writes)
  LoginPage.jsx     Email/password sign-in form
  NavBar.jsx        Responsive header with auth-aware login/logout
  Footer.jsx        Social links and Square checkout
```

## Firestore Data Model

Collection: **`events`**

| Field | Type | Notes |
|---|---|---|
| `dateKey` | string | `"YYYY-MM-DD"` — indexed, used in all queries |
| `title` | string | |
| `description` | string | optional |
| `allDay` | boolean | if true, `startTime`/`endTime` are empty |
| `startTime` | string | 24-hour `"HH:MM"`, empty when `allDay` |
| `endTime` | string | 24-hour `"HH:MM"`, empty when `allDay` |
| `ownerId` | string | Firebase UID of the creating member |
| `createdAt` | timestamp | `serverTimestamp()` — used for default sort |

## Debugging

All components use the `src/logger.js` utility, which prefixes dev-console
messages by namespace:

| Prefix | Colour | Content |
|---|---|---|
| `[BOX]` | blue | general info |
| `[BOX:firebase]` | orange | Firestore subscribe / snapshot events |
| `[BOX:auth]` | green | auth state changes, sign-in/out |
| `[BOX:warn]` | yellow | non-fatal warnings (e.g. missing env vars) |
| `[BOX:error]` | red | errors from Firestore writes or auth |

All log calls are **no-ops in production** — `process.env.NODE_ENV === 'production'`
causes the logger to export empty functions, so there is zero overhead and no
log leakage in the deployed build.

## Keyboard Shortcuts

| Page | Key | Action |
|---|---|---|
| Calendar | `←` / `PageUp` | Previous month |
| Calendar | `→` / `PageDown` | Next month |
| Calendar | `T` | Jump to today |
| Day view | `←` / `PageUp` | Previous day |
| Day view | `→` / `PageDown` | Next day |

Shortcuts are suppressed when focus is inside a text input or textarea.
