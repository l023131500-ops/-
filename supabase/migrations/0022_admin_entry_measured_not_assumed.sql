-- 0022 — the admin entry of three live systems existed in production and not in the record
--
-- §3 asks the super-admin board for a "נהל מערכת זו" link per system, and §5
-- asks that bkalot specifically be shown "כולל כניסה לניהול". Both read one
-- column: core.projects.admin_url. Eleven of the twenty-one public systems held
-- NULL there, and nothing had ever checked whether that was true.
--
-- scripts/qa/admin-entry-probe.mjs measured it against production — the served
-- page plus the site's own JS bundles, since every one of these writes its nav
-- from script and reading the HTML alone reports zero links for an SPA.
-- Evidence: QA/platform/admin-entry-0807.json (07/08/2026).
--
-- Three of the eleven have an admin entry live right now:
--
--   10 bkalot   — the deployed app.js sets the nav's "ניהול" link to
--                 https://more30.com/admin/rights. This is the §5 item, and it
--                 was already built; only the record was missing.
--   24 galil    — /gabai, the gabai portal, present in the bundle.
--   27 mechiron — /admin and /admin-docs, with its own /api/admin/login.
--
-- The other eight are recorded as measured-absent rather than assumed-absent:
-- admin_auth stays 'none', which now means "looked for one, found none" and not
-- "nobody has looked". They are imud, briut, smel, chizukim, orech, studio,
-- kesef, tivuch.
--
-- ⚠️ galil is recorded, not endorsed. core.issues #62 is open and owned by the
-- user: /galil/gabai?auto=admin opens the console with no password, and the
-- real login cannot succeed because the browser gets 401 on gabai_accounts.
-- Recording where the door is does not claim the door works — and the board
-- needs the address to show the decision at all.
--
-- Nothing here touches 08, 09, bkalut-app, bkalot-admin, zr_* or NEDARIM3873,
-- and no billing or sending state is changed.

update core.projects
   set admin_url  = 'https://more30.com/admin/rights',
       admin_auth = 'hub',
       updated_at = now()
 where slug = 'bkalot-rights'
   and admin_url is null;

update core.projects
   set admin_url  = '/gabai',
       admin_auth = 'own',
       updated_at = now()
 where slug = 'galilee-connect-hub'
   and admin_url is null;

update core.projects
   set admin_url  = '/admin',
       admin_auth = 'own',
       updated_at = now()
 where slug = 'bkalut-price'
   and admin_url is null;

-- 'none' had two readings: no admin exists, and nobody checked. After the probe
-- above only the first is true for these eight.
update core.projects
   set admin_auth = 'none',
       updated_at = now()
 where public_visible
   and admin_url is null
   and slug in ('imud-torani', 'kupot-holim', 'smel-ndln', 'chizukim-transcribe',
                'torah-editor-mvp', 'modaot-studio', 'kesef', 'nadlan-pro');
