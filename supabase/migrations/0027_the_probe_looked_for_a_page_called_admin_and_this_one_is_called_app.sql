-- 0027 — one of the eight "no admin entry" systems has had one all along, under a
--        name the probe was never going to try
--
-- 0022 measured eleven public systems whose core.projects.admin_url was NULL and
-- recorded eight of them as measured-absent: imud, briut, smel, chizukim, orech,
-- studio, kesef, tivuch. core.issues #86 carries that list. The measurement was
-- honest but single-angle: admin-entry-probe.mjs fetches candidate addresses off
-- the live origin and reads the site's JS bundles for a nav link. Every candidate
-- it tries is a variation on the word admin — /admin, /admin/login, /gabai,
-- /manage. A console that is not called any of those is invisible to it.
--
-- This round asked the other half of the question, against the source trees
-- rather than the origin: does an admin screen exist in the code at all? For six
-- of the seven remaining, the answer is a firm no — no file named for one, no
-- route, no role check:
--
--   17 chizukim  85 source files, 0 admin-ish
--   04 imud      89 files; 4 client routes (/, /wizard, /templates, /editor/:id)
--   34 kesef     a single index.html, no script
--   18 orech     31 files; app/ has documents, editor, htr, login, api — no admin
--   12 smel      82 files, 0 admin-ish
--   26 modaot-studio 112 files; 7 client routes, none admin
--
-- tivuch (36, nadlan-pro) is the exception, and it is not a near-miss. Its whole
-- management system ships as sites/36-nadlan-pro/tivuch/app.html — 88KB, an
-- office CRM with an explicit role ladder (owner / manager / agent, app.html:484)
-- driving np_* RPCs under RLS. That is the system's admin surface; nadlan-pro
-- simply has no separate console, because the owner role inside the product IS
-- the administrator.
--
-- Measured live in this run, not read off the repo:
--   more30.com/tivuch          200 · 17,982 b · the landing page
--   more30.com/tivuch/app.html 308 → /tivuch/app        (why a suffix probe misses it)
--   more30.com/tivuch/app      200 · 88,348 b · contains np_me
--   more30.com/tivuch/sign     200 · 16,050 b
-- Anonymous at /tivuch/app lands on "פתיחת משרד" — the office-opening form, with
-- the login pill in the corner — and no office data. Evidence:
-- QA/platform/admin-entry-tivuch-0807/.
--
-- ⚠️ What this row does NOT claim. It records where the management entry is, not
-- that it is gated. The office-opening form renders to an anonymous visitor; what
-- happens on submit was not measured here and is not asserted. Same standard as
-- 0022's galil note: recording the address is not endorsing the door.
--
-- So core.issues #86 goes from eight to six, and the six change character: they
-- are not built-but-unserved screens like kupot's was. There is nothing to serve.
-- briut is a seventh and separate case, already measured on 07/08 — its only key
-- is insert-only (POST 201, GET/PATCH/DELETE 401), so an admin screen there
-- cannot read its own leads no matter how well it is gated. It needs a
-- server-side path, not a page.
--
-- Nothing here touches 08, 09, bkalut-app, bkalot-admin, zr_* or NEDARIM3873, and
-- no billing or sending state is changed.

update core.projects
   set admin_url  = '/app',
       admin_auth = 'own',
       updated_at = now()
 where path = 'tivuch'
   and admin_url is null;
