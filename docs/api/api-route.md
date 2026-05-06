# Health Endpoint

`GET /api` — Service health check.

---

## Endpoint

```
GET /api
```

## Response

```json
{
  "message": "Hello, world!"
}
```

---

## Status Codes

| Code | Meaning |
|---|---|
| 200 | Service is running |

---

## Usage

This endpoint is primarily used for:
- **Health checks** — Verify the Cloudflare Workers deployment is responding
- **Monitoring** — Confirm the API layer is alive
- **Debugging** — Quick test that server-side code is executing

---

## Implementation

**File:** `src/app/api/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}
```

This is a minimal endpoint. It does not check database connections, external services, or cache status. It simply confirms the Workers runtime is executing code.
