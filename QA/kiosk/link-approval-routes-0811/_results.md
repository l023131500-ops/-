# kiosk (35) — the link approvals, wired (§2★ה, second half)

`server/src/linkapprovals.js` landed a step ago with nothing importing it. This
run adds the two routes and puts the widened allow-list behind one function.

## What was verified

`node --test test/*.test.mjs` in `apps/35-kioskfleet/server`:

- **137/138** across the suite. 134/135 before, so the three new cases are the
  whole difference. The one failure is `routing.test.mjs`, which imports
  `express` — `server/node_modules` is not installed in this checkout, the
  documented baseline.
- **12/12** in `linkapprovals.test.mjs` on its own (`linkapprovals.test.txt`).

The three new cases replay `PUT /api/devices/:id/links`'s own sequence —
`approvalSelection()` → delete + insert in one transaction → read back →
`deviceConfigHostCsv()` — against the production DDL on `node:sqlite`, and
assert the **stored rows** and the **pushed list**, not the modules' return
values. express is the only thing rewritten; every decision is a call into the
real module.

| case | asserts |
|---|---|
| the PUT stores the owner's ids only | link 4 (another customer's) is filtered out *and* absent from `device_links` — the foreign key would have taken it, since it proves a link exists and not whose it is. Also: replace-not-merge, and that an empty list is a legitimate save. |
| one config push carries all three widenings | `hall.example.com,biz.example.com,hadar.example.com,pay.example.com,shown.example.com` — the device's own host, an approved client's, an approved link's, and the display link's. Un-approving takes the link's hosts back out and leaves the other two. |
| a device with no lock is still handed no lock | `null` stays `null` and `''` stays `''` through all three widenings in a row. Seeding here would *create* a lock on a device that had none. |

## Not verified here

The express glue itself — the router mount, `requireAuth`, `getOwnedDevice`.
Same constraint as every prior step: `express` cannot be loaded in this
checkout. The two routes are added to the same router, with the same
`getOwnedDevice` guard, as `/devices/:id/clients` directly above them.

No console UI yet, so approving a link for a device is still an HTTP call. Not
deployed — the Railway service builds from another repo (STATUS.md, "Next, in
order" item 1).
