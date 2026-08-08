-- 0049 — הנורמליזציה חתכה את הדומיין בלי לשאול של מי הוא
--
-- ‏core.issues #122, שנפתח במפורש בסבב הקודם ונשאר פתוח: השורה הראשונה של
-- core.app_key_normalize הייתה
--
--     v := regexp_replace(v, '^[a-z]+://[^/]+', '', 'i');
--
-- כלומר הפרוטוקול והדומיין ירדו **בלי שאיש שאל מי הדומיין**. התנהגות מ-0015,
-- ו-0048 לא נגעה בה. נמדד 09/08 על המסד החי:
--
--     core.app_key_normalize('https://evil.com/bkalot')  →  'bkalot'
--
-- הדרך שזה מגיע לייצור היא הקלט שהלקוחות באמת שולחים — שניהם **כתובת**, לא
-- מפתח:
--
--     portal/public/auth-button.js:353   more30_join_app({ p_app: location.href })
--     portal/public/auth/callback.html:158
--         more30_join_app({ p_app: returnTo() || document.referrer || 'more30' })
--
-- ‏returnTo() כבר מוגבל לנתיב יחיד (callback.html:130), ולכן החור הוא
-- document.referrer: מי שנוחת ב-/auth/callback מאתר זר יכול לקבל שורת חברות
-- ב-core.app_memberships של מערכת קיימת.
--
-- מה שמצמצם, ונמדד ולא הונח: הפונקציה אינה יכולה להמציא מפתח — כל ערך שיוצא
-- ממנה הוא path רשום ב-core.projects או 'more30'. חברות היא רישום ואינה שער
-- גישה. לכן זו רשומה שקרית ולא הרשאה שדלפה. אבל §2 ו-§3 קוראים בדיוק את
-- הטבלה הזו כדי לענות "מי הלקוחות של המערכת", ולידה שאיש לא ביקש היא בדיוק
-- מה שכלל "נתוני אמת בלבד" אוסר.
--
-- ── למה זו טבלה ולא רשימה בתוך הפונקציה ─────────────────────────────────────
--
-- הסיבה שהבאג של 0048 היה באג היא שרשימה מוקלדת בתוך גוף פונקציה לא גדלה
-- כשהמערכת גדלה. אותו לקח כאן: הדומיינים המורשים הם עובדה על **הניתוב**, לא
-- על המסד. core.trusted_origins מחזיקה אותם כשורות, ו-
-- scripts/qa/normalize-rejects-foreign-hosts.mjs גוזר את אותה רשימה מחדש מ-
-- portal/vercel.dist.json בכל ריצה ומשווה — כך שהרכבה חדשה שתיווסף לניתוב
-- ולא לטבלה תיתפס כאן, ולא בשקט בעוד חודש.
--
-- מה מורשה, ולמה בדיוק זה:
--
--   • more30.com (+www) — המקור הקנוני. נמדד: **כל** live_url שרשום
--     ב-core.projects הוא more30.com, 25 מתוך 25, וכן שלושת ה-admin_url
--     המוחלטים. הדומיין הזה הוא היחיד שהמרשם מכיר.
--   • 25 מארחי ההרכבה — היעדים ש-portal/vercel.dist.json באמת מפנה אליהם
--     (24 ‏*.vercel.app + kioskfleet-production.up.railway.app). הם חייבים
--     להיות ברשימה: auth-button.js שולח location.href, ומי שגולש ישירות
--     להרכבה במקום דרך more30.com היה מפסיק להירשם כלקוח.
--   • localhost ו-127.0.0.1 — פיתוח מקומי. אתר זר אינו יכול לזייף referrer
--     כזה; רק דף שרץ על המכונה עצמה.
--
-- מה **לא** נכלל, במכוון ובגלוי: תבנית '%-more30.vercel.app'. השם ב-
-- vercel.app הוא מרחב שמות גלובלי, ותבנית הייתה מרשה לכל אחד שירשום פרויקט
-- בשם כזה. וכן: מארח התצוגה-המקדימה של הפורטל עצמו אינו ברשימה (אין לו שורה
-- בניתוב, כי הכינוי שלו הוא more30.com). כניסה מהמארח הגולמי ההוא תחזיר null
-- עד שיירשם כאן.
--
-- אימות: node scripts/qa/normalize-rejects-foreign-hosts.mjs

-- ── 1. המארחים שאנחנו מגישים מהם ────────────────────────────────────────────
create table if not exists core.trusted_origins (
  host     text primary key,
  kind     text not null check (kind in ('canonical', 'assembly', 'dev')),
  note     text,
  added_at timestamptz not null default now()
);

comment on table core.trusted_origins is
  'המארחים שמותר לכתובת להגיע מהם. נגזר מ-portal/vercel.dist.json ומהמקור '
  'הקנוני; core.app_key_normalize מחזירה null לכל מארח שאינו כאן (#122).';

insert into core.trusted_origins (host, kind, note) values
  ('more30.com',                          'canonical', 'המקור הקנוני — כל live_url ב-core.projects'),
  ('www.more30.com',                      'canonical', 'אותו אתר, עם www'),
  ('localhost',                           'dev',       'פיתוח מקומי; פורט נחתך לפני ההשוואה'),
  ('127.0.0.1',                           'dev',       'פיתוח מקומי'),
  ('nihul-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('torah-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('tamlul-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('modaot-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('chizukim2-more30.vercel.app',         'assembly',  'portal/vercel.dist.json'),
  ('chatzor-more30.vercel.app',           'assembly',  'portal/vercel.dist.json'),
  ('egod-more30.vercel.app',              'assembly',  'portal/vercel.dist.json'),
  ('mthbram-more30.vercel.app',           'assembly',  'portal/vercel.dist.json'),
  ('zchuyot-more30.vercel.app',           'assembly',  'portal/vercel.dist.json'),
  ('galil-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('bkalot-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('smel-more30.vercel.app',              'assembly',  'portal/vercel.dist.json'),
  ('kupot-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('gesher-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('smachot-more30.vercel.app',           'assembly',  'portal/vercel.dist.json'),
  ('briut-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('nadlan-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('mechiron-more30.vercel.app',          'assembly',  'portal/vercel.dist.json'),
  ('studio-more30.vercel.app',            'assembly',  'portal/vercel.dist.json'),
  ('imud-more30.vercel.app',              'assembly',  'portal/vercel.dist.json'),
  ('orech-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('crm-more30.vercel.app',               'assembly',  'portal/vercel.dist.json'),
  ('kesef-more30.vercel.app',             'assembly',  'portal/vercel.dist.json'),
  ('nadlan-pro-more30.vercel.app',        'assembly',  'portal/vercel.dist.json — מגיש את /tivuch'),
  ('kioskfleet-production.up.railway.app','assembly',  'portal/vercel.dist.json — הקיוסק על Railway')
on conflict (host) do update
  set kind = excluded.kind,
      note = excluded.note;

-- ── 2. השער ─────────────────────────────────────────────────────────────────
-- הפורט נחתך כאן ולא אצל הקורא, כדי ש-'localhost:5173' יעבוד בלי שהרשימה
-- תצטרך לדעת על פורטים.
create or replace function core.app_host_trusted(p_host text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from core.trusted_origins t
    where t.host = regexp_replace(lower(btrim(coalesce(p_host, ''))), ':[0-9]+$', '')
  );
$$;

comment on function core.app_host_trusted(text) is
  'מארח (עם פורט או בלי) → האם אנחנו מגישים ממנו. ריק = false.';

-- ── 3. הנורמליזציה, עם השער ─────────────────────────────────────────────────
create or replace function core.app_key_normalize(p_raw text)
returns text
language plpgsql
stable
as $$
declare
  v      text;
  v_auth text;
  v_host text;
  v_app  text;
  v_key  text;
begin
  v := btrim(coalesce(p_raw, ''));

  -- שער הדומיין (#122). האוטוריטה נחתכת ב-'/' וגם ב-'?' וב-'#', אחרת
  -- 'https://evil.com?x=/bkalot' היה מבריח את הדומיין פנימה כחלק מהנתיב.
  if v ~* '^[a-z][a-z0-9+.-]*://' then
    v_auth := substring(v from '^[a-z][a-z0-9+.-]*://([^/?#]*)');
    v      := regexp_replace(v, '^[a-z][a-z0-9+.-]*://[^/?#]*', '', 'i');
  elsif v like '//%' then                                -- כתובת ללא פרוטוקול
    v_auth := substring(v from '^//([^/?#]*)');
    v      := regexp_replace(v, '^//[^/?#]*', '');
  end if;

  if v_auth is not null then
    -- 'https://more30.com@evil.com/bkalot' — המארח האמיתי הוא מה שאחרי ה-'@'.
    v_host := regexp_replace(v_auth, '^[^@]*@', '');
    if not core.app_host_trusted(v_host) then
      return null;                                       -- לא אנחנו. לא נרשם.
    end if;
  end if;

  -- ‏'?app=' נקרא כאן, לפני שה-query נמחק. זו הכתובת שכרטיס בדף הבית מוביל
  -- אליה ('/system.html?app=nadlan'), ובעמוד כזה שם המערכת יושב **רק** שם.
  -- ‏'[?&]app=' דורש את המפריד, ולכן 'myapp=' ו-'app_id=' אינם נתפסים.
  v_app := substring(v from '[?&]app=([^&#]*)');
  if v_app is not null then
    v_app := lower(regexp_replace(v_app, '[^A-Za-z0-9_-]', '', 'g'));
    if v_app <> '' then
      v_key := core.app_key_lookup(v_app);
      if v_key is not null then return v_key; end if;
      if v_app = 'more30' then return 'more30'; end if;
    end if;
  end if;

  v := regexp_replace(v, '[?#].*$', '');                -- הורדת query/hash
  v := trim(both '/' from v);
  v := split_part(v, '/', 1);                           -- המקטע הראשון בלבד
  v := regexp_replace(v, '\.[A-Za-z0-9]+$', '');        -- '/system.html' → 'system'
  v := lower(regexp_replace(v, '[^A-Za-z0-9_-]', '', 'g'));

  if v = '' then return 'more30'; end if;               -- דף הבית

  -- המרשם קודם. דף פורטל לעולם אינו מאפיל על path אמיתי.
  v_key := core.app_key_lookup(v);
  if v_key is not null then return v_key; end if;

  -- הדפים המשותפים של הפלטפורמה אינם אתר בפני עצמו — הם שייכים לפורטל (33).
  -- הרשימה היא המסלולים ש-portal/vercel.dist.json מגיש מ-portal/public/,
  -- בשתי הצורות שבהן אפשר לפגוש אותם (המסלול הנקי ושם הקובץ).
  -- 'more30' עצמו ברשימה כי זה המפתח שהפונקציה מחזירה: ערך שיוצא ממנה חייב
  -- לשרוד מעבר נוסף דרכה, אחרת קורא שמעביר הלאה מפתח מוכר מקבל "לא מוכר".
  if v in ('more30','login','me','admin','auth','nihul',
           'subscribe','showcase','system','robots','sitemap')
     or v like 'admin-%'                                -- תשעת מסכי הלוח הסטטיים
  then
    return 'more30';
  end if;

  return null;   -- לא מוכר; הקורא מחליט מה לעשות עם זה
end;
$$;

comment on function core.app_key_normalize(text) is
  'כתובת שהמשתמש עמד בה → מפתח מערכת. דוחה מארח שאינו ב-core.trusted_origins, '
  'קורא ?app= לפני שהוא זורק את ה-query, חותך סיומת קובץ, ומחזיר more30 לדפי '
  'הפורטל עצמו. null = לא מוכר, ואז לא נכתבת חברות.';
