-- Perf advisor: auth_rls_initplan (78 findings across public schema RLS
-- policies). Every policy that calls auth.uid() -- directly or as an
-- argument to is_super_admin()/has_tenant_role()/user_in_tenant() -- makes
-- Postgres re-evaluate auth.uid() once per row instead of once per query,
-- because it can't prove the call is stable across rows unless it's wrapped
-- as a scalar subquery. Wrapping every occurrence in `(select auth.uid())`
-- is a pure perf fix: the boolean result of each policy expression is
-- unchanged (auth.uid() is already constant within one statement), only the
-- number of times it's evaluated changes. Zero behavior change, so no
-- read/write access is broadened or narrowed by this migration.
--
-- Only touches policies that already exist in the migrations above (all
-- 01-torah-platform-owned tables) -- this project also hosts 02/03/10/18,
-- whose tables/policies are untouched by this WHERE clause.
--
-- Generated with a DO block (not hand-written ALTER POLICY statements) so
-- the exact live qual/with_check text is reused verbatim with only the
-- auth.uid() substring replaced -- avoids any risk of a hand-transcription
-- slip changing policy semantics.
do $$
declare
  stmt text;
begin
  for stmt in
    select 'ALTER POLICY ' || quote_ident(policyname) || ' ON public.' || quote_ident(tablename) ||
      case when qual is not null then ' USING (' || replace(qual, 'auth.uid()', '(select auth.uid())') || ')' else '' end ||
      case when with_check is not null then ' WITH CHECK (' || replace(with_check, 'auth.uid()', '(select auth.uid())') || ')' else '' end
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'ads','announcements','attendance','audit_log','azkarot','carts',
        'chat_messages','chat_rooms','community_services','donation_campaigns',
        'donations','forum_access','forum_categories','forum_comments',
        'forum_posts','gallery_images','halacha_daily','kashrut_certifications',
        'leads','lesson_topics','lessons','materials','memberships',
        'nedarim_configs','nedarim_transactions','newsletters','order_items',
        'orders','participants','portal_messages','prayer_times',
        'product_categories','products','profiles','rabbi_questions',
        'study_daily','study_schedules','synagogues','tenant_branding',
        'tenant_features','tenant_invites','tenant_subscriptions','tenants',
        'tips','user_roles'
      )
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
    order by tablename, policyname
  loop
    execute stmt;
  end loop;
end $$;
