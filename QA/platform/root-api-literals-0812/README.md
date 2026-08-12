# Is the mount-prefix API bug closed? — all 25 mounts, measured on production

**When** 2026-08-12 · **What** priority §1 / core.issues #154 · **Deployed** nothing (measurement only)

## Why

Three systems shipped a bundle whose `fetch()` calls were written root-relative
(`/api/...`). Served from `more30.com/<mount>/` those calls leave the app and
land on the portal, which answers a 404 — so every save and every load in the
product fails, and from outside nothing looks broken. imud (04) was found on
12/08 05:56Z, kupot (28) the same morning, mechiron (27) at 07:48Z. Each was
found on its own, by walking into it. The last heartbeat's line (4) claimed the
sweep was complete; that claim had never been tested against the thing that is
actually served.

This asks the question of every mount at once, against production, not against
the source tree — because the source tree is not what is being served.

## Method

`scan.ps1`: GET `more30.com/<mount>`, take every same-origin `<script src>`, GET
each asset, regex the emitted JavaScript for root-relative API literals in the
five shapes vite and webpack preserve. Then, for every hit, read the bundle and
resolve the base the call site actually uses. A regex hit is a candidate; the
verdict is the base.

Two things the first run got wrong and this one does not:

- **Trailing slash.** `more30.com/<mount>/?cachebust=…` answers **308** on every
  Next.js mount and the query does not survive the redirect, so 7 of 25 mounts
  scanned 0 assets and reported clean. Requesting `/<mount>` with no query
  fixed it. Staleness is covered instead by the asset names: they are content
  hashes, and the Next mounts append `?dpl=<deployment>`, so stale HTML would
  name a different file rather than the same file with different bytes.
- **A hit is not a bug.** 7 of the 13 hits are the same library string.

## Result — the class is closed on all 25 mounts

| mounts | hits | verdict |
|---|---|---|
| torah, egod, chatzor, mthbram, galil, crm, gesher | `/api/broadcast` | **not ours.** `@supabase/realtime-js` `broadcastEndpointURL` rewrites the *realtime endpoint's* pathname (`…replace(/\/socket\/websocket$/i,"")` immediately before it). It never touches more30.com. |
| mechiron (27) | 294 × `"/api/…"` | **fixed and live.** `qt = "__PORT_5000__".startsWith("__") ? XF : …`, `XF = "/mechiron/".replace(/\/+$/,"")` — the d478863 fix, verified in the served bundle. |
| chizukim (17) | `/api/transcribe/${id}` | **fine.** `Fo = "/chizukim"`, and `Gw` fetches `` `${Fo}${path}` ``. |
| studio (26) | `/api/templates` | **fine.** `em = wv`, `wv = "/studio/".replace(/\/+$/,"")`. Confirmed end to end: `more30.com/api/templates` → 404 text/plain, `more30.com/studio/api/templates` → **200 JSON**, real templates. |
| imud (04), kupot (28) | queryKeys + `apiRequest` paths | **fixed previously** (8507410, 6551b75); their live APIs already answer 200 under the mount. |
| smel (12) | `/api/questionnaire` | **latent, not reachable** — see below. |
| tamlul, modaot, orech, nadlan, gannenet, briut, bkalot, smachot, zchuyot | — | clean. |
| kesef, tivuch, kiosk | — | **not scanned, and correctly so**: their entry HTML is a hand-written static page and carries no same-origin script at all. Nothing to scan, not a gap in the scan. |

## The one thing worth writing down: smel (12)

smel's bundle **does** contain the unfixed fallback —

```js
const tS = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";
//                                            ^^ mechiron's bug, byte for byte
```

— and `tS` is used by react-query's default `queryFn`:
`fetch(\`${tS}${queryKey.join("/")}\`)`. Under `/smel/` that resolves to
`more30.com/api/…`, the portal.

It is **not** a live fault, and this is stated as a measurement rather than a
reading: the whole bundle contains exactly one `queryKey`, and it supplies its
own `queryFn`:

```js
queryKey: ["/api/questionnaire"], queryFn: () => eC()
```

so the default `queryFn` — the only consumer of `tS` — is never invoked. Dead
code with a live-looking shape. Left alone deliberately: touching it means
rebuilding and redeploying 12 to change nothing a user can observe, and §1's
anti-drift rule is function before polish. It is recorded here so that the next
query added to smel does not quietly become the fourth instance of this bug.

## Not claimed

- Only the entry HTML's scripts are scanned. A route-split chunk that no entry
  page pulls in would be missed on the Vite mounts (each ships one bundle, so
  this is narrow); the Next mounts ship 7–8 chunks and all were read.
- `more30.com/kiosk` serves an HTML page with no application script. That is
  outside this question and is not asserted either way here.

## Files

- `scan.ps1` — re-runnable; writes `_results.json` beside itself
- `_results.json` — per mount: index status, every asset with its byte count,
  every hit with pattern, count and a 70-char sample
