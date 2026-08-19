-- The last two deploy_target disagreements, and neither is a measurement.
--
-- After 0055, registry-vs-projects.mjs reports one field on two rows: 37 and
-- 38 hold null in core.projects and "unknown" in registry.ts. Both are `idea`
-- stage, both are unrouted (/bkalot-studio and /events return 404), so no
-- probe can settle where they are hosted — and 'unknown' is not a guess about
-- that, it is the name for not knowing. packages/config/src/types.ts:36 does
-- not admit null at all, so the file could never have matched the column.
--
-- Nothing else moves: admin/src/App.tsx:675 hides the badge for both null and
-- 'unknown', so the rendered screen before and after is identical. The point
-- is only that the two lists stop disagreeing about a row neither of them
-- knows anything about, and the next round's diff is empty instead of noisy.
--
-- Only rows that are unrouted and unbuilt are touched: the where-clause
-- requires live=false and is_deployed=false, so a row that later gets a mount
-- cannot be swept into 'unknown' by re-running this.

update core.projects set deploy_target = 'unknown', updated_at = now()
 where deploy_target is null
   and live = false
   and is_deployed = false
   and is_protected = false;

do $$
declare n int;
begin
  select count(*) into n from core.projects where deploy_target is null;
  if n > 0 then
    raise exception 'deploy_target: % rows still null', n;
  end if;
end $$;
