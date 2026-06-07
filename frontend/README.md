# Hospital Management System — React Frontend

A single-page app built with **React 18 + Hooks** (Vite) that consumes the four backend
microservices. It provides full CRUD for Patients, Doctors, Appointments, and Bills, plus the
multi-criteria patient search.

## React Hooks used

- `useState` — form state, active tab, edit mode (every component).
- `useEffect` — load data on mount (inside the custom `useFetch` hook).
- `useCallback` — memoize the reload function in `useFetch`.
- **Custom hook** `useFetch(fetchFn, deps)` in [src/api.js](src/api.js) — returns
  `{ data, loading, error, reload }` and is reused by all four pages.

## Authentication

The app is gated by a **login / register screen** ([Auth.jsx](src/components/Auth.jsx)) backed by
auth-service (`:8086`). On success the JWT + user info are stored in `localStorage` (so a refresh
keeps you signed in), and a **Logout** button clears it. Registration shows per-field validation
errors (gmail-only email, password rules) returned by the backend.

## Pages

All four list tabs include **pagination (Prev/Next + page indicator) and a sort dropdown**, driven
by the reusable [Pagination.jsx](src/components/Pagination.jsx) and the `usePaged` hook.

| Tab | Service | Features |
|-----|---------|----------|
| Patients | patient-service `:8081` | CRUD + complex multi-criteria search + pagination/sorting |
| Doctors | doctor-service `:8083` | CRUD + pagination/sorting |
| Appointments | appointment-service `:8084` | CRUD; patient/doctor dropdowns; Feign validation errors; pagination/sorting |
| Bills | billing-service `:8085` | List (with patient/doctor names), update status, delete; pagination/sorting |

## Run locally

The backend must be running first (`docker compose up` from the repo root).

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

> The backend services have CORS enabled (`WebConfig` in each service), so the browser can call
> them directly on their ports. API base URLs are configurable via `.env` (see `.env.example`) —
> defaults point at `localhost:8081/8083/8084/8085`.

## Build for production

```bash
npm run build      # outputs static files to dist/
npm run preview    # preview the production build
```

## Docker

```bash
docker build -t hospital-frontend .
docker run -p 8080:80 hospital-frontend   # served by nginx on http://localhost:8080
```
