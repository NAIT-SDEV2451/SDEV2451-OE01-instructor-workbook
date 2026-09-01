# Paginating the Trips List Endpoint with DRF

This example builds on the completed Fleet Manager app from the previous module. The full-stack app is already wired together — the React frontend fetches live data from the Django REST Framework backend, the Trip Detail page shows a map and allows status transitions, and stat cards summarise fleet data.

In this example we add **server-side pagination** to the trips list endpoint. Without it, every request to `GET /api/v1/trips/` returns the full dataset regardless of size. Pagination caps the response to a fixed page size and lets the frontend request subsequent pages on demand.

## Prerequisites

### Backend
- Create a virtual environment inside `vehiclefleet_backend/` and install packages from `requirements.txt`.
- Run `python manage.py migrate` to apply migrations.
- Run `python manage.py loaddata vehicles drivers trips` to load the base sample data.
- Run `python manage.py loaddata trips_variety` to load the extended dataset (12 additional trips needed to see pagination in action).
- Run `python manage.py runserver`.

### Frontend
- Run `npm install` inside `vehiclefleet_frontend/`.
- Run `npm run dev`.

---

## Steps

The fleet app is fully functional. The trips list currently returns all trips in one response — fine for a small dataset but a problem as data grows. We will introduce a paginator on the backend and update the frontend hook and page to handle the new response shape.

---

### 1. Create `vehiclefleet_backend/fleet/pagination.py`

DRF pagination lives in its own file to keep the viewset clean and make the class reusable across future viewsets.

```python
# fleet/pagination.py

from rest_framework.pagination import PageNumberPagination


class TripPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = "page_size"
    max_page_size = 50
```

Let's talk about what this code is doing.
- `PageNumberPagination` is DRF's built-in page-number strategy. It wraps list results in a `{ "count": N, "next": "url", "previous": "url", "results": [...] }` envelope automatically — no changes to the serializer are needed.
- `page_size = 5` is the default number of trips per page. Clients request page 2 with `?page=2`.
- `page_size_query_param = "page_size"` lets the client override the page size per request (e.g. `?page_size=10`). Without this attribute the page size is fixed.
- `max_page_size = 50` caps the override so a client cannot request an arbitrarily large page and bypass the performance benefit.
- Putting this class in a dedicated `pagination.py` rather than inline in `views.py` keeps the viewset focused on behaviour and makes the paginator easy to reuse on other viewsets later.

---

### 2. Apply `TripPagination` to `TripViewSet` in `fleet/views.py`

```python
# fleet/views.py

from fleet.pagination import TripPagination

class TripViewSet(ModelViewSet):
    serializer_class = TripSerializer
    pagination_class = TripPagination

    def get_queryset(self):
        return Trip.objects.select_related("vehicle", "driver").all()

    # ... existing map, start, complete actions unchanged ...
```

Let's talk about what this code is doing.
- Setting `pagination_class` directly on `TripViewSet` applies pagination only to trips. The vehicle and driver list endpoints remain unpaginated — they have small, bounded datasets where loading all records at once is fine.
- DRF applies the paginator only to list-style responses. The `map`, `start`, and `complete` detail actions (`@action(detail=True, ...)`) are not affected — they operate on a single object and bypass the list paginator entirely.
- Setting this globally in `settings.py` (`REST_FRAMEWORK = { "DEFAULT_PAGINATION_CLASS": ... }`) would paginate every viewset. The per-viewset approach gives you control over which endpoints are paginated.

You can verify pagination is working by visiting `http://localhost:8000/api/v1/trips/` in your browser. The response should now look like:

```json
{
  "count": 17,
  "next": "http://localhost:8000/api/v1/trips/?page=2",
  "previous": null,
  "results": [ ... ]
}
```

---

### 3. Update `fetchTrips` in `src/api/fleet.js`

The API function needs to accept a page number and pass it as a query parameter.

```js
// src/api/fleet.js

export async function fetchTrips(page = 1) {
  const response = await fetch(`${BASE_URL}/trips/?page=${page}`)
  if (!response.ok) throw new Error('Failed to fetch trips')
  return response.json()
}
```

Let's talk about what this code is doing.
- `page = 1` defaults to the first page so existing call sites that omit the argument continue to work without changes.
- `?page=${page}` appends the page number to the request URL. DRF's `PageNumberPagination` reads this parameter automatically.
- The function still returns `response.json()` — the caller (the hook) is responsible for reading the paginated envelope.

---

### 4. Update `useTrips` in `src/hooks/useTrips.js`

The hook accepts a page number and passes it to `fetchTrips`. Rather than including the page in the query key — which would create a separate cache entry per page — we keep the key as `['trips']` and use `useEffect` to invalidate the query whenever the page changes. This keeps the pagination state (owned by `PaginationContext`) cleanly separated from the data-fetching cache key.

```js
// src/hooks/useTrips.js

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrips, createTrip } from '../api/fleet'

export function useTrips(page = 1) {
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['trips'],
    queryFn: () => fetchTrips(page),
  })

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['trips'] })
  }, [page])

  return {
    trips: data ?? { results: [], count: 0 },
    isLoading,
    isError,
    error,
  }
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
- `queryKey: ['trips']` is a stable key — it never changes, so React Query maintains a single cache entry for the trips list at any point in time.
- `queryFn: () => fetchTrips(page)` captures the current `page` value in a closure. Each time the query runs — on mount or after an invalidation — it calls `fetchTrips` with the latest page.
- `useEffect(() => { queryClient.invalidateQueries(...) }, [page])` watches for page changes. When `page` changes, `invalidateQueries` marks the `['trips']` entry as stale. Because the query is being observed by a mounted component, React Query immediately refetches using the updated `queryFn` closure, which now captures the new page number.
- `trips: data ?? { results: [], count: 0 }` returns the full paginated response object rather than extracting individual fields. Consumers access `trips.results` for the array and `trips.count` for the total — keeping the response shape intact and making it obvious what the backend returned.
- This design keeps pagination state in `PaginationContext` and fetching logic in `useTrips`. Neither knows the internals of the other — swapping one does not require touching the other.
- `hasNext` and `hasPrevious` are no longer returned. Those boundary booleans are now derived inside `usePagination` from `page` and `totalPages`, keeping `useTrips` focused purely on fetching.
- `useCreateTrip`'s `invalidateQueries({ queryKey: ['trips'] })` continues to work unchanged — there is now only one `['trips']` cache entry to invalidate after a mutation, rather than one per page.

---

### 5. Add page state and pagination controls to `src/pages/TripsPage.jsx`

```jsx
// src/pages/TripsPage.jsx

import { useState } from 'react'
import TripList from '../components/TripList'
import StatCard from '../components/StatCard'
import AverageDistanceChart from '../components/AverageDistanceChart'
import { useTrips } from '../hooks/useTrips'
import { useStats } from '../hooks/useStats'

// ... STAT_CARDS config unchanged ...

function TripsPage() {
  const [page, setPage] = useState(1)
  const { trips, count, hasNext, hasPrevious, isLoading } = useTrips(page)
  const { stats } = useStats()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, color }) => (
          <StatCard key={key} label={label} value={stats?.[key]} color={color} />
        ))}
      </div>

      {stats?.avg_distance_per_week?.length > 0 && (
        <AverageDistanceChart data={stats.avg_distance_per_week} />
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3">Trips</h2>
        {isLoading
          ? <span className="loading loading-spinner loading-md" />
          : <TripList trips={trips} />
        }
        <div className="flex items-center gap-3 mt-4">
          <button
            className="btn btn-sm btn-outline"
            disabled={!hasPrevious}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span className="text-sm text-base-content/60">{count} trips total</span>
          <button
            className="btn btn-sm btn-outline"
            disabled={!hasNext}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default TripsPage
```

Let's talk about what this code is doing.
- `useState(1)` initialises the page on load to page 1. Updating it triggers a re-render; the new value flows into `useTrips(page)`, changes the `queryKey`, and React Query fetches the new page.
- `disabled={!hasPrevious}` and `disabled={!hasNext}` prevent the user from navigating past the first or last page without needing to track the total page count explicitly.
- `onClick={() => setPage(p => p - 1)}` uses the functional updater form to avoid stale closure issues — `p` is always the current value at click time.
- The `{count} trips total` label gives users context about the full dataset size without loading all records.
- The stat cards and chart are unchanged — they call `useStats`, which is a separate query unaffected by the pagination state.

---

### 6. Create `src/contexts/PaginationContext.jsx`

The pagination state — which page we are on, how many pages exist — currently lives inside `TripsPage` as local `useState`. That works as long as only one component needs it. But as the UI grows, other components will also want to know the current page or navigate between pages. Passing `page` and `setPage` down through props to every component that needs them is called **prop drilling**, and it becomes difficult to maintain quickly.

The **React Context API** solves this by creating a value that any component in a subtree can read or update directly — no props required. A **Provider** component wraps the part of the tree that needs the shared state and makes the value available to all of its descendants.

```jsx
// src/contexts/PaginationContext.jsx

import { createContext, useState } from 'react'

export const PaginationContext = createContext(null)

export function PaginationProvider({ pageSize = 5, children }) {
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <PaginationContext.Provider value={{
      page,
      totalCount,
      totalPages,
      setTotalCount,
      goToNext:     () => setPage(p => Math.min(p + 1, totalPages)),
      goToPrevious: () => setPage(p => Math.max(p - 1, 1)),
      goToPage:     (n) => setPage(Math.max(1, Math.min(n, totalPages))),
    }}>
      {children}
    </PaginationContext.Provider>
  )
}
```

Let's talk about what this code is doing.
- `createContext(null)` creates the context object. The `null` default is only used when a component calls `useContext` outside of any provider — we will guard against that in the hook.
- `PaginationContext.Provider` makes the `value` object available to every descendant component. Any component inside the provider can read `page`, call `goToNext`, etc. — without receiving them as props.
- `totalCount` and `setTotalCount` are held in the context because the data-fetching component (`TripsContent`) learns the total after fetching and needs to share it with the pagination controls (`TripsPagination`). Neither component is the parent of the other, so context is the right tool.
- `totalPages = Math.ceil(totalCount / pageSize) || 1` derives the page count from the total. The `|| 1` guards against a zero before the first fetch so the `goToNext` clamp `Math.min(p + 1, totalPages)` never produces `0`.
- `goToNext`, `goToPrevious`, and `goToPage` are defined as arrow functions inside the provider so they always close over the latest `totalPages` value. Putting navigation logic in the context means any consumer can trigger navigation without knowing about `setPage`.
- `pageSize` is accepted as a prop so the provider can be reused for other lists with different page sizes.

---

### 7. Create `src/hooks/usePagination.js`

Rather than calling `useContext(PaginationContext)` directly in every component, we wrap it in a dedicated hook. The hook also derives convenience booleans and throws a clear error if the hook is used outside a provider.

```js
// src/hooks/usePagination.js

import { useContext } from 'react'
import { PaginationContext } from '../contexts/PaginationContext'

export function usePagination() {
  const context = useContext(PaginationContext)
  if (!context) {
    throw new Error('usePagination must be used inside a PaginationProvider')
  }
  const { page, totalCount, totalPages, setTotalCount, goToNext, goToPrevious, goToPage } = context
  return {
    page,
    totalCount,
    totalPages,
    hasNext:     page < totalPages,
    hasPrevious: page > 1,
    setTotalCount,
    goToNext,
    goToPrevious,
    goToPage,
  }
}
```

Let's talk about what this code is doing.
- `useContext(PaginationContext)` reads the nearest `PaginationContext.Provider` value in the component tree. If there is no provider above the calling component, it returns the default value (`null`).
- The `if (!context)` guard converts that `null` case into a descriptive error. Without this guard, trying to destructure `null` would throw a less helpful `TypeError: Cannot destructure property 'page' of null`.
- `hasNext: page < totalPages` and `hasPrevious: page > 1` are computed here rather than in `PaginationContext` itself. Derived values belong in the hook (the consumer interface) rather than the context (the shared state).
- Components import `usePagination` and never touch `PaginationContext` or `useContext` directly. If the context shape ever changes, only this file needs updating.

---

### 8. Create `src/components/TripsPagination.jsx`

The pagination buttons are now their own component. They read everything they need from the context via `usePagination` — no props required.

```jsx
// src/components/TripsPagination.jsx

import { usePagination } from '../hooks/usePagination'

function TripsPagination() {
  const { page, totalCount, totalPages, hasNext, hasPrevious, goToNext, goToPrevious } = usePagination()

  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        className="btn btn-sm btn-outline"
        disabled={!hasPrevious}
        onClick={goToPrevious}
      >
        Previous
      </button>
      <span className="text-sm text-base-content/60">
        Page {page} of {totalPages} · {totalCount} trips total
      </span>
      <button
        className="btn btn-sm btn-outline"
        disabled={!hasNext}
        onClick={goToNext}
      >
        Next
      </button>
    </div>
  )
}

export default TripsPagination
```

Let's talk about what this code is doing.
- `TripsPagination` calls `usePagination()` and receives everything it needs: the current page, total pages, boundary booleans, and navigation functions. Its parent (`TripsContent`) passes it zero props.
- This is the payoff of using context: `TripsPagination` could be moved anywhere inside the `PaginationProvider` tree — into a footer, a sidebar, or a mobile drawer — without any changes to the component itself or its parent.
- `onClick={goToNext}` passes the function reference directly rather than wrapping it in an arrow function, since `goToNext` already encapsulates the page-clamping logic.

---

### 9. Add `PaginationProvider` to the trips route in `src/App.jsx` and update `src/pages/TripsPage.jsx`

`PaginationProvider` belongs at the route level in `App.jsx`. This makes `TripsPage` a straightforward single component — it calls `usePagination` freely because the provider is already above it in the tree when the route renders.

```jsx
// src/App.jsx

import { PaginationProvider } from './contexts/PaginationContext'
// ... other imports unchanged ...

<Route
  path="/trips"
  element={
    <PaginationProvider pageSize={5}>
      <TripsPage />
    </PaginationProvider>
  }
/>
```

With the provider in place, `TripsPage` is a single clean component with no inner wrapper:

```jsx
// src/pages/TripsPage.jsx

import { useEffect } from 'react'
import TripList from '../components/TripList'
import StatCard from '../components/StatCard'
import AverageDistanceChart from '../components/AverageDistanceChart'
import TripsPagination from '../components/TripsPagination'
import { useTrips } from '../hooks/useTrips'
import { useStats } from '../hooks/useStats'
import { usePagination } from '../hooks/usePagination'

// ... STAT_CARDS config unchanged ...

function TripsPage() {
  const { stats } = useStats()
  const { page, setTotalCount } = usePagination()
  const { trips, isLoading } = useTrips(page)

  useEffect(() => {
    if (trips.count !== undefined) setTotalCount(trips.count)
  }, [trips.count, setTotalCount])

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, color }) => (
          <StatCard key={key} label={label} value={stats?.[key]} color={color} />
        ))}
      </div>

      {stats?.avg_distance_per_week?.length > 0 && (
        <AverageDistanceChart data={stats.avg_distance_per_week} />
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3">Trips</h2>
        {isLoading
          ? <span className="loading loading-spinner loading-md" />
          : <TripList trips={trips.results} />
        }
        <TripsPagination />
      </div>
    </div>
  )
}

export default TripsPage
```

Let's talk about what this code is doing.
- Placing `PaginationProvider` in `App.jsx` on the trips route is the natural home for a provider that is scoped to a single page. The provider mounts when the route activates and unmounts when the user navigates away, resetting pagination state automatically.
- `TripsPage` calls `usePagination()` directly because by the time React renders `TripsPage`, `PaginationProvider` is already above it in the tree. There is no need for an inner wrapper component.
- `TripsPage` no longer imports `PaginationProvider` — that responsibility has moved to `App.jsx`. The page component only imports what it uses directly.
- `useEffect(() => { if (trips.count !== undefined) setTotalCount(trips.count) }, [trips.count, setTotalCount])` writes the server's total back into the context whenever a new page loads. `TripsPagination` then reads `totalPages` from the context to display `Page 2 of 4` without `TripsPage` needing to pass anything to it as a prop.
- `TripsPagination` and `TripsPage` are siblings in the component tree — neither is the parent of the other. Their shared state lives in `PaginationContext` above both of them. This is the core idea of the Context API: **lift shared state up** into a provider and **consume it sideways** from any descendant, without threading props through intermediate components.

---

## Toast Notifications — A Second Context Example

The steps below are independent of pagination. They can be implemented any time after the pagination work above is done. The goal is to introduce a second context — `NotificationContext` — that solves a different but equally common global-state problem: showing transient success and error messages from anywhere in the app without passing callbacks through props.

---

### 10. Create `src/contexts/NotificationContext.jsx`

Any component in the app can trigger a toast — `CreateTripPage` after a mutation, `TripDetailPage` after a status transition — but they are all different parts of the component tree. Without a shared context, each one would need the notification callback threaded down as a prop. `NotificationContext` lifts that state to the top of the tree so any component can call `showSuccess` or `showError` directly.

`NotificationProvider` renders the `Toast` component itself, so consumers just wrap with `NotificationProvider` and get the toast for free — no extra imports needed in `App.jsx`.

```jsx
// src/contexts/NotificationContext.jsx

import { createContext, useState } from 'react'
import Toast from '../components/Toast'

export const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null)

  function showSuccess(message) {
    setNotification({ message, type: 'success' })
  }

  function showError(message) {
    setNotification({ message, type: 'error' })
  }

  function hide() {
    setNotification(null)
  }

  return (
    <NotificationContext.Provider value={{ showSuccess, showError, hide }}>
      <Toast notification={notification} hide={hide} />
      {children}
    </NotificationContext.Provider>
  )
}
```

Let's talk about what this code is doing.
- `notification` state lives in `NotificationProvider`. It is either `null` (nothing to show) or `{ message, type }` where `type` is `'success'` or `'error'`. A single piece of state is enough — we only ever show one toast at a time.
- `showSuccess`, `showError`, and `hide` are plain functions defined inside the provider. They close over `setNotification` and are passed into context. Consumers never call `setNotification` directly — they only call the named functions, which keeps the notification shape consistent.
- `<Toast notification={notification} hide={hide} />` is rendered before `{children}`. This is why consumers don't need to add `<Toast />` anywhere in their own JSX — the provider handles it.
- `Toast` receives `notification` and `hide` as props rather than reading from context. This avoids a circular import: `Toast` would need to import from `NotificationContext`, but `NotificationContext` already imports `Toast`.
- The context value only exposes `{ showSuccess, showError, hide }` — not `notification` itself. The display state is an implementation detail of the provider, not part of the public API that consumers use.

---

### 11. Create `src/components/Toast.jsx`

`Toast` is a regular component in the `components/` folder. It receives the current notification and the hide function as props — it has no direct dependency on `NotificationContext`.

```jsx
// src/components/Toast.jsx

import { useEffect } from 'react'

const AUTO_HIDE_MS = 3000

function Toast({ notification, hide }) {
  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(hide, AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [notification, hide])

  if (!notification) return null

  const alertClass = notification.type === 'success' ? 'alert-success' : 'alert-error'

  return (
    <div className="toast toast-top toast-end z-50">
      <div className={`alert ${alertClass} flex justify-between gap-4`}>
        <span>{notification.message}</span>
        <button className="btn btn-xs btn-ghost" onClick={hide}>✕</button>
      </div>
    </div>
  )
}

export default Toast
```

Let's talk about what this code is doing.
- `if (!notification) return null` — when there is no active notification, the component renders nothing. This is the React pattern for conditionally rendering UI: return `null` rather than an empty container.
- `useEffect([notification, hide])` — each time a new notification is set, the effect starts a `setTimeout` that calls `hide` after `AUTO_HIDE_MS`. The cleanup function (`return () => clearTimeout(timer)`) cancels the previous timer if a new notification arrives before the old one has auto-hidden. Without the cleanup, stacking two notifications quickly would leave a timer from the first one that fires unexpectedly.
- `notification.type === 'success' ? 'alert-success' : 'alert-error'` maps the type to a DaisyUI colour class. Adding a new type (e.g. `'warning'`) is a one-line change here.
- The `✕` dismiss button calls `hide` immediately so users can close the toast without waiting for the timeout.
- `Toast` has no import from `NotificationContext` — it is a plain presentational component. Its only job is to display what it is given and call back when dismissed.

---

### 12. Create `src/hooks/useNotification.js`

```js
// src/hooks/useNotification.js

import { useContext } from 'react'
import { NotificationContext } from '../contexts/NotificationContext'

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used inside a NotificationProvider')
  }
  return context
}
```

Let's talk about what this code is doing.
- The hook returns the context value — `{ showSuccess, showError, hide }`. Components destructure only what they need: a page that triggers mutations imports `{ showSuccess, showError }`.
- The `if (!context)` guard throws a descriptive error when the hook is called outside a `NotificationProvider`. Without it, the `null` default value would cause a confusing `TypeError` when a consumer tries to destructure it.
- This pattern — one `createContext`, one Provider, one hook — is the same structure used for `PaginationContext`. Once you recognise the pattern, reading and building new contexts becomes mechanical.

---

### 13. Wrap `src/App.jsx` with `NotificationProvider`

`NotificationProvider` must be the outermost wrapper so every page component can call `showSuccess` or `showError`. Because `Toast` is rendered inside the provider itself, `App.jsx` does not need to import or place `<Toast />` anywhere.

```jsx
// src/App.jsx

import { NotificationProvider } from './contexts/NotificationContext'
// ... other imports unchanged — no Toast import needed ...

function App() {
  return (
    <NotificationProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-base-200">
            <nav className="navbar bg-base-100 shadow px-6">
              {/* ... navbar unchanged ... */}
            </nav>
            <main className="p-6 max-w-6xl mx-auto">
              <Routes>
                {/* ... routes unchanged ... */}
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </QueryClientProvider>
    </NotificationProvider>
  )
}
```

Let's talk about what this code is doing.
- `NotificationProvider` wraps `QueryClientProvider` and `BrowserRouter`. The order relative to those two providers does not matter — `NotificationContext` has no dependency on React Query or React Router.
- There is no `<Toast />` in this file. The provider renders the toast itself, so the only change to `App.jsx` is adding the `NotificationProvider` wrapper and its import.
- Because every page component is a descendant of `NotificationProvider`, they all read from the same context instance — one `notification` state shared across the whole app.

---

### 14. Use `useNotification` in `src/pages/CreateTripPage.jsx`

This step demonstrates the hook in practice. `CreateTripPage` calls `showSuccess` when the mutation succeeds and `showError` when it fails — without knowing anything about how the toast is displayed.

```jsx
// src/pages/CreateTripPage.jsx

import { useNotification } from '../hooks/useNotification'
// ... other imports unchanged ...

function CreateTripPage() {
  const navigate = useNavigate()
  const { vehicles } = useVehicles()
  const { drivers } = useDrivers()
  const { mutate: createTrip, isPending } = useCreateTrip()
  const { showSuccess, showError } = useNotification()

  function handleSubmit(formData) {
    createTrip(formData, {
      onSuccess: () => {
        showSuccess('Trip created successfully.')
        navigate('/trips')
      },
      onError: () => showError('Failed to create trip. Please try again.'),
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
- `CreateTripPage` calls `showSuccess` and `showError` but has no knowledge of where or how the toast is rendered. This is the key benefit of the context approach — the triggering component and the display component are fully decoupled.
- `onSuccess` calls `showSuccess` before `navigate('/trips')`. The navigation happens immediately, but because the toast is rendered inside `NotificationProvider` which sits above the routes, it survives the route change and remains visible on the Trips page.
- `onError` is passed directly to `useMutation`'s per-call options. This is the same `createTrip(formData, { onSuccess, onError })` pattern from earlier examples — we're just adding a new callback rather than changing the mutation setup.
- The `useNotification` import is the only change to this file. Nothing else about the component's structure changes.

---

## Challenge/Exercise

### 1. Add a page size selector

`TripPagination` already supports a `?page_size=` query parameter (up to `max_page_size = 50`).
- Add a `<select>` above the trips table with options for 5, 10, and 25 trips per page.
- Store the selection in `useState` and pass it to `fetchTrips` as a second argument: `fetchTrips(page, pageSize)`.
- Append `&page_size=${pageSize}` to the URL in `fetchTrips` when a value is provided.
- Reset `page` back to `1` whenever `pageSize` changes so the user does not land on a non-existent page.
- Include `pageSize` in the `queryKey`: `['trips', page, pageSize]`.

### 2. Show current page number

The pagination controls currently show Previous / Next buttons and a total count but no indication of which page the user is on.
- Add a `Page {page}` label between the two buttons.
- Calculate the total number of pages as `Math.ceil(count / pageSize)` and display it as `Page {page} of {totalPages}`.

---

## Conclusion

In this example we learned about:
- **`PageNumberPagination`** — DRF's built-in page-number paginator wraps list results in a `{ count, next, previous, results }` envelope automatically; no serializer changes are required
- **Per-viewset `pagination_class`** — setting `pagination_class` on an individual viewset applies pagination only where needed; setting it globally in `settings.py` would paginate every endpoint
- **`@action(detail=True)` bypasses the list paginator** — custom detail actions operate on a single object and are not affected by the paginator set on the viewset
- **`queryKey` includes the page number** — scoping the cache key to `['trips', page]` gives each page its own cache entry so back-navigation returns cached results instantly
- **Partial key invalidation** — `invalidateQueries({ queryKey: ['trips'] })` matches all keys that start with `'trips'`, invalidating every cached page at once after a mutation
- **`data?.results ?? []`** — the response shape changed from a plain array to an object; optional chaining and a `[]` default keep the component safe while data is loading
- **`!!data?.next` / `!!data?.previous`** — coercing the URL string or `null` to a boolean is the simplest way to derive `hasNext` / `hasPrevious` without parsing the URL
- **React Context API** — `createContext` creates a shared value; `Provider` makes it available to all descendants; `useContext` reads it from any component in the tree, eliminating prop drilling
- **Narrow the provider scope** — wrapping only the components that need shared state (the trips section) rather than the entire page keeps the context's blast radius small and makes re-renders predictable
- **Derived values belong in the hook, not the context** — `hasNext` and `hasPrevious` are computed in `usePagination` from `page` and `totalPages`; the context itself stores only the primitive state it needs to persist
- **Guard `useContext` with a null check** — returning a descriptive error from the hook when the context is `null` surfaces the "missing provider" mistake immediately rather than producing a cryptic `TypeError` deep in the component tree
- **Sibling components sharing state through context** — `TripsContent` (writes `totalCount`) and `TripsPagination` (reads `totalPages`) are siblings; neither is the parent of the other; context is the right tool when siblings need shared state and lifting it to a common ancestor would require passing props through uninterested intermediaries
- **`useEffect` to sync server data into context** — calling `setTotalCount(count)` inside a `useEffect` that depends on `count` writes the server's total back into the context after each page fetch; `TripsPagination` then derives `totalPages` without needing a prop from `TripsContent`
- **Caution — the `count` in the stats card and `count` from pagination are different values.** The stats endpoint's `total_trips` is computed by a separate aggregation query; the paginator's `count` comes from the trips queryset. They should agree, but if you add filtering to `TripViewSet` later (e.g. `filter_backends`), the paginator `count` will reflect the filtered set while `total_trips` in stats will not.
- **Caution — resetting `page` to 1 when filters change is essential.** If the user is on page 3 and applies a filter that yields only 2 pages, requesting page 3 will return an empty `results` array. Always reset page state to 1 when any parameter that affects the queryset changes.
