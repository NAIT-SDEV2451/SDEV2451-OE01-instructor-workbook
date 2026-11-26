---
paths:
  - "ticketmono_frontend/src/**"
---

# Frontend

- Data flows from `src/api` to `src/hooks` to pages. Networks calls only happen in `src/api/`, through `apiClient`
- Server state uses TanStack Query, and query keys include every parameter.
- Every page that loads data handles loading, error and empty states.
- Forms use controlled inputs like `LoginForm`. No form libraries.
- Style with the existing Tailwind and daisyUI classes. No new UI libraries.