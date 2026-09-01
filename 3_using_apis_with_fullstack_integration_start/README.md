# Connecting a React Frontend to a Django REST Framework API

This example bridges the two halves of the course: the Django REST Framework API from the backend review and the React frontend from the frontend review. We will configure the backend to accept requests from a different origin and replace the frontend's static mock data with live API calls.

## Prerequisites

### Backend
- Create a virtual environment inside `vehiclefleet_backend/` and install packages from `requirements.txt`.
- Run `python manage.py migrate` to apply migrations.
- Run `python manage.py loaddata vehicles drivers trips` to load sample data.
- Run `python manage.py runserver` — the API must be running on `http://localhost:8000` before the frontend can talk to it.

### Frontend
- Run `npm install` inside `vehiclefleet_frontend/`.
- Run `npm run dev` to start the Vite dev server on `http://localhost:5173`.

---

## Steps

We have already built a working DRF API and a React frontend that displays fleet data from a `mockData.js` file. In this example we connect the two: the backend is configured to allow cross-origin requests from the frontend, and the frontend is refactored to fetch real data from the API.

We will introduce three new concepts: CORS configuration with `django-cors-headers`, a layered frontend architecture using an `src/api/` module for raw HTTP calls and `src/hooks/` for React Query data hooks, and React Query itself for server state caching.

---

### 1. Install and configure CORS in `vehiclefleet_backend/vehiclefleet_backend/settings.py`

When the browser loads the React app from `localhost:5173` and it makes a request to the Django server at `localhost:8000`, the browser treats these as two different origins. Without explicit CORS headers from the server, the browser blocks every response. `django-cors-headers` adds those headers automatically.

`django-cors-headers` is already listed in `requirements.txt`. We only need to wire it up in settings.

```python
# vehiclefleet_backend/settings.py

INSTALLED_APPS = [
    # ... django built-ins ...
    "corsheaders",
    "rest_framework",
    # custom apps
    "fleet",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",          # must be here
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    # ... other middleware ...
]

# ... other settings ...

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

Let's talk about what this code is doing.
- Adding `"corsheaders"` to `INSTALLED_APPS` registers the package with Django so it can be used as middleware.
- `"corsheaders.middleware.CorsMiddleware"` must be placed **before** `SessionMiddleware` and `CommonMiddleware`. It intercepts every incoming request and, when the `Origin` header matches an allowed origin, adds the `Access-Control-Allow-Origin` header to the response. If it comes after those middlewares, some requests get processed (and potentially rejected) before CORS headers can be added.
- `CORS_ALLOWED_ORIGINS` is an explicit allowlist. Only the origins listed here will receive the CORS headers. `http://localhost:5173` is Vite's default dev server address — change this when deploying to production.
- Browser preflight requests (`OPTIONS` method) are handled automatically by `CorsMiddleware` — you do not need to add `OPTIONS` handling to your views.

---

### 2. Install React Query and add `src/api/fleet.js` in the frontend

The frontend currently imports data from `mockData.js`. Before we can replace that with real API calls, we need two things: a place to put raw `fetch()` calls, and a library to manage the async lifecycle (loading, error, caching).

#### 2a. Install `@tanstack/react-query`

```bash
npm install @tanstack/react-query
```

#### 2b. Create `src/api/fleet.js`

```js
// src/api/fleet.js

const BASE_URL = 'http://localhost:8000/api/v1'

export async function fetchVehicles() {
  const response = await fetch(`${BASE_URL}/vehicles/`)
  if (!response.ok) throw new Error('Failed to fetch vehicles')
  return response.json()
}

export async function fetchDrivers() {
  const response = await fetch(`${BASE_URL}/drivers/`)
  if (!response.ok) throw new Error('Failed to fetch drivers')
  return response.json()
}

export async function fetchTrips() {
  const response = await fetch(`${BASE_URL}/trips/`)
  if (!response.ok) throw new Error('Failed to fetch trips')
  return response.json()
}

export async function createTrip(data) {
  const response = await fetch(`${BASE_URL}/trips/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create trip')
  return response.json()
}
```

Let's talk about what this code is doing.
- `BASE_URL` is defined once at the top of the file. Every function uses it, so changing the server address only requires changing one line.
- Each function calls `fetch()`, checks `response.ok` (which is `true` for any 2xx status), and throws an error if the request failed. React Query catches that thrown error and exposes it through the `isError` / `error` values returned by `useQuery`.
- `response.json()` is returned directly. React Query's `queryFn` must return the data it wants to cache — returning the promise from `.json()` is the standard pattern.
- `createTrip` sends a `POST` with `Content-Type: application/json`. DRF requires that header to parse the request body as JSON.
- This file has **no React imports** — it is plain JavaScript. Keeping the raw HTTP logic separate from React makes it easy to test and reuse.

---

### 3. Create React Query hooks in `src/hooks/`

The `src/api/` functions know how to talk to the server. The hooks in `src/hooks/` know how to manage that data inside React — caching it, tracking loading state, and invalidating stale data after a mutation.

#### 3a. Create `src/hooks/useVehicles.js` and `src/hooks/useDrivers.js`

```js
// src/hooks/useVehicles.js

import { useQuery } from '@tanstack/react-query'
import { fetchVehicles } from '../api/fleet'

export function useVehicles() {
  const { data: vehicles = [], isLoading, isError, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: fetchVehicles,
  })
  return { vehicles, isLoading, isError, error }
}
```

`useDrivers` follows the exact same pattern — swap `vehicles` for `drivers` and `fetchVehicles` for `fetchDrivers`.

Let's talk about what this code is doing.
- `useQuery` is the core React Query hook for data fetching. It takes a `queryKey` (a stable identifier for this data) and a `queryFn` (the function that fetches it).
- `queryKey: ['vehicles']` uniquely identifies this query in React Query's cache. If two components call `useVehicles()`, React Query runs the fetch only once and shares the result — no duplicate requests.
- `data: vehicles = []` renames `data` to `vehicles` and provides a default empty array. Without the default, `vehicles` would be `undefined` on the first render before the fetch completes, which would crash `vehicles.map(...)`.
- The hook returns a plain object (`{ vehicles, isLoading, isError, error }`). Pages and components destructure only what they need — they never import from `@tanstack/react-query` directly.

#### 3b. Create `src/hooks/useTrips.js`

```js
// src/hooks/useTrips.js

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrips, createTrip } from '../api/fleet'

export function useTrips() {
  const { data: trips = [], isLoading, isError, error } = useQuery({
    queryKey: ['trips'],
    queryFn: fetchTrips,
  })
  return { trips, isLoading, isError, error }
}

export function useCreateTrip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
```

Let's talk about what this code is doing.
- `useMutation` is React Query's hook for write operations (POST, PATCH, DELETE). Unlike `useQuery`, it does not run automatically — the caller triggers it by calling `mutate(data)`.
- `useQueryClient()` gives access to the shared query cache. `invalidateQueries({ queryKey: ['trips'] })` marks the trips cache as stale, so React Query re-fetches the trip list automatically the next time it is needed. This is what ensures the trips page reflects the new trip without a manual page reload.
- Exporting two separate functions (`useTrips` and `useCreateTrip`) keeps concerns split: `useTrips` is for reading, `useCreateTrip` is for writing. A page that only reads trips doesn't need to import the mutation.

---

### 4. Wrap the app in `QueryClientProvider` in `src/App.jsx`

React Query requires a `QueryClient` instance to be provided at the top of the component tree. Every hook that calls `useQuery` or `useMutation` reads from this shared client.

```jsx
// src/App.jsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
// ... page imports ...

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* navbar and routes unchanged */}
      </BrowserRouter>
    </QueryClientProvider>
  )
}
```

Let's talk about what this code is doing.
- `new QueryClient()` is created **outside** the `App` function at module level. If it were created inside `App`, a new client (and empty cache) would be created on every re-render.
- `QueryClientProvider` must wrap every component that uses a React Query hook, so it sits at the very top — outside `BrowserRouter`. The order between `QueryClientProvider` and `BrowserRouter` does not matter as long as both are above the pages.

---

### 5. Update the pages to use hooks instead of mock data

Each page now imports from `src/hooks/` instead of `src/mockData.js`. The component layer (`VehicleList`, `DriverList`, `TripList`, `TripForm`) does not change at all — it still receives the same props it always did.

#### 5a. Update `src/pages/VehiclesAndDriversPage.jsx` and `src/pages/TripsPage.jsx`

```jsx
// src/pages/VehiclesAndDriversPage.jsx

import VehicleList from '../components/VehicleList'
import DriverList from '../components/DriverList'
import { useVehicles } from '../hooks/useVehicles'
import { useDrivers } from '../hooks/useDrivers'

function VehiclesAndDriversPage() {
  const { vehicles, isLoading: loadingVehicles } = useVehicles()
  const { drivers, isLoading: loadingDrivers } = useDrivers()

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        {loadingVehicles
          ? <span className="loading loading-spinner loading-md" />
          : <VehicleList vehicles={vehicles} />
        }
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-3">Drivers</h2>
        {loadingDrivers
          ? <span className="loading loading-spinner loading-md" />
          : <DriverList drivers={drivers} />
        }
      </section>
    </div>
  )
}
```

`TripsPage` follows the same pattern — swap `useVehicles` / `useDrivers` for `useTrips` and render `<TripList trips={trips} />`.

Let's talk about what this code is doing.
- The only changes from the mock-data version are the import lines and the loading spinner. Everything else — JSX structure, class names, component usage — is identical.
- `isLoading: loadingVehicles` renames `isLoading` so both hooks can be used in the same component without a name collision.
- `<span className="loading loading-spinner loading-md" />` is a DaisyUI spinner. It renders while the fetch is in flight and disappears once `isLoading` becomes `false`.
- The API response from DRF is a plain JSON array (no `results` wrapper) because no pagination class is configured in `REST_FRAMEWORK`. `vehicles` is directly usable as an array.

#### 5b. Update `src/pages/CreateTripPage.jsx`

```jsx
// src/pages/CreateTripPage.jsx

import { useNavigate } from 'react-router-dom'
import TripForm from '../components/TripForm'
import { useVehicles } from '../hooks/useVehicles'
import { useDrivers } from '../hooks/useDrivers'
import { useCreateTrip } from '../hooks/useTrips'

function CreateTripPage() {
  const navigate = useNavigate()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { mutate: createTrip, isPending } = useCreateTrip()

  function handleSubmit(formData) {
    createTrip(formData, {
      onSuccess: () => navigate('/trips'),
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a New Trip</h2>
      {isPending && <span className="loading loading-spinner loading-md mb-4" />}
      <TripForm vehicles={vehicles} drivers={drivers} onSubmit={handleSubmit} />
    </div>
  )
}
```

Let's talk about what this code is doing.
- `mutate: createTrip` renames the `mutate` function to match what it does — creating a trip.
- `createTrip(formData, { onSuccess: () => navigate('/trips') })` passes the form data as the argument to `mutationFn` (which is `createTrip` from `src/api/fleet.js`). The `onSuccess` callback runs only after the server responds with a success status. At that point, `useCreateTrip` has already invalidated the trips cache, so navigating to `/trips` will show the updated list.
- `isPending` is `true` while the POST request is in flight. Showing a spinner during this time gives the user feedback that something is happening.
- `vehicles` and `drivers` are fetched by the same hooks used on `VehiclesAndDriversPage`. React Query returns the cached result immediately — no second network request is made because the data was already fetched when the user visited that page.

---

## Challenge/Exercise

### 1. Add error feedback to the pages

Currently, `isError` is destructured from each hook but never used. Add visible error messages to the UI:
- When `isError` is `true` on `VehiclesAndDriversPage` or `TripsPage`, render a DaisyUI `alert alert-error` in place of the spinner or table.
- On `CreateTripPage`, if `useCreateTrip()` returns `isError: true`, display the error message below the form without navigating away.
- Test it by stopping the Django server and reloading the frontend.

### 2. Add a search filter to the vehicles list

The backend's `VehicleViewSet` already supports `?search=` via DRF's `SearchFilter`.
- Add a controlled text input above the `VehicleList` in `VehiclesAndDriversPage`.
- Store the search term in `useState`.
- Update `fetchVehicles` in `src/api/fleet.js` to accept an optional `search` string and append `?search=<term>` when present.
- Update `useVehicles` to accept a `search` argument, pass it to `fetchVehicles`, and include it in the `queryKey`: `['vehicles', search]`. React Query will re-fetch automatically whenever the key changes.

---

## Conclusion

In this example we learned about:
- **CORS and `django-cors-headers`** — browsers block cross-origin responses unless the server explicitly allows them. `CorsMiddleware` must be placed near the top of `MIDDLEWARE`, before `CommonMiddleware`, to intercept preflight requests.
- **`CORS_ALLOWED_ORIGINS`** — an explicit allowlist of trusted frontend origins. Using `CORS_ALLOW_ALL_ORIGINS = True` is convenient for development but should never be used in production.
- **`src/api/` layer** — plain async functions that own the HTTP details (URL, method, headers, error checking). No React, no hooks. Easy to test in isolation.
- **`src/hooks/` layer** — React Query hooks that wrap the API functions and expose `data`, `isLoading`, `isError`, and `error` to components. Pages and components never call `fetch()` directly.
- **`useQuery`** — caches fetched data by `queryKey`. Multiple components calling the same hook share one request and one cached result. Always provide a default value (`data: items = []`) to avoid `undefined` on the first render.
- **`useMutation`** — for write operations. Call `mutate(data)` to trigger the request. Use `onSuccess` to invalidate related query cache entries and trigger a background re-fetch.
- **`QueryClientProvider`** — must wrap the entire app (or at least every component that uses a React Query hook). Create `new QueryClient()` outside the component so it is not recreated on every render.
- **Caution — `CorsMiddleware` order matters.** Placing it after `CommonMiddleware` or `SessionMiddleware` will cause preflight OPTIONS requests to fail, and the browser will block all API calls even though the server is running.
- **Caution — `BASE_URL` is hardcoded to `localhost:8000`.** In a real project, use an environment variable (`import.meta.env.VITE_API_URL`) so the URL can differ between development and production without changing source code.
- **Caution — React Query caches data across page navigations.** If the backend data changes between visits, the stale cache is shown first while a background re-fetch runs. This is usually desirable, but be aware that `vehicles` and `drivers` on `CreateTripPage` may briefly show the cached version from an earlier visit.
