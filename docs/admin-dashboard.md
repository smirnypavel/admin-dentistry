# Admin Dashboard API

This document describes endpoints and payloads for the Admin Dashboard widgets. All endpoints are protected by admin auth (either `x-api-key` or `Authorization: Bearer ...`).

## GET `/admin/dashboard`

- Purpose: unified payload for dashboard widgets (single request for fast admin UI)
- Auth: `x-api-key` or Bearer token
- Query params:
  - `from` (string, optional): ISO date inclusive lower bound; default: 30 days before `to`
  - `to` (string, optional): ISO date inclusive upper bound; default: now (UTC)
  - `granularity` (string, optional): one of `day|week|month` for time series bucketing; default: `day`
  - `tz` (string, optional): IANA timezone name for bucketing (e.g., `Europe/Kyiv`); default: `UTC`
  - `topLimit` (number, optional): max top products; default: 10, max: 100
  - `recentLimit` (number, optional): number of recent orders to return; default: 10, max: 100

Response example:

```
{
  "range": {
    "from": "2025-08-14T00:00:00.000Z",
    "to": "2025-09-13T23:59:59.999Z",
    "granularity": "day",
    "timezone": "UTC"
  },
  "summary": {
    "ordersTotal": 23,
    "ordersNonCancelled": 21,
    "revenue": 15230,
    "itemsSold": 87,
    "avgOrderValue": 725.24
  },
  "salesSeries": [
    { "periodStart": "2025-09-10T00:00:00.000Z", "orders": 3, "revenue": 2100, "itemsSold": 12 }
  ],
  "topProducts": [
    { "productId": "665f1a2b3c4d5e6f7a8b9c0d", "title": "Композит A2", "quantity": 24, "revenue": 8400 }
  ],
  "recentOrders": [
    {
      "_id": "66f000000000000000000001",
      "phone": "+380971112233",
      "clientId": "web-abc",
      "itemsTotal": 700,
      "total": 700,
      "status": "new",
      "itemsCount": 2,
      "createdAt": "2025-09-12T12:00:00.000Z"
    }
  ],
  "catalogHealth": {
    "productsTotal": 128,
    "productsActive": 120,
    "variantsTotal": 356,
    "productsWithImages": 97,
    "productsWithoutImages": 31
  },
  "discountsHealth": {
    "total": 12,
    "activeNow": 7,
    "upcoming": 2,
    "expired": 3
  }
}
```

Curl example:

```bash
curl -H "x-api-key: $ADMIN_API_KEY" "http://localhost:3000/admin/dashboard?granularity=day&topLimit=5&recentLimit=5"
```

Notes:

- Revenue excludes orders with status `cancelled`.
- Series buckets by `createdAt` using MongoDB `$dateTrunc` with provided `tz` and `granularity`.
- `avgOrderValue` = `revenue / ordersNonCancelled`.
- Health sections are simple counts (kept minimal for performance on small instances).
- Performance: an index on `orders.createdAt` is defined to speed up range queries. If your dataset grows, consider adding compound indexes aligned with your primary filters (e.g., `{ status: 1, createdAt: -1 }`).

## Future Extensions

- Additional breakdowns (by manufacturer/country/category)
- Conversion funnel (requires more events)
- Cache layer (Redis) if traffic grows
- Export CSV for the period
