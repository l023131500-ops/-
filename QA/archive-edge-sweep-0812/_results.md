# apps/_archive/** edge functions — swept, and the "they are not deployed" assumption is false

Date: 2026-08-12. Method: one unauthenticated bodiless `GET` per function — no `apikey`,
no `Authorization`, no body. Same discriminator as `QA/estate-edge-sweep-0812`: the gateway
answers `401 UNAUTHORIZED_NO_AUTH_HEADER` **before** the function runs when `verify_jwt` is
on, and `404` when the function does not exist. Any other status means the handler executed
with no credential at all.

Bodiless was deliberate: every function here reads `req.json()` early, so an empty body kills
the request before any write or outbound send. Nothing was POSTed, no row was inserted, no
message was sent.

## Why this was worth doing

The previous step (`1a5214a`) closed with open line (5): *"apps/_archive/** has 12 more
functions including admin-set-password and admin-create-user — not swept, on the assumption
they are not deployed, which was NOT verified."*

It was wrong. There are 10 functions across two archived apps, and **all 10 are deployed and
answering right now.** Archiving the source did not undeploy anything.

## The two projects

| app dir | supabase project | what it is |
|---|---|---|
| `apps/_archive/bklotm` | `pwcswdfgorvlpdflzylm` | **system 08 `bkalut-app` — PROTECTED** (`core.projects.is_protected = true`) |
| `apps/_archive/lux-manage` | `zwxwteebcoejrjdufzsv` | orphan — no row in `core.projects` at all, no site, still live |

`bklotm` is a copy of the protected eligibility system: its `leads-api` exposes
`id_number, date_of_birth, spouse_id_number, health_status, disability_percentage`. Read-only
GETs are the one approved exception for 08/09; **nothing on `pwcswdfgorvlpdflzylm` was changed,
and nothing on it is changed by this commit.**

## Results — all 10, unauthenticated GET, no headers

| project | function | http | body |
|---|---|---|---|
| 08 (protected) | check-premium-client | 500 | `{"error":"Unexpected end of JSON input","premium":[]}` |
| 08 (protected) | leads-api | **401** | `{"error":"Missing API key"}` ← gated, correct |
| 08 (protected) | leads-webhook | 500 | `{"error":"Unexpected end of JSON input"}` |
| 08 (protected) | n8n-notify | 500 | `{"error":"Unexpected end of JSON input"}` |
| 08 (protected) | rights-agent | 500 | `{"error":"Unexpected end of JSON input"}` |
| lux-manage | admin-create-user | **401** | `{"error":"Missing authorization"}` ← gated, correct |
| lux-manage | admin-set-password | **401** | `{"error":"Missing authorization"}` ← gated, correct |
| lux-manage | inbound-webhook | 500 | `{"error":"SyntaxError: Unexpected end of JSON input"}` |
| lux-manage | ivr-api | 400 | `{"error":"Unknown action: null"}` |
| lux-manage | **leads-api** | **200** | **the lead table, in full** |

## The finding — core.issues #170, critical

`GET https://zwxwteebcoejrjdufzsv.supabase.co/functions/v1/leads-api` returns **200 with the
contents of the `leads` table** to a caller sending no credential of any kind.

- The function builds a `service_role` client at line 15 and never checks anything.
- `select("*")` — every column: `id, name, email, phone, source, message, created_at`.
- `?limit=` and `?offset=` are caller-controlled and unbounded, so the whole table paginates out.
- `total` reported by the endpoint itself: **6 rows** — real names, real gmail addresses, real
  free-text enquiries. Small, and still six people's contact details readable by anyone who
  guesses the URL.
- The comment above the handler read *"requires auth header with service key or admin JWT"*.
  No such check was ever written. The comment was the whole security model.

Same class as #161 (mthbram `/api/seekers`) and #167 (egod `seed-demo-portals`): `service_role`
behind a gateway with `verify_jwt` off.

**Not just a read.** `POST` and `PUT` on the same endpoint insert into `leads` with no gate
either — `PUT` takes an array, so the table can be filled by anyone. That was **not** tested:
proving it means writing junk into a live table, and the source is unambiguous.

Rows are **not** redacted here by accident — they are omitted on purpose. This file records the
count, the field list and the status code, which is what proves the hole. The values are other
people's personal data and do not belong in a git repo.

## The fix

`apps/_archive/lux-manage/supabase/functions/leads-api/index.ts` — a `readerGate()` that runs
before the router:

- `GET` and `PUT` require `x-api-key == LEADS_API_KEY`.
- **Fails closed**: with no `LEADS_API_KEY` in the environment the reader answers
  `403 leads-api reader disabled`, which is the correct resting state for a `service_role`
  endpoint on a project nobody owns.
- `POST` is deliberately left open. It is the public contact form
  (`ContactSection.tsx`, `PublicConciergeBot.tsx`) — a visitor with no session must be able to
  submit, and it only writes. Closing it would break the only live use of this endpoint.
- `verify_jwt` alone would not have closed the read, for the same reason as #161/#167: the anon
  key is a valid JWT shipped to every browser. `config.toml` now pins the intent per function.

The one GET caller is `src/components/AdminLeads.tsx` (`?limit=500`). It is in an archived app
with no deployment and no `core.projects` row, so nothing live regresses. If that admin screen
is ever revived it must read the table through supabase-js under RLS, not through this
endpoint — putting `LEADS_API_KEY` into a browser bundle would be a fake gate.

## NOT DEPLOYED

`zwxwteebcoejrjdufzsv` is not reachable from this environment: no Supabase CLI on this machine,
no `SUPABASE_ACCESS_TOKEN`, and the MCP connection lists only `uhnrgujbdxhhmoxcjria`. **The open
version stays live until someone runs the deploy.** Command and acceptance check are in
`NEEDS_USER.md` §0ש.

## Recorded, deliberately not fixed

**#171, high — three unauthenticated `service_role` functions on protected system 08.**
`leads-webhook`, `n8n-notify` and `rights-agent` on `pwcswdfgorvlpdflzylm` all executed for a
caller with no credential; only the empty body stopped them. None returned data to me, so this
is not a disclosure — but they are ungated write/forward paths on the live eligibility system.
08 is protected: read-only was the whole permission, and it is the user's call, like #164/#169.
