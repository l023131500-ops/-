-- 0023 — system 01's admin entry was recorded as the page its gate sends you to
--
-- core.issues #85. 0022 measured admin_url against production for all twenty-one
-- public systems and could not decide one of them: torah recorded '/auth/sign-in',
-- and /torah/auth/sign-in returns the same document as a path that does not
-- exist. That is not evidence of a missing route — it is what EVERY path under a
-- client-routed SPA returns, so HTTP cannot tell a real route from a typo there.
-- The record was left alone rather than replaced with another unverified value.
--
-- scripts/qa/spa-admin-route.mjs (new) decides it by running the router in a
-- browser instead of comparing documents. Measured against production 07/08/2026,
-- evidence QA/platform/spa-admin-torah-0807/:
--
--   /admin              -> redirects to /torah/auth/sign-in?redirect=%2Fadmin
--                          137 chars, password field, return trip preserved
--   /auth/sign-in       -> stays, 137 chars, password field, NO return trip
--   /legacy/admin       -> stays, 953 chars, admin console, NO password  ⚠️ see below
--   /legacy/admin-login -> stays, 122 chars, password field, no return trip
--
-- So both recorded and correct values are real routes, and they are not the same
-- screen. '/admin' is the gate — AdminLayout checks the session, then is_super_admin,
-- and sends a signed-out visitor to the sign-in page carrying ?redirect=/admin.
-- '/auth/sign-in' is where that gate lands, stripped of the way back: an admin who
-- follows the recorded address signs in and is returned to the home page, not to
-- the console. §3's "נהל מערכת זו" link needs the gate, not its destination.
--
-- ⚠️ Deliberately NOT recorded here: /torah/legacy/admin renders the full
-- "לוח ניהול" to an anonymous visitor — filed as its own issue. An open door is a
-- defect to close, not an entry to publish on the super-admin board.
--
-- admin_auth stays 'own': the gate is the site's own, not the platform hub's.
--
-- Nothing here touches 08, 09, bkalut-app, bkalot-admin, zr_* or NEDARIM3873,
-- and no billing or sending state is changed.

update core.projects
   set admin_url  = '/admin',
       updated_at = now()
 where slug = 'torah-platform'
   and admin_url = '/auth/sign-in';
