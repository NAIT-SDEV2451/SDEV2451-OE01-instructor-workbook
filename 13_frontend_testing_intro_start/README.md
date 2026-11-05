# Frontend Testing Introduction — Vitest, React Testing Library & MSW


In the last two examples we tested the TicketMono **backend**. Now we turn to the **frontend**. It's the same TicketMono project you've been building since Module 1 — the same `EventCard`, the same `EventsListPage`, the same React Query hooks — so by the end of this example you'll have a real, passing test suite covering how that UI actually renders and fetches data.

---

## Why Frontend Testing Matters

Backend tests tell you your API returns the right data. They don't tell you the UI actually shows that data correctly, handles a slow network gracefully, or recovers when a request fails. That's what frontend tests are for.

**Confidence when refactoring components.** Rename a prop, restructure a component, swap a CSS class — your tests immediately tell you whether the UI still renders what a user expects to see.

**Catching broken renders before a user does.** A component that throws when a field is `null`, or a loading state that never actually shows, is easy to miss by eye and easy to catch with a test.

**Testing UI behavior without a live backend.** You don't want your tests depending on the Django server actually running, or on real data sitting in the database. Frontend tests intercept network calls and control exactly what "the backend" returns, so your tests are fast, repeatable, and don't break because someone else changed a row in the dev database.

---

## Types of Frontend Tests

- **Component (unit) tests** — render a single component in isolation with fixed props and assert on what shows up. `EventCard` is a good example: give it a fake event object, check the name and venue show up.
- **Integration tests** — render a component that *fetches its own data* (through a hook, through React Query) and assert on how it behaves across loading, error, and success states. `EventsListPage` is this kind of test — it isn't really testing "the network," it's testing "does this component react correctly to what the network gives it."
- **End-to-end (E2E) tests** — a real browser driving the whole stack, frontend and backend together. We are not covering E2E in this course, but it's worth knowing the term exists above component and integration tests in the testing pyramid.

This example focuses on component and integration tests, and ends with a first look at user interaction: filling in the login form and checking where the app navigates afterwards.

---

## Tools We'll Use

- **[Vitest](https://vitest.dev/)** — the test runner. It's built by the Vite team and reuses your existing `vite.config.js`, so there's no separate build pipeline to configure.
- **[`@testing-library/react`](https://testing-library.com/docs/react-testing-library/intro/)** — renders components into a fake DOM and gives you `screen` to query them the way a user would (by visible text, by button role) instead of by CSS selector or component internals.
- **[`@testing-library/user-event`](https://testing-library.com/docs/user-event/intro/)** — simulates real user interactions (clicks, typing). You'll use it in Step 11 to fill in and submit the login form.
- **[`@testing-library/jest-dom`](https://github.com/testing-library/jest-dom)** — adds readable matchers like `.toBeInTheDocument()` and `.toBeDisabled()` on top of Vitest's `expect`.
- **[jsdom](https://github.com/jsdom/jsdom)** — a JavaScript implementation of the DOM that runs in Node. This is what lets Vitest render React components without opening an actual browser.
- **[MSW](https://mswjs.io/) (Mock Service Worker)** — intercepts `fetch` calls at the network level and returns fake responses you control. Your components call the exact same `apiClient` they call in production; MSW just makes sure those calls never leave the test process.
---

## What We'll Cover in This Example

- **Step 1** — Create a GitHub issue and branch
- **Step 2** — Install the testing dependencies
- **Step 3** — Add the `test` and `test:run` scripts
- **Step 4** — Configure Vitest in `vite.config.js`
- **Step 5** — Create the MSW request handlers
- **Step 6** — Create the MSW server
- **Step 7** — Create the Vitest setup file
- **Step 8** — Create a `renderWithProviders` helper
- **Step 9** — Write your first test: `EventCard`
- **Step 10** — Write an integration test: `EventsListPage`
- **Step 11** — Test navigation with a mocked `useNavigate`: `LoginPage`
- **Step 12** — Best practices for frontend tests
- **Step 13** — Commit, push, and open a pull request

---

### Step 1 — Create a GitHub Issue and Branch

Same workflow as every example since Example 10.

**Create a GitHub issue** with:
- **Title:** Set up frontend testing tooling
- **Description:** Install Vitest, React Testing Library, and MSW, and write the first component and integration tests for the TicketMono frontend.
- **Label:** enhancement

**Create a branch** named after your issue number. If your issue is #9:

```
git checkout -b 9-frontend-testing-setup
```

All work below happens on this branch, from the `ticketmono_frontend` directory.

---

### Step 2 — Install the Testing Dependencies

Install everything as dev dependencies — none of this ships in your production build:

```
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

**What's happening here:**

- `vitest` is the test runner itself.
- `jsdom` gives Vitest a fake browser DOM to render into.
- `@testing-library/react` is how we render components and query the result.
- `@testing-library/jest-dom` and `@testing-library/user-event` extend that with matchers and interaction helpers.
- `msw` intercepts the `fetch` calls your components make through `apiClient`.

Confirm they landed in `package.json` under `devDependencies` before moving on.

---

### Step 3 — Add the `test` and `test:run` Scripts

Open `package.json` and add two scripts:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run"
}
```

**What's happening here:**

- `npm run test` starts Vitest in **watch mode** — it stays running and re-runs affected tests every time you save a file. This is what you'll use while writing tests.
- `npm run test:run` runs the whole suite **once** and exits — this is what you (and later, CI) use to confirm everything passes before a commit.

Run `npm run test:run` now, before any test files exist, to confirm the command works:

```
npm run test:run
```

Vitest will fail with something like `No test files found` — that's expected. There's nothing to test yet. This is your baseline, the same way `Ran 0 tests / OK` was your baseline for the backend.

---

### Step 4 — Configure Vitest in `vite.config.js`

Vitest reads its configuration from the same `vite.config.js` you already have. Add a `test` key:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
})
```

**What's happening here:**

- `environment: 'jsdom'` tells Vitest to render into the fake DOM instead of assuming Node's default (no-DOM) environment.
- `setupFiles: ['./src/test/setup.js']` points at a file (which we create in Step 7) that runs before every test file — this is where global matchers and the mock server get wired up.
- `globals: true` makes `describe`, `it`, `expect`, and `vi` available in every test file automatically, without an `import` at the top of each one.

`src/test/setup.js` doesn't exist yet, so don't run the tests yet — we'll get there in Step 7.

---

### Step 5 — Create the MSW Request Handlers

MSW needs to know what to return for each API call your components make. Create `src/test/handlers.js`:

```js
import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

export const mockEvents = [
  {
    id: 1,
    name: 'Indie Rock Night',
    date_time: '2026-11-14T19:30:00Z',
    venue: { id: 1, name: 'The Aurora Room', address: '221 King St W' },
  },
  {
    id: 2,
    name: 'Comedy Open Mic',
    date_time: '2026-11-20T20:00:00Z',
    venue: { id: 2, name: 'Backroom Lounge', address: '77 Jasper Ave' },
  },
]

export const mockUser = { id: 1, username: 'sam', role: 'user' }

// A fake JWT: header.payload.signature. Only the payload is real base64 JSON,
// because AuthContext decodes it to read user_id.
const FAKE_ACCESS_TOKEN = `header.${btoa(JSON.stringify({ user_id: 1 }))}.signature`

export const handlers = [
  http.get(`${BASE_URL}/events/`, () => {
    return HttpResponse.json(mockEvents)
  }),

  http.post(`${BASE_URL}/auth/login/`, () => {
    return HttpResponse.json({
      access: FAKE_ACCESS_TOKEN,
      refresh: 'fake-refresh-token',
    })
  }),

  http.get(`${BASE_URL}/auth/me/`, () => {
    return HttpResponse.json(mockUser)
  }),
]
```


**What's happening here:**

- `BASE_URL` matches the same default your `apiClient` (`src/api/client.js`) falls back to when `VITE_API_URL` isn't set, so requests made in tests match the URL MSW is listening for.
- `mockEvents` is fixture data shaped exactly like what the real `/events/` endpoint returns — matching the fields `EventCard` and `EventsListPage` actually read (`name`, `date_time`, `venue.name`, `venue.address`).
- `http.get(...)` registers a **default** handler for `GET /events/`. Every test gets this response unless a specific test overrides it — you'll see that override in Step 10, for testing the error state.
- The two **auth handlers** are for the `LoginPage` test in Step 11. When a user logs in, `AuthContext` (`src/contexts/AuthContext.jsx`) first calls `POST /auth/login/` to get tokens, then calls `GET /auth/me/` to get the username and role. A successful login needs both requests to be mocked.
- `FAKE_ACCESS_TOKEN` isn't a real signed JWT, but `AuthContext` decodes the middle (payload) section of the token with `atob` to read `user_id`. The payload therefore has to be valid base64-encoded JSON, or the decode fails. The header and signature are never checked on the frontend, so placeholder strings are fine.
---

### Step 6 — Create the MSW Server

MSW needs a "server" instance that intercepts requests while tests run in Node (as opposed to a real browser, which uses a service worker instead). Create `src/test/server.js`:

```js
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

That's the whole file — it just wires the handlers from Step 5 into a server object the rest of the test setup can start, reset, and stop.

---

### Step 7 — Create the Vitest Setup File

This is the file `vite.config.js` pointed at in Step 4. Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**What's happening here:**

- `import '@testing-library/jest-dom'` registers the extra matchers (`toBeInTheDocument`, `toBeDisabled`, etc.) globally, so every test file can use them without its own import.
- `beforeAll(() => server.listen(...))` starts intercepting requests before any test runs. `onUnhandledRequest: 'warn'` means if a component makes a request you forgot to mock, you get a console warning instead of a silent failure or a real network call.
- `afterEach(() => server.resetHandlers())` restores the **default** handlers after every single test. This matters: if one test overrides a handler with `server.use(...)` (Step 10), that override should not leak into the next test.
- `afterAll(() => server.close())` shuts the server down once the whole suite finishes.

Now that `src/test/setup.js` exists, run the test command again to confirm the config is wired correctly:

```
npm run test:run
```

You'll still see `No test files found` — that's still correct, we haven't written a test yet. What matters is that Vitest no longer complains about a missing setup file.

---

### Step 8 — Create a `renderWithProviders` Helper

Our components don't work on their own. In the real app, `App.jsx` wraps everything in providers:

- `QueryClientProvider` — `EventsListPage` calls `useEvents()`, which calls React Query's `useQuery`. Without a `QueryClient` above it, `useQuery` throws.
- `AuthProvider` — `LoginPage` calls `useAuth()`, which throws if there's no `AuthProvider` above it.
- `BrowserRouter` — `EventCard` renders a `<Link>` to `/events/:id`. A `<Link>` outside a router throws too.

Testing Library's `render` only renders the exact component you give it, so in a test there's no `App.jsx` and none of those providers. Instead of repeating the same wrapper in every test file, we'll write one helper that every test uses. Create `src/test/renderWithProviders.jsx`:

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render } from '@testing-library/react'

import { AuthProvider } from '../contexts/AuthContext'

export function renderWithProviders(ui, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
```

> **Note:** the file extension is `.jsx`, not `.js` — it contains JSX, so Vite needs the `.jsx` extension to transform it.

**What's happening here:**

- `renderWithProviders(ui, ...)` works exactly like Testing Library's `render` — you pass it a component like `<EventCard event={event} />` — but it wraps that component in the providers first. It returns whatever `render` returns, so things like `container` are still available (you'll use `container` in Step 10).
- **A new `QueryClient` is created on every call.** React Query caches responses. If all tests shared one client, the events fetched in one test would still be cached in the next. That would break the error test in Step 10, because the page would show cached events instead of making a new (failing) request. A fresh client per test means every test starts with an empty cache.
- **`retry: false`** turns off React Query's automatic retries. By default, a failed query is retried 3 times with a growing delay between attempts before `isError` becomes `true`. That's great for real users on a flaky network, but in a test it means the error state takes several seconds to appear, and `waitFor` gives up after 1 second. With retries off, a `500` from MSW shows the error state right away.
- **`MemoryRouter` instead of `BrowserRouter`.** `BrowserRouter` reads and writes the real browser URL bar, which doesn't exist in jsdom. `MemoryRouter` keeps the route history in memory, so `<Link>` and `useNavigate` work without a real browser.
- **`initialEntries = ['/']`** sets which URL the router starts on. We don't need it in this example, but it lets a later test render a page as if the user were at a specific route, e.g. `renderWithProviders(<EventDetailPage />, { initialEntries: ['/events/1'] })`.
- **`AuthProvider` goes inside `QueryClientProvider`** because it uses React Query's `useMutation` for login and register, the same order as in `App.jsx`. `EventCard` and `EventsListPage` don't use auth, but wrapping them in `AuthProvider` doesn't change how they render. Putting it in the helper means `LoginPage` (Step 11) works without any extra setup.
- We only include the providers our components under test actually need. `CartProvider` from `App.jsx` isn't used by any component we test here, so we leave it out. If a future test renders a component that uses it, this helper is the one place to add it.

There's nothing to run yet — this file is a helper, not a test. You'll use it in every test from Step 9 onward.

---

### Step 9 — Write Your First Test: `EventCard`

`EventCard` (`src/components/EventCard.jsx`) is a good first test: it takes a single `event` prop and renders synchronously — no loading state, no network call. Create `src/__tests__/EventCard.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'

import EventCard from '../components/EventCard'
import { renderWithProviders } from '../test/renderWithProviders'
import { mockEvents } from '../test/handlers'

describe('EventCard', () => {
  const event = mockEvents[0]

  it('renders the event name', () => {
    renderWithProviders(<EventCard event={event} />)

    expect(screen.getByText('Indie Rock Night')).toBeInTheDocument()
  })

  it('renders the venue name and address', () => {
    renderWithProviders(<EventCard event={event} />)

    expect(screen.getByText('The Aurora Room')).toBeInTheDocument()
    expect(screen.getByText('221 King St W')).toBeInTheDocument()
  })

  it('links to the event detail page', () => {
    renderWithProviders(<EventCard event={event} />)

    const link = screen.getByRole('link', { name: 'Get Tickets' })
    expect(link).toHaveAttribute('href', '/events/1')
  })
})
```


**What's happening here:**

- We reuse `mockEvents` from `src/test/handlers.js` instead of writing a second, slightly-different fixture — one source of truth for what a fake event looks like.
- `screen.getByText(...)` finds an element by its visible text, the same way a user (or a screen reader) would identify it. This is deliberately **not** a CSS selector — if the test only cared that *some* `<h2>` existed, it wouldn't actually confirm the right event name renders.
- `screen.getByRole('link', { name: 'Get Tickets' })` queries by accessible role and accessible name, which is the Testing Library convention: query the page the way a user or assistive technology would, not by digging into markup structure.
- We're deliberately **not** asserting on the exact formatted date/time text. `EventCard` formats `date_time` with `toLocaleDateString`/`toLocaleTimeString`, which are timezone-sensitive — the exact string depends on the machine running the test. If you wanted to test that formatting logic specifically, the better approach is to pull it into its own small function and unit test *that* directly, independent of the timezone the test happens to run in.

Run the suite:

```
npm run test:run
```

The output should look like the following:

```
> ticketmono_frontend@0.0.0 test
> vitest


 DEV  v5.0.2 C:/Users/dmouris/course_development/sdev2451/sdev2451_full_stack/module_5_testing_full_stack_applications/13_frontend_testing_intro_end/ticketmono_frontend

 ✓ src/__tests__/EventCard.test.jsx (3 tests) 127ms
   ✓ EventCard (3)
     ✓ renders the event name 47ms
     ✓ renders the venue name and address 5ms
     ✓ links to the event detail page 72ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  15:44:06
   Duration  2.32s (environment 42%, import 33%, setup 15%, tests 6%, transform 3%, worker 1%)
```


--

### Step 10 — Write an Integration Test: `EventsListPage`

`EventsListPage` (`src/pages/attendee/EventsListPage.jsx`) is different from `EventCard` — it calls `useEvents()` (a React Query hook, `src/hooks/useEvents.js`) which calls `fetchEvents()` (`src/api/events.js`), which calls `apiClient`. There's a real (mocked) network round-trip here, and three distinct states to test: loading, error, and success. Create `src/__tests__/EventsListPage.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'

import EventsListPage from '../pages/attendee/EventsListPage'
import { renderWithProviders } from '../test/renderWithProviders'
import { server } from '../test/server'

const EVENTS_URL = 'http://localhost:8000/api/v1/events/'

describe('EventsListPage', () => {
  it('shows a loading spinner while events are loading', () => {
    const { container } = renderWithProviders(<EventsListPage />)

    expect(container.querySelector('.loading-spinner')).toBeInTheDocument()
  })

  it('renders every event once loading finishes', async () => {
    renderWithProviders(<EventsListPage />)

    await waitFor(() => {
      expect(screen.getByText('Indie Rock Night')).toBeInTheDocument()
      expect(screen.getByText('Comedy Open Mic')).toBeInTheDocument()
    })
  })

  it('shows an error message if the request fails', async () => {
    server.use(
      http.get(EVENTS_URL, () => {
        return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      })
    )

    renderWithProviders(<EventsListPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load events. Please try again later.')
      ).toBeInTheDocument()
    })
  })
})
```

**What's happening here:**

- The **loading** test doesn't `await` anything — it asserts on the very first render, before the mocked network response has resolved, which is exactly when `EventsListPage`'s `isLoading` branch is showing. We use `container.querySelector('.loading-spinner')` here instead of a text/role query because the spinner is a DaisyUI `<span>` with no visible text or accessible name — this is one of the few legitimate cases for a CSS-selector query in Testing Library.
- The **success** test uses the default handler from `src/test/handlers.js` (Step 5) — we didn't override anything, so both `mockEvents` come back. `waitFor(...)` is required because the data doesn't exist on the first render; it retries the assertion until the (mocked, but still async) fetch resolves.
- The **error** test uses `server.use(...)` to override just the `/events/` handler for this one test, returning a `500` response instead of the default. `apiClient`/`fetchEvents` treats a non-`ok` response as a thrown error, which flips `useQuery`'s `isError` to `true` and `EventsListPage` renders its `alert-error` branch instead.
- Because `afterEach(() => server.resetHandlers())` runs after every test (Step 7), that `500` override only affects this one test — the next test goes back to the default `handlers` array automatically.

Run the full suite:

```
npm run test:run
```

You should now see **2 test files, 6 tests total**, all passing — 3 in `EventCard.test.jsx`, 3 in `EventsListPage.test.jsx`.

---

### Step 11 — Test Navigation with a Mocked `useNavigate`: `LoginPage`

So far every test has only checked what's **on screen**. `LoginPage` (`src/pages/auth/LoginPage.jsx`) also does something after the user submits the form: when login succeeds, it sends the user to the home page:

```jsx
const navigate = useNavigate()

function handleSubmit(formData) {
  login(formData, {
    onSuccess: () => navigate('/'),
  })
}
```

We want to test that this redirect happens. The problem is that in a test there's no real URL bar to check (we're using `MemoryRouter`), and we aren't rendering a home page to look for either. Instead, we **replace `useNavigate` with a mock function** and check that the mock was called with the right path.

Create `src/__tests__/LoginPage.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'

import LoginPage from '../pages/auth/LoginPage'
import { renderWithProviders } from '../test/renderWithProviders'
import { server } from '../test/server'

const LOGIN_URL = 'http://localhost:8000/api/v1/auth/login/'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockNavigate.mockClear()
  })

  afterEach(() => {
    // A successful login writes tokens to localStorage, so clear them
    // to make sure the next test starts logged out.
    localStorage.clear()
  })

  it('navigates to the home page after a successful login', async () => {
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('Enter your username'), 'sam')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('does not navigate when the login fails', async () => {
    server.use(
      http.post(LOGIN_URL, () => {
        return HttpResponse.json(
          { detail: 'No active account found with the given credentials' },
          { status: 401 }
        )
      })
    )

    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('Enter your username'), 'sam')
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => {
      expect(
        screen.getByText('No active account found with the given credentials')
      ).toBeInTheDocument()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
```

**What's happening here:**

- **`const mockNavigate = vi.fn()`** creates a **mock function**: a fake function that does nothing except record every call made to it and the arguments it was called with. Later we can ask it "were you called with `'/'`?"
- **`vi.mock('react-router-dom', ...)`** replaces the `react-router-dom` module for every file in this test, including `LoginPage.jsx`. Vitest moves `vi.mock` calls to the top of the file before any imports run, so `LoginPage` gets the mocked version when it's imported.
- **`importOriginal()` and `...actual`** keep everything else in `react-router-dom` real. `MemoryRouter`, `Link`, and the rest still work normally, and only `useNavigate` is swapped out. Without `...actual`, `renderWithProviders` would break because `MemoryRouter` would be missing.
- **`useNavigate: () => mockNavigate`** means that when `LoginPage` calls `useNavigate()`, it gets our mock back. So `navigate('/')` inside the component is really `mockNavigate('/')`.
- **`userEvent.setup()`** creates a simulated user. `user.type(...)` types into an input one key at a time, and `user.click(...)` clicks a button, the same events a real user would trigger. Both return promises, so we `await` them.
- **`getByPlaceholderText`** is used to find the inputs because the `<label>`s in `LoginForm` aren't linked to their inputs (there's no `htmlFor`/`id` pair). If they were, `getByLabelText('Username')` would be the better query.
- **`waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'))`** is needed because clicking "Log In" starts an async chain: `POST /auth/login/`, then `GET /auth/me/` (both answered by MSW, Step 5), then the `onSuccess` callback calls `navigate('/')`. `waitFor` keeps retrying the assertion until that chain finishes.
- **The failure test** overrides the login handler with a `401`, just like the `500` override in Step 10. We first wait for the error message to appear, which proves the request has finished. After that we can check `expect(mockNavigate).not.toHaveBeenCalled()`. If we checked `not.toHaveBeenCalled()` straight after the click, it would pass even if navigation was broken, because the request wouldn't have finished yet.
- **`mockNavigate.mockClear()` in `beforeEach`** wipes the mock's call history before each test. `mockNavigate` is created once for the whole file, so without this, the `'/'` call from the first test would still be recorded in the second test and `not.toHaveBeenCalled()` would fail.
- **`localStorage.clear()` in `afterEach`**: a successful login saves tokens and the user to `localStorage` (just like in the real app). Clearing it means each test starts logged out, regardless of test order.

> **Why not test the `EventCard` "Get Tickets" link this way?** `EventCard` uses a `<Link>`, not `useNavigate()`. React Router's `<Link>` doesn't go through the `useNavigate` we mocked, so `mockNavigate` would never be called. For links, checking the `href` attribute (as we did in Step 9) is the right test. Mock `useNavigate` when a component calls `navigate(...)` itself, usually after a form submit or a button click.

Run the full suite:

```
npm run test:run
```

You should now see **3 test files, 8 tests total**, all passing — 3 in `EventCard.test.jsx`, 3 in `EventsListPage.test.jsx`, and 2 in `LoginPage.test.jsx`.

To see that the test really checks the path, temporarily change `toHaveBeenCalledWith('/')` to `toHaveBeenCalledWith('/wrong')` and run it again. Vitest fails and shows the path `mockNavigate` was actually called with:

```
AssertionError: expected "vi.fn()" to be called with arguments: [ '/wrong' ]

Received:

  1st vi.fn() call:

  [
-   "/wrong",
+   "/",
  ]
```

Change it back to `'/'` before moving on.

---

## Step 12 — Best Practices for Frontend Tests

### Query the way a user finds things
Prefer `getByRole` and `getByText` over `container.querySelector`. If you can only find an element with a CSS class, that's often a sign the element needs a clearer accessible role or label — which also makes your real app more accessible.

### Don't test implementation details
Don't assert on component internal state, prop values, or CSS class names as your primary check. Assert on what's rendered — what a user would actually see. If you refactor `EventCard` to use a different internal variable name, your tests shouldn't need to change.

### Mock at the network boundary, not the component boundary
MSW intercepts the actual `fetch` call, so `EventsListPage`, `useEvents`, and `fetchEvents` are all exercised for real — only the network is fake. This catches more real bugs than mocking `useEvents()` itself would, because a mistake anywhere in that chain still shows up in the test.

### Reset state between tests
`afterEach(() => server.resetHandlers())` exists precisely so one test's `server.use(...)` override can never leak into another test and cause a confusing, order-dependent failure.

### Reset mocks between tests
The same goes for mock functions like `mockNavigate`. Call `mockClear()` in `beforeEach` so each test only sees the calls it made itself. Otherwise a `toHaveBeenCalledWith` could pass because of a call from an earlier test, and `not.toHaveBeenCalled()` could fail for the same reason.

### Turn off React Query retries in tests
Without `retry: false`, a test for an error state will actually wait through React Query's retry/backoff cycle before failing — slow, and easy to mistake for a hang.

### Keep loading/error/success as three separate tests
Just like the backend testing example, one behavior per test. If the "shows events" test also tried to assert the loading spinner disappeared *and* the error case never triggers, a single failure wouldn't tell you which of those three things actually broke.

---

## Running the Tests — Reference

Watch mode (re-runs on save, best while writing tests):
```
npm run test
```

Run once and exit (best before a commit, and what CI will use):
```
npm run test:run
```

Run a single test file:
```
npx vitest run src/__tests__/EventCard.test.jsx
```

---

## Step 13 — Commit, Push, and Open a Pull Request

**Run the full suite one final time** to confirm everything is green:

```
npm run test:run
```

**Stage and commit your changes:**

```
git add package.json package-lock.json vite.config.js src/test src/__tests__
git commit -m "Set up Vitest, React Testing Library, and MSW; add EventCard, EventsListPage, and LoginPage tests"
```

**Push your branch to GitHub:**

```
git push --set-upstream origin <your-branch-name>
```

**Open a pull request** into `main`, and link your issue with `Closes #<issue-number>` in the description.

---

## Conclusion

In this example you set up the entire frontend testing pipeline for TicketMono:

- **Vitest** as the test runner, configured directly in `vite.config.js`
- **`@testing-library/react`** to render components and query them the way a user would
- **MSW** to intercept network requests so tests never depend on a real backend
- A **shared setup file** (`src/test/setup.js`) and **`renderWithProviders`** helper so every test file starts from the same clean baseline
- Tests covering a **presentational component** (`EventCard`) and a **data-fetching component** across its loading, success, and error states (`EventsListPage`)
- A **navigation test** (`LoginPage`) that uses `user-event` to fill in and submit a form, and a mocked `useNavigate` (`mockNavigate`) to check where the user is sent afterwards

Most of this example tested *rendering*, meaning what shows up on screen. The `LoginPage` test was a first step into testing **user interaction**.
