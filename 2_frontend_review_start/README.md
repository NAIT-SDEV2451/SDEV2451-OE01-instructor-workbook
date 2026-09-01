# React Review — Fleet Management Frontend


## Prerequisites
- Run `npm install` inside the `vehiclefleet_frontend/` folder to install all dependencies.
- Run `npm run dev` to start the Vite development server.
- `src/mockData.js` is provided — it contains sample vehicles, drivers, and trips shaped to match the real API response.

## Steps

We have already learned how to build a Django REST Framework API. This example reviews the core building blocks of React: components, props, state, hooks, and routing — all in a single focused app with mocked data.

We will build a three-page Fleet Management frontend using React Router for navigation, DaisyUI for styling, and a `mockData.js` file that mirrors the shape of the real API so it can be swapped for `fetch()` calls later.

---

### 1. Install dependencies and configure Tailwind + DaisyUI in `vite.config.js` and `src/index.css`

The project ships with only React and Vite — we need to add routing and styling before writing any components.

```bash
npm install react-router-dom tailwindcss @tailwindcss/vite daisyui
```

```js
// vite.config.js
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

```css
/* src/index.css — replace all existing content */
@import "tailwindcss";
@plugin "daisyui";
```

Let's talk about what this code is doing.
- `@tailwindcss/vite` is a Vite plugin that runs Tailwind's CSS processing at build time — no separate `tailwind.config.js` file is needed with Tailwind v4.
- `@import "tailwindcss"` injects all of Tailwind's utility classes into the stylesheet.
- `@plugin "daisyui"` activates DaisyUI's component layer on top of Tailwind, giving us classes like `btn`, `table`, `navbar`, `card`, and `badge` without any extra imports in our JSX.
- The old `src/index.css` contained Vite's default styles — replacing it entirely avoids conflicts with Tailwind's reset.

---

### 2. Create list components in `src/components/`

The three list components follow the same pattern: accept an array as a prop and render a DaisyUI table. `VehicleList` and `DriverList` are identical in structure — only the columns differ.

#### 2a. Create `src/components/VehicleList.jsx` and `src/components/DriverList.jsx`

```jsx
// src/components/VehicleList.jsx

function VehicleList({ vehicles }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Make</th><th>Model</th><th>Year</th><th>License Plate</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id}>
              <td>{vehicle.make}</td>
              <td>{vehicle.model}</td>
              <td>{vehicle.year}</td>
              <td>{vehicle.license_plate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default VehicleList
```

`DriverList` follows the exact same structure — swap `vehicles` for `drivers` and update the column headings to Name, License Number, Phone, Email.

Let's talk about what this code is doing.
- `{ vehicles }` in the function signature is **destructuring props** — equivalent to `function VehicleList(props)` and then `const vehicles = props.vehicles`.
- `table table-zebra` are DaisyUI classes. `table-zebra` adds alternating row colours automatically.
- `overflow-x-auto` on the wrapper allows the table to scroll horizontally on small screens instead of breaking the layout.
- `.map((vehicle) => <tr key={vehicle.id}>` — the `key` prop is required by React when rendering lists. It lets React identify which rows changed when data updates. Always use a stable unique value like a database ID, never the array index.

#### 2b. Create `src/components/TripList.jsx`

`TripList` introduces one extra concept: conditionally rendering a badge when a trip has no distance yet.

```jsx
// src/components/TripList.jsx

{trips.map((trip) => (
  <tr key={trip.id}>
    <td>{trip.vehicle_detail.make} {trip.vehicle_detail.model}</td>
    <td>{trip.driver_detail.name}</td>
    <td>{new Date(trip.start_time).toLocaleString()}</td>
    <td>
      {trip.distance ?? (
        <span className="badge badge-warning badge-sm">In progress</span>
      )}
    </td>
  </tr>
))}
```

Let's talk about what this code is doing.
- `trip.vehicle_detail.make` accesses the nested vehicle object that `TripSerializer` embeds in the API response — the shape matches exactly so no transformation is needed.
- `new Date(trip.start_time).toLocaleString()` converts the ISO 8601 string from the API into the user's local date and time format.
- `trip.distance ?? (...)` is the **nullish coalescing operator**. It renders the right-hand side only when `trip.distance` is `null` or `undefined`. `badge badge-warning badge-sm` is a DaisyUI badge styled in amber.

---

### 3. Create the controlled form in `src/components/TripForm.jsx`

`TripForm` demonstrates controlled inputs — every field value lives in React state and updates on every keystroke.

```jsx
// src/components/TripForm.jsx

import { useState } from 'react'

const EMPTY_FORM = {
  vehicle: '', driver: '', start_location: '', end_location: '', start_time: '',
}

function TripForm({ vehicles, drivers, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit(form)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="card bg-base-100 shadow-md w-full max-w-xl">
      <div className="card-body gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="form-control w-full">
            <div className="label pb-1">
              <span className="label-text font-medium">Vehicle</span>
            </div>
            <select name="vehicle" value={form.vehicle} onChange={handleChange}
              className="select select-bordered w-full" required>
              <option value="" disabled>Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} — {v.license_plate}
                </option>
              ))}
            </select>
          </label>
          {/* driver, start_location, end_location, start_time follow the same pattern */}
          <div className="card-actions justify-end pt-2">
            <button type="submit" className="btn btn-primary">Create Trip</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

Let's talk about what this code is doing.
- `useState(EMPTY_FORM)` initialises the form state as a single object. Storing all fields together (instead of separate `useState` calls) makes reset straightforward — just `setForm(EMPTY_FORM)`.
- `{ ...form, [e.target.name]: e.target.value }` is a spread update. `e.target.name` matches the `name` attribute on the input, so one `handleChange` handles every field. The square brackets make the key dynamic.
- `e.preventDefault()` stops the browser from submitting the form to a URL. Without it, the page reloads and all React state is lost.
- `onSubmit` is a **callback prop** — the parent page decides what happens with the data (in a real app: a `POST` request). The form component only manages its own state and calls the prop when done.
- `card`, `card-body`, and `card-actions` are DaisyUI layout classes that give the form a card container with proper padding and a right-aligned action row.

---

### 4. Create pages in `src/pages/`

Pages are thin components that import data and pass it to display components. They contain no layout logic of their own.

#### 4a. Create `src/pages/VehiclesAndDriversPage.jsx` and `src/pages/TripsPage.jsx`

```jsx
// src/pages/VehiclesAndDriversPage.jsx

import VehicleList from '../components/VehicleList'
import DriverList from '../components/DriverList'
import { VEHICLES, DRIVERS } from '../mockData'

function VehiclesAndDriversPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Vehicles</h2>
        <VehicleList vehicles={VEHICLES} />
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-3">Drivers</h2>
        <DriverList drivers={DRIVERS} />
      </section>
    </div>
  )
}
```

`TripsPage` follows the same pattern — import `TRIPS` and render `<TripList trips={TRIPS} />`.

Let's talk about what this code is doing.
- Mock data is imported directly rather than fetched asynchronously — this keeps the pages focused on the component and props concepts for this review. The `mockFetch` helper exists in `mockData.js` for when you want to practice the `useEffect` + `useState` async pattern.
- Passing `VEHICLES` as the `vehicles` prop to `<VehicleList>` is the fundamental props pattern: data flows downward from parent to child. The child renders whatever it receives and has no knowledge of where the data came from.

#### 4b. Create `src/pages/CreateTripPage.jsx`

```jsx
// src/pages/CreateTripPage.jsx

import { useNavigate } from 'react-router-dom'
import TripForm from '../components/TripForm'
import { VEHICLES, DRIVERS } from '../mockData'

function CreateTripPage() {
  const navigate = useNavigate()

  function handleSubmit(formData) {
    // In a real app: POST to /api/v1/trips/ then navigate
    console.log('New trip submitted:', formData)
    navigate('/trips')
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Create a New Trip</h2>
      <TripForm vehicles={VEHICLES} drivers={DRIVERS} onSubmit={handleSubmit} />
    </div>
  )
}
```

Let's talk about what this code is doing.
- `useNavigate()` is a React Router hook that returns a `navigate` function. Calling `navigate('/trips')` redirects the user programmatically — the same as clicking a link, but triggered from code after an action completes.
- `handleSubmit` receives `formData` from `TripForm` via the `onSubmit` callback prop. The `console.log` is a placeholder — replace it with a real `fetch('POST', ...)` call when the backend is connected.
- `CreateTripPage` passes `VEHICLES` and `DRIVERS` directly to `TripForm`. The form component is reusable and does not know or care where the data comes from.

---

### 5. Set up routing in `src/App.jsx`

`App.jsx` wraps everything in a `BrowserRouter`, defines the three routes, and renders the navbar.

```jsx
// src/App.jsx

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-base-200">
        <nav className="navbar bg-base-100 shadow px-6">
          <div className="navbar-start">
            <span className="text-lg font-bold">Fleet Manager</span>
          </div>
          <div className="navbar-end gap-2">
            <NavLink to="/" end
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}>
              Vehicles &amp; Drivers
            </NavLink>
            <NavLink to="/trips" end
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}>
              Trips
            </NavLink>
            <NavLink to="/trips/new"
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}>
              Create Trip
            </NavLink>
          </div>
        </nav>

        <main className="p-6 max-w-6xl mx-auto">
          <Routes>
            <Route path="/" element={<VehiclesAndDriversPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/new" element={<CreateTripPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

Let's talk about what this code is doing.
- `BrowserRouter` uses the browser's History API to manage navigation without full page reloads. It must wrap the entire app so every component has access to routing context.
- `Routes` renders only the first `Route` whose `path` matches the current URL. Without `Routes`, all matching routes would render at the same time.
- `Route path="/" element={<VehiclesAndDriversPage />}` maps the root URL to a page. The `element` prop takes a JSX element — not a component reference.
- `NavLink` receives an `isActive` boolean in its `className` callback, letting us toggle between `btn-primary` (active) and `btn-ghost` (inactive) to show the user which page they are on.
- The `end` prop on the `/` and `/trips` `NavLink`s prevents them from matching child paths. Without `end`, the `/` link would appear active on every page because every URL starts with `/`.

---

## Challenge/Exercise

### 1. Add a `useEffect` data-fetching layer to `TripsPage`

Swap the direct import for an async pattern that mirrors a real API call:
- Add `useState` for `trips` (initialise to `[]`) and `loading` (initialise to `true`).
- Add a `useEffect` that calls `mockFetch(TRIPS)`, sets `trips` on resolve, and sets `loading` to `false` in `.finally()`.
- While loading, render a DaisyUI `<span className="loading loading-spinner loading-lg" />` in place of the table.
- Verify the spinner appears briefly before the data loads, then verify the table renders correctly.

### 2. Add a trip detail page

- Create `src/pages/TripDetailPage.jsx` that reads a trip `id` from the URL using the `useParams` hook from React Router.
- Find the matching trip in `TRIPS` by comparing `trip.id === Number(id)` and display all its fields in a DaisyUI `card`.
- Add `<Route path="/trips/:id" element={<TripDetailPage />} />` in `App.jsx` — place it **before** `/trips/new` so the router checks it first.
- Update `TripList` so each row's `#` cell is a `<Link to={`/trips/${trip.id}`}>` that navigates to the detail page.

---

## Conclusion

In this example we learned about:
- **Components and props** — small, focused functions that accept data from their parent via props and return JSX. Data flows downward: parent → child.
- **Destructuring props** — `function VehicleList({ vehicles })` is cleaner than reading from a `props` object and makes the component's contract explicit at a glance.
- **Controlled form inputs** — every input's value lives in `useState`. A single `handleChange` using `[e.target.name]` dynamic keys handles all fields without repetition.
- **`useState` reset pattern** — storing the whole form as one object makes resetting trivial: `setForm(EMPTY_FORM)` after submit.
- **Callback props** — `TripForm` accepts `onSubmit` as a prop so the parent decides what to do with the data. The form stays reusable and unaware of the backend.
- **React Router** — `BrowserRouter` provides routing context, `Routes` + `Route` map URLs to components, `NavLink` highlights the active link, and `useNavigate` triggers programmatic navigation.
- **Mock data shaped like the API** — keeping field names identical to the real API response means the only change needed to go live is swapping the import for a `fetch()` call.
- **Caution — `key` must be stable and unique.** Using array indices as `key` causes React to lose track of rows when the list order changes. Always use a database ID or another stable unique value.
- **Caution — `e.preventDefault()` is required in form `onSubmit`.** Without it, the browser performs a full page reload and all React state is lost.
- **Caution — `NavLink` needs the `end` prop on short paths.** Without `end` on `/`, the home link appears active on every page because every URL starts with `/`.
