---
name: "run-tests"
description: "Run the backend and frontend tests, with backend coverage, and reports a short summary."
disable-model-invocation: true
---

In `ticketmono_backend`, run `coverage run manage.py test`, `coverage report` and `coverage html`.
In `ticketmono_frontend`, run `npm run test:run`.

Report the pass and fail counts for each, and the backend coverage percentage. For any failure, give the test name and the error only. List the changed backend files with the lowest coverage.

Finish by suggesting we open `ticketmono_backend/htmlcov/index.html` in browser, giving the path.

Don't change any source files.