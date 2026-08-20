-- more30 · 39-maatefet — enforce 2FA (Supabase Auth MFA / aal2) for every
-- verified-instructor and super-admin action that touches couple PII
-- ============================================================================
-- MAATEFET_BUILD.md's "אבטחה כערך-על" line requires 2FA for everyone, and
-- every stage-0 round since #12 has flagged it as deliberately deferred
-- (0108's own header lists it explicitly: "2FA enforcement ... next rounds").
-- This is that step, scoped to the two roles that can actually reach
-- client/couple PII today: a verified instructor and the super-admin panel.
-- Client-facing MFA (the couple's own personal-area login) is stage 1 —
-- there is no personal-area screen yet to gate — and stays out of this
-- round; tracked in MAATEFET_BUILD.md, not silently dropped.
--
-- Enforcement point: `maatefet.my_instructor_id()` is the single choke point
-- every clients/invites/content_items RLS policy and every instructor-facing
-- RPC (0110) already calls through. Adding the aal2 check there — instead of
-- to each policy separately — closes the gate everywhere at once and can't
-- be forgotten on the next new table. Supabase's documented pattern for this
-- is reading the `aal` claim straight off the request JWT (`auth.jwt() ->>
-- 'aal'`); that helper is already proven live on this exact project (see
-- 0009/0010/0031 nadlan_pro migrations) so this isn't a new dependency.
-- A verified instructor whose *session* hasn't completed an MFA challenge
-- (still aal1) is now treated exactly like a non-instructor: RLS returns
-- zero rows, and RPCs that require an instructor id raise the same "only a
-- verified instructor can ..." error they already raise today. Verification
-- status itself (pending/verified/suspended) is untouched — this is a
-- session-level gate stacked on top of it, not a replacement for it.
--
-- The super-admin verify/suspend action gets its own explicit check inside
-- maatefet.verify_instructor() — approving or suspending an instructor is at
-- least as sensitive as reading one client row. Deliberately NOT added to
-- public.more30_is_super_admin() itself, which every other admin surface
-- (30/31/36/etc.) also calls; changing that shared function is out of this
-- round's scope and would risk locking out admins on unrelated systems that
-- have never enrolled MFA. Scoping the check to this one RPC keeps the
-- blast radius to maatefet only.

create or replace function maatefet.my_instructor_id()
returns uuid
language sql
stable
security definer
set search_path = maatefet
as $$
  select id from maatefet.instructors
  where auth_user_id = auth.uid()
    and status = 'verified'
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
  limit 1
$$;

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
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'super-admin session requires 2FA (aal2) to verify or suspend an instructor';
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

-- ---------- expose current MFA state to the client, so the UI can show an
-- enroll/challenge screen instead of a misleading "no clients yet" ----------
-- `maatefet_me()` (0110) already reports the instructor/client rows; adding
-- the raw aal claim lets the app distinguish "not verified yet" from
-- "verified but this session hasn't completed its 2FA challenge" without a
-- second round trip.
create or replace function public.maatefet_me()
returns jsonb
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'instructor', (select to_jsonb(i) from maatefet.instructors i where i.auth_user_id = auth.uid()),
    'client', (select to_jsonb(c) from maatefet.clients c where c.auth_user_id = auth.uid()),
    'is_super_admin', public.more30_is_super_admin(),
    'aal', auth.jwt() ->> 'aal'
  )
$$;

-- ---------- registry note ----------
update core.projects
set note = 'שלב 0: סכימת maatefet חיה + RLS מדורג + invite-only + UI ראשון (index/instructor/join/admin) + API ציבורי. '
  || '[20/08/2026 סבב 5] נאכף 2FA (Supabase Auth MFA/aal2) בפועל בשכבת ה-DB: '
  || 'maatefet.my_instructor_id() — הפונקציה שכל מדיניות RLS ו-RPC של מדריך עוברת דרכה — דורשת עכשיו '
  || 'auth.jwt()->>''aal''=''aal2'' בנוסף ל-status=''verified''; מדריך מאומת עם session שלא עבר עדיין אתגר 2FA '
  || 'נחסם בדיוק כמו מי שאינו מדריך כלל (0 שורות, לא שגיאה מטעה). maatefet.verify_instructor() (פאנל סופר-אדמין) '
  || 'דורש aal2 באופן מפורש משלו — לא נגעתי ב-public.more30_is_super_admin() הגלובלי כדי לא לסכן מערכות אחרות '
  || 'שמשתמשות בו. maatefet_me() חושף עכשיו את ה-aal הנוכחי כדי שה-UI יציג מסך הרשמה/אתגר 2FA נכון במקום מסך ריק '
  || 'מטעה. 2FA ללקוח (חתן/כלה) עדיין לא נבנה — אין עדיין מסך אזור-אישי לשער (שלב 1). הצפנת-שדה לתוכן רגיש עדיין '
  || 'לא נבנתה. מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
