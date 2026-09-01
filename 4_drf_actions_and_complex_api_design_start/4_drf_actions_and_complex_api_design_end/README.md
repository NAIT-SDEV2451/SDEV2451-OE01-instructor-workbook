# DRF Aggregations, Live Search, and Data Visualization with Recharts

This example extends the connected fleet application from the previous example. We already have a working full-stack app where the React frontend fetches real data from the Django REST Framework backend. Here we go further: the stats endpoint returns richer aggregated data, the vehicle and driver lists gain live search, and a new chart visualises average trip distances per week using Recharts.

## Prerequisites

### Backend
- Create a virtual environment inside `vehiclefleet_backend/` and install packages from `requirements.txt`.
- Run `python manage.py migrate` to apply migrations.
- Run `python manage.py loaddata vehicles drivers trips` to load the base sample data.
- Run `python manage.py runserver`.

### Frontend
- Run `npm install` inside `vehiclefleet_frontend/`.
- Run `npm run dev`.

---

## Steps

We have already built a full-stack Fleet Management app where the React frontend fetches live data from the Django REST Framework API. In this example we add backend aggregations using Django's ORM, live search filtering wired through React Query, and a Recharts bar chart to visualise the weekly distance data.

---

### 1. Enhance the stats endpoint in `vehiclefleet_backend/fleet/views.py`

The existing stats endpoint only returns counts. We want it to also return the overall average trip distance and a breakdown of average distance per week for the last six months — data we will visualise in a chart.

```python
# fleet/views.py

from datetime import timedelta

from django.db.models import Avg, Count
from django.db.models.functions import TruncWeek
from django.utils import timezone
# ... other imports ...

class FleetStatsView(APIView):

    def get(self, request):
        avg = Trip.objects.aggregate(avg_distance=Avg("distance"))["avg_distance"]

        six_months_ago = timezone.now() - timedelta(weeks=26)
        weekly_avg_distance = list(
            Trip.objects
            .filter(start_time__gte=six_months_ago, distance__isnull=False)
            .annotate(week=TruncWeek("start_time"))
            .values("week")
            .annotate(avg_distance=Avg("distance"))
            .order_by("week")
            .values_list("week", "avg_distance")
        )

        return Response({
            "total_vehicles": Vehicle.objects.count(),
            "total_drivers": Driver.objects.count(),
            "total_trips": Trip.objects.count(),
            "avg_trip_distance": round(avg, 2) if avg is not None else None,
            "avg_distance_per_week": [
                {
                    "week": week.strftime("%Y-%m-%d"),
                    "avg_distance": round(float(avg_dist), 2),
                }
                for week, avg_dist in weekly_avg_distance
            ],
        })
```

Let's talk about what this code is doing.
- `Avg("distance")` computes a single database-level average across all completed trips. Trips where `distance` is `null` (in-progress) are excluded from the average automatically by the database.
- `timezone.now() - timedelta(weeks=26)` defines a rolling six-month window. Using `timezone.now()` rather than `datetime.now()` respects Django's `USE_TZ = True` setting, which keeps all datetimes timezone-aware.
- `TruncWeek("start_time")` truncates each trip's timestamp to the Monday of its week, producing a consistent `GROUP BY` key.
- `.values("week").annotate(avg_distance=Avg(...))` is Django's group-by pattern: `values()` sets the grouping column and the second `annotate()` applies the aggregate within each group.
- `distance__isnull=False` in the filter ensures in-progress trips are excluded from the weekly breakdown as well.
- `week.strftime("%Y-%m-%d")` serialises each Monday as an ISO date string so JSON can represent it cleanly.

---

### 2. Load variety fixture data into `fleet/fixtures/trips_variety.json`

The base fixture only has five trips. We need a richer dataset spread over six months with a variety of distances to make the stats endpoint — especially the weekly chart — meaningful.

The project includes a `trips_variety.json` fixture with 12 additional trips (PKs 6–17) spanning January to June 2026, with distances ranging from 6 km to 194 km. Load it after the base fixtures:

```bash
python manage.py loaddata trips_variety
```

Expected output:
```
Installed 12 object(s) from 1 fixture(s).
```

Let's talk about what this code is doing.
- `loaddata` reads fixture files from any `fixtures/` directory inside a registered app. You can pass multiple names in one command or run them separately.
- The new fixture uses PKs 6–17, which do not conflict with the base fixtures (PKs 1–5).
- One trip in the new fixture (`pk: 17`) has `"distance": null` to simulate an in-progress trip — it is excluded from all distance averages automatically.
- Run `loaddata trips_variety` only once on a given database. Running it a second time will fail with a primary key conflict. Use `python manage.py flush` if you need to start fresh.

---

### 3. Add search support to the API functions in `src/api/fleet.js`

The backend's `VehicleViewSet` and `DriverViewSet` already have `SearchFilter` configured. We just need the frontend to pass the `?search=` query parameter when the user types something.

```js
// src/api/fleet.js

export async function fetchVehicles(search = '') {
  const url = search
    ? `${BASE_URL}/vehicles/?search=${encodeURIComponent(search)}`
    : `${BASE_URL}/vehicles/`
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch vehicles')
  return response.json()
}

export async function fetchDrivers(search = '') {
  // same pattern — drivers search on name, license_number, email
}

export async function fetchStats() {
  const response = await fetch(`${BASE_URL}/stats/`)
  if (!response.ok) throw new Error('Failed to fetch stats')
  return response.json()
}
```

Let's talk about what this code is doing.
- `search = ''` gives the parameter a default so existing call sites that omit it continue to work.
- The ternary builds the URL conditionally — when `search` is an empty string (falsy), we fetch without a query string to avoid sending `?search=` to the server.
- `encodeURIComponent(search)` percent-encodes special characters. A search term like `"Ford Transit"` would otherwise produce a broken URL; encoded it becomes `Ford%20Transit`.
- `fetchStats` is a new plain fetch function for the stats endpoint — the same pattern as the others.

---

### 4. Update `useVehicles` and `useDrivers` to accept search and expose an invalidate function

The hooks need to accept a search term, pass it to the API function, and tell React Query to cache each unique search result separately.

```js
// src/hooks/useVehicles.js

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchVehicles } from '../api/fleet'

export function useVehicles(search = '') {
  const queryClient = useQueryClient()

  const { data: vehicles = [], isLoading, isError, error } = useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => fetchVehicles(search),
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['vehicles', search] })
  }

  return { vehicles, isLoading, isError, error, invalidate }
}
```

`useDrivers` follows the exact same pattern — swap `vehicles` for `drivers` and `fetchVehicles` for `fetchDrivers`.

Let's talk about what this code is doing.
- `queryKey: ['vehicles', search]` includes the search term so React Query caches `['vehicles', 'ford']` and `['vehicles', 'toyota']` as separate entries. Switching between two terms that were already fetched returns the cached result instantly.
- `queryFn: () => fetchVehicles(search)` uses an arrow function so the current value of `search` is captured in the closure at call time, rather than being evaluated when the hook mounts.
- `useQueryClient()` gives access to the shared cache. `invalidateQueries` marks the current search entry as stale, which triggers a background re-fetch the next time the data is needed.
- The hook returns `invalidate` so the page component can call it directly — the hook itself does not decide when to invalidate.

---

### 5. Add search inputs and `useEffect` to `src/pages/VehiclesAndDriversPage.jsx`

The search term state lives in the page. A `useEffect` watches each term and calls `invalidate` when it changes, triggering a fresh fetch with the new value.

```jsx
// src/pages/VehiclesAndDriversPage.jsx

import { useState, useEffect } from 'react'
// ... other imports ...

function VehiclesAndDriversPage() {
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [driverSearch, setDriverSearch] = useState('')

  const { vehicles, isLoading: loadingVehicles, invalidate: invalidateVehicles } = useVehicles(vehicleSearch)
  const { drivers, isLoading: loadingDrivers, invalidate: invalidateDrivers } = useDrivers(driverSearch)

  useEffect(() => {
    invalidateVehicles()
  }, [vehicleSearch])

  useEffect(() => {
    invalidateDrivers()
  }, [driverSearch])

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        <input
          type="text"
          placeholder="Search by make, model, or plate..."
          value={vehicleSearch}
          onChange={(e) => setVehicleSearch(e.target.value)}
          className="input input-bordered w-full max-w-sm mb-3"
        />
        {loadingVehicles
          ? <span className="loading loading-spinner loading-md" />
          : <VehicleList vehicles={vehicles} />
        }
      </section>
      {/* same pattern for Drivers section */}
    </div>
  )
}
```

Let's talk about what this code is doing.
- Each section has its own independent `useState` — `vehicleSearch` and `driverSearch` — so typing in one input does not affect the other.
- `useEffect(() => { invalidateVehicles() }, [vehicleSearch])` runs once after each render in which `vehicleSearch` changed. The empty-dependency case (initial render) also fires, which is harmless — invalidating a fresh query just causes an immediate background refetch.
- `value={vehicleSearch}` and `onChange={setVehicleSearch}` make the input controlled. React is the single source of truth for its value.
- The DRF `SearchFilter` performs a case-insensitive `icontains` across `make`, `model`, and `license_plate` — typing `"ford"` matches `"Ford Transit"` without needing exact casing.

---

### 6. Create `useStats` and the `StatCard` component

Before building the Trips page dashboard, we need the hook that fetches stats and a reusable card component to display individual values.

#### 6a. Create `src/hooks/useStats.js`

```js
// src/hooks/useStats.js

import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../api/fleet'

export function useStats() {
  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  })
  return { stats, isLoading, isError, error }
}
```

#### 6b. Create `src/components/StatCard.jsx`

```jsx
// src/components/StatCard.jsx

function StatCard({ label, value, color }) {
  return (
    <div className={`card shadow-md ${color}`}>
      <div className="card-body">
        <p className="text-sm font-medium opacity-80">{label}</p>
        <p className="text-4xl font-bold">
          {value ?? <span className="loading loading-spinner loading-sm" />}
        </p>
      </div>
    </div>
  )
}

export default StatCard
```

Let's talk about what this code is doing.
- `useStats` follows the same `useQuery` pattern as the other hooks. The `queryKey: ['stats']` is stable — there is no search parameter — so stats are fetched once and cached until invalidated.
- `StatCard` receives `color` as a prop (e.g. `"bg-primary text-primary-content"`) so it can be reused for cards of different DaisyUI theme colours without needing separate components.
- `value ?? <span className="loading..." />` — the `??` (nullish coalescing) operator renders the spinner only when `value` is `null` or `undefined`. A value of `0` would render correctly as the number `0`, not a spinner.

---

### 7. Add stat cards and the chart to `src/pages/TripsPage.jsx`

The Trips page now has a dashboard section at the top with four stat cards and a bar chart, all driven by the single `useStats` call.

```jsx
// src/pages/TripsPage.jsx

import StatCard from '../components/StatCard'
import AverageDistanceChart from '../components/AverageDistanceChart'
import { useStats } from '../hooks/useStats'
// ... other imports ...

const STAT_CARDS = [
  { key: 'total_vehicles',    label: 'Total Vehicles',        color: 'bg-primary text-primary-content' },
  { key: 'total_drivers',     label: 'Total Drivers',         color: 'bg-secondary text-secondary-content' },
  { key: 'total_trips',       label: 'Total Trips',           color: 'bg-accent text-accent-content' },
  { key: 'avg_trip_distance', label: 'Average Trip Distance', color: 'bg-neutral text-neutral-content' },
]

function TripsPage() {
  const { trips, isLoading } = useTrips()
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
      </div>
    </div>
  )
}
```

Let's talk about what this code is doing.
- `STAT_CARDS` is a configuration array defined outside the component. Each object holds the API key, the display label, and the DaisyUI colour string. Mapping over it keeps the JSX concise and makes adding a new card a one-line change.
- `stats?.[key]` uses optional chaining to safely access a property when `stats` is still `undefined` (loading). This passes `undefined` to `StatCard`, which renders the spinner via `??`.
- `stats?.avg_distance_per_week?.length > 0` guards the chart — it renders only once the data has arrived and contains at least one entry.
- `useStats` is called once in `TripsPage`. Both the stat cards and the chart read from the same cached query, so there is only one network request to `/api/v1/stats/`.

---

### 8. Create `src/components/AverageDistanceChart.jsx`

The chart component receives the weekly data array as a prop and renders a Recharts `BarChart` inside a DaisyUI card.

```jsx
// src/components/AverageDistanceChart.jsx

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function formatWeek(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-CA', { month: 'short', day: '2-digit' })
}

function AverageDistanceChart({ data }) {
  const chartData = data.map((entry) => ({
    week: formatWeek(entry.week),
    avg_distance: entry.avg_distance,
  }))

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title text-base">Average Trip Distance per Week</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis unit=" km" width={70} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value} km`, 'Avg Distance']} />
            <Bar dataKey="avg_distance" fill="#570df8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AverageDistanceChart
```

Let's talk about what this code is doing.
- `formatWeek` converts the ISO date string from the API (e.g. `"2026-01-05"`) into a short human-readable label (e.g. `"Jan 05"`) for the X-axis ticks.
- `ResponsiveContainer width="100%"` makes the chart fill its parent's full width at all screen sizes. `height={300}` sets a fixed pixel height.
- `XAxis dataKey="week"` and `YAxis unit=" km"` configure the axis labels. `width={70}` on the Y-axis prevents the `km` unit from being clipped.
- `Tooltip formatter` customises the tooltip popup so it reads `"45.20 km — Avg Distance"` rather than showing the raw key name.
- `radius={[4, 4, 0, 0]}` rounds only the top corners of each bar — a common styling convention.
- The component knows nothing about the API — it only knows about the `data` prop. If the shape of the backend response changes, only `TripsPage` (the consumer) needs updating.

---

## Challenge/Exercise

### 1. Add a total trips per week chart

The stats endpoint currently returns average distances but not trip counts per week.
- Add a `trips_per_week` key to `FleetStatsView` that counts trips grouped by `TruncWeek` over the same 6-month window.
- Create a new `TripsPerWeekChart` component using Recharts `LineChart` instead of `BarChart`.
- Add it to `TripsPage` below the `AverageDistanceChart`.

### 2. Debounce the search inputs

Currently every keystroke fires an API request. For a production app you would debounce the input so requests only fire after the user stops typing.
- Add `useState` for a `debouncedVehicleSearch` value that updates 300ms after `vehicleSearch` changes using `setTimeout` and `clearTimeout` inside a `useEffect`.
- Pass `debouncedVehicleSearch` to `useVehicles` instead of the raw `vehicleSearch` so the hook only fetches when the debounced value changes.
- Apply the same pattern to the drivers search.

---

## Conclusion

In this example we learned about:
- **`Avg` and `TruncWeek` aggregations** — Django's ORM can compute averages and group by truncated time periods (`TruncWeek`, `TruncMonth`) in a single SQL query
- **Rolling time windows** — `timezone.now() - timedelta(weeks=26)` creates a dynamic window; always use `timezone.now()` (not `datetime.now()`) when `USE_TZ = True`
- **Dynamic `queryKey` for per-search caching** — including the search term in `queryKey: ['vehicles', search]` gives each unique search its own cache entry; re-visiting a previous search returns the cached result instantly
- **`invalidate` + `useEffect` pattern** — exposing `invalidate` from a hook and calling it from a `useEffect` in the page is an explicit way to force a re-fetch when dependent state changes
- **`encodeURIComponent`** — always encode user-supplied strings before embedding them in a URL to handle spaces and special characters safely
- **Config arrays for repeated components** — defining card data as `STAT_CARDS = [{ key, label, color }]` outside the component body keeps the JSX concise and makes adding or reordering cards a one-line change
- **`value ?? fallback`** — nullish coalescing (`??`) renders a fallback only for `null`/`undefined`, not for falsy values like `0`; use it in display components to show loading state without hiding valid zero values
- **`ResponsiveContainer`** — Recharts charts need `ResponsiveContainer` to fill their parent's width; without it the chart has a fixed pixel width that breaks on smaller screens
- **Single fetch, multiple consumers** — calling `useStats` once in `TripsPage` means the stat cards and the chart share a single cached network request
- **Caution — `loaddata` cannot be run twice on the same database** without flushing first; the new `trips_variety` fixture uses explicit PKs that will conflict on a second run
- **Caution — in-progress trips are silently excluded from `Avg`** — Django's `Avg` ignores `null` values, so any trip without a recorded `distance` does not affect the averages; this is usually the desired behaviour but can be surprising if you expect all trips to contribute
