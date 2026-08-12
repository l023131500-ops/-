# mounted-api-base, 12/08 — the last two entries in core.issues #154, settled

`scripts/qa/mounted-api-base.mjs`, run against production. **16 passed, 0 failed**
(was 14 / 2 on the same tree before this step; 4 / 12 when #154 was opened).

    QA_OUT_DIR=QA/platform/mounted-api-base-0812 node scripts/qa/mounted-api-base.mjs

`QA_OUT_DIR` is new. The script wrote to `mounted-api-base-0810` unconditionally,
and that folder is the evidence #154 cites — a re-run would have overwritten the
measurement it is being compared against.

## What was left, and why it was not a bug

Two mounts still failed, both with the candidate verdicts the script is careful
not to call proof: imud `mount_prefix` on `/api/books` and `/api/meta`, kupot
`mount_other_method` on `/api/agent` and `/api/switch-lead`. Both say the same
thing — the route answers under the mount — and neither says whether the shipped
client gets there, because the prefix is applied at the call and never written
into the literal. That is the same standing studio (26) had until commit 8537099
read its call site.

Both bundles turn out to carry studio's shape with one wrapper around it:

    // _deploy/imud-more30/public/imud/assets/index-DbqCalt6.js
    Nx = "/imud/".replace(/\/+$/,""), Cx = {}, z1 = Cx?.VITE_API_BASE,
    v2 = z1 && z1.trim() ? z1.trim().replace(/\/$/,"")
                         : "__PORT_5000__".startsWith("__") ? Nx : "__PORT_5000__"
    fetch(`${v2}${t}`, …)                 // apiRequest
    fetch(`${v2}${t.join("/")}`)          // the default queryFn

kupot's is identical with `AT`/`Bd`/`ew` and `"/kupot/"`. `Nx`/`AT` is Vite's
`BASE_URL` inlined at build time — what commit 6551b75 changed for kupot and
8507410 for imud. The reader could not follow it because of the override: it had
no rule for a property read off an object literal, so `z1` was unknown, and an
unknown condition leaves the whole expression undecided.

## The rule that was added, and the thing it refuses to do

`evalBase` gained two symbols kept deliberately apart from `null`:
`EMPTY_OBJECT` for a bare `{}` — an `import.meta.env` object Vite emitted with
nothing in it — and `ABSENT` for a property read off one. `null` still means
"could not read this", and it is never allowed to act like "provably empty":
the override branch grants the base only when the override resolves to `ABSENT`.
A build that really did set `VITE_API_BASE` would take the other branch and the
base would be its value, so an unreadable override keeps the artifact in failure.

The negative controls in the same run are the evidence that nothing was blanket-
granted: mechiron and smel still resolve their base to `""` and get no grant
(mechiron additionally carries 9 bare `fetch("/api/…")` sites), and the
regression lock `/studio/api/brands → JSON` still passes.

## Confirmed in a browser, not only by reading the bundle

Chromium, viewport 1280×900, through more30.com — the address the customer uses:

| page | request the browser actually sent | status |
| --- | --- | --- |
| `/imud/` | `https://more30.com/imud/api/books` | 200 |
| `/kupot/` | `https://more30.com/kupot/api/hf/meta` | 200 |
| `/kupot/` | `https://more30.com/kupot/api/hf/topics` | 200 |

Nothing asked more30.com for a root-relative `/api/…`. `imud-live.png` shows the
two real rows that came back from `/imud/api/books` drawn under "הספרים שלי".

`/api/agent` and `/api/switch-lead` are POSTs behind a user action and were not
fired — sending them would write a real lead into a live system. They are reached
by the same module-level constant as the two calls that were observed; that is
the reading, and it is stated as a reading.

## Not claimed

`/api/wizard/infer` stays `reached_mount_function`: the mounted address reached
imud's own function, which answered 404 JSON naming the path back. The probe
sends GET and the client sends POST, so this run does not say whether the route
exists — only that the prefix arrives. Unchanged from 10/08.

Files: `_results.json` · `imud-live.png` · `kupot-live.png`
