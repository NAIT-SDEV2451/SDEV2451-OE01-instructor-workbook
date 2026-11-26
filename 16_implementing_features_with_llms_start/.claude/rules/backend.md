---
paths:
  - "ticketmono_backend/**/*.py"
---

# Backend

- Use DRF ViewSets, serializers and routers, mathcing `event_tickets`
- Keep `select_related` and `prefretch_related` on querysets that return related data.
- Set permissions explicitly on every ViewSet, with `permissions_classes` or `get_premissions`.