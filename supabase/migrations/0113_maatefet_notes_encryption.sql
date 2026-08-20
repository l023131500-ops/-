-- more30 · 39-maatefet — field-level encryption for maatefet.clients.notes
-- ============================================================================
-- MAATEFET_BUILD.md's "אבטחה כערך-על" line requires field-level encryption for
-- sensitive content; every round since #12 (0108's own header) has flagged this
-- as the one deliberately-deferred stage-0 security item, alongside 2FA (closed
-- in 0112). This closes it. Scope: maatefet.clients.notes — free-text
-- counseling/guidance notes an instructor keeps about a chatan/kallah couple,
-- the most sensitive PII field in stage 0 (more sensitive than name/phone/email,
-- which are needed in plaintext for contact/display and are not the target
-- here — only free-text notes are encrypted, matching the literal ask).
--
-- Verified before writing this: maatefet.clients has 0 rows today (0 with
-- notes), so there is no plaintext data to migrate in place — this adds the
-- encrypted column directly, no backfill needed.
--
-- Mechanism: pgcrypto (already installed, schema `extensions`) symmetric
-- pgp_sym_encrypt/decrypt, keyed by a secret stored in Supabase Vault
-- (already installed) — the documented Supabase pattern for column encryption.
-- The key itself is only ever read inside a SECURITY DEFINER helper with no
-- grants to any client role; authenticated callers get encrypt_note/decrypt_note
-- helpers that take/return values, never the key. The public.maatefet_*
-- wrappers (already the only RLS-safe path to the clients table, per 0110)
-- stay SECURITY INVOKER so RLS on maatefet.clients keeps deciding *which rows*
-- are reachable — encryption only changes how the notes value is stored, not
-- who can reach a row.

-- ---------- vault-backed key (idempotent — safe to re-run) ----------
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'maatefet_notes_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'base64'),
      'maatefet_notes_key',
      'more30 · 39-maatefet: symmetric key for pgp_sym_encrypt/decrypt on maatefet.clients.notes (couple counseling notes — PII).'
    );
  end if;
end $$;

-- ---------- key accessor: never exposed beyond this schema's own functions ----------
create or replace function maatefet._notes_key()
returns text
language sql
stable
security definer
set search_path = vault, pg_temp
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'maatefet_notes_key'
$$;

revoke all on function maatefet._notes_key() from public, authenticated, anon;

-- ---------- encrypt/decrypt helpers (safe to call: no key ever leaves these) ----------
create or replace function maatefet.encrypt_note(p_plain text)
returns bytea
language sql
stable
security definer
set search_path = extensions, maatefet, pg_temp
as $$
  select case when p_plain is null then null
         else extensions.pgp_sym_encrypt(p_plain, maatefet._notes_key())
         end
$$;

revoke all on function maatefet.encrypt_note(text) from public, anon;
grant execute on function maatefet.encrypt_note(text) to authenticated;

create or replace function maatefet.decrypt_note(p_enc bytea)
returns text
language sql
stable
security definer
set search_path = extensions, maatefet, pg_temp
as $$
  select case when p_enc is null then null
         else extensions.pgp_sym_decrypt(p_enc, maatefet._notes_key())
         end
$$;

revoke all on function maatefet.decrypt_note(bytea) from public, anon;
grant execute on function maatefet.decrypt_note(bytea) to authenticated;

-- ---------- swap the column: plaintext `notes` -> encrypted `notes_enc` ----------
alter table maatefet.clients add column notes_enc bytea;
alter table maatefet.clients drop column notes;

-- ---------- public API: decrypt on read, encrypt on write, same field name/shape ----------
-- return type changes from `setof maatefet.clients` (notes_enc is bytea, wrong
-- shape for the UI) to an explicit table matching the original columns with
-- `notes` as decrypted text — the instructor.html/admin.html UI already reads
-- `c.notes` as plain text and needs no change.
drop function if exists public.maatefet_clients_list();

create function public.maatefet_clients_list()
returns table (
  id uuid, instructor_id uuid, invite_id uuid, auth_user_id uuid, segment maatefet.segment,
  full_name text, partner_name text, phone text, email text, wedding_date date, notes text,
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select c.id, c.instructor_id, c.invite_id, c.auth_user_id, c.segment,
         c.full_name, c.partner_name, c.phone, c.email, c.wedding_date,
         maatefet.decrypt_note(c.notes_enc) as notes,
         c.created_at, c.updated_at
  from maatefet.clients c
  order by c.created_at desc
$$;

revoke all on function public.maatefet_clients_list() from public;
grant execute on function public.maatefet_clients_list() to authenticated;

drop function if exists public.maatefet_client_update(uuid, text, text, text, date, text);

create function public.maatefet_client_update(
  p_id uuid,
  p_partner_name text default null,
  p_phone text default null,
  p_email text default null,
  p_wedding_date date default null,
  p_notes text default null
)
returns table (
  id uuid, instructor_id uuid, invite_id uuid, auth_user_id uuid, segment maatefet.segment,
  full_name text, partner_name text, phone text, email text, wedding_date date, notes text,
  created_at timestamptz, updated_at timestamptz
)
language sql
security invoker
set search_path = maatefet, public
as $$
  update maatefet.clients
  set partner_name = coalesce(p_partner_name, partner_name),
      phone = coalesce(p_phone, phone),
      email = coalesce(p_email, email),
      wedding_date = coalesce(p_wedding_date, wedding_date),
      notes_enc = case when p_notes is not null then maatefet.encrypt_note(p_notes) else notes_enc end
  where id = p_id
  returning id, instructor_id, invite_id, auth_user_id, segment,
            full_name, partner_name, phone, email, wedding_date,
            maatefet.decrypt_note(notes_enc) as notes,
            created_at, updated_at
$$;

revoke all on function public.maatefet_client_update(uuid, text, text, text, date, text) from public;
grant execute on function public.maatefet_client_update(uuid, text, text, text, date, text) to authenticated;

-- ---------- maatefet_me(): keep the client-self shape consistent (unused by any UI
-- today — stage 1's personal-area screen is the first consumer — but wrong now
-- beats wrong later) ----------
create or replace function public.maatefet_me()
returns jsonb
language sql
stable
security invoker
set search_path = maatefet, public
as $$
  select jsonb_build_object(
    'instructor', (select to_jsonb(i) from maatefet.instructors i where i.auth_user_id = auth.uid()),
    'client', (
      select jsonb_build_object(
        'id', c.id, 'instructor_id', c.instructor_id, 'invite_id', c.invite_id,
        'auth_user_id', c.auth_user_id, 'segment', c.segment,
        'full_name', c.full_name, 'partner_name', c.partner_name,
        'phone', c.phone, 'email', c.email, 'wedding_date', c.wedding_date,
        'notes', maatefet.decrypt_note(c.notes_enc),
        'created_at', c.created_at, 'updated_at', c.updated_at
      )
      from maatefet.clients c where c.auth_user_id = auth.uid()
    ),
    'is_super_admin', public.more30_is_super_admin(),
    'aal', auth.jwt() ->> 'aal'
  )
$$;

revoke all on function public.maatefet_me() from public;
grant execute on function public.maatefet_me() to authenticated;

-- ---------- registry note ----------
update core.projects
set note = 'שלב 0: סכימת maatefet חיה + RLS מדורג + invite-only + UI ראשון (index/instructor/join/admin) + API ציבורי + 2FA (aal2) למדריך/סופר-אדמין. '
  || '[20/08/2026 סבב 6] נסגר הפער האחרון שתועד לשלב 0: הצפנת-שדה לתוכן רגיש. maatefet.clients.notes (הערות ליווי חופשיות על זוג — השדה הרגיש ביותר בשלב 0) '
  || 'מוצפן עכשיו at-rest עם pgp_sym_encrypt/decrypt (pgcrypto) ומפתח סימטרי שמור ב-Supabase Vault, לא בקוד/בטבלה. המפתח עצמו נגיש רק לפונקציית עזר '
  || 'SECURITY DEFINER יחידה (maatefet._notes_key) בלי שום הרשאה ל-authenticated/anon/public — לקוחות מקבלים רק encrypt_note/decrypt_note שמקבלים/מחזירים ערכים, לא את המפתח. '
  || 'RLS על maatefet.clients נשאר שכבת ההגנה על *אילו שורות* נגישות (ללא שינוי); ההצפנה מגנה על *איך* השדה שמור בדיסק/בגיבויים. עמודת notes הוחלפה ב-notes_enc (bytea); '
  || 'public.maatefet_clients_list/maatefet_client_update/maatefet_me מפענחים/מצפינים שקוף כך שה-UI הקיים (instructor.html/admin.html) לא נגע כלל — עדיין קורא/כותב שדה notes כטקסט רגיל. '
  || '0 שורות היו בטבלה לפני הסבב (אומת) — אין מיגרציית נתונים נדרשת. שלב 0 עכשיו סגור עם כל 4 הרכיבים מהאפיון: CRM + ספריית תוכן + פאנל סופר-אדמין + אבטחה (2FA+הצפנה). '
  || 'עדיין נדרש מהמשתמש (לא טכני): פרויקט Vercel נפרד כדי ש-/maatefet יהיה חי בפועל (ר׳ NEEDS_USER.md). מפרט מלא: MAATEFET_BUILD.md.'
where number = '39';
