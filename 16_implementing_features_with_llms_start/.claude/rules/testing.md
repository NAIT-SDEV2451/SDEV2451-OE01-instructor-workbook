---
paths:
  - "ticketmono_backend/**/tests.py"
  - "ticketmono_frontend/src/__tests__/**"
  - "ticketmono_frontend/src/test/**"
---

# Testing

- Backend tests user `APITestCase`, shared data in `setUp`, and `force_authenticate`
- Don't user mocking in backend tests.
- Frontend tests query the way a user finds things, use MSW at the network boundary, and use `renderWithProviders`
- Keep loading, error and success as separate tests.
- Add a test only when it would catch a different failure from the existing tests. Don't test the same rule twice.
- New behaviour needs a test that would fail without it.