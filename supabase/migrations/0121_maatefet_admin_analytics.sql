-- more30 · 39-maatefet — stage 4 begins: cross-instructor analytics for the
-- super-admin panel.
-- ============================================================================
-- MAATEFET_BUILD.md's roadmap line for stage 4 is "סליקת מנויים (...) +
-- אנליטיקה + הרחבות" and the "תוספות מתקדמות" section separately names
-- "דשבורד ארגון לסופר-אדמין: תובנות חוצות-מדריכים ... לשיפור ההכשרה" —
-- this ships that dashboard's data layer. Deliberately built first, ahead of
-- subscription billing: the platform already has a working, generic,
-- test-mode-gated billing mechanism (core.plans / core.subscriptions /
-- more30_subscribe / more30_checkout / more30_my_subscription, all keyed by
-- app_key and already driving /subscribe?app=<key> for every other system)
-- that maatefet can plug into with zero new schema the moment core.projects
-- flips `live`=true for path='maatefet' — that flip is the still-open
-- NEEDS_USER item (a separate Vercel project), not a code gap. Analytics has
-- no such external blocker and is real, useful today even at zero rows.
--
-- One aggregate function rather than one RPC per table: a dashboard reads
-- all of these together on every load, and every count below is a real
-- `count(*)`/`group by` over live tables — never an invented or estimated
-- number. RLS already grants the super-admin full read access on every
-- maatefet table via each table's own `... OR more30_is_super_admin()`
-- policy (instructors/clients/appointments/reminders/content_items/
-- followups/wedding_tasks/invites) or an admin-only ALL policy
-- (directory_entries) or a read policy that already ORs in the super-admin
-- (forum_posts/forum_replies) — so `security invoker` is enough here, same
-- choice as the sibling admin RPC `maatefet_directory_admin_list` (0119).
-- The explicit `more30_is_super_admin()` check below is defense-in-depth on
-- top of that RLS, not a replacement for it — same pattern used by every
-- other admin-only RPC in this schema since 0109.

create or replace function public.maatefet_admin_analytics()
returns jsonb
language plpgsql
stable
security invoker
set search_path = maatefet, public
as $$
declare
  v jsonb;
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can view cross-instructor analytics';
  end if;

  select jsonb_build_object(
    'instructors', jsonb_build_object(
      'total', (select count(*) from maatefet.instructors),
      'by_status', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb)
                    from (select status, count(*) n from maatefet.instructors group by status) s),
      'by_segment', (select coalesce(jsonb_object_agg(segment::text, n), '{}'::jsonb)
                     from (select segment, count(*) n from maatefet.instructors group by segment) s)
    ),
    'clients', jsonb_build_object(
      'total', (select count(*) from maatefet.clients),
      'by_segment', (select coalesce(jsonb_object_agg(segment::text, n), '{}'::jsonb)
                     from (select segment, count(*) n from maatefet.clients group by segment) s),
      'couples_linked', (select count(*) from maatefet.couple_links)
    ),
    'invites', jsonb_build_object(
      'total', (select count(*) from maatefet.invites),
      'by_status', (select coalesce(jsonb_object_agg(status::text, n), '{}'::jsonb)
                    from (select status, count(*) n from maatefet.invites group by status) s)
    ),
    'appointments', jsonb_build_object(
      'total', (select count(*) from maatefet.appointments),
      'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    from (select status, count(*) n from maatefet.appointments group by status) s)
    ),
    'reminders', jsonb_build_object(
      'total', (select count(*) from maatefet.reminders),
      'done', (select count(*) from maatefet.reminders where is_done),
      'pending', (select count(*) from maatefet.reminders where not is_done)
    ),
    'content_items', jsonb_build_object(
      'total', (select count(*) from maatefet.content_items),
      'shared', (select count(*) from maatefet.content_items where is_shared),
      'by_type', (select coalesce(jsonb_object_agg(content_type, n), '{}'::jsonb)
                  from (select content_type, count(*) n from maatefet.content_items group by content_type) s)
    ),
    'forum', jsonb_build_object(
      'posts', (select count(*) from maatefet.forum_posts),
      'replies', (select count(*) from maatefet.forum_replies),
      'pinned', (select count(*) from maatefet.forum_posts where is_pinned)
    ),
    'followups', jsonb_build_object(
      'total', (select count(*) from maatefet.followups),
      'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    from (select status, count(*) n from maatefet.followups group by status) s),
      'flagged', (select count(*) from maatefet.followups where flagged)
    ),
    'wedding_tasks', jsonb_build_object(
      'total', (select count(*) from maatefet.wedding_tasks),
      'by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                    from (select status, count(*) n from maatefet.wedding_tasks group by status) s),
      'by_category', (select coalesce(jsonb_object_agg(category, n), '{}'::jsonb)
                       from (select category, count(*) n from maatefet.wedding_tasks group by category) s)
    ),
    'directory_entries', jsonb_build_object(
      'total', (select count(*) from maatefet.directory_entries),
      'active', (select count(*) from maatefet.directory_entries where is_active),
      'by_category', (select coalesce(jsonb_object_agg(category, n), '{}'::jsonb)
                       from (select category, count(*) n from maatefet.directory_entries group by category) s)
    ),
    'generated_at', to_jsonb(now())
  ) into v;

  return v;
end;
$$;
revoke all on function public.maatefet_admin_analytics() from public;
grant execute on function public.maatefet_admin_analytics() to authenticated;
revoke execute on function public.maatefet_admin_analytics() from anon;
