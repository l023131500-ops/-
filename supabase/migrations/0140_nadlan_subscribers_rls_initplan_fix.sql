-- get_advisors (performance) flagged nadlan.subscribers' own_subscription policy with
-- auth_rls_initplan: auth.uid() is called directly in USING, so Postgres re-evaluates it
-- per row instead of once per statement. Same class of fix already applied to
-- nadlan_pro.forum_posts/forum_comments in 0139 -- wrap with (select auth.uid()),
-- identical boolean result per row, zero behavior change.

alter policy own_subscription on nadlan.subscribers
  using ((select auth.uid()) = user_id);
