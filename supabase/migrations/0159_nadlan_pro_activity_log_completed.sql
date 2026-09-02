-- np_activity_save's insert branch never accepted is_done/done_at — every new
-- activity landed open (is_done=false), even a call/meeting/showing/email the
-- caller is logging *after* it happened. There was no way to record "I just
-- called this contact" without a two-step create-then-check-off, and until the
-- second step the logged call sat in the tasks/agenda "no date" bucket
-- (np_activities' p_only_open filter, and the new agenda tab's no-date
-- section) forever if nobody remembered to check it. The update branch
-- already supports is_done; this brings the insert branch to parity.
create or replace function public.np_activity_save(p jsonb)
returns uuid language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare v_id uuid := nullif(p->>'id','')::uuid;
declare v_done boolean := coalesce(nullif(p->>'is_done','')::boolean, false);
begin
  if v_id is null then
    insert into nadlan_pro.activities (
      office_id, contact_id, deal_id, property_id, kind, title, body,
      due_at, is_done, done_at, assigned_to, created_by)
    values (
      (p->>'office_id')::uuid,
      nullif(p->>'contact_id','')::uuid,
      nullif(p->>'deal_id','')::uuid,
      nullif(p->>'property_id','')::uuid,
      coalesce(nullif(p->>'kind',''), 'note')::nadlan_pro.activity_kind,
      p->>'title', p->>'body',
      nullif(p->>'due_at','')::timestamptz,
      v_done,
      case when v_done then coalesce(nullif(p->>'done_at','')::timestamptz, now()) else null end,
      coalesce(nullif(p->>'assigned_to','')::uuid, auth.uid()),
      auth.uid())
    returning id into v_id;
  else
    update nadlan_pro.activities a set
      title   = coalesce(p->>'title', a.title),
      body    = coalesce(p->>'body', a.body),
      due_at  = coalesce(nullif(p->>'due_at','')::timestamptz, a.due_at),
      is_done = coalesce(nullif(p->>'is_done','')::boolean, a.is_done),
      done_at = case when coalesce(nullif(p->>'is_done','')::boolean, a.is_done)
                     then coalesce(a.done_at, now()) else null end,
      assigned_to = coalesce(nullif(p->>'assigned_to','')::uuid, a.assigned_to)
    where a.id = v_id;
    if not found then
      raise exception 'הפעילות לא נמצאה, או שאין לך הרשאה לערוך אותה';
    end if;
  end if;
  return v_id;
end $$;
