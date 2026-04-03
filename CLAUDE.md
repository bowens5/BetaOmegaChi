# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Beta Omega Chi fraternity website — a React SPA deployed to GitHub Pages, backed by Firebase Firestore and Firebase Auth.

## Commands

```bash
npm start        # Dev server at http://localhost:8080 (webpack-dev-server, SPA fallback enabled)
npm run build    # Production build → /dist/
node index.js    # Backend Express server (currently unused/placeholder)
```

No test framework is configured.

## Deployment

Pushing to `main` triggers a GitHub Actions workflow (`.github/workflows/publish-docs.yml`) that:
1. Builds with webpack → `/dist/`
2. Copies `/dist/` to `/docs/` (adds 404.html for SPA deep linking, `.nojekyll`)
3. Commits and pushes the `/docs/` directory
4. GitHub Pages serves from `/docs/`

The router uses `basename="/BetaOmegaChi"` in `App.jsx` to match the GitHub Pages URL path.

## Architecture

**Entry points:**
- `static/index.html` — HTML template (Webpack injects bundle here, `id="root"`)
- `src/main.jsx` — ReactDOM root render
- `src/App.jsx` — Router with all routes

**Routes:**
- `/` → `HomePage` — next 5 upcoming events (real-time)
- `/calendar` → `CalendarPage` — monthly grid view (real-time)
- `/view-date/:dateKey` → `ViewDatePage` — event CRUD (write access requires auth)
- `/login` → `LoginPage` — Firebase email/password auth

**Firebase:**
- `src/firebase.js` — exports `db` (Firestore) and `auth`
- `src/auth.js` — auth helper functions
- Firestore collection: `events`, fields: `dateKey`, `title`, `description`, `startTime`, `endTime`, `allDay`
- Real-time listeners via `onSnapshot()` used on HomePage, CalendarPage, and ViewDatePage
- Authenticated users (Firebase Auth) can create, edit, and delete events on ViewDatePage

**Styling:** Each component has a paired `.css` file. Global styles in `src/main.css` and `src/style.css`.

**Unused dependencies:** `express`, `mongoose`, `cors`, `dotenv` are installed but not integrated into the SPA — they belong to a placeholder backend (`index.js`).
