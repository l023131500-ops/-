# 01 torah — round-4 functional check (18/08, opens round-4)

Round-3 (dark-mode contrast recheck) closed every ROUTES entry as of the
previous session (df94da6). This starts round-4: a functional pass per
MORE30_MASTER_BUILD §2 ("ready" = login works + core action works + real
data + deployed 200), one system at a time, ROUTES order starting at torah (01).

## What was checked (live, https://more30.com/torah)

1. **Home (`/torah`)** — loads (200), hero + service cards render, nav intact.
2. **Core action — lessons directory (`/torah/lessons`)** — 5 real lesson rows
   render (name, teacher, city/street, day, time), e.g. "דף יומי - מסכת בבא
   קמא" / הרב יוסף כהן / ירושלים · גבעת שאול · רח' הרב פינקל 15 / ראשון 08:00.
   Search box + topic/day filters present. Real data, not placeholders.
3. **Login round-trip (§1ג requirement)** — clicked the shared auth pill →
   "כניסה" → `/login?from=.../torah/lessons` → auto-completed (existing
   Playwright-profile session) → `/auth/callback` → **landed back on
   `/torah/lessons`** (the page it started from), pill now reads "לקוח"
   (customer). Confirms login returns the user into the product itself, not
   a "thank you"/landing screen — matches the §1 core requirement. Screenshot:
   `torah-lessons-logged-in.png`.
4. **Lesson detail (`/torah/lessons/5ba8dd94-9d44-418d-b2fb-2ae2e3b0a87e`)** —
   loads, shows teacher name, description, contact phone.

## Note, not fixed this step

The lesson-detail page shows a contact phone of `050-1234567` — a sequential
placeholder-looking number, not obviously real. The list card for the same
lesson does not repeat this number (it shows address/day/time instead, which
the detail page in turn omits). Not investigated further this step (existing
DB data quality, not a code defect) — worth a follow-up: check whether
`050-1234567` is real seed/demo data or a literal placeholder left in
`core`/torah's lessons table.

## Result

Torah (01) meets the round-4 "ready" bar: login works + redirects into
product, core action (lesson directory with real data) works, deployed and
live (200). No code change, no deploy needed this step.

Next in round-4 ROUTES order (per `scripts/qa/platform-audit.mjs` ROUTES
list, skipping the four portal-level routes already covered structurally):
tamlul (02).
