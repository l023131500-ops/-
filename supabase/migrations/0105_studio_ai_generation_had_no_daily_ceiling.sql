-- 0105 — סטודיו מודעות (26): יצירות AI לא נשאו שום מכסה, וכל קריאה עולה כסף אמיתי
--
-- ‏core.projects.audit_gaps של 26 studio מסמן: "אין מכסת יצירות AI (כל יצירה עולה
-- כסף אמיתי) ולכן אי אפשר לפתוח לציבור בלי מנוי." סבב B קודם (19/08, ראה
-- ‏DECISIONS.md #84) בדק אכיפה לפי משתמש מחובר בלבד — getUserIdFromToken — ומצא
-- ‏ששת (בפועל שמונה) נתיבי היצירה ב-vercel-adapter/api/_lib/server/routes.ts לא
-- ‏אוכפים היום שום דבר, ושרוב התעבורה עדיין אנונימית (ההתחברות נוספה רק 19/08),
-- ‏כך שמכסה לפי משתמש הייתה מכסה חלק קטן מהחשיפה ומשאירה את רובה כמו שהיא —
-- ‏ולכן לא נבנה תיקון חלקי שנראה כמו סגירת הפער בלי לסגור אותו.
--
-- ‏התיקון הזה שונה במכוון: מכסה לפי כתובת IP (מגובבת), לא לפי משתמש. זה חל באותה
-- ‏מידה על אנונימי ועל מחובר — בדיוק החלק שהתיקון הקודם לא כיסה — בלי לדרוש
-- ‏התחברות כתנאי-סף (שהייתה שוברת את הזרימה האנונימית הקיימת, רגרסיה אסורה).
--
-- ‏טבלה + פונקציית "העלה-וקרא" אטומית (upsert...on conflict...returning בתוך
-- ‏שאילתה אחת), כדי שקריאות מקבילות מאותה IP לא יחמקו בין קריאה לכתיבה. נגישה
-- ‏רק ל-service_role (בדיוק כמו studio_projects/studio_brands/studio_users —
-- ‏RLS דלוק בלי policies, השרת קורא/כותב עם מפתח ה-service role בלבד).

create table if not exists public.studio_ai_rate_limits (
  ip_hash text not null,
  day     date not null default current_date,
  count   integer not null default 0,
  primary key (ip_hash, day)
);

alter table public.studio_ai_rate_limits enable row level security;
-- אין policies בכוונה: כמו שלוש אחיותיה (studio_projects/brands/users), רק
-- ‏service_role (שעוקף RLS) קורא/כותב כאן — קריאה ישירה מהדפדפן לא אמורה
-- ‏להיות אפשרית בכלל, לא רק לא-רצויה.

comment on table public.studio_ai_rate_limits is
  'מכסת AI יומית לפי כתובת IP מגובבת עבור 26 studio — core.projects.audit_gaps #2, DECISIONS.md #84 (הרחבה). לא PII: ip_hash הוא sha256, אין את ה-IP עצמו.';

create or replace function public.studio_bump_ai_rate_limit(p_ip_hash text, p_limit integer)
returns jsonb
language plpgsql
as $function$
declare
  v_count integer;
begin
  insert into public.studio_ai_rate_limits (ip_hash, day, count)
  values (p_ip_hash, current_date, 1)
  on conflict (ip_hash, day)
  do update set count = public.studio_ai_rate_limits.count + 1
  returning count into v_count;

  return jsonb_build_object('allowed', v_count <= p_limit, 'count', v_count, 'limit', p_limit);
end;
$function$;

comment on function public.studio_bump_ai_rate_limit(text, integer) is
  'עולה-וקרא אטומי למכסת ה-AI היומית של 26 studio. אין grant מפורש לanon/authenticated בכוונה — נקרא רק דרך storage.ts עם service_role.';
