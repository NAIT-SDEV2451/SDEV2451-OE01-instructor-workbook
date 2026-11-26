# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

TicketMono is a course project (NAIT SDEV2451): a Django REST Framework API (`ticketmono_backend/`) and a React + Vite SPA (`ticketmono_frontend/`) for selling event tickets. Solutions should match the level and style of the existing code. The root `README.md` is lesson material, not project docs.

## Commands

Backend (run from `ticketmono_backend/` with the `.venv` virtualenv active):
- `python manage.py migrate` / `python manage.py runserver` (serves `http://localhost:8000`)
- Sample data: `python manage.py create_organizers` then `python manage.py loaddata event_data.json` (organizers `alice_organizer` / `Organizer@100`, `bob_organizer` / `Organizer@101`). Sample data has no orders.
- Tests: `python manage.py test`; single test: `python manage.py test event_tickets.tests.EventTicketsTestCase.test_order_total_price`
- Coverage: `coverage run manage.py test`, `coverage report`, `coverage html` (config in `.coveragerc`, output in `htmlcov/`)

Frontend (run from `ticketmono_frontend/`):
- `npm run dev` (Vite on `http://localhost:5173`, the only CORS-allowed origin), `npm run build`, `npm run lint`
- Tests: `npm run test:run` (single pass) or `npm test` (watch); single file: `npx vitest run src/__tests__/EventCard.test.jsx`

## Architecture

**Backend.** Two apps. `core` holds `CustomUser` (`AUTH_USER_MODEL`, with `role` of `user` or `event_organizer`) and auth endpoints under `/api/v1/auth/` (register, JWT login/refresh via SimpleJWT, `me`). `event_tickets` holds Venue → Event → TicketTier → Ticket, plus Order (M2M to Ticket; `total_price` is a computed property), exposed through a `DefaultRouter` at `/api/v1/events/` and `/api/v1/orders/`. JWT is the only authentication class. SQLite database.

**Frontend.** Data flows `src/api/` → `src/hooks/` (TanStack Query) → `src/pages/`. All requests go through `apiClient` in `src/api/client.js`, which attaches the bearer token and does a single shared silent refresh on 401. `AuthContext` stores tokens and `{id, username, role}` in localStorage (`src/api/tokenStorage.js`) and registers refresh/logout callbacks with `apiClient`. `CartContext` holds the ticket selection in memory between select-tickets and checkout. Routes live in `App.jsx`; `ProtectedRoute` only checks login, not role. Styling is Tailwind v4 + daisyUI.

**Frontend tests.** Vitest + jsdom + Testing Library. MSW intercepts the network (`src/test/handlers.js`, `server.js`, started in `setup.js`); override per-test with `server.use(...)`. Render with `renderWithProviders` (QueryClient with retries off + `MemoryRouter`); it does not include Auth or Cart providers.

## Known gaps in the existing code

- `EventViewSet` is a `ModelViewSet` guarded only by `IsAuthenticated`, so any logged-in user can update or delete any event.
- Registration accepts a `role` field, so anyone can register as an organizer.
- `event_tickets/tests.py` creates users with `role='attendee'` / `'organizer'`, which aren't valid choices; the real values are `user` and `event_organizer`.
