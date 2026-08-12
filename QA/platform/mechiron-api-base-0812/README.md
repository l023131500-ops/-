# mechiron (27), 12/08 — the API the client never asked for

`more30.com/mechiron` shipped a bundle whose API base resolved to `""`, so every
call went to the portal root. The API function built for this deployment was live
the whole time, with real data in it, and the browser never sent it a request.

## What production was doing

    GET https://more30.com/api/pc/public/meta          404  text/plain   ← what the client sent
    GET https://more30.com/mechiron/api/pc/public/meta 200  application/json

The second one answers `productCount: 117405`, `storeCount: 1213`,
`activeSources: 33`, `lastUpdatedAt: 2026-08-12T03:18:19Z` — today's import. The
first is Vercel's own `NOT_FOUND`, because `/api/*` at the root of more30.com is
the portal and not this app.

Same for `/api/pc/public/settings`, `/filters`, `/promotions`, `/catalog`,
`/compare/:barcode` and `/public/chatbot/config` — every public route the
function implements.

## The base

`client/src/lib/queryClient.ts` fell back to `""` when `VITE_API_BASE` was unset,
and the mechiron build never set it:

    Un = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__"     // index-DcMphBNb.js

The fallback is now Vite's own `BASE_URL`, trailing slash stripped — the shape
imud took in 8507410 and kupot in 6551b75:

    XF = "/mechiron/".replace(/\/+$/, ""), qt = "__PORT_5000__".startsWith("__") ? XF : "__PORT_5000__"

This is self-consistent rather than a hardcode: the API rides the same prefix the
assets already came from. `base: "/"` leaves `BASE_URL` `"/"`, which strips to
`""` — byte-for-byte the previous behaviour, so the origin deployment that serves
this app from a root is unchanged.

## The nine bare call sites

`mounted-api-base.mjs` recorded 9 `fetch("/api/…")` literals that bypass the base
entirely; `user-auth.tsx` had 3 more inlining the same `__PORT_5000__` ternary.
All 12 now go through `API_BASE`:

    lib/admin-auth.tsx            /api/admin/login
    lib/user-auth.tsx             /api/user/me · /api/user/login · /api/user/logout
    pages/admin-docs.tsx          /api/admin/google/status
    pages/admin-login.tsx         /api/admin/google/status
    pages/public-community.tsx    /api/public/community/:slug · …/submit
    pages/public-health-funds.tsx /api/hf/public/search · /api/hf/public/meta
    pages/public-potential.tsx    /api/public/potential/submit  (×2)

The emitted bundle now contains zero `fetch("/api/` and zero `` fetch(`/api/ ``.

## Verified live, in a browser, through more30.com

Deployed `mechiron-more30` `dpl_B46XCvXYdBkWopGbhqucCRBmTgHf`, target production,
READY. Chromium at 1280×900 on `more30.com/mechiron/#/price-comparison`:

| request the browser actually sent | status |
| --- | --- |
| `https://more30.com/mechiron/api/pc/public/settings` | 200 |
| `https://more30.com/mechiron/api/pc/public/meta` | 200 |
| `https://more30.com/mechiron/api/public/chatbot/config` | 200 |

Nothing asks more30.com for a root-relative `/api`.
`mechiron-price-comparison-live.png` is the screen drawn from those answers:
"מקורות פעילים: 33 · מוצרים: 117,405 · חנויות: 1,213", 22 real categories, six
real promotions and real product cards with barcodes and prices. Before this
deploy that screen had no numbers, no categories and no products.

## Staged, not mirrored

`_deploy/mechiron-more30/public/mechiron/index.html` is **not** vite's output —
it is 34,179 bytes against vite's 3,082, carrying a prerendered `#root` snapshot,
the dark-mode head script and the shared auth pill. Copying `dist/public` over it
would have thrown all of that away. Only the JS asset was swapped and the one
`<script src>` line rewritten; the CSS hash is unchanged (`index-BMbi5OZ_.css`),
which is itself the evidence that nothing but the JS moved.

Diffed against production first: the live document and the disk copy differ only
by NetFree's two injected `<script>` tags, so the disk copy *is* what production
was serving.

## Not claimed, and left open

- The admin routes stay dark. `/api/admin/*`, `/api/rights`, `/api/orgs`,
  `/api/hf/*`, `/api/community/*` and the rest now reach mechiron's own function
  and get its `{"message":"not found","path":…}` instead of the platform's
  text/plain 404 — a truthful answer rather than a working one. That deployment
  carries the public price-comparison routes only, by design, and what #27 should
  serve at all is core.issues #94, which is the user's call. This step does not
  touch it.
- The POST/PATCH sites were not fired. A real `potential/submit` or
  `community/:slug/submit` body writes a live record. They are reached by the
  same `API_BASE` constant as the three GETs that were observed; that is a
  reading, and it is stated as a reading.
- System 27 is `is_protected=false` in `core.projects` with its own repo
  (`bkalut-price`) and its own Vercel project. Nothing here touches the protected
  `bkalut-app` PM2 server, 08, 09, `bkalot-admin`, `zr_*` or `NEDARIM3873`.

Files: `mechiron-price-comparison-live.png` · `check-bundle.ps1` ·
`diff-index.ps1` · `stage.ps1`
