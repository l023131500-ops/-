-- more30 · 36 nadlan-pro — office-specific contract templates: write path
-- ============================================================================
-- nadlan_pro.contract_templates (0012) was built for exactly this: office_id
-- null = shared system template, office_id set = one office's own copy, with
-- RLS (np_tpl_write) already gating writes to nadlan_pro.manages_office(office_id)
-- and a unique index keeping one office's keys distinct from another's. But no
-- RPC ever exposed a write path — app.html's contractForm() only ever calls
-- np_templates() (read-only) to populate the template picker. An office that
-- wanted to adjust wording (a firm-specific clause, a different duration
-- default, a local disclosure line) had no way to do it: every office was
-- stuck with the three fixed system templates verbatim.
--
-- Two functions, mirroring the office_id/manages_office pattern every other
-- office-scoped write RPC in this schema already uses (np_office_settings_save,
-- np_lease_*, np_task_*): np_template_save (create-or-update one office's own
-- template) and np_template_delete (remove one). Both security invoker, so RLS
-- does the actual enforcement — is_system rows and other offices' rows are
-- simply invisible/unwritable to the caller, same guarantee as every other
-- table in this schema.
create or replace function public.np_template_save(p jsonb)
returns jsonb language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
declare
  v_office uuid := nullif(p->>'office_id', '')::uuid;
  v_id     uuid := nullif(p->>'id', '')::uuid;
  v_key    text := nullif(trim(coalesce(p->>'key', '')), '');
  v_row    nadlan_pro.contract_templates;
begin
  if v_office is null then
    raise exception 'יש לבחור משרד';
  end if;
  if coalesce(trim(p->>'name'), '') = '' then
    raise exception 'יש להזין שם לתבנית';
  end if;
  if coalesce(trim(p->>'body_md'), '') = '' then
    raise exception 'לא ניתן לשמור תבנית ריקה';
  end if;

  if v_id is not null then
    -- office_id in the WHERE (not just is_system=false) so RLS and this check
    -- agree: a template belonging to a different office is not found, not a
    -- generic permission error, same style np_lease_*/np_task_* already use.
    update nadlan_pro.contract_templates
       set name = p->>'name', body_md = p->>'body_md', fields = coalesce(p->'fields', fields)
     where id = v_id and office_id = v_office and is_system = false
     returning * into v_row;
    if not found then
      raise exception 'התבנית לא נמצאה, כבר נמחקה, או שאין הרשאה לערוך אותה';
    end if;
  else
    if v_key is null then
      v_key := 'custom_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    end if;
    insert into nadlan_pro.contract_templates (office_id, key, name, body_md, fields, is_system, sort)
    values (v_office, v_key, p->>'name', p->>'body_md', coalesce(p->'fields', '[]'::jsonb), false, 100)
    on conflict (coalesce(office_id, '00000000-0000-0000-0000-000000000000'::uuid), key)
    do update set name = excluded.name, body_md = excluded.body_md, fields = excluded.fields
    returning * into v_row;
  end if;

  return jsonb_build_object('id', v_row.id, 'key', v_row.key, 'name', v_row.name,
                             'body_md', v_row.body_md, 'fields', v_row.fields,
                             'is_system', v_row.is_system);
end $$;

create or replace function public.np_template_delete(p_id uuid)
returns void language plpgsql security invoker
set search_path = nadlan_pro, public, pg_temp as $$
begin
  delete from nadlan_pro.contract_templates
   where id = p_id and is_system = false;
  if not found then
    raise exception 'התבנית לא נמצאה, כבר נמחקה, או שאין הרשאה למחוק אותה';
  end if;
end $$;

revoke all on function public.np_template_save(jsonb) from public, anon;
revoke all on function public.np_template_delete(uuid) from public, anon;
grant execute on function public.np_template_save(jsonb) to authenticated;
grant execute on function public.np_template_delete(uuid) to authenticated;
