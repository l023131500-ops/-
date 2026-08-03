## Goal

Build a professional, bilingual (Hebrew RTL + English) web interface for the price-comparison bot. Lovable hosts **only the frontend** plus a thin server-side proxy. The browser never calls the FastAPI backend directly (no CORS, backend URL + admin token stay secret).

The backend is ready — its endpoints are confirmed:
- `POST /api/web/search` → `{ status, query, results: [{ product_name, manufacturer, chain_name, branch_name, price }] }`
- `GET /health` → `{ status: "ok", price_rows: number }`
- `POST /api/admin/trigger-fetch` (header `X-Admin-Token`) → `{ status: "fetch_started" }` or 401

## Architecture

```text
Browser (React UI, he/en + RTL)
        │  same-origin call
        ▼
Lovable server functions  ── server-to-server ──►  FastAPI backend (https://b023131500.com)
 (read PRICE_BOT_API_URL + PRICE_BOT_ADMIN_TOKEN     /api/web/search
  from secrets, inside .handler only)                /health
                                                     /api/admin/trigger-fetch
```

## Secrets

I'll request these via the secure form (you already have the values):
- `PRICE_BOT_API_URL` = `https://b023131500.com`
- `PRICE_BOT_ADMIN_TOKEN` = the long random token from your `.env`

## What I'll build

**Server-function proxy** (`src/lib/price-bot.functions.ts`):
- `searchPrices({ query })` → POST `${PRICE_BOT_API_URL}/api/web/search`. Zod-validated query (1–100 chars), 30s `AbortController` timeout, returns a typed DTO. On failure returns a normalized `{ status: "error", results: [], error }` shape (no blank screens).
- `getStatus()` → GET `${PRICE_BOT_API_URL}/health`. Returns `{ ok, priceRows, error }`.
- `triggerFetch()` → POST `${PRICE_BOT_API_URL}/api/admin/trigger-fetch` with `X-Admin-Token` header from the secret. Returns `{ started, error }`.
- All read `process.env.*` inside `.handler()` only; if the URL secret is missing, return a friendly "backend not configured" state.

**i18n + RTL** (`src/lib/i18n.tsx`):
- Lightweight context with `he` + `en` dictionaries, language toggle in the header.
- Persists choice in `localStorage`; sets `document.documentElement.dir` to `rtl`/`ltr` and `lang`.
- Localized price formatting (₪) and all UI strings translated.

**Routes:**
- `/` (rewrite `src/routes/index.tsx`) — Search page: prominent input (barcode or product name), submit via TanStack Query (`useServerFn` + `useMutation`). Results render as ranked cards (🥇🥈🥉) with chain, branch, price, and "potential savings" between cheapest and priciest. Loading skeletons; graceful empty/not-found/error states.
- `/status` (new `src/routes/status.tsx`) — Status dashboard: health indicator (reachable + price-row count) via `useQuery`, plus a "Trigger daily fetch" button (`triggerFetch`) with success/error toasts (sonner).
- Shared header component with nav (Search / Status) + language toggle. `__root.tsx` keeps `<Outlet />`; I'll mount the i18n provider + `<Toaster />` there and switch `<html lang>`/`dir` client-side.
- Per-route SEO `head()` metadata (title/description/og) in both languages-neutral form.

**Design system** (`src/styles.css`):
- A retail-friendly, distinctive palette (not the default slate) defined in `oklch` semantic tokens, light + dark, RTL-aware spacing. Medal/rank accent colors as tokens. No generic AI look.

## Technical details

- Stack: TanStack Start + React + TanStack Query (already in template). No Lovable Cloud / database — data comes from your FastAPI backend.
- Reuse existing shadcn components (card, input, button, badge, skeleton, sonner).
- Robust fetch: explicit timeout, normalized error envelopes, no raw provider errors leaked to UI.

## Out of scope

- No scraper/ingestion or database in Lovable — FastAPI stays the source of truth.
- IVR and WhatsApp endpoints stay in the backend; the web UI uses only `/api/web/search`, `/health`, `/api/admin/trigger-fetch`.

## After approval

1. Add the two secrets via the secure form.
2. Build the proxy layer, i18n, design tokens, search page, and status dashboard.
3. Verify end-to-end by invoking the server functions against the live backend and confirming results render.
