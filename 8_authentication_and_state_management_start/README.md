# Authentication and State Management — Ticketmono

This example completes the authentication layer for Ticketmono. Building on the architecture introduced in Example 7, it adds JWT-based login on the Django backend and integrates it with a React frontend that manages authentication state globally using Context and React Query.

## Prerequisites

### Backend
- Create a virtual environment inside `ticketmono_backend/` and install packages from `requirements.txt`.
- Run `python manage.py migrate` to apply migrations.
- Run `python manage.py runserver`.

### Frontend
- Run `npm install` inside `ticketmono_frontend/`.
- Run `npm run dev`.

---

## Loading Sample Data

The project includes sample data so you can explore the application without building everything from scratch.

> **Run all commands from inside `ticketmono_backend/` with your virtual environment active.**

### Create the organizer accounts and load sample data

A management command has already been created for you at `core/management/commands/create_organizers.py`. Run it to create the two organizer accounts with properly hashed passwords, then load the venues, events, and ticket tiers.

```
python manage.py create_organizers
python manage.py loaddata event_data.json
```

The `create_organizers` command is safe to re-run — it skips any user that already exists.

### Create a superuser and verify the data

```
python manage.py createsuperuser
```

Then visit `http://localhost:8000/admin/` and log in to browse the loaded venues, events, ticket tiers, and organizer accounts.

---

## Steps

### 1. Create `event_tickets/serializers.py`

Four serializers handle the events list response. `TicketTierSerializer`, `VenueSerializer`, and `OrganizerSerializer` each describe a nested object. `EventListReadOnlySerializer` composes all three to produce the full shape the frontend needs in a single request.

```python
# event_tickets/serializers.py

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Event, TicketTier, Venue

User = get_user_model()


class TicketTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketTier
        fields = ("id", "name", "price")


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = ("id", "name", "address")


class OrganizerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "role")


class EventListReadOnlySerializer(serializers.ModelSerializer):
    ticket_tiers = TicketTierSerializer(many=True, read_only=True)
    venue = VenueSerializer(read_only=True)
    organizer = OrganizerSerializer(read_only=True)

    class Meta:
        model = Event
        fields = ("id", "name", "date_time", "venue", "organizer", "ticket_tiers")
```

Let's talk about what this code is doing.
- `TicketTierSerializer`, `VenueSerializer`, and `OrganizerSerializer` are small, focused serializers. Keeping them separate means they can be reused in other serializers later without duplication.
- Declaring `ticket_tiers`, `venue`, and `organizer` explicitly on `EventListReadOnlySerializer` overrides the default behaviour, which would only return the foreign key IDs. The nested serializers return full objects instead.
- `many=True` on `ticket_tiers` tells DRF the field is a one-to-many relationship — it serializes a queryset into a list of objects.
- `read_only=True` on each nested field means the serializer is for output only. Attempting to write through it will raise a validation error.
- `get_user_model()` returns `core.CustomUser`, which is why `OrganizerSerializer` has access to the `role` field that does not exist on Django's default `User` model.

---

### 2. Create the `EventViewSet` in `event_tickets/views.py`

`EventViewSet` exposes the events list endpoint. `get_serializer_class` selects the serializer per action — returning `EventListReadOnlySerializer` for `list` — which leaves room to swap in a different serializer for other actions later.

```python
# event_tickets/views.py

from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from .models import Event
from .serializers import EventListReadOnlySerializer


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.select_related("venue", "organizer").prefetch_related(
        "ticket_tiers"
    )
    permission_classes = (AllowAny,)

    def get_serializer_class(self):
        if self.action == "list":
            return EventListReadOnlySerializer
        return EventListReadOnlySerializer
```

Let's talk about what this code is doing.
- `select_related("venue", "organizer")` fetches the venue and organizer in the same SQL query as the events using a JOIN, rather than issuing a separate query for each row. Without it, serializing 8 events would fire 16 extra queries.
- `prefetch_related("ticket_tiers")` fetches all ticket tiers for all events in a single follow-up query, then maps them back in Python. It uses a separate query (not a JOIN) because ticket tiers are a one-to-many relationship.
- `permission_classes = (AllowAny,)` makes the endpoint public. The events list page is accessible to unauthenticated users so they can browse events before registering.
- `get_serializer_class` returns the serializer based on `self.action`. This is the standard DRF pattern for viewsets that need different serializers per action (e.g. a read-heavy list serializer and a simpler write serializer for create/update).

---

### 3. Create `event_tickets/urls.py` and update `ticketmono_backend/urls.py`

A DRF router automatically generates the URL patterns for each action registered on the viewset.

```python
# event_tickets/urls.py

from rest_framework.routers import DefaultRouter

from .views import EventViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")

urlpatterns = router.urls
```

Then include the app's URLs in the project's main URL configuration:

```python
# ticketmono_backend/urls.py

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("core.urls")),
    path("api/v1/", include("event_tickets.urls")),
]
```

Let's talk about what this code is doing.
- `DefaultRouter` generates standard REST routes for the registered viewset. Registering `EventViewSet` under `"events"` produces `GET /api/v1/events/` (list) and `GET /api/v1/events/<pk>/` (detail) among others.
- `basename="event"` is used to name the generated URL patterns (e.g. `event-list`, `event-detail`). It is required here because the queryset is defined on the viewset — Django cannot infer the name from the model automatically in all cases.
- Mounting at `api/v1/` keeps the events routes consistent with the auth routes already at `api/v1/auth/`.

The events list endpoint is now available at:

| Method | URL | Description |
|---|---|---|
| `GET` | `/api/v1/events/` | List all events with nested venue, organizer, and ticket tiers |

---

### 4. Create `src/components/EventCard.jsx`

`EventCard` is a presentational component that displays a single event. The data is hardcoded for now — props and real data will be wired in a later step.

```jsx
// src/components/EventCard.jsx

function EventCard() {
  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">Summer Jazz Festival</h2>
        <p className="text-sm text-base-content/60">July 15, 2026 · 7:00 PM</p>
        <p className="text-sm">Madison Square Garden</p>
        <p className="text-sm text-base-content/60">4 Pennsylvania Plaza, New York, NY 10001</p>
        <div className="card-actions justify-end mt-2">
          <button className="btn btn-primary btn-sm">Get Tickets</button>
        </div>
      </div>
    </div>
  )
}

export default EventCard
```

Let's talk about what this code is doing.
- `EventCard` is a **presentational component** — it only renders UI and has no logic, state, or side effects. Keeping it this way means the shape of the component is established before any data-fetching concerns are introduced.
- The data is hardcoded so the component can be dropped into any page and previewed immediately, before the API is connected.
- `card-title` makes the event name visually prominent. `text-base-content/60` applies 60% opacity to secondary text, creating a visual hierarchy between the event name, date, and venue without extra colour choices.
- The `Get Tickets` button is a placeholder CTA. It will become a link to the event detail page once the component accepts props.

---

### 5. Update `src/pages/attendee/EventsListPage.jsx` to render six `EventCard` components

Render six static cards in a responsive grid to establish the layout of the events list page before real data is introduced.

```jsx
// src/pages/attendee/EventsListPage.jsx

import EventCard from '../../components/EventCard'

function EventsListPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <EventCard />
        <EventCard />
        <EventCard />
        <EventCard />
        <EventCard />
        <EventCard />
      </div>
    </div>
  )
}

export default EventsListPage
```

Let's talk about what this code is doing.
- Repeating `<EventCard />` six times with static data lets us validate the grid layout and card design before any API work begins. The repetition is intentional — it will be replaced by a `.map()` over real data in the next step.
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` makes the grid responsive: one column on mobile, two on small screens, three on large screens.
- `max-w-4xl mx-auto` centres the content and caps the width so the grid does not stretch too wide on large monitors.

---

### 6. Create `src/api/events.js`

A single function wraps the events endpoint. It throws on a non-OK response so React Query can catch it and populate `isError`.

```js
// src/api/events.js

import apiClient from './client'

export async function fetchEvents() {
  const res = await apiClient('/events/')
  if (!res.ok) throw new Error('Failed to fetch events.')
  return res.json()
}
```

Let's talk about what this code is doing.
- `apiClient` already attaches the `Authorization` header when a token is present, but `GET /api/v1/events/` is a public endpoint so no token is required. The function works the same way whether the user is logged in or not.
- Throwing on `!res.ok` converts a failed HTTP response into a JavaScript error. React Query catches this throw and sets `isError: true` on the query — without it, a 500 response would resolve silently and `data` would be `undefined`.

---

### 7. Create `src/hooks/useEvents.js`

`useEvents` wraps `useQuery` and gives any component a single import to get the events list with loading and error state included.

```js
// src/hooks/useEvents.js

import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../api/events'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  })
}
```

Let's talk about what this code is doing.
- `queryKey: ['events']` is the cache key. React Query uses it to deduplicate requests — if two components call `useEvents()` at the same time, only one network request is made and both receive the same data.
- Encapsulating `useQuery` inside a custom hook means components never import `useQuery` or `fetchEvents` directly. If the query key or fetch function changes, only this file needs updating.

---

### 8. Update `src/components/EventCard.jsx` to accept an `event` prop

Replace the hardcoded values with fields from the `event` object. The date is formatted using the browser's built-in `Intl` API via `toLocaleDateString` and `toLocaleTimeString`.

```jsx
// src/components/EventCard.jsx

function EventCard({ event }) {
  const date = new Date(event.date_time)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title">{event.name}</h2>
        <p className="text-sm text-base-content/60">{formattedDate} · {formattedTime}</p>
        <p className="text-sm">{event.venue.name}</p>
        <p className="text-sm text-base-content/60">{event.venue.address}</p>
        <div className="card-actions justify-end mt-2">
          <button className="btn btn-primary btn-sm">Get Tickets</button>
        </div>
      </div>
    </div>
  )
}

export default EventCard
```

Let's talk about what this code is doing.
- `new Date(event.date_time)` parses the ISO 8601 UTC string returned by the API into a JavaScript `Date` object. The browser then converts it to the user's local timezone automatically when formatting.
- `toLocaleDateString` and `toLocaleTimeString` use the browser's locale to format the date and time. Passing `'en-US'` with explicit options produces a consistent output (e.g. `July 15, 2026 · 7:00 PM`) regardless of the user's system locale.
- `event.venue.name` and `event.venue.address` are available because `EventListReadOnlySerializer` nests the full venue object — if the serializer only returned the venue ID, this would be `undefined`.

---

### 9. Update `src/pages/attendee/EventsListPage.jsx` to fetch and display real events

Replace the six static cards with a `.map()` over the data returned by `useEvents`. Add loading and error states to handle the time between the request firing and the response arriving.

```jsx
// src/pages/attendee/EventsListPage.jsx

import EventCard from '../../components/EventCard'
import { useEvents } from '../../hooks/useEvents'

function EventsListPage() {
  const { data: events, isLoading, isError } = useEvents()

  if (isLoading) {
    return (
      <div className="flex justify-center mt-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load events. Please try again later.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Upcoming Events</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  )
}

export default EventsListPage
```

Let's talk about what this code is doing.
- `data: events` renames the `data` property from `useQuery` to `events` for clarity. React Query sets `data` to `undefined` while loading, so the `isLoading` guard above prevents the `.map()` from running on `undefined`.
- `isLoading` is `true` from the moment the component mounts until the first successful response arrives. The spinner gives the user visual feedback during this window.
- `isError` is `true` if `fetchEvents` threw (network failure, non-OK response). The error state renders an alert instead of an empty or broken grid.
- `key={event.id}` gives React a stable identity for each card. Without a `key`, React cannot efficiently reconcile the list when it re-renders — it would re-mount every card on each update instead of patching only what changed.

---

### 10. Update `src/components/EventCard.jsx` to link to the event detail page

Replace the static button with a React Router `Link` that navigates to `/events/:id` when clicked.

```jsx
// src/components/EventCard.jsx — changes only

import { Link } from 'react-router-dom'

// ...inside the return:
<div className="card-actions justify-end mt-2">
  <Link to={`/events/${event.id}`} className="btn btn-primary btn-sm">
    Get Tickets
  </Link>
</div>
```

Let's talk about what this code is doing.
- `Link` from React Router renders an `<a>` tag that intercepts the click and navigates without a full page reload. Using a plain `<a href>` would reload the entire app and lose React Query's cache.
- The template literal `` `/events/${event.id}` `` builds the path dynamically from the event's `id`. This matches the `/events/:id` route already registered in `App.jsx`.
- Styling `Link` with `btn btn-primary btn-sm` makes it look identical to the old button — the user sees no visual change, only navigation behaviour.

---

### 11. Update `src/pages/attendee/EventDetailPage.jsx` to read the route parameter

`useParams` reads the `:id` segment out of the URL and makes it available as a variable. The page is a placeholder for now — data fetching will be added in a later step.

```jsx
// src/pages/attendee/EventDetailPage.jsx

import { useParams } from 'react-router-dom'

function EventDetailPage() {
  const { id } = useParams()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Event Detail Page</h1>
      <p className="text-base-content/60 mt-2">Event ID: {id}</p>
    </div>
  )
}

export default EventDetailPage
```

Let's talk about what this code is doing.
- `useParams()` returns an object whose keys match the named segments in the route pattern. Because the route is `/events/:id`, the object has an `id` key containing whatever value appears in the URL (e.g. `/events/3` gives `{ id: "3" }`).
- Rendering `{id}` on the page confirms the link in `EventCard` is working correctly before any API call is added.
- The route `/events/:id` is already registered in `App.jsx` — no routing changes are needed.

---

### 12. Protect the events list and event detail routes in `src/App.jsx`

`ProtectedRoute` already exists at `src/components/auth/ProtectedRoute.jsx`. Wrap the `/` and `/events/:id` routes with it the same way `SelectTicketsPage` and `CheckoutPage` are already wrapped.

```jsx
// src/App.jsx — changes only

<Route path="/" element={<ProtectedRoute><EventsListPage /></ProtectedRoute>} />
<Route path="/events/:id" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
```

Let's talk about what this code is doing.
- `ProtectedRoute` reads `user` from `AuthContext`. If `user` is `null` — meaning no one is logged in — it renders `<Navigate to="/login" replace />` before the page component ever mounts. The protected page receives no renders and makes no API calls.
- `replace` swaps the current history entry instead of pushing a new one. Without it, a user redirected from `/` to `/login` could press Back and end up on the protected page again without logging in.
- Wrapping at the route level rather than inside each page keeps the protection in one place. Adding or removing authentication from a page is a one-line change in `App.jsx`.
- `/login` and `/register` are intentionally left unwrapped — they must remain accessible to unauthenticated users.

---

### 13. Restrict the events endpoint to authenticated users in `event_tickets/views.py`

Replace `AllowAny` with `IsAuthenticated` on `EventViewSet`. DRF will now require a valid `Authorization: Bearer` header on every request to `/api/v1/events/`.

```python
# event_tickets/views.py — changes only

from rest_framework.permissions import IsAuthenticated

class EventViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    # ... rest unchanged
```

Let's talk about what this code is doing.
- `IsAuthenticated` tells DRF to run `JWTAuthentication` on every incoming request. If the `Authorization: Bearer <token>` header is missing, invalid, or expired, DRF returns `401 Unauthorized` before the view logic runs.
- The frontend's `apiClient` already attaches the access token to every request and silently refreshes it on a `401` response. A logged-in user will never notice this change.
- Locking the backend independently from the frontend is important. The frontend `ProtectedRoute` only guards the UI — a user with a tool like `curl` or Postman could still reach the API without it. `IsAuthenticated` on the viewset ensures the data itself is protected regardless of how the request is made.

---

### 14. Create `src/components/EventDetailsHeader.jsx`

`EventDetailsHeader` displays the top section of the event detail page — name, date/time, and venue. The data is hardcoded for now and will be replaced with props in a later step.

```jsx
// src/components/EventDetailsHeader.jsx

function EventDetailsHeader() {
  return (
    <div className="bg-base-100 shadow rounded-box p-6 mb-6">
      <h1 className="text-3xl font-bold mb-2">Summer Jazz Festival</h1>
      <p className="text-base-content/60 mb-4">July 15, 2026 · 7:00 PM</p>
      <div>
        <p className="font-semibold">Madison Square Garden</p>
        <p className="text-sm text-base-content/60">4 Pennsylvania Plaza, New York, NY 10001</p>
      </div>
    </div>
  )
}

export default EventDetailsHeader
```

Let's talk about what this code is doing.
- `rounded-box` is a DaisyUI utility that applies the theme's standard border radius, keeping the card corners consistent with the rest of the UI.
- The venue name uses `font-semibold` to visually separate it from the address below without needing an extra heading element.
- The data is hardcoded so the layout and visual hierarchy can be reviewed immediately, before any API work is introduced.

---

### 15. Update `src/pages/attendee/EventDetailPage.jsx` to render `EventDetailsHeader`

Place `EventDetailsHeader` at the top of the page. The `id` from `useParams` is kept in the component since it will be needed to fetch the real event data in the next step.

```jsx
// src/pages/attendee/EventDetailPage.jsx

import { useParams } from 'react-router-dom'
import EventDetailsHeader from '../../components/EventDetailsHeader'

function EventDetailPage() {
  const { id } = useParams()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EventDetailsHeader />
    </div>
  )
}

export default EventDetailPage
```

Let's talk about what this code is doing.
- `useParams` is kept even though `id` is not used yet. The ID will be passed to a data-fetching hook in the next step, so leaving it here avoids re-introducing the import later.
- `max-w-2xl mx-auto` gives the detail page a narrower, centred layout compared to the events list grid, which is appropriate for a single-item detail view.

---

### 16. Create `src/components/TicketTierSelector.jsx`

`TicketTierSelector` displays a single ticket tier with a quantity selector. It owns its own `quantity` state so each tier is controlled independently.

```jsx
// src/components/TicketTierSelector.jsx

import { useState } from 'react'

function TicketTierSelector({ tier }) {
  const [quantity, setQuantity] = useState(0)

  function decrement() {
    setQuantity((q) => Math.max(0, q - 1))
  }

  function increment() {
    setQuantity((q) => q + 1)
  }

  return (
    <div className="flex items-center justify-between p-4 bg-base-100 rounded-box shadow">
      <div>
        <p className="font-semibold">{tier.name}</p>
        <p className="text-sm text-base-content/60">${tier.price}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-sm btn-outline" onClick={decrement}>−</button>
        <span className="w-6 text-center font-medium">{quantity}</span>
        <button className="btn btn-sm btn-outline" onClick={increment}>+</button>
      </div>
    </div>
  )
}

export default TicketTierSelector
```

Let's talk about what this code is doing.
- `quantity` state lives inside `TicketTierSelector` so each tier tracks its own count independently. When the user increments Floor tickets it does not affect Lower Bowl or Upper Bowl.
- `Math.max(0, q - 1)` prevents the quantity from going below zero — a user cannot select a negative number of tickets.
- The functional updater form `(q) => ...` reads the latest state value rather than a stale closure, which is the correct pattern when the new state depends on the previous value.
- `w-6 text-center` on the quantity display reserves a fixed width so the +/− buttons do not shift horizontally as the number changes between single and double digits.

---

### 17. Create `src/components/TicketTierList.jsx`

`TicketTierList` takes an array of tier objects and renders a `TicketTierSelector` for each one. Keeping this as a separate component means any page that needs to display a list of tiers can reuse it without duplicating the `.map()`.

```jsx
// src/components/TicketTierList.jsx

import TicketTierSelector from './TicketTierSelector'

function TicketTierList({ tiers }) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-3">Ticket Tiers</h2>
      <div className="flex flex-col gap-3">
        {tiers.map((tier) => (
          <TicketTierSelector key={tier.id} tier={tier} />
        ))}
      </div>
    </div>
  )
}

export default TicketTierList
```

Let's talk about what this code is doing.
- `TicketTierList` is a pure structural component — it has no state or logic of its own. Its only job is to render the section heading and iterate over `tiers`, delegating each row to `TicketTierSelector`.
- The `h2` heading visually separates the ticket tiers section from `EventDetailsHeader` above it and makes the page scannable at a glance.
- `mb-3` on the heading keeps the spacing between the title and the first selector consistent with the `gap-3` between selectors.
- `key={tier.id}` uses the database ID rather than the array index. If tiers are ever reordered or filtered, React can still match each component to the correct state.

---

### 18. Update `src/pages/attendee/EventDetailPage.jsx` to render `TicketTierList`

Pass a hardcoded `STATIC_TIERS` array to `TicketTierList` below the header. The constant mirrors the shape the API will return, so swapping it for real data later requires only replacing the constant with a prop.

```jsx
// src/pages/attendee/EventDetailPage.jsx

import { useParams } from 'react-router-dom'
import EventDetailsHeader from '../../components/EventDetailsHeader'
import TicketTierList from '../../components/TicketTierList'

const STATIC_TIERS = [
  { id: 1, name: 'Floor', price: '150.00' },
  { id: 2, name: 'Lower Bowl', price: '85.00' },
  { id: 3, name: 'Upper Bowl', price: '45.00' },
]

function EventDetailPage() {
  const { id } = useParams()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EventDetailsHeader />
      <TicketTierList tiers={STATIC_TIERS} />
    </div>
  )
}

export default EventDetailPage
```

Let's talk about what this code is doing.
- `STATIC_TIERS` is defined as a module-level constant rather than inside the component. Defining it inside the component would recreate the array on every render, which is unnecessary for data that never changes.
- The tier objects use string prices (`"150.00"`) to match the format returned by DRF's `DecimalField`, so no conversion will be needed when real data replaces the constant.

---

### 19. Add `fetchEvent` to `src/api/events.js`

Add a second function alongside `fetchEvents` that fetches a single event by ID from the detail endpoint.

```js
// src/api/events.js — addition only

export async function fetchEvent(id) {
  const res = await apiClient(`/events/${id}/`)
  if (!res.ok) throw new Error('Failed to fetch event.')
  return res.json()
}
```

Let's talk about what this code is doing.
- `` `/events/${id}/` `` targets the detail route generated by `DefaultRouter` — the same router that produces `GET /api/v1/events/` for the list also produces `GET /api/v1/events/<pk>/` for the detail.
- The trailing slash is required because Django's `APPEND_SLASH` setting is enabled by default — omitting it causes a redirect that `fetch` does not follow with a body.
- The function follows the same shape as `fetchEvents`: it throws on a non-OK response so React Query can set `isError`.

---

### 20. Create `src/hooks/useEvent.js`

`useEvent` wraps `useQuery` for a single event. The `id` is part of the query key so React Query maintains a separate cache entry for each event.

```js
// src/hooks/useEvent.js

import { useQuery } from '@tanstack/react-query'
import { fetchEvent } from '../api/events'

export function useEvent(id) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => fetchEvent(id),
  })
}
```

Let's talk about what this code is doing.
- `queryKey: ['events', id]` scopes the cache entry to a specific event. `['events', 1]` and `['events', 2]` are stored separately, so navigating between event detail pages never shows stale data from a different event.
- Using `['events', id]` also means the list cache (`['events']`) and the detail cache (`['events', id]`) share the same top-level key. React Query can use this relationship for cache invalidation — invalidating `['events']` will also invalidate all detail entries.
- The `queryFn` is wrapped in an arrow function `() => fetchEvent(id)` so the `id` argument is passed correctly at call time rather than being evaluated when the hook first runs.

---

### 21. Update `src/components/EventDetailsHeader.jsx` to accept an `event` prop

Replace the hardcoded values with fields from the `event` object. The date formatting follows the same pattern used in `EventCard`.

```jsx
// src/components/EventDetailsHeader.jsx

function EventDetailsHeader({ event }) {
  const date = new Date(event.date_time)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="bg-base-100 shadow rounded-box p-6 mb-6">
      <h1 className="text-3xl font-bold mb-2">{event.name}</h1>
      <p className="text-base-content/60 mb-4">{formattedDate} · {formattedTime}</p>
      <div>
        <p className="font-semibold">{event.venue.name}</p>
        <p className="text-sm text-base-content/60">{event.venue.address}</p>
      </div>
    </div>
  )
}

export default EventDetailsHeader
```

Let's talk about what this code is doing.
- `event.venue.name` and `event.venue.address` are available because `EventListReadOnlySerializer` nests the full venue object on both the list and detail endpoints — the same serializer is used for both actions.
- The date formatting is intentionally identical to `EventCard` so the user sees the same date style when they navigate from the list to the detail page.

---

### 22. Update `src/pages/attendee/EventDetailPage.jsx` to fetch and display real event data

Wire `useEvent` into the page, pass the fetched data to `EventDetailsHeader` and `TicketTierList`, and guard against loading and error states.

```jsx
// src/pages/attendee/EventDetailPage.jsx

import { useParams } from 'react-router-dom'
import EventDetailsHeader from '../../components/EventDetailsHeader'
import TicketTierList from '../../components/TicketTierList'
import { useEvent } from '../../hooks/useEvent'

function EventDetailPage() {
  const { id } = useParams()
  const { data: event, isLoading, isError } = useEvent(id)

  if (isLoading) {
    return (
      <div className="flex justify-center mt-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>Failed to load event. Please try again later.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EventDetailsHeader event={event} />
      <TicketTierList tiers={event.ticket_tiers} />
    </div>
  )
}

export default EventDetailPage
```

Let's talk about what this code is doing.
- `useEvent(id)` receives the string from `useParams` directly. The hook passes it to `fetchEvent` which interpolates it into the URL — no conversion to a number is needed.
- The `STATIC_TIERS` constant and its import are removed entirely. `event.ticket_tiers` is the real array returned by the API, which has the same shape the static data was modelling.
- The loading and error guards follow the same pattern as `EventsListPage`, keeping the user experience consistent across pages.

---

### 23. Create `src/contexts/CartContext.jsx` and `src/hooks/useCart.js`

`CartContext` manages the user's in-progress ticket selections as a single object. `CartProvider` lives in the contexts folder; `useCart` lives in the hooks folder — the same separation used by `AuthContext` and `useAuth`.

```jsx
// src/contexts/CartContext.jsx

import { createContext, useState } from 'react'

export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, updateCartItems] = useState({})

  function updateCart({ eventId, eventName, tierId, tierName, tierPrice, quantity }) {
    const key = `${eventId}-${tierId}`
    updateCartItems((prev) => {
      if (quantity === 0) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: { eventId, eventName, tierId, tierName, tierPrice, quantity } }
    })
  }

  const value = {
    items,
    updateCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
```

```js
// src/hooks/useCart.js

import { useContext } from 'react'
import { CartContext } from '../contexts/CartContext'

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used inside a CartProvider')
  }
  return context
}
```

Let's talk about what this code is doing.
- `items` is a plain object rather than an array. Each entry is keyed by `` `${eventId}-${tierId}` `` which guarantees uniqueness across events and tiers — two different events can both have a "Floor" tier, and they will be stored as separate keys without collision.
- `updateCart` uses the functional updater form `(prev) => ...` to read the latest state rather than a stale closure. This is important because multiple rapid updates (e.g. clicking `+` quickly) all need to build on the previous result.
- When `quantity === 0`, the item is removed using destructuring: `const { [key]: _, ...rest } = prev` extracts the key to discard and returns everything else. This keeps the cart clean — zero-quantity entries never linger in state.
- `updateCart` accepts a single object rather than multiple positional arguments. A single object is easier to read at the call site and makes it straightforward to add more fields later without changing every caller.
- Each cart entry now stores `eventName`, `tierName`, and `tierPrice` alongside the IDs. This means a cart summary or checkout page can display human-readable information without making additional API calls.
- `useCart` is in the hooks folder alongside `useAuth` and `useEvents`, keeping all hook imports consistent — components always import hooks from `../hooks/`, never from `../contexts/`.

### 24. Wrap the application in `CartProvider` in `src/App.jsx`

Add `CartProvider` inside `AuthProvider` and outside `BrowserRouter` so the cart state is available to every route in the application.

```jsx
// src/App.jsx — changes only

import { CartProvider } from './contexts/CartContext'

// In the JSX tree:
<AuthProvider>
  <CartProvider>
    <BrowserRouter>
      {/* ... routes unchanged ... */}
    </BrowserRouter>
  </CartProvider>
</AuthProvider>
```

Let's talk about what this code is doing.
- `CartProvider` is placed inside `AuthProvider` because the cart is a user-specific concern — in a future step it may read from `AuthContext` to associate items with the logged-in user.
- `CartProvider` is placed outside `BrowserRouter` so the cart state persists across route changes. If it were placed inside a specific route's component tree, navigating away would unmount the provider and reset the cart.
- Any component in the tree can now call `useCart()` to read `items` or call `updateCart` to update them, without prop drilling.

---

### 25. Update `src/components/TicketTierSelector.jsx` to write to the cart

Import `useCart` and call `updateCart` with the full item object whenever the quantity changes.

```jsx
// src/components/TicketTierSelector.jsx

import { useState } from 'react'
import { useCart } from '../hooks/useCart'

function TicketTierSelector({ tier, eventId, eventName }) {
  const [quantity, setQuantity] = useState(0)
  const { updateCart } = useCart()

  function decrement() {
    const newQty = Math.max(0, quantity - 1)
    setQuantity(newQty)
    updateCart({ eventId, eventName, tierId: tier.id, tierName: tier.name, tierPrice: tier.price, quantity: newQty })
  }

  function increment() {
    const newQty = quantity + 1
    setQuantity(newQty)
    updateCart({ eventId, eventName, tierId: tier.id, tierName: tier.name, tierPrice: tier.price, quantity: newQty })
  }

  return (
    <div className="flex items-center justify-between p-4 bg-base-100 rounded-box shadow">
      <div>
        <p className="font-semibold">{tier.name}</p>
        <p className="text-sm text-base-content/60">${tier.price}</p>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-sm btn-outline" onClick={decrement}>−</button>
        <span className="w-6 text-center font-medium">{quantity}</span>
        <button className="btn btn-sm btn-outline" onClick={increment}>+</button>
      </div>
    </div>
  )
}

export default TicketTierSelector
```

Let's talk about what this code is doing.
- `newQty` is computed before calling either `setQuantity` or `updateCart`. Both calls need the same value — computing it once avoids any inconsistency between the local display state and the cart state.
- `updateCart` is called on every press, including decrement. When `newQty` reaches 0, `CartContext` removes the entry from `items` — the cart stays clean with no zero-quantity entries.
- `eventId` and `eventName` come from props rather than being fetched here. `TicketTierSelector` is a leaf component; it should receive data, not fetch it.

---

### 26. Update `src/components/TicketTierList.jsx` and `src/pages/attendee/EventDetailPage.jsx` to pass event information down

`TicketTierList` needs `eventId` and `eventName` to forward to each `TicketTierSelector`. `EventDetailPage` already has the full `event` object from `useEvent`, so it passes those two fields directly.

```jsx
// src/components/TicketTierList.jsx — changes only

function TicketTierList({ tiers, eventId, eventName }) {
  // ...
  {tiers.map((tier) => (
    <TicketTierSelector key={tier.id} tier={tier} eventId={eventId} eventName={eventName} />
  ))}
```

```jsx
// src/pages/attendee/EventDetailPage.jsx — changes only

<TicketTierList tiers={event.ticket_tiers} eventId={event.id} eventName={event.name} />
```

Let's talk about what this code is doing.
- `TicketTierList` acts as a pass-through for `eventId` and `eventName`. It does not use these values itself — it simply forwards them to each `TicketTierSelector` so they can be included in the cart entry.
- `event.id` and `event.name` are already available on the `event` object returned by `useEvent` — no additional fetching or state is needed.

---

### 27. Add a conditional "Go to Checkout" button to `src/pages/attendee/EventDetailPage.jsx`

Read `items` from `useCart` and derive a boolean `hasItems`. Render a `Link` to `/checkout` only when `hasItems` is true.

```jsx
// src/pages/attendee/EventDetailPage.jsx

import { useParams, Link } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
// ... other imports unchanged

function EventDetailPage() {
  const { id } = useParams()
  const { data: event, isLoading, isError } = useEvent(id)
  const { items } = useCart()

  const hasItems = Object.keys(items).length > 0

  // ... loading/error guards unchanged

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <EventDetailsHeader event={event} />
      <TicketTierList tiers={event.ticket_tiers} eventId={event.id} eventName={event.name} />
      {hasItems && (
        <div className="mt-6">
          <Link to="/checkout" className="btn btn-primary w-full">
            Go to Checkout
          </Link>
        </div>
      )}
    </div>
  )
}
```

Let's talk about what this code is doing.
- `Object.keys(items).length > 0` checks whether the cart object has any entries. This re-evaluates on every render, so the button appears immediately after the first ticket is added without any extra state or effect.
- The button is a `Link` styled as `btn btn-primary w-full` — it looks like a full-width primary button but navigates without a page reload, and keeps the route in the browser's history stack.
- `mt-6` adds spacing between the tier list and the button so they do not visually run together.
- The `/checkout` route is already registered and protected in `App.jsx` — no routing changes are needed.

---

### 28. Update `src/pages/attendee/CheckoutPage.jsx` to display a cart summary

Read `items` from `useCart`, convert the object to an array with `Object.values`, and render a simple text summary of each item with a grand total at the bottom.

> **Note:** This is an intentionally simple text summary. The checkout page will be updated in a later example with a more complete UI, order submission, and error handling. For now the goal is to confirm that cart state flows correctly from `CartContext` all the way to this page.

```jsx
// src/pages/attendee/CheckoutPage.jsx

import { useCart } from '../../hooks/useCart'

function CheckoutPage() {
  const { items } = useCart()
  const cartItems = Object.values(items)
  const grandTotal = cartItems.reduce(
    (sum, item) => sum + item.quantity * parseFloat(item.tierPrice),
    0
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      {cartItems.length === 0 ? (
        <p className="text-base-content/60">Your cart is empty.</p>
      ) : (
        <div>
          {cartItems.map((item) => (
            <div
              key={`${item.eventId}-${item.tierId}`}
              className="flex justify-between py-3 border-b border-base-300"
            >
              <div>
                <p className="font-semibold">{item.eventName}</p>
                <p className="text-sm text-base-content/60">
                  {item.tierName} × {item.quantity}
                </p>
              </div>
              <p className="font-medium">
                ${(item.quantity * parseFloat(item.tierPrice)).toFixed(2)}
              </p>
            </div>
          ))}
          <div className="flex justify-between pt-4 font-bold text-lg">
            <span>Total</span>
            <span>${grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CheckoutPage
```

Let's talk about what this code is doing.
- `Object.values(items)` converts the cart object into an array so it can be mapped over. The keys (`` `${eventId}-${tierId}` ``) are only needed for lookups — the values hold all the display data.
- `parseFloat(item.tierPrice)` converts the DRF decimal string (e.g. `"150.00"`) to a number for arithmetic. `.toFixed(2)` formats the result back to a two-decimal-place string for display.
- `reduce` accumulates the grand total in a single pass over the array. Starting the accumulator at `0` means an empty cart correctly produces `$0.00` without a separate guard.
- `key={`${item.eventId}-${item.tierId}`}` reuses the same composite key used inside `CartContext`, so React's reconciliation is consistent with how the cart itself identifies items.
- The empty-cart message (`"Your cart is empty."`) handles the edge case of a user navigating directly to `/checkout` without selecting any tickets.

---

## Conclusion

In this example we built a complete full-stack ticketing feature — from a secured Django REST Framework API to a React frontend with global authentication state, server data fetching, and client-side cart management.

The work covered two distinct layers that had to be developed and connected deliberately:

**Backend**
- A read-only `EventListReadOnlySerializer` that nests venue, organizer, and ticket tier data so the frontend never needs extra requests to display a complete event.
- An `EventViewSet` using `select_related` and `prefetch_related` to avoid N+1 queries, with `IsAuthenticated` to ensure the data is protected at the API level regardless of what the frontend does.
- Sample data loaded through a management command (for users) and fixtures (for domain data), demonstrating two complementary Django data-seeding approaches.

**Frontend**
- `AuthContext` as the single source of truth for login state, with a token refresh strategy baked into `apiClient` so every other part of the app can make authenticated requests without knowing anything about JWT expiry.
- `ProtectedRoute` enforcing authentication at the route level — a pattern that scales to any number of protected pages with a one-line change in `App.jsx`.
- React Query (`useEvents`, `useEvent`) managing server state with automatic caching, deduplication, and loading/error states, keeping page components clean and free of `useEffect` boilerplate.
- `CartContext` managing client-side cart state as a plain object keyed by `eventId-tierId`, with `CartProvider` placed outside `BrowserRouter` so selections persist across navigation.

**Key takeaways to apply to your own projects**

- **Lock both layers independently.** A frontend route guard protects the UI; a backend permission class protects the data. You need both — one without the other leaves a gap.
- **Separate server state from client state.** React Query owns data that lives on the server (events, event details). Context owns data that lives in the browser session (auth, cart). Mixing them leads to stale data and unnecessary re-fetches.
- **Build static first, then connect.** Every component in this example started with hardcoded data. This let the layout and component hierarchy be validated before any API work began, keeping each step focused and reversible.
- **Keep components focused.** `TicketTierSelector` selects a quantity. `TicketTierList` arranges selectors. `EventDetailPage` fetches data and composes the page. Each has one job, which makes them straightforward to test and extend.

The checkout page and order submission will be completed in a later example, where the cart summary will be fleshed out with a real order API call. Everything built here — the cart context, the API client, the auth flow — carries forward unchanged.
