-- more30 · 36 nadlan-pro — deal-stage change: let the "lost" reason actually land
-- ============================================================================
-- nadlan_pro.deals.lost_reason has existed since the very first schema
-- migration (0009), and np_deal_save (0010) already round-trips it (its
-- update branch does `lost_reason = coalesce(p->>'lost_reason', d.lost_reason)`)
-- -- but nothing in app.html ever sends that key. The reason: stage changes
-- never go through np_deal_save at all. They go through the dedicated
-- np_deal_stage(p_id, p_stage) RPC (0010's own comment explains why: "dragging
-- a card is its own call... must not need the rest of the record round-tripped"),
-- and that is the ONLY place a deal is ever moved into the "lost" (לא יצא
-- לפועל) stage -- both the pipeline board's drag-and-drop and the deal
-- drawer's stage <select> call np_deal_stage exclusively. Since that RPC never
-- touched lost_reason, the column has been permanently NULL for every deal
-- ever marked lost, and nothing in the UI ever asked for or displayed one --
-- the exact "modeled but unwired" shape this project's changelog keeps finding
-- (grep confirms zero occurrences of "lost_reason" anywhere in app.html before
-- this round).
--
-- This adds an optional p_lost_reason param to np_deal_stage (default null,
-- so every existing 2-arg call site keeps working unchanged) that, when
-- provided, is written the same coalesce-only way np_deal_save already treats
-- the column -- moving a deal to any OTHER stage, or omitting the param, never
-- touches the existing value. No new table/column, no destructive clear on
-- reopen (a deal moved out of "lost" and later back keeps whatever reason was
-- last recorded, which is what an office would want to see, not silently lose).
drop function if exists public.np_deal_stage(uuid, text);

create or replace function public.np_deal_stage(p_id uuid, p_stage text, p_lost_reason text default null)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  update nadlan_pro.deals set
    stage       = p_stage::nadlan_pro.deal_stage,
    lost_reason = coalesce(nullif(trim(p_lost_reason), ''), lost_reason)
  where id = p_id;
  if not found then
    raise exception 'העסקה לא נמצאה, או שאין לך הרשאה לערוך אותה';
  end if;
end $$;

revoke all on function public.np_deal_stage(uuid, text, text) from public, anon;
grant execute on function public.np_deal_stage(uuid, text, text) to authenticated;
