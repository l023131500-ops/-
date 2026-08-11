-- Heartbeat for 11/08/2026 — gannenet (#40) marketing-claims truth pass.
-- Unwritten: the Supabase MCP was not connected this run and the anon key
-- cannot reach the `core` schema (406 — the schema is not exposed to PostgREST).
-- Insert this as-is when the MCP is back.
insert into core.run_progress (phase, task, status, note) values (
  'gannenet-40',
  'pricing/home/nav/footer — remove claims the app cannot honour',
  'done',
  'Four features were advertised and not implemented: אשף הכנה לשבוע (no route, no code, named in 4 places), שליחה בוואטסאפ ושילוב תמונות (the newsletter page has neither, nor a copy button), הדפסה ו-PDF from the מחולל (it returns a text card), and an AI quota split 3/unlimited on an app with no accounts and no counter — everything sold as premium was open to everyone. /pricing also quoted 49 ₪, which is on no price scale the platform set (§8א: 2/5/10/12/15) and in no core.plans row, and its three buttons — including דברו איתנו — all pointed at /library. The nav button on every page read הרשמה and went to the price table; there is no sign-up in this app. Copy now matches the product, the paid tier reads בהכנה with the real 2–15 ₪ scale named and the #40 mapping left open, CTAs go where they say, and the §7 credit link פותח ע״י עולם הסטארטאפים was added to the footer. tsc 0, next build 65 pages, 0 console errors. Evidence: QA/gannenet/claims-truth-0811/. Open for the user: which plan (2 ₪ / 5 ₪) applies to #40 — in NEEDS_USER.md.'
);
