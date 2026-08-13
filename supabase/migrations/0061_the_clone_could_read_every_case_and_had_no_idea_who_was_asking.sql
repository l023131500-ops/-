-- 0061 — bkalot_clone שכבה 2, הלבנה השנייה: הכניסה לניהול (core.issues #224 סעיף 2)
--
-- מה היה: 0060 בנה את נתיב הקריאה — bkalot_clone_admin_cases/‏_case מחזירות כל
-- פנייה שנקלטה, כולל שם, טלפון ומייל של מי שהשאיר פרטים. ה-README והמיגרציה
-- עצמה רשמו במפורש שאין בהן שום בדיקת זהות, ושהכניסה לניהול חייבת לנחות
-- *לפני* שיש להן כתובת HTTP: edge function שהייתה קוראת להן בלי שער הייתה
-- חושפת את כל הפניות לכל מחזיק מפתח anon — והמפתח הזה יושב בקוד המקור של
-- הטופס הציבורי מאז #223, כלומר הוא ידוע לכל מי שפתח את more30.com/bkalot-studio.
--
-- מה נבנה כאן — הזהות בלבד, בלי ולו כתובת HTTP אחת:
--   bkalot_clone.admin_users     — משתמשי ניהול (bcrypt)
--   bkalot_clone.admin_sessions  — סשנים; נשמר hash של הטוקן, לא הטוקן
--   public.bkalot_clone_admin_create(jsonb)   — יצירת משתמש ניהול
--   public.bkalot_clone_admin_login(jsonb)    — אימות → טוקן אטום
--   public.bkalot_clone_admin_session(text)   — אימות טוקן (מה שהשער יקרא)
--   public.bkalot_clone_admin_logout(text)    — ביטול סשן
--
-- שתי סטיות מכוונות מהמקור, שתיהן רשומות ב-BKALOT_METHOD §6.2 כ«אל תשכפל»:
--
-- (1) המקור מחזיק ב-app_users גם password_hash (sha256) וגם password_plain —
--     הסיסמה בהיר עד שנמסרה. כאן: bcrypt (pgcrypto, work factor 12) ואין עמודה
--     שמחזיקה סיסמה קריאה בשום שלב. מסירה חד-פעמית: הסיסמה חוזרת מ-create
--     בתשובה ואינה ניתנת לשליפה אחר כך משום מקום.
--
-- (2) המקור מחזיק ב-admin_sessions את הטוקן עצמו. כאן נשמר sha256 שלו בלבד,
--     ולכן קריאה של הטבלה — גיבוי, דאמפ, או באג קריאה — אינה מניבה טוקן שאפשר
--     להתחבר איתו. הדפוס שכן הועתק מהמקור הוא הטוקן האטום בכותרת Authorization
--     מ-state בזיכרון, בלי localStorage ובלי cookies (schema.ts:166-168).
--
-- שלוש הכרעות שנגזרות מכשל אפשרי ולא מהעדפה:
--
-- (א) מייל שאינו קיים וסיסמה שגויה מחזירים את אותה שגיאה בדיוק
--     (invalid_credentials), ובמסלול «אין משתמש» מורץ crypt מדומה באותו work
--     factor. בלעדיו זמן התשובה היה מסגיר אילו מיילים רשומים כמנהלים — הפרש
--     של ~100ms שנמדד בקלות מדפדפן.
--
-- (ב) נעילה אחרי 5 כשלונות, אבל account_locked מוחזר *רק* אחרי שהסיסמה אומתה
--     כנכונה. אילו הנעילה הוחזרה לפני כן, היא עצמה הייתה מסגירה שהמייל קיים —
--     בדיוק מה שסעיף (א) מונע.
--
-- (ג) הטוקן הוא 32 בייט מ-gen_random_bytes ולא md5(random()) — random() הוא
--     PRNG שאינו קריפטוגרפי וניתן לחיזוי מתוך פלטים קודמים.
--
-- 🚫 שום נגיעה ב-08/09/bkalut-app/bkalot-admin/zr_*/NEDARIM3873 ובסכמות csj/csj_src/igud.
--    אין DDL על שום טבלה קיימת — שתי טבלאות חדשות בסכמת השכפול בלבד.
--    מצב טסט: אין נגיעה ב-bkalot_auto.outbound_queue, אין שליחה ואין מייל.
--    אין כאן פריסה ואין כתובת HTTP — הן הלבנה הבאה, ובכוונה בסדר הזה.

-- ── טבלאות ───────────────────────────────────────────────────────────────────
create table if not exists bkalot_clone.admin_users (
  id              bigserial primary key,
  email           text        not null unique,
  full_name       text        not null,
  password_hash   text        not null,          -- bcrypt; אין עמודת בהיר, בכוונה
  is_active       boolean     not null default true,
  failed_attempts int         not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  constraint admin_users_email_lower_ck check (email = lower(email))
);

comment on table bkalot_clone.admin_users is
  'משתמשי הניהול של שכפול בקלות. bcrypt בלבד — אין עמודה שמחזיקה סיסמה קריאה, '
  'בניגוד ל-app_users.password_plain במקור (BKALOT_METHOD §6.2).';

create table if not exists bkalot_clone.admin_sessions (
  id           bigserial primary key,
  admin_id     bigint      not null references bkalot_clone.admin_users(id) on delete cascade,
  token_hash   text        not null unique,      -- sha256 של הטוקן; לא הטוקן
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz,
  user_agent   text,
  ip           text
);

comment on table bkalot_clone.admin_sessions is
  'סשני ניהול. נשמר sha256 של הטוקן ולא הטוקן — קריאת הטבלה אינה מניבה טוקן '
  'שאפשר להתחבר איתו. ON DELETE CASCADE: מחיקת מנהל מנתקת אותו מיד.';

create index if not exists admin_sessions_admin_id_idx on bkalot_clone.admin_sessions(admin_id);
create index if not exists admin_sessions_expires_at_idx on bkalot_clone.admin_sessions(expires_at);

-- RLS דלוק ואפס policies, כמו שלוש הטבלאות של 0057: כל גישה עוברת דרך
-- הפונקציות למטה, שהן SECURITY DEFINER — ולא דרך PostgREST.
alter table bkalot_clone.admin_users    enable row level security;
alter table bkalot_clone.admin_sessions enable row level security;

-- אין ולו הרשאת טבלה אחת לאף תפקיד, כולל service_role. הפונקציות רצות כבעליהן
-- ואינן זקוקות לה; grant גורף היה פותח נתיב קריאה ל-password_hash דרך תפקיד
-- שיושב ב-edge function.
revoke all on bkalot_clone.admin_users    from public, anon, authenticated, service_role;
revoke all on bkalot_clone.admin_sessions from public, anon, authenticated, service_role;
revoke all on sequence bkalot_clone.admin_users_id_seq    from public, anon, authenticated, service_role;
revoke all on sequence bkalot_clone.admin_sessions_id_seq from public, anon, authenticated, service_role;

-- ── יצירת משתמש ניהול ────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_admin_create(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email text;
  v_name  text;
  v_pw    text;
  v_id    bigint;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'payload_invalid');
  end if;

  v_email := lower(btrim(coalesce(p->>'email', '')));
  v_name  := btrim(coalesce(p->>'full_name', ''));
  v_pw    := coalesce(p->>'password', '');

  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('ok', false, 'error', 'email_invalid');
  end if;
  if v_name = '' then
    return jsonb_build_object('ok', false, 'error', 'full_name_required');
  end if;
  -- 10 ולא 8: הסיסמה הזו נמסרת ידנית פעם אחת ואינה מוקלדת יום-יום
  if length(v_pw) < 10 then
    return jsonb_build_object('ok', false, 'error', 'password_too_short', 'min_length', 10);
  end if;

  if exists (select 1 from bkalot_clone.admin_users u where u.email = v_email) then
    return jsonb_build_object('ok', false, 'error', 'email_taken');
  end if;

  insert into bkalot_clone.admin_users (email, full_name, password_hash)
  values (v_email, v_name,
          extensions.crypt(v_pw, extensions.gen_salt('bf', 12)))
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'admin', jsonb_build_object('id', v_id, 'email', v_email, 'full_name', v_name));
end;
$fn$;

comment on function public.bkalot_clone_admin_create(jsonb) is
  'שכבה 2: יצירת משתמש ניהול. הסיסמה נכנסת bcrypt ואינה נשמרת קריאה בשום עמודה — '
  'אחרי הקריאה הזו אין מאיפה לשלוף אותה. service_role בלבד.';

-- ── כניסה ────────────────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_admin_login(p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_email  text;
  v_pw     text;
  v_u      bkalot_clone.admin_users%rowtype;
  v_token  text;
  v_exp    timestamptz;
  c_ttl    interval := interval '12 hours';
  c_max    int      := 5;
  c_lock   interval := interval '15 minutes';
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'payload_invalid');
  end if;

  v_email := lower(btrim(coalesce(p->>'email', '')));
  v_pw    := coalesce(p->>'password', '');

  if v_email = '' or v_pw = '' then
    return jsonb_build_object('ok', false, 'error', 'credentials_required');
  end if;

  select * into v_u from bkalot_clone.admin_users u where u.email = v_email;

  -- הכרעה (א): מייל שאינו קיים עולה אותו זמן כמו סיסמה שגויה, ומחזיר את אותה
  -- שגיאה. בלי ה-crypt המדומה הזה, ההפרש היה מונה מיילים רשומים מדפדפן.
  if not found then
    perform extensions.crypt(v_pw, extensions.gen_salt('bf', 12));
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  if v_u.password_hash <> extensions.crypt(v_pw, v_u.password_hash) then
    update bkalot_clone.admin_users u
       set failed_attempts = u.failed_attempts + 1,
           locked_until = case when u.failed_attempts + 1 >= c_max
                               then now() + c_lock else u.locked_until end
     where u.id = v_u.id;
    return jsonb_build_object('ok', false, 'error', 'invalid_credentials');
  end if;

  -- הכרעה (ב): רק מכאן ואילך אפשר לומר משהו מדויק — מי שהגיע לשורה הזו כבר
  -- מחזיק את הסיסמה הנכונה, ולכן account_locked אינו מסגיר לו דבר שאינו יודע.
  if v_u.locked_until is not null and v_u.locked_until > now() then
    return jsonb_build_object('ok', false, 'error', 'account_locked',
                              'locked_until', v_u.locked_until);
  end if;
  if not v_u.is_active then
    return jsonb_build_object('ok', false, 'error', 'account_disabled');
  end if;

  -- הכרעה (ג): 32 בייט קריפטוגרפיים, base64url בלי padding
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_exp   := now() + c_ttl;

  -- ניקוי בלי cron: סשנים שפגו לפני יותר משבוע נמחקים בכל כניסה
  delete from bkalot_clone.admin_sessions s where s.expires_at < now() - interval '7 days';

  insert into bkalot_clone.admin_sessions (admin_id, token_hash, expires_at, user_agent, ip)
  values (v_u.id,
          encode(extensions.digest(v_token, 'sha256'), 'hex'),
          v_exp,
          nullif(btrim(coalesce(p->>'user_agent', '')), ''),
          nullif(btrim(coalesce(p->>'ip', '')), ''));

  update bkalot_clone.admin_users u
     set failed_attempts = 0, locked_until = null, last_login_at = now()
   where u.id = v_u.id;

  return jsonb_build_object(
    'ok', true,
    'token', v_token,                 -- הפעם היחידה שהטוקן קיים בפלט
    'expires_at', v_exp,
    'admin', jsonb_build_object('id', v_u.id, 'email', v_u.email,
                                'full_name', v_u.full_name));
end;
$fn$;

comment on function public.bkalot_clone_admin_login(jsonb) is
  'שכבה 2: כניסה לניהול. מייל לא קיים וסיסמה שגויה מחזירים invalid_credentials '
  'זהה ובאותו זמן ריצה. הטוקן מוחזר פעם אחת ונשמר כ-sha256 בלבד. service_role בלבד.';

-- ── אימות טוקן — זה מה שהשער יקרא לפני כל קריאה של 0060 ──────────────────────
create or replace function public.bkalot_clone_admin_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_hash text;
  v_sid  bigint;
  v_aid  bigint;
  v_exp  timestamptz;
  v_rev  timestamptz;
  v_act  boolean;
  v_mail text;
  v_name text;
begin
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'token_required');
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  select s.id, s.admin_id, s.expires_at, s.revoked_at, u.is_active, u.email, u.full_name
    into v_sid, v_aid, v_exp, v_rev, v_act, v_mail, v_name
    from bkalot_clone.admin_sessions s
    join bkalot_clone.admin_users u on u.id = s.admin_id
   where s.token_hash = v_hash;

  -- טוקן שאינו קיים, פג, בוטל, או של מנהל שהושבת — כולם invalid_session אחד.
  -- הפרדה ביניהם הייתה מלמדת תוקף אם הטוקן שבידו היה תקף פעם.
  if not found or v_rev is not null or v_exp <= now() or not v_act then
    return jsonb_build_object('ok', false, 'error', 'invalid_session');
  end if;

  update bkalot_clone.admin_sessions s set last_seen_at = now() where s.id = v_sid;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_sid,
    'expires_at', v_exp,
    'admin', jsonb_build_object('id', v_aid, 'email', v_mail, 'full_name', v_name));
end;
$fn$;

comment on function public.bkalot_clone_admin_session(text) is
  'שכבה 2: אימות טוקן ניהול. זה השער שחייב לרוץ לפני bkalot_clone_admin_cases/_case, '
  'שאין בהן שום בדיקת זהות. כל כשל מוחזר כ-invalid_session אחד. service_role בלבד.';

-- ── יציאה ────────────────────────────────────────────────────────────────────
create or replace function public.bkalot_clone_admin_logout(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_hash text;
  v_n    int;
begin
  if p_token is null or btrim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'token_required');
  end if;

  v_hash := encode(extensions.digest(btrim(p_token), 'sha256'), 'hex');

  update bkalot_clone.admin_sessions s
     set revoked_at = now()
   where s.token_hash = v_hash and s.revoked_at is null;
  get diagnostics v_n = row_count;

  -- ok:true גם כשלא בוטל דבר: «צא» שנכשל על טוקן שכבר פג היה משאיר את המסך
  -- מחובר-לכאורה, ומדובר בפעולה אידמפוטנטית.
  return jsonb_build_object('ok', true, 'revoked', v_n);
end;
$fn$;

comment on function public.bkalot_clone_admin_logout(text) is
  'שכבה 2: ביטול סשן ניהול. אידמפוטנטית — ok:true גם כשאין מה לבטל. service_role בלבד.';

-- ── הרשאות: service_role בלבד ────────────────────────────────────────────────
-- אותה מלכודת שנמדדה ב-0058 וב-0060: פונקציה חדשה ב-public מקבלת EXECUTE
-- ל-PUBLIC כברירת מחדל. בלי ה-revoke הזה, מחזיק מפתח ה-anon — שיושב בקוד המקור
-- של הטופס הציבורי — היה יכול ליצור לעצמו משתמש ניהול בקריאה אחת.
revoke all on function public.bkalot_clone_admin_create(jsonb)  from public, anon, authenticated;
revoke all on function public.bkalot_clone_admin_login(jsonb)   from public, anon, authenticated;
revoke all on function public.bkalot_clone_admin_session(text)  from public, anon, authenticated;
revoke all on function public.bkalot_clone_admin_logout(text)   from public, anon, authenticated;
grant execute on function public.bkalot_clone_admin_create(jsonb)  to service_role;
grant execute on function public.bkalot_clone_admin_login(jsonb)   to service_role;
grant execute on function public.bkalot_clone_admin_session(text)  to service_role;
grant execute on function public.bkalot_clone_admin_logout(text)   to service_role;
