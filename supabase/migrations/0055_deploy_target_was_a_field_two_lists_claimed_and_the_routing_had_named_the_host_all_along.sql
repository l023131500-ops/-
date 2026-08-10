-- deploy_target: two lists claimed it, neither was measured, and fifteen rows
-- in core.projects disagreed with the origin that actually serves the mount.
--
-- Measured 10/08 by scripts/qa/deploy-target-from-routing.mjs, against
-- portal/vercel.dist.json (the deployed routing artifact, which names the
-- origin per mount) plus more30.com/<mount>/ returning that system rather than
-- the portal's catch-all. 25 of 36 rows are settled; the other 11 have no
-- rewrite or no path and are left exactly as they are, because a target for an
-- unrouted row would be invented.
--
-- The method this replaces is recorded because it looked right and was not:
-- reading `server` / `x-vercel-id` off more30.com/<mount>/ returns Vercel for
-- every mount, including /kiosk/, whose origin is on Railway — a Vercel rewrite
-- proxies the upstream, so the client only ever sees the portal's own edge.
-- Row 33 is the single exception and is measured that way on purpose: it *is*
-- the portal, so nothing relays it.
--
-- Two rows were not merely blank but wrong: 04 said railway and 15 said
-- lovable, and both are served from *-more30.vercel.app. 04 matters beyond the
-- label — the API function added for it in 8507410 is a Vercel function, and a
-- registry that says railway is what sends the next round to the wrong host.
--
-- Display is unaffected either way: admin/src/App.tsx:675 renders the badge
-- only when the value is neither null nor 'unknown', so this fills in badges
-- that were blank and corrects two that were misleading.
--
-- 08 and 09 are protected: not probed, not compared, not touched here.

update core.projects set deploy_target = 'vercel', updated_at = now()
 where number in ('04','06','10','12','14','15','18','21','22','24','26','27','30','31','33')
   and is_protected = false;

-- Guard: the protected pair must not have moved, and nothing outside the
-- measured set may have been rewritten to 'vercel' by accident.
do $$
declare n int;
begin
  select count(*) into n from core.projects
   where number in ('04','06','10','12','14','15','18','21','22','24','26','27','30','31','33')
     and deploy_target is distinct from 'vercel';
  if n > 0 then
    raise exception 'deploy_target: % measured rows did not take the value', n;
  end if;

  select count(*) into n from core.projects
   where number in ('08','09') and deploy_target is distinct from 'unknown';
  if n > 0 then
    raise exception 'deploy_target: protected rows were modified';
  end if;
end $$;
