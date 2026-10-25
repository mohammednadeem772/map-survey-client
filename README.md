# MAP Survey — Client

React frontend for the **MAP Socio-Economic Survey Application**, built for the Mohalla Adoption Program (MAP) run by Zakat Center India, Vaniyambadi Unit, in collaboration with The Vaniyambadi Muslim Educational Society (VMES).

This app is the field/admin UI: surveyors fill household surveys, supervisors and admins review them, and admins manage users, areas, and dashboard charts. It talks to the [map-survey-server](https://github.com/mohammednadeem772/map-survey-server) REST API — this repo has no backend of its own.

## Tech stack
- React 18 + Vite
- React Router v6 (client-side routing)
- Axios (API client with JWT interceptor)
- Recharts (dashboard charts)

## Project structure
```text
client/
  src/
    api.js              Axios instance — injects the stored JWT into every request
    App.jsx             Routes, auth context, protected-route wrapper, app shell/nav
    main.jsx             Vite/React entry point
    pages/
      Landing.jsx         Public landing page
      Login.jsx            Login form, stores JWT + user in localStorage
      SurveyForm.jsx       Create/edit household survey (new + existing by :id)
      Dashboard.jsx        KPI summary + charts, role-aware
      Admin.jsx            Admin-only: areas, users, chart config management
    styles.css           Global styles
  index.html
  nginx.conf            Nginx config used in the production Docker image
  Dockerfile            Multi-stage build: Vite build -> served by nginx
  .env.example
```

## Routes
| Path | Access | Purpose |
|---|---|---|
| `/` | Public | Landing page |
| `/login` | Public | Login |
| `/dashboard` | Authenticated | KPIs + charts |
| `/survey/new` | Authenticated | New household survey |
| `/survey/:id` | Authenticated | View/edit an existing survey |
| `/admin` | Admin only | Areas, users, chart configuration |

Auth state (`user`) is kept in a React context backed by `localStorage` (`map_user`, `map_token`). Unauthenticated visits to protected routes redirect to `/login`; routes with a `roles` restriction redirect non-matching roles to `/dashboard`.

## Getting started

### Prerequisites
- Node.js 20+
- A running instance of [map-survey-server](https://github.com/mohammednadeem772/map-survey-server) (and its MySQL database)

### Setup
```bash
npm install
cp .env.example .env
```

Set `VITE_API_URL` in `.env` to point at your running API, e.g.:
```
VITE_API_URL=http://localhost:4000/api
```

### Run in development
```bash
npm run dev
```
Starts Vite's dev server (default `http://localhost:5173`) with hot reload.

### Build for production
```bash
npm run build
npm run preview   # optional: preview the production build locally
```
Output goes to `dist/`. Serve it behind any static host (Nginx, Apache, Azure Static Web Apps, etc.) — the API base URL is baked in at build time via `VITE_API_URL`, so set it correctly before running `build`.

### Docker
```bash
docker build -t map-survey-client .
docker run -p 8080:80 map-survey-client
```
The image builds the app with Vite and serves the static output through Nginx. `nginx.conf` proxies `/api/` to an `api` host on port 4000 — this matches the service name used in the project's `docker-compose.yml`, so when running standalone you'll want to adjust that proxy target or front it with your own reverse proxy.

## Demo accounts
When the paired server has `SEED_DEMO_USERS=true`, you can sign in with:

| Role | Email | Password |
|---|---|---|
| Admin | admin@map.local | Admin@123 |
| Supervisor | supervisor@map.local | Supervisor@123 |
| Surveyor | surveyor@map.local | Surveyor@123 |

Change these immediately in any non-local deployment.

## Notes for contributors
- All data access goes through `src/api.js`; don't call `fetch`/`axios` directly from a page component.
- Role-based UI (e.g. the "Admin" nav link, admin-only routes) mirrors — but does not replace — the server's permission checks. The API is the source of truth for authorization.
- This repo collects sensitive household/socio-economic data on the backend it talks to. See the parent project's security and privacy checklist before any non-local deployment.
