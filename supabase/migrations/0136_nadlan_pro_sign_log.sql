-- more30 · 36 nadlan-pro — backfill: np_sign_log was applied live
-- (20260802222043 nadlan_pro_sign_log_service_only) but never saved as a repo
-- migration. 0012_nadlan_pro_contracts.sql backfilled the base contracts +
-- signatures schema/API (4 of the 5 live migrations from that day) but missed
-- this one. Without it, a fresh environment built from this repo would have
-- supabase/functions/np-send-signature calling an RPC that does not exist —
-- the send would still succeed (Resend call happens first) but the
-- 'emailed' evidence-log entry would silently fail every time (the function
-- swallows that specific fetch's error), quietly breaking the audit trail
-- signature_events exists for. DDL below is copied verbatim from
-- pg_get_functiondef() against the live database, not reconstructed from
-- memory.

create or replace function public.np_sign_log(p_signature uuid, p_event text, p_detail jsonb default null::jsonb)
returns void
language plpgsql
security definer
set search_path to 'nadlan_pro', 'public', 'pg_temp'
as $function$
begin
  -- Fixed vocabulary. The log is evidence, and free text in the event column
  -- would make it unreadable as a sequence.
  if p_event not in ('sent', 'emailed', 'opened', 'signed', 'declined', 'reminded') then
    raise exception 'unknown signature event: %', p_event;
  end if;
  insert into nadlan_pro.signature_events (signature_id, event, detail)
  values (p_signature, p_event, p_detail);
end $function$;

-- service_role only (called from the np-send-signature Edge Function with the
-- service key, never by a browser) — matches the live grants exactly.
revoke all on function public.np_sign_log(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.np_sign_log(uuid, text, jsonb) to service_role;
