# Backend Testing Introduction — Django & DRF

In this example we turn our attention to **testing** — one of the most important habits you can build as a software developer. We've been building the TicketMono backend for several examples now, so we have real code to test. By the end of this example you'll have a suite of automated tests covering the `Order` model and the API endpoints in `event_tickets`.

---

## Why Testing Matters

When you write code and manually check "does this work?" in a browser or Postman, you're testing — just not in a way anyone else (or future-you) can repeat. Automated tests solve that problem.

Here's what tests give you:

**Confidence when changing code.** When you refactor a serializer or add a new field to a model, your tests tell you immediately if something broke — before you push to GitHub, before a teammate reviews it, before a user sees it.

**A safety net for your teammates.** On a team, you can't manually test every feature every time someone opens a pull request. A test suite runs automatically and catches regressions nobody thought to check manually.

**Living documentation.** A well-written test reads like a specification: "when an authenticated user creates an order, the response is 201 and the order belongs to that user." That's more reliable than a comment or a wiki page because it stays in sync with the code.

**Faster debugging.** A failing test points directly at what broke. Compare that to refreshing a browser and trying to reproduce a bug by clicking around.

---

## Types of Tests

There are three main categories. Think of them as a pyramid — the base is widest (most tests) and the top is narrow (fewest tests).

### Unit Tests
Test a single function, method, or class **in isolation**. They don't touch the database or make network calls. Because of this they are extremely fast and cheap to run. Unit tests are best suited for logic that can be exercised without any infrastructure — a calculation, a data transformation, a string format.

**Example in this project:** Testing that `Order.total_price` returns the correct sum of ticket prices.

### Integration Tests
Test that **multiple parts of the system work together** — typically a database, a serializer, and a view. Slower than unit tests because they actually write to and read from the database, but they catch a whole category of problems that unit tests miss. A serializer might work perfectly in isolation but break when it receives a real queryset from the database. Integration tests catch that.

**Example in this project:** Making a `POST /api/v1/orders/` request and asserting that the order was created in the database with the correct customer and ticket count.

### End-to-End (E2E) Tests
Test the **entire application stack** from the user's perspective — a browser clicks a button, the frontend sends a request, the backend saves to the database, the frontend renders the result. These are the most realistic tests but also the slowest and most expensive to write and maintain.

**We'll cover E2E tests when we get to frontend testing.** For this example we focus on unit tests and integration tests.

---

## Django's Testing Tools

Django ships with a test runner and a `TestCase` class built on Python's standard `unittest` module. You do not need to install any third-party packages to get started.

The command to run all tests in the project is:

```
python manage.py test
```

Django's test runner discovers every file named `tests.py` (or inside a `tests/` package) across all apps in your project, runs every method whose name starts with `test_`, and reports the results.

**The most important thing to understand about Django's `TestCase`:** it wraps every individual test method in a database transaction that is rolled back automatically when the test finishes. This means:
- Each test starts with a clean, empty database
- Tests are completely isolated from each other — one test cannot affect another
- You never need to manually delete records you created during a test

For testing DRF API endpoints we use `APITestCase` from `rest_framework.test`. It works exactly like Django's `TestCase` but provides a `self.client` object that knows how to make HTTP requests to your API and understands how to send authentication credentials.

---

## What We'll Cover in This Example

- **Step 1** — Create a GitHub issue and branch
- **Step 2** — How Django discovers and runs tests
- **Step 3** — The `setUp` method: creating shared test data
- **Step 4** — Unit test: `Order.total_price` property
- **Step 5** — Integration test: events list requires authentication (401)
- **Step 6** — Integration test: authenticated user can list events (200)
- **Step 7** — Integration test: creating an order (201)
- **Step 8** — Integration test: users can only see their own orders
- **Step 9** — Integration test: order detail returns nested ticket data
- **Step 10** — Best practices
- **Step 11** — Commit, push, and open a pull request

---

## Steps

### Step 1 — Create a GitHub Issue and Branch

Before writing any code, follow the team workflow we established in example 10.

**Create a GitHub issue** in your repository with the following details:
- **Title:** Add backend tests for event_tickets
- **Description:** Write a suite of automated unit and integration tests for the `event_tickets` app covering the `Order.total_price` property, the Events API, and the Orders API.
- **Label:** enhancement

**Create a branch** named after your issue number. If your issue is #4, the command is:

```
git checkout -b 4-add-backend-tests
```

All of the test code you write in the steps below goes on this branch. When you're done, you'll open a pull request and link it to the issue — the same workflow as before.

---

### Step 2 — How Django Discovers and Runs Tests

Django looks for `tests.py` inside each app directory. Open `event_tickets/tests.py`. Django created this file automatically when you ran `startapp`, and right now it looks like this:

```python
from django.test import TestCase

# Create your tests here.
```

Before you write a single test, run the test suite to confirm it starts in a passing state:

```
python manage.py test
```

You should see output similar to:

```
Ran 0 tests in 0.000s

OK
```

Zero tests, zero failures. This is your baseline. Every test you add from here should either pass (green) or fail in a way that tells you exactly what you need to implement next.

**Useful flags for running tests:**

Run tests for a single app only:
```
python manage.py test event_tickets
```

Run a single test class:
```
python manage.py test event_tickets.tests.EventTicketsTestCase
```

Run a single test method:
```
python manage.py test event_tickets.tests.EventTicketsTestCase.test_order_total_price
```

Run with verbose output (shows each test name as it runs):
```
python manage.py test --verbosity=2
```

---

### Step 3 — The `setUp` Method: Creating Shared Test Data

Almost every test needs some data to work with — a user, an event, a venue. You could create that data inside each individual test method, but then you'd be repeating the same object creation code over and over. The `setUp` method solves this: Django calls it automatically **before every single test method** in the class, so all of your tests can rely on the same baseline objects without duplicating setup code.

Replace the contents of `event_tickets/tests.py` with the following:

```python
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Event, Order, Ticket, TicketTier, Venue

User = get_user_model()


class EventTicketsTestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='attendee',
        )
        self.organizer = User.objects.create_user(
            username='organizer',
            password='testpass123',
            role='organizer',
        )
        self.venue = Venue.objects.create(
            name='Test Venue',
            address='123 Test St',
            owner=self.organizer,
        )
        self.event = Event.objects.create(
            name='Test Event',
            date_time=timezone.now(),
            venue=self.venue,
            organizer=self.organizer,
        )
        self.tier = TicketTier.objects.create(
            name='General Admission',
            price='25.00',
            event=self.event,
        )
```

**What's happening here, line by line:**

- `APITestCase` is the DRF-aware base class. It gives us `self.client` — an HTTP client that knows how to talk to our API and handles authentication. Think of it as a test-only version of Postman built into the test suite.
- `get_user_model()` is the Django-recommended way to reference your user model. It works whether you're using Django's default `User` or a custom one (like our `core.User` which adds the `role` field).
- `create_user(...)` is used instead of `create(...)`. The difference is that `create_user` hashes the password correctly. Using `create(...)` would store a plaintext password, which would cause authentication tests to fail in confusing ways.
- `self.user` and `self.organizer` give us two distinct users we can use across tests — one to act as a regular attendee and one as an event organizer.
- `self.venue`, `self.event`, and `self.tier` set up the minimum data needed to create and retrieve orders.
- Because Django rolls back the database after every test, none of these objects bleed into the next test. The next test gets a completely fresh `setUp`.

Run the tests again to confirm nothing broke:

```
python manage.py test event_tickets
```

Still `Ran 0 tests` — `setUp` itself doesn't count as a test. That's expected.

---

### Step 4 — Unit Test: `Order.total_price`

The `Order` model has a `total_price` property that sums the price of all associated tickets:

```python
@property
def total_price(self):
    return sum(ticket.tier.price for ticket in self.tickets.all())
```

This is pure business logic — the kind of thing that can be tested without touching any HTTP layer. Add the following test method inside `EventTicketsTestCase`:

```python
    def test_order_total_price(self):
        ticket_1 = Ticket.objects.create(tier=self.tier)
        ticket_2 = Ticket.objects.create(tier=self.tier)
        order = Order.objects.create(customer=self.user)
        order.tickets.set([ticket_1, ticket_2])

        self.assertEqual(order.total_price, 50)
```

**What's happening here:**

- We create two `Ticket` objects, both belonging to `self.tier` which has a price of `25.00`.
- We create an `Order` belonging to `self.user` and attach both tickets via `order.tickets.set(...)`.
- `self.assertEqual(order.total_price, 50)` asserts that the property returns `50` — two tickets at `$25.00` each.
- If someone later changes `total_price` — maybe to accidentally return an average instead of a sum, or to forget to follow the `tier` FK — this test fails immediately and tells you exactly what broke.

Run the tests:

```
python manage.py test event_tickets
```

You should now see `Ran 1 test` with `OK`.

**Why test a property this simple?**

Because the logic could change. The `@property` currently does a Python `sum()` over a queryset. If someone refactors it to query an annotation, adds a discount calculation, or accidentally breaks the `ticket.tier.price` traversal, the test catches it. Tests for small things are cheap to write and they protect you when you least expect it.

---

### Step 5 — Integration Test: Events List Requires Authentication

The `EventViewSet` has `permission_classes = (IsAuthenticated,)`. This means any request without a valid user should be rejected with `401 Unauthorized`. Let's write a test that confirms this is actually enforced.

Add the following method to `EventTicketsTestCase`:

```python
    def test_events_list_requires_authentication(self):
        response = self.client.get('/api/v1/events/')

        self.assertEqual(response.status_code, 401)
```

**What's happening here:**

- `self.client.get('/api/v1/events/')` sends a `GET` request to the events endpoint with **no credentials**. The `self.client` starts unauthenticated by default — no token, no session, nothing.
- The request passes through Django's URL routing, hits `EventViewSet`, and DRF's permission check rejects it before the view does anything else.
- `self.assertEqual(response.status_code, 401)` confirms the rejection happened. If someone were to accidentally remove `permission_classes` from the viewset, this test would fail immediately.

Run the tests:

```
python manage.py test event_tickets
```

You should now see `Ran 2 tests` with `OK`.

**Why test this?** Permission checks are easy to forget. A developer might copy a viewset, strip out the permission class while prototyping, and forget to add it back. A test like this catches that mistake automatically before it ever reaches production.

---

### Step 6 — Integration Test: Authenticated User Can List Events

Now let's test the happy path — an authenticated user should receive `200 OK` and see the events that exist in the database.

Add the following method to `EventTicketsTestCase`:

```python
    def test_authenticated_user_can_list_events(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/events/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
```

**What's happening here:**

- `self.client.force_authenticate(user=self.user)` is the standard way to authenticate in DRF tests. It bypasses JWT token generation entirely — no need to POST to `/token/`, no need to set headers manually. It simply tells DRF "treat this client as if `self.user` is logged in." This is the officially recommended approach for testing authenticated endpoints.
- After this call, every subsequent request from `self.client` in this test will be treated as coming from `self.user`.
- `self.assertEqual(response.status_code, 200)` confirms the request succeeded.
- `self.assertEqual(len(response.data), 1)` confirms exactly one event is returned. Our `setUp` created exactly one event, so the response should contain exactly one item. If the view returned all events from all tests (which it won't, because each test runs in a rolled-back transaction), this assertion would catch it.

Run the tests:

```
python manage.py test event_tickets
```

`Ran 3 tests — OK`.

**A note on `force_authenticate` vs real tokens:** In a production-like end-to-end test you might want to test the entire login flow including token generation. But for tests focused on the behaviour of a viewset, `force_authenticate` keeps the test focused on what matters — the view logic — rather than the authentication mechanism. You can always write a separate test for the login flow itself.

---

### Step 7 — Integration Test: Creating an Order

The `OrderViewSet.create` method handles `POST /api/v1/orders/`. It validates the payload, creates `Ticket` objects for each item and quantity, creates an `Order`, and returns `201 Created`. Let's test the entire flow.

Add the following method to `EventTicketsTestCase`:

```python
    def test_create_order(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            'items': [
                {
                    'event_id': self.event.id,
                    'ticket_tier_id': self.tier.id,
                    'quantity': 2,
                }
            ]
        }
        response = self.client.post('/api/v1/orders/', payload, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.customer, self.user)
        self.assertEqual(order.tickets.count(), 2)
```

**What's happening here:**

- `payload` is the exact JSON structure the frontend sends. `items` is a list of order items, each with an `event_id`, a `ticket_tier_id`, and a `quantity`.
- `self.client.post('/api/v1/orders/', payload, format='json')` sends the request. The `format='json'` argument tells `self.client` to JSON-encode the dict and set the `Content-Type` header to `application/json` — without this, DRF might receive the data as form-encoded and fail to parse it.
- `self.assertEqual(response.status_code, 201)` checks the HTTP status. `201 Created` is the correct response for a successful resource creation.
- `self.assertEqual(Order.objects.count(), 1)` goes directly to the database and confirms an order was actually saved — not just that the response said `201`. These are different things. The view could theoretically return `201` without saving anything; querying the database catches that.
- `order = Order.objects.first()` retrieves the order we just created.
- `self.assertEqual(order.customer, self.user)` confirms the order was attributed to the correct user — not a default user, not None, not the organizer.
- `self.assertEqual(order.tickets.count(), 2)` confirms that a `quantity` of `2` resulted in two actual `Ticket` database records attached to the order.

Run the tests:

```
python manage.py test event_tickets
```

`Ran 4 tests — OK`.

---

### Step 8 — Integration Test: Users Can Only See Their Own Orders

`OrderViewSet.get_queryset` filters to `customer=self.request.user`. This is a critical security property — a user should never be able to see another user's orders. Let's write a test that confirms this scoping works.

Add the following method to `EventTicketsTestCase`:

```python
    def test_user_cannot_see_other_users_orders(self):
        other_user = User.objects.create_user(
            username='other',
            password='testpass123',
            role='attendee',
        )
        ticket = Ticket.objects.create(tier=self.tier)
        other_order = Order.objects.create(customer=other_user)
        other_order.tickets.set([ticket])

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/orders/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)
```

**What's happening here:**

- We create a second user (`other_user`) directly inside this test method. We don't put this in `setUp` because not every test needs a second user — we only create it where it's needed.
- We create an order belonging to `other_user` (not `self.user`).
- We authenticate as `self.user` and request the orders list.
- `self.assertEqual(len(response.data), 0)` asserts that zero orders are returned. `self.user` has no orders — the only order in the database belongs to `other_user`. If `get_queryset` were missing the `.filter(customer=self.request.user)` and returned all orders in the system, `response.data` would have one item and the test would fail.

This test is testing a **security boundary**. It's testing that the privacy constraint actually holds under real conditions, not just that the code has a filter written in it.

Run the tests:

```
python manage.py test event_tickets
```

`Ran 5 tests — OK`.

---

### Step 9 — Integration Test: Order Detail Returns Nested Ticket Data

The `retrieve` action on `OrderViewSet` uses `OrderDetailSerializer` instead of the flat `OrderSerializer`. `OrderDetailSerializer` nests full ticket and tier information so the frontend can display event names, tier names, and prices without making additional requests. Let's test that the response structure is correct.

Add the following method to `EventTicketsTestCase`:

```python
    def test_order_detail_returns_nested_tickets(self):
        ticket = Ticket.objects.create(tier=self.tier)
        order = Order.objects.create(customer=self.user)
        order.tickets.set([ticket])

        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/orders/{order.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertIn('tickets', response.data)
        self.assertEqual(len(response.data['tickets']), 1)
        self.assertIn('tier', response.data['tickets'][0])
        self.assertEqual(response.data['tickets'][0]['tier']['name'], 'General Admission')
        self.assertIn('total_price', response.data)
```

**What's happening here:**

- We create one ticket and one order, then fetch the detail endpoint using the order's real database `id` in the URL.
- `self.assertIn('tickets', response.data)` checks that the `tickets` key exists in the response. If someone changed `OrderDetailSerializer` and renamed or removed that field, this test would catch it.
- `self.assertEqual(len(response.data['tickets']), 1)` confirms exactly one ticket is returned.
- `self.assertIn('tier', response.data['tickets'][0])` drills one level deeper and confirms that each ticket has a nested `tier` object — not just a flat integer ID.
- `self.assertEqual(response.data['tickets'][0]['tier']['name'], 'General Admission')` verifies the content of the nested data. `'General Admission'` is the tier name we set in `setUp`. This confirms the serializer is following the FK relationship from `Ticket` to `TicketTier` and reading the `name` field correctly.
- `self.assertIn('total_price', response.data)` confirms the `total_price` property is exposed in the response. This is a `@property` on the model, not a database column — DRF needs an explicit `DecimalField(read_only=True)` in the serializer to include it. Without this assertion, a developer could accidentally remove that field from the serializer and no test would notice until a user saw a broken order confirmation page.

Run the tests:

```
python manage.py test event_tickets
```

`Ran 6 tests — OK`. All tests passing.

---

## Step 10 — Best Practices for Django Tests

### Name tests like sentences
`test_user_cannot_see_other_users_orders` reads like a product requirement. When this test fails in CI, you know immediately what broke without reading the code inside. Compare that to `test_orders_2` which tells you nothing. Use the format `test_<subject>_<condition>_<expected_result>`.

### One behaviour per test
Don't write a single test that creates an order, checks the status code, verifies the database, AND tests that the total price is correct. Each of those is a separate concern. When a test with five assertions fails, you have to dig through to find which assertion triggered. When a test with one assertion fails, you know exactly what's wrong.

### Test the sad path, not just the happy path
We tested that a valid order returns `201`. What about an invalid payload — what if `quantity` is `0` or `ticket_tier_id` doesn't exist? What if the user is not authenticated? These edge cases are where bugs hide. For every happy path test, ask yourself: "what could go wrong, and do I have a test for it?"

### Don't test Django or DRF itself
You don't need to test that `ModelSerializer` serializes a `CharField`. Django and DRF are already tested by their own test suites. Test *your* code — your custom model properties, your `get_queryset` filters, your permission logic, your custom `create` method.

### Use `force_authenticate` over real tokens in unit and integration tests
Generating real JWT tokens requires posting to the auth endpoint, extracting the token, and setting the `Authorization` header on every request. That's a lot of noise for tests focused on view behaviour. `force_authenticate` is DRF's official testing shortcut and is completely appropriate for this level of testing. Save the real token flow for dedicated authentication tests.

### Keep `setUp` minimal
Only put in `setUp` what every test in the class needs. If only two tests need a second user, create that user inside those two tests — don't add it to `setUp` where it becomes invisible clutter that makes `setUp` harder to read. A bloated `setUp` makes it hard to understand what each test actually depends on.

### Run tests before every pull request
`python manage.py test` takes a few seconds. Make it part of your workflow before you push to GitHub. In a professional environment, CI (continuous integration) runs the full test suite automatically on every push — a failing test blocks the PR from being merged. Your test suite is the shared contract that protects the whole team.

---

## Running the Tests — Reference

Run everything:
```
python manage.py test
```

Run one app:
```
python manage.py test event_tickets
```

Run one class:
```
python manage.py test event_tickets.tests.EventTicketsTestCase
```

Run one test method:
```
python manage.py test event_tickets.tests.EventTicketsTestCase.test_order_total_price
```

Verbose output (shows each test name as it runs):
```
python manage.py test --verbosity=2
```

---

## Step 11 — Commit, Push, and Open a Pull Request

Your test suite is passing and your work is done. Now follow the same workflow you've been using since example 10 to get your changes reviewed.

**Run the full test suite one final time** before committing to make sure everything is green:

```
python manage.py test event_tickets
```

**Stage and commit your changes** with a message that describes what the tests cover, not just that tests were added:

```
git add event_tickets/tests.py
git commit -m "Add unit and integration tests for event_tickets"
```

**Push your branch to GitHub:**

```
git push --set-upstream origin <your-branch-name>
```

**Open a pull request** on GitHub from your branch into `main`. In the PR description, link your issue with `Closes #<issue-number>` so the issue closes automatically when the PR is merged.

---

## Conclusion

In this example you wrote your first automated tests for the TicketMono backend:

- **Why testing matters** — confidence when refactoring, a safety net for teammates, living documentation, and faster debugging
- **The testing pyramid** — unit tests for isolated logic, integration tests for endpoints, E2E tests for user flows (coming later)
- **`setUp`** — shared test data that resets before every test so tests cannot affect each other
- **`APITestCase` and `force_authenticate`** — DRF's built-in tools for testing authenticated endpoints without dealing with real tokens
- **Testing the happy path and the sad path** — valid requests, authentication enforcement, data scoping, and response shape validation
- **Best practices** — descriptive test names, single-concern tests, testing your code not the framework, keeping `setUp` minimal

Every feature you build from here should have tests alongside it. It might feel like extra work at first, but it pays off the first time you refactor something and the suite stays green — and catches the bug before it reaches your teammates.
