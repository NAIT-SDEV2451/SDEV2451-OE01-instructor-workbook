# Backend Testing with Coverage — Django & DRF

In the last example you wrote your first automated tests for the TicketMono backend — a unit test for `Order.total_price` and five integration tests for the Events and Orders API endpoints. In this example we introduce **coverage**: a tool that measures which lines of your source code are actually executed when your tests run. By the end you'll be able to generate a report that shows exactly which parts of the codebase your tests are reaching and — more importantly — which parts they're missing.

---

## Quick Review — What We Built in Example 11

Before jumping into coverage, let's revisit the key ideas from the last example.

**`setUp`** runs before every test method and creates shared test data — a user, an organizer, a venue, an event, and a ticket tier. Because Django wraps each test in a rolled-back transaction, this data is always fresh and tests can never affect each other.

**`APITestCase`** gives us `self.client`, a test HTTP client built into DRF. We use `self.client.force_authenticate(user=self.user)` to authenticate requests without dealing with real JWT tokens.

**Unit tests** check isolated logic — our `test_order_total_price` test confirms the `@property` on `Order` sums ticket prices correctly without going near the HTTP layer.

**Integration tests** check that multiple layers work together — our tests for the events and orders endpoints send real requests through the full Django request/response cycle and check status codes, response shapes, and database state.

The six tests we have are a solid start. But how do we know if they're enough? That's where coverage comes in.

---

## What is Coverage?

Coverage answers one question: **when your tests run, which lines of your source code get executed?**

Imagine your codebase as a map and your tests as a flashlight. Coverage tracks which parts of the map your flashlight illuminates. Any line that is never reached during a test run is a **gap** — code that could be broken and your tests would never notice.

A **coverage percentage** like `72%` means that 72% of your lines were executed at least once during the test suite. The remaining 28% were never touched — those could contain bugs, wrong behaviour, or broken logic that your tests would silently miss.

**Coverage does not tell you your tests are correct.** A test could execute a line and assert nothing about it — the line is "covered" but untested in any meaningful sense. Coverage is a diagnostic tool, not a quality guarantee. It tells you where your tests definitely can't catch a bug; it doesn't tell you where they will.

**What's a good coverage number?** There's no universal answer. 80% is a common floor in professional projects. What matters more than the number is understanding what the uncovered lines are and making a deliberate decision about whether they need a test.

---

## What We'll Cover in This Example

- **Step 1** — Create a GitHub issue and branch
- **Step 2** — Install coverage
- **Step 3** — Run tests with coverage
- **Step 4** — Read the terminal report
- **Step 5** — Configure coverage with `.coveragerc`
- **Step 6** — Generate the HTML report
- **Step 7** — Read the HTML report and understand the gaps
- **Step 8** — Add a test to fill a coverage gap
- **Step 9** — Add tests for the authentication endpoints
- **Step 10** — Commit, push, and open a pull request

---

## Steps

### Step 1 — Create a GitHub Issue and Branch

Create a GitHub issue in your repository:
- **Title:** Add coverage reporting to backend test suite
- **Label:** enhancement

Then create a branch named after your issue number:

```
git checkout -b <issue-number>-add-coverage-reporting
```

---

### Step 2 — Install Coverage

`coverage` is already listed in `requirements.txt`. Install it into your virtual environment:

```
pip install coverage
```

`coverage` is a Python tool — it wraps your test runner, intercepts every line of code that executes, and records which lines were hit. It's not Django-specific; it works with any Python project, but it has first-class support for Django's test runner.

---

### Step 3 — Run Tests with Coverage

Instead of running tests with `python manage.py test`, you run them through `coverage`:

```
coverage run manage.py test
```

**What's happening here:**

- `coverage run` starts the coverage measurement tool and then runs whatever command follows it — in this case `manage.py test`
- All six of your existing tests run exactly as before, but coverage is watching every line that gets executed across the entire codebase
- When the tests finish, coverage saves the results to a hidden file called `.coverage` in the current directory — you won't see any output yet

You should see the usual test output ending with `Ran 6 tests — OK`. The coverage data has been collected but not displayed yet.

---

### Step 4 — Read the Terminal Report

Now ask coverage to display the results:

```
coverage report
```

You'll see output similar to this:

```
Name                                          Stmts   Miss  Cover
-----------------------------------------------------------------
event_tickets/__init__.py                         0      0   100%
event_tickets/admin.py                            3      0   100%
event_tickets/apps.py                             4      0   100%
event_tickets/migrations/0001_initial.py         47      0   100%
event_tickets/models.py                          32      0   100%
event_tickets/serializers.py                     37      3    92%
event_tickets/tests.py                           52      0   100%
event_tickets/urls.py                             5      0   100%
event_tickets/views.py                           26      6    77%
core/models.py                                   13      2    85%
core/views.py                                    21     12    43%
...
-----------------------------------------------------------------
TOTAL                                           350     45    87%
```

**What each column means:**

- **Stmts** — the total number of executable statements in the file (blank lines and comments don't count)
- **Miss** — the number of statements that were never executed during the test run
- **Cover** — the percentage of statements that were executed at least once (`(Stmts - Miss) / Stmts`)

**What to look at first:** ignore files you didn't write — migrations, `__init__.py`, `apps.py`. Focus on `views.py`, `models.py`, and `serializers.py`. Those are where your business logic lives and where coverage gaps are most important.

---

### Step 5 — Configure Coverage with `.coveragerc`

The default report includes migration files, `manage.py`, and other files you don't need to test. A `.coveragerc` file lets you tell coverage what to include and exclude.

Create a file named `.coveragerc` in the `ticketmono_backend/` directory (the same folder as `manage.py`):

```ini
[run]
source = event_tickets, core
omit =
    */migrations/*
    manage.py
    */asgi.py
    */wsgi.py

[report]
show_missing = True
```

**What each section does:**

- `[run]` configures what coverage measures when you run `coverage run`
- `source = event_tickets, core` tells coverage to only measure those two apps — this focuses the report on your code and nothing else
- `omit` lists patterns of files to exclude. Migrations are auto-generated code you didn't write; `manage.py`, `asgi.py`, and `wsgi.py` are boilerplate that never changes
- `[report]` configures how the report is displayed
- `show_missing = True` adds a **Missing** column to the terminal report that shows the exact line numbers that weren't executed — this is what makes coverage actionable

Now re-run with the configuration in place:

```
coverage run manage.py test
coverage report
```

The report is now focused and the **Missing** column shows you exactly which lines to look at:

```
Name                                    Stmts   Miss  Cover   Missing
---------------------------------------------------------------------
core/models.py                             13      2    85%   45-46
core/views.py                              21     12    43%   18-34
event_tickets/models.py                    32      0   100%
event_tickets/serializers.py               37      3    92%   53-55
event_tickets/views.py                     26      6    77%   20-23, 31
---------------------------------------------------------------------
TOTAL                                     189     23    88%
```

Now you can open those specific files, jump to those line numbers, and see exactly what code your tests aren't reaching.

---

### Step 6 — Generate the HTML Report

The terminal report gives you numbers. The HTML report gives you a visual — you can click into any file and see line-by-line which code is covered (green) and which is not (red).

Generate it with:

```
coverage html
```

This creates a folder called `htmlcov/` in your current directory. Open `htmlcov/index.html` in your browser. You'll see the same summary table as the terminal report, but every filename is a link — click any file to see the annotated source.

**Green lines** were executed at least once during the test run.
**Red lines** were never executed — these are your coverage gaps.
**Yellow lines** indicate partial branch coverage (a condition was evaluated but not all branches were taken — more on this below).

> **Important:** Add `htmlcov/` and `.coverage` to your `.gitignore` so generated report files don't end up in your repository.

---

### Step 7 — Read the HTML Report and Understand the Gaps

Open `event_tickets/views.py` in the HTML report. You'll likely see red lines in `EventViewSet.get_serializer_class` and possibly in `OrderViewSet`.

Here's what each gap in `views.py` tells you:

**`EventViewSet.get_serializer_class` (lines 20–23)** — the `if self.action == "list"` branch. Our test hits the list endpoint so this may be green, but any other action (retrieve, create, update, delete) on `EventViewSet` is untested — those code paths are never reached.

**`OrderViewSet.get_serializer_class` (line 31)** — the `if self.action == "retrieve"` branch returns `OrderDetailSerializer`, and the `else` branch returns `OrderSerializer`. Our `test_order_detail_returns_nested_tickets` test covers the `retrieve` branch, and `test_create_order` covers the `list`/create serializer path. If either branch shows as red, that test is missing.

Open `core/views.py` in the HTML report. The registration and login views are likely almost entirely red — we have no tests for the authentication endpoints at all. That's a significant gap, and we'll close it in Step 9.

**The key question to ask about each gap:** "If someone broke this code, would any test fail?" If the answer is no, that's a gap worth closing. If the code is a rarely-used edge case or truly trivial boilerplate, you might make a deliberate decision to leave it.

---

### Step 8 — Add a Test to Fill a Coverage Gap

Let's fix one concrete gap: there's no test confirming that an unauthenticated user cannot create an order. The `create` action in `OrderViewSet` is protected by `IsAuthenticated`, but we've never verified that an unauthenticated `POST` is rejected. This is the same class of test we wrote for the events list in example 11.

Open `event_tickets/tests.py` and add the following method to `EventTicketsTestCase`:

```python
    def test_create_order_requires_authentication(self):
        payload = {
            'items': [
                {
                    'event_id': self.event.id,
                    'ticket_tier_id': self.tier.id,
                    'quantity': 1,
                }
            ]
        }
        response = self.client.post('/api/v1/orders/', payload, format='json')

        self.assertEqual(response.status_code, 401)
        self.assertEqual(Order.objects.count(), 0)
```

**What's happening here:**

- We send a `POST` to the orders endpoint with no credentials — `self.client` is unauthenticated by default
- `self.assertEqual(response.status_code, 401)` confirms the permission check rejects the request before any order is created
- `self.assertEqual(Order.objects.count(), 0)` confirms nothing was written to the database — the rejection was real, not just a misleading status code

Run the full suite with coverage to see the improvement:

```
coverage run manage.py test
coverage report
```

Your coverage percentage should tick up and the line for the unauthenticated rejection path in `views.py` should now be green in the HTML report.

```
coverage html
```

Open `htmlcov/index.html` and navigate to `event_tickets/views.py` to confirm the previously red lines are now green.

**This is the coverage cycle:** run → inspect the report → identify a meaningful gap → write a test → run again and confirm the gap is closed. You don't need to chase 100% — you need to make deliberate decisions about every gap.

---

### Step 9 — Add Tests for the Authentication Endpoints

The HTML report showed that `core/views.py` is almost entirely red. There are two endpoints there: `UserRegistrationView` and `MeView`. Let's write tests for both.

Open `core/tests.py` and replace its contents with the following:

```python
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class UserRegistrationViewTestCase(APITestCase):
    url = "/api/v1/auth/register/"

    def test_register_creates_user(self):
        payload = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepass123",
        }
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(response.data["message"], "User registered successfully.")

    def test_register_with_missing_fields_returns_400(self):
        payload = {"username": "newuser"}
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    def test_register_with_duplicate_username_returns_400(self):
        User.objects.create_user(username="existing", email="a@example.com", password="pass1234")
        payload = {
            "username": "existing",
            "email": "b@example.com",
            "password": "pass1234",
        }
        response = self.client.post(self.url, payload)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(User.objects.count(), 1)


class MeViewTestCase(APITestCase):
    url = "/api/v1/auth/me/"

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="user",
        )

    def test_me_returns_user_data(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["username"], self.user.username)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(response.data["role"], self.user.role)
        self.assertEqual(response.data["id"], self.user.id)

    def test_me_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 401)
```

**What each test class covers:**

`UserRegistrationViewTestCase` tests `POST /api/v1/auth/register/`:

- `test_register_creates_user` — a valid payload returns 201 and creates exactly one user in the database; the response body contains the success message
- `test_register_with_missing_fields_returns_400` — a payload missing the required `email` and `password` fields returns 400 and creates no user
- `test_register_with_duplicate_username_returns_400` — attempting to register a username that already exists returns 400 and leaves the database unchanged

`MeViewTestCase` tests `GET /api/v1/auth/me/`:

- `test_me_returns_user_data` — an authenticated request returns 200 and the correct `id`, `username`, `email`, and `role` fields for the logged-in user
- `test_me_requires_authentication` — an unauthenticated request returns 401; the endpoint is not publicly accessible

Run the full suite to confirm all tests pass:

```
coverage run manage.py test
coverage report
```

Re-generate the HTML report and open `core/views.py` — the lines that were red before should now be green.

```
coverage html
```

---

### Step 10 — Commit, Push, and Open a Pull Request

Run the full test suite one final time to confirm everything passes:

```
coverage run manage.py test
```

Before committing, make sure `htmlcov/` and `.coverage` are in your `.gitignore` — these are generated files and don't belong in the repository.

Stage and commit your changes:

```
git add event_tickets/tests.py core/tests.py .coveragerc .gitignore
git commit -m "Add coverage configuration and tests for orders and authentication endpoints"
```

Push your branch:

```
git push --set-upstream origin <your-branch-name>
```

Open a pull request on GitHub from your branch into `main` and link your issue with `Closes #<issue-number>` in the description.

---

## Conclusion

In this example you added coverage measurement to the TicketMono test suite:

- **What coverage measures** — which lines of your source code are executed when your tests run, expressed as a percentage
- **`coverage run manage.py test`** — runs your tests while collecting coverage data
- **`coverage report`** — displays a terminal summary with statement counts, miss counts, and coverage percentages
- **`.coveragerc`** — configures what to measure and what to exclude, and enables the `show_missing` column that shows exact line numbers
- **`coverage html`** — generates a browsable HTML report with line-by-line colour coding: green for covered, red for not
- **Reading the gaps** — every red line is a code path that your tests don't reach; the question to ask is "if someone broke this, would any test catch it?"
- **The coverage cycle** — run, inspect, identify a meaningful gap, write a test, run again

Coverage is a habit, not a one-time task. Run it regularly — ideally as part of your pull request workflow — so gaps don't accumulate silently as the codebase grows.
