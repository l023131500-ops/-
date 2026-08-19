-- 0026 — the per-system bug row on /admin/systems knew two states, and §3 asks
--        for three
--
-- §3 asks the super-admin board for, per system: "באגים: תוקן / בטיפול / פתוח".
-- more30_admin_issues builds the per-system counts in its by_app block, and that
-- block folded two of the three states into one:
--
--   'open', count(*) filter (where status in ('open','in_progress'))
--
-- so 'בטיפול' had no key to be rendered from and could not appear on any card,
-- while an issue already being worked on was counted and labelled as open.
--
-- The function's own 'totals' block, three lines above, already separates them —
-- open, in_progress and fixed are three distinct counters there, and
-- /admin/issues renders them as three. Only the per-system block disagreed, so
-- the same issue was one state on the platform header and another on the card.
--
-- Measured over core.issues before the change: two cards of the thirty carry an
-- in_progress row, and both read wrong.
--
--   torah    — 0 open, 1 in_progress, 1 fixed. Card read "1 פתוחים · 1 תוקנו".
--              That is core.issues #87, the open /legacy/admin console: the fix
--              is written, measured and committed and is waiting only on the
--              Vercel deploy quota (#83). "Open" says nobody has touched it.
--   mthbram  — 1 open, 1 in_progress, 1 fixed. Card read "2 פתוחים · 1 תוקנו",
--              which is one number covering two different states.
--
-- The other twenty-eight cards are unchanged by this migration: with zero
-- in_progress rows, filtering on status='open' returns what the folded filter
-- returned.
--
-- What this does NOT fix on its own: the deployed portal/public/admin-systems.html
-- reads b.open, b.needs_user and b.fixed and has no key for the third state, so
-- until the next deploy the live card shows the corrected open count and still
-- omits בטיפול. The page half of this change is in the same commit.
--
-- needs_user is deliberately left as it is — a subset of open+in_progress owned
-- by the user, not a fourth state. The page is what says so, and now does.
--
-- totals is untouched: /admin/issues reads it and it was already correct.
--
-- Read-only change. Volatility, security_definer and search_path are reproduced
-- exactly as the live function carries them, so the only difference on the server
-- is the by_app filter; super-admin gated as before, no billing or sending state
-- touched, nothing here concerns 08, 09, bkalut-app, bkalot-admin, zr_* or
-- NEDARIM3873.

create or replace function public.more30_admin_issues()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'core'
as $function$
declare
  result jsonb;
  last_hb timestamptz;
  last_board timestamptz;
  since int;
  threshold constant int := 3;
begin
  if not public.more30_is_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select max(at) into last_hb from core.run_progress;
  select max(greatest(created_at, updated_at)) into last_board from core.issues;
  select count(*) into since
    from core.run_progress
   where last_board is not null and at > last_board;

  select jsonb_build_object(
    'generated_at', now(),
    -- מדד הטריות: כמה פעימות נרשמו מאז הפעם האחרונה שהלוח הזה זז.
    -- לוח שלא זז ויום שקט נראים אותו דבר, ולכן ההפרש מוצג כאן במפורש.
    'freshness', jsonb_build_object(
      'last_heartbeat_at', last_hb,
      'last_board_write_at', last_board,
      'heartbeats_since_board_write', coalesce(since, 0),
      'threshold', threshold,
      'drifting', coalesce(since, 0) >= threshold,
      'stale_hours', case
        when last_hb is null or last_board is null or last_hb <= last_board then 0
        else round(extract(epoch from (last_hb - last_board)) / 3600.0, 1)
      end
    ),
    'totals', jsonb_build_object(
      'open',        count(*) filter (where status = 'open'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'fixed',       count(*) filter (where status = 'fixed'),
      -- שתי המספרים שהמשתמש ביקש לראות מופרדים
      'mine',        count(*) filter (where status in ('open','in_progress') and owner = 'agent'),
      'needs_user',  count(*) filter (where status in ('open','in_progress') and owner = 'user'),
      'critical_open', count(*) filter (where status in ('open','in_progress') and severity = 'critical')
    ),
    'issues', coalesce(jsonb_agg(
      jsonb_build_object(
        'id', id, 'app', app, 'title', title, 'detail', detail,
        'severity', severity, 'status', status, 'owner', owner,
        'blocked_on', blocked_on, 'evidence', evidence,
        'created_at', created_at, 'resolved_at', resolved_at
      )
      order by
        -- דחוף וחסום-על-המשתמש קודם: זה מה שאי אפשר להתקדם בלעדיו.
        (status = 'fixed'),
        (owner = 'agent'),
        case severity when 'critical' then 0 when 'high' then 1
                      when 'normal' then 2 else 3 end,
        app nulls first, id
    ), '[]'::jsonb),
    -- ספירה לכל מערכת, לשילוב בכרטיסים ב-/admin/systems.
    -- שלושת המצבים ש-§3 מבקש, כל אחד במפתח משלו: open הוא פתוח בלבד ולא
    -- "פתוח או בטיפול", אחרת אין ממה לצייר את "בטיפול" ותקלה שכבר עובדים
    -- עליה נספרת כתקלה שאיש לא נגע בה.
    -- needs_user אינו מצב רביעי אלא תת-קבוצה של open+in_progress שבבעלות
    -- המשתמש, ולכן הוא נספר בנפרד ואינו מופחת מהם.
    'by_app', coalesce((
      select jsonb_object_agg(coalesce(app,'—'), cnt)
      from (
        select app, jsonb_build_object(
                 'open', count(*) filter (where status = 'open'),
                 'in_progress', count(*) filter (where status = 'in_progress'),
                 'fixed', count(*) filter (where status = 'fixed'),
                 'needs_user', count(*) filter (where status in ('open','in_progress') and owner='user')
               ) as cnt
        from core.issues group by app
      ) s
    ), '{}'::jsonb)
  )
  into result
  from core.issues;

  return result;
end;
$function$;
