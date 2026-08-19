# 31 gesher — the consent screen was a declaration; one live path already ignored it

**12/08/2026 · §1ג / §8ב · open line (1) of the previous heartbeat**

The previous step built `/client/consents` and left this in writing: *"לא נבדק אם קוד כלשהו באמת אוכף
את visibility_rules + client_consents כששותף קורא לקוח. ההסכמה היא כרגע הצהרה."* This step measured
that, found one live path where it was true, and closed it.

## What was measured

Three of the four partner surfaces cannot leak anything, because they render nothing:

| route | what it does |
|---|---|
| `/partner/` | redirects to `/partner/clients` |
| `/partner/clients` | `PlaceholderPage` — no data |
| `/partner/feedbacks` | `PlaceholderPage` — no data |
| `/partner/tasks` | **loads real rows via `listTasks()`** |

RLS itself is not the gate here. `client_profiles` has no partner policy at all
(`Clients read own client profile` = `auth.uid() = id`, plus an admin policy), and `client_consents`
is client-or-admin only. So nothing a partner sees can come through RLS — it can only come from a
server function running as `service_role`, and that is exactly what the one live surface does.

## The finding

`decorateTasks()` in `src/lib/tasks.functions.ts` took every `client_id` on the board and resolved it
to `profiles.full_name` **through `supabaseAdmin`** — service role, RLS bypassed — and returned it as
`client_name`. `listTasks()` correctly limits a partner's rows to `partner_id = userId`, so the leak is
not "any client"; it is *the assigned ones*. But `full_name` is one of the eight fields the consent
screen governs (`PRETTY_FIELD` in `partner-categories.ts`), and neither `client_consents` nor
`visibility_rules` was consulted anywhere in the file. A client could switch "עורכי דין" off on
`/client/consents`, see the toggle stick, and the assigned lawyer would still read their full name
off the tasks board. Same for `listTasksForClient()`, which admits an assigned partner by design.

## The fix

New `src/lib/partner-visibility.ts` — the rule stated once, server-side, because RLS cannot state it:
a partner may see field F of client C only when (1) the partner has a `specialization_category`,
(2) that category's `visibility_rules` row lists F, and (3) C has `client_consents.is_granted = true`
for that category. `decorateTasks` now takes a viewer (`{userId, isAdmin}`); admins are unaffected, a
client reading their own tasks still sees their own name, and a partner without all three conditions
gets `CONSENT_WITHHELD_NAME` ("לקוח (טרם אישר שיתוף)") instead of a name. No other field is disclosed
by this path, so no other projection was needed.

## Verification

- `verify-visibility.mjs` — 12/12 PASS against the **real module** (bundled with esbuild, not copied),
  with a stand-in service-role client shaped like the live tables. Covers: consent granted; consent row
  present but `is_granted=false`; no consent row at all; a field outside the rule; the seeded
  `סוכני_פנסיה` category whose `allowed_schema_fields` is `[]` (consent alone must not expose a name);
  a partner with no category; and the empty board, which must issue no queries at all.
  Re-run: `node_modules/.bin/esbuild src/lib/partner-visibility.ts --bundle --format=esm --platform=node
  --outfile=_bundle.mjs` then `node verify-visibility.mjs _bundle.mjs`.
- `tsc --noEmit` exit 0; `vite build` exit 0 (26.16s).
- Deployed: `gesher-more30`, `dpl_5meKPFEwGsmtAEkwwg9hX8ffg2X7`, production, READY, from source
  (not `--prebuilt`, so `vercel.json` ships).
- Browser against more30.com: `/gesher/client/status` renders for `test@more30.com` after the deploy
  (screenshot 01) — no regression on the surface a customer actually has; `/gesher/partner/tasks`
  requested as that client redirects to `/client`, so the role guard holds in production.

## What was NOT verified, and why

**The partner-side render was not walked.** There is no partner account available from here: creating
one needs the admin panel (Google sign-in for l023131500@gmail.com) or a service-role key, and gesher's
Supabase project `ygaqqnuyfnumezxxmtbh` is not reachable via MCP and has no `SUPABASE_ACCESS_TOKEN` on
this machine. The decision logic is proven by test, the deploy is proven live, but "a partner logs in
and sees the withheld label" is untested. Nor is it known whether `partner_assignments`,
`partner_profiles` or `tasks` hold any rows at all in production — that too needs an account.

Test mode: no user created, no message sent, no charge. Protected systems untouched.
