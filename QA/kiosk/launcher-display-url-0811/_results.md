# launcher-display-url-0811 — §2★א's second field on the launcher payload

Item 4 of `apps/35-kioskfleet/STATUS.md` "Next, in order", server half.

## What was wrong

`identify()` distinguishes `kioskUrl` (the venue's main site — what the device
locks to, and where idle-return and a reboot land) from `displayUrl` (what *this*
device shows, §2★א's second field). `launcherProfile()` answered with `kioskUrl`
alone, so on a device given its own link the launcher's `🏠 אתר האולם` button
opened something other than what the tablet was showing a moment before the code
was typed.

Underneath it was the same defect the previous step found in `identify()`: three
allow-list widenings exist and this composed **two**. `launcherProfile()` was the
last call site not going through `deviceConfigHostCsv()`'s composition, so a
device whose own link is on a host nothing else mentions was handed a list that
blocks the page it is showing right now — a blocked page, which in a hall reads
as a broken kiosk. `POST /api/launcher/open` inherits the list from this same
function, so it was wrong there too.

## What changed

`server/src/launcher.js` only:

- `displayUrl: deviceDisplayUrl(device)` in the payload. It is never null while
  the device has a main site — `deviceDisplayUrl()` falls back to it — so the
  page can open it unconditionally rather than re-deriving "NULL means follow the
  main site". Withholding was never the reason it was absent: this caller is
  already handed the venue's address, the approved businesses' and the approved
  links'; `displayUrl` is one of those or `home_url` itself.
- the allow-list wrapped in `configHostCsv(…, shown)`, giving the three widenings
  in `deviceConfigHostCsv()`'s order. Each only ever widens, so "unset stays
  unset" survives all three: a device with no lock is still handed no lock.
- `kioskUrl` is unchanged and is still `home_url`. This is not a second lock.

## Verified

`node --test "test/*.test.mjs"` → **152 tests, 151 pass**. The baseline before
this step was 146/145, so the 6 new cases in `test/launcher.test.mjs` are the
whole difference, and the one failure is still `routing.test.mjs`, which imports
express (`server/node_modules` is not installed in this checkout).

`node QA/kiosk/launcher-display-url-0811/check.mjs` → **8/8**. A test written
after a change cannot show the defect was real, and #35's source is gitignored
here so there is no `git show` of the previous version to diff against. So the
harness rebuilds the **pre-change expression verbatim** from the same modules
over the same rows and measures it:

| | |
|---|---|
| before | payload has no `displayUrl` at all |
| before | `allowedHost` omits `screen.example.com` — the device's own link — while carrying the client's and the approved link's hosts, so it is the third widening missing and not a broken fixture |
| before | `identify()` says the tablet is showing `screen.example.com` and the launcher's only address is the venue's |
| after | both fields answered, `screen.example.com` in the list |
| after | `display_url` NULL → `displayUrl` is the main site, and the list is byte-identical to before |
| after | `allowed_host = ''` stays `''` |
| after | `device`, `kioskUrl`, `idleReturnSeconds` unmoved in both fixtures |
| after | the launcher and `identify()` agree on all three context fields for one device |

`/open` is covered by a test that reads `src/routes/launcher.js` off disk and
asserts it still takes `allowedHost` from `launcherProfile()` rather than
building a second expression — which is exactly how the call sites
`deviceConfigHostCsv()` exists to unify drifted apart in the first place.

## Not done here

The route replay is at module level plus that disk read; `/resolve` was not
driven over a socket in this step, because the field it now carries is a plain
passthrough and the express glue is what the earlier launcher runs already
exercised.

**Not deployed**, and the page does not draw it yet: `public/kiosk-launcher.html`
still labels the venue button from `kioskUrl`. That is the next step and it is
`public/` only.
