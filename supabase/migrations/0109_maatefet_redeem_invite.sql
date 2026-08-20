-- more30 · 39-maatefet — close a real gap in stage-0: invite redemption + admin verify RPCs
-- ============================================================================
-- 0108 built instructors/invites/clients/content_items with RLS, but left a
-- functional hole: maatefet.clients only grants insert via the
-- clients_instructor_all policy (instructor_id = maatefet.my_instructor_id()).
-- A chatan/kallah who just signed in via a real invite code has no
-- instructor row at all, so they could never actually create their own
-- client row — the entire "client only gets in via a real invite" flow had
-- no working entry point. Likewise, marking an invite 'used' requires
-- updating maatefet.invites, which invites_instructor_all also restricts to
-- the owning instructor, not the redeeming client.
--
-- Fix: two SECURITY DEFINER RPCs, scoped tight, that do exactly the one
-- privileged thing each needs and nothing else:
--   - maatefet.redeem_invite(code, ...): callable by any authenticated user;
--     atomically claims one still-pending, non-expired invite by exact code
--     and creates the caller's own client row from it. Race-safe (claims via
--     a conditional UPDATE ... WHERE status = 'pending', not a plain SELECT
--     then UPDATE), and a caller can only ever redeem into their own
--     auth_user_id (enforced by the function body, not caller input).
--   - maatefet.verify_instructor(instructor_id, approve): callable by any
--     authenticated user, but internally re-checks public.more30_is_super_admin()
--     and raises if the caller isn't one — same gate the guard trigger from
--     0108 already enforces on a raw UPDATE, exposed here as a clean RPC for
--     the super-admin panel instead of asking the client to hand-craft an
--     UPDATE against a table whose RLS/trigger interaction is easy to get
--     wrong from the UI layer.

create or replace function maatefet.redeem_invite(
  p_code text,
  p_full_name text default null,
  p_partner_name text default null,
  p_phone text default null,
  p_email text default null
)
returns maatefet.clients
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_invite maatefet.invites;
  v_client maatefet.clients;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to redeem an invite';
  end if;

  if exists (select 1 from maatefet.clients where auth_user_id = auth.uid()) then
    raise exception 'this account already has a client profile';
  end if;

  -- atomic claim: only succeeds once, even under concurrent redemption
  -- attempts of the same code.
  update maatefet.invites
  set status = 'used', used_by = auth.uid(), used_at = now()
  where code = p_code
    and status = 'pending'
    and expires_at > now()
  returning * into v_invite;

  if v_invite.id is null then
    raise exception 'invite code is invalid, already used, or expired';
  end if;

  insert into maatefet.clients (
    instructor_id, invite_id, auth_user_id, segment,
    full_name, partner_name, phone, email
  ) values (
    v_invite.instructor_id, v_invite.id, auth.uid(), v_invite.segment,
    coalesce(p_full_name, v_invite.couple_name, ''),
    p_partner_name,
    coalesce(p_phone, v_invite.phone),
    coalesce(p_email, v_invite.email)
  )
  returning * into v_client;

  return v_client;
end;
$$;

revoke all on function maatefet.redeem_invite(text, text, text, text, text) from public;
grant execute on function maatefet.redeem_invite(text, text, text, text, text) to authenticated;

create or replace function maatefet.verify_instructor(
  p_instructor_id uuid,
  p_approve boolean
)
returns maatefet.instructors
language plpgsql
security definer
set search_path = maatefet, public
as $$
declare
  v_row maatefet.instructors;
begin
  if not public.more30_is_super_admin() then
    raise exception 'only a super-admin can verify an instructor';
  end if;

  update maatefet.instructors
  set status = case when p_approve then 'verified' else 'suspended' end,
      verified_at = case when p_approve then now() else verified_at end,
      verified_by = case when p_approve then auth.uid() else verified_by end
  where id = p_instructor_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'instructor not found';
  end if;

  return v_row;
end;
$$;

revoke all on function maatefet.verify_instructor(uuid, boolean) from public;
grant execute on function maatefet.verify_instructor(uuid, boolean) to authenticated;

-- ---------- registry note ----------
update core.projects
set note = 'שלב 0 בבנייה: סכימת maatefet חיה (instructors/invites/clients/content_items), invite-only + RLS מדורג + מנעול הרשאות-על נגד עלייה-בהרשאות עצמית (guard_instructor_status_change). '
  || '[20/08/2026 סבב 3] תוקן פער אמיתי: לפני כן ל-client לא הייתה שום דרך ליצור את שורת ה-client שלו/ה אחרי הזמנה אמיתית (RLS על clients/invites דרש instructor_id שלו/ה שאין ללקוח) — נוסף maatefet.redeem_invite() (SECURITY DEFINER, אטומי מול מרוץ-כפילות, מגביל ל-auth_user_id של הקורא בלבד) ו-maatefet.verify_instructor() (עוטף את בדיקת super-admin ל-RPC נקי לפאנל הבא). קוד אפליקציה/UI עדיין לא נבנה — ‏/maatefet עדיין "בקרוב". נותר לשלב 0: פאנל סופר-אדמין בפועל + מסך CRM ראשון למגזר הכלות (עכשיו יש להם RPCs תקינים לבנות מולם). 2FA והצפנת-שדה עדיין עבודת שכבת-אפליקציה עתידית. מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
