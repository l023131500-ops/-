# kiosk (35) — "אתר ראשי" was the one address on the device that nothing checked

11/08/2026. `node QA/kiosk/home-url-0811/verify.mjs` → **19/19**.
`node --test "test/*.test.mjs"` in `apps/35-kioskfleet/server` → **125/126**
(122 before; the four new cases are in `test/displayurl.test.mjs`, and the one
failure is `routing.test.mjs`, which imports express and cannot run in this
checkout — the documented baseline).

## The defect

`display_url` — §2★א's *second* field, the one that only changes what is on
screen — has refused non-http(s) since it landed, because the value is loaded in
the kiosk webview and a `javascript:` URL there is script running in the one
browser on the device that is supposed to run nothing.

`home_url` — §2★א's **first** field, the one the device *locks onto*, the one
idle-return and a reboot land on, and the one the enrollment response hands a
device that has nothing else yet — was checked less than that:

| door | before |
|---|---|
| `PATCH /devices/:id` | stored raw. No parse, no scheme check, nothing. |
| `POST /enrollments` | `try { new URL(homeUrl) } catch` — and `new URL('javascript:alert(1)')` does not throw. |
| `POST /devices/:id/command` (`set_url`) | host non-empty only, so `ftp://hall.example.com/x` passed. |
| `POST /links` | host non-empty only (which did block `javascript:`, by accident). |
| `PATCH /links/:id` | nothing at all. |

The last two matter because the library is the *source*: both device routes
accept a `linkId` and copy `link.url` into `home_url`.

## The fix

`normalizeHomeUrl()` in `src/displayurl.js` — the module that is already "the two
fields of §2★א" — sharing one `checkWebUrl()` with `normalizeDisplayUrl()`.

- **Empty is not an error and not a clear.** Absent means "leave the main site
  alone" (the PATCH COALESCEs), and a device with no main site was never
  configured rather than having had its lock removed. That is the opposite of
  field 2, where empty is a real value meaning "follow the main site".
- **The library path is validated too.** A link row predates this validation, so
  "picked from the library" is not "already known good". Its error names the
  library, because the owner did not type that address and this screen cannot
  edit it — pointing them at "the main site" sends them to correct a field that
  is not the problem.
- **Host derivation moved after the check**, and stayed on the manual path only:
  a library link carries its own host set, and deriving one would edit the
  device's allow-list on a save where the owner picked a link whose row has none.
- `set_url` now sends the **checked** value, so a trailing newline in a pasted
  address does not reach the webview.

## Corrected by the run

The first version also refused a hostless URL, on the reasoning that the device
matches its allow-list by host. `http:///lobby` is not that case — http is a
WHATWG "special" scheme and it normalises to host `lobby`. Anything that parses
as http(s) has a host, so there is no separate check to write. The branch was
removed and the test now asserts what is actually true.

## Output

```
PATCH /devices/:id — the field the device locks onto
  ok   a javascript: main site is refused, and the column is untouched
  ok   a data: main site is refused
  ok   a bare domain is refused rather than stored as a dead address
  ok   a library link holding a bad address is refused, and says where to fix it
  ok   a good library link still lands, with the row's own host set
  ok   a pasted address is stored trimmed, and the pushed config carries it
  ok   not sending the field leaves the main site exactly alone
  ok   an empty string is "not submitted" here, not "clear the lock"

POST /enrollments — the first config a device ever sees
  ok   a javascript: address is refused, and no enrollment row is written
  ok   the old check passed exactly this, which is why it is here
  ok   a whitespace-only address is still the "choose a link" error
  ok   a real address enrolls, trimmed, with hosts derived

POST /devices/:id/command — set_url
  ok   ftp:// on an allowed host is refused (a host check alone passed it)
  ok   the device is sent the checked value, not the raw one
  ok   the allow-list still decides where a device may be sent

the "before" — the same requests against the code as it was
  ok   the old PATCH stored whatever it was handed

the replay matches the source it claims to replay
  ok   routes/devices.js runs normalizeHomeUrl on all three doors
  ok   the bare `new URL()` guards it replaced are gone
  ok   routes/links.js checks the address on the way in and on edit

19/19 passed
```

## Not covered

- **No screenshot.** Nothing visual changed; the surface here is five refusal
  messages on paths the console already renders as errors.
- **Existing rows are not swept.** A `links` row or a `home_url` stored before
  this change keeps whatever it holds. Rewriting an owner's stored address on a
  boot migration would change what a live device shows without anyone asking;
  the refusal is at the door, and a bad row now surfaces the library error the
  next time someone saves against it.
- **Not deployed** — the Railway service builds from `l023131500-ops/zol`, not
  from this tree. Item 1 of `apps/35-kioskfleet/STATUS.md`.
