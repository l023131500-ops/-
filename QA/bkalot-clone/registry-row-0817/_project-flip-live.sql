-- registry-row-0817: flip core.projects #37 (bkalot-clone) to reflect what is
-- actually deployed and verified. The row has existed since before 0057
-- (13/08) but was never updated after go-live — see probe.txt for the full
-- evidence trail. Run this once Supabase access (MCP or SB_PAT) is available.
--
-- Scope: five columns only, on the one row identified by slug. No schema
-- change, no other row touched, no protected system involved.
update core.projects
   set live            = true,
       is_deployed     = true,
       stage           = 'beta',
       live_url        = 'https://more30.com/bkalot-studio',
       admin_url       = 'https://more30.com/bkalot-studio/admin',
       public_visible  = true,
       updated_at      = now()
 where slug = 'bkalot-clone';

-- Verify after running:
-- select number, slug, stage, live, is_deployed, live_url, admin_url, public_visible
--   from core.projects where slug = 'bkalot-clone';
-- expect exactly 1 row, all five flipped fields matching the values above.
