-- 0103 — smel (12) מחזיקה עשרה לידים אמיתיים, ואף מסך לא יכול לקרוא אותם
--
-- core.issues #86 — שש מערכות ציבוריות חיות בלי מסך ניהול במקור. שלוש מתוכן
-- (kesef/imud/studio) כבר קיבלו קורא+מסך באותה תבנית. שלוש נותרו בטענה
-- "פרויקט זר, לא בהאב" — chizukim (17) נסגר ב-19/08 (a212af4) אחרי שהתברר
-- שהחשבון הזה כן מגיע לפרויקט הזר (csjekrvukbdznetsrodj) דרך
-- SUPABASE_ACCESS_TOKEN, וגם דרך FDW שכבר קיים כאן (csj_src_nadlan.*,
-- מיגרציית csjekrvu_fdw_link מ-30/07). smel (12) יושבת באותו פרויקט זר
-- בדיוק, ו-nadlan.research_leads כבר חשופה כאן כטבלת FDW —
-- csj_src_nadlan.research_leads.
--
-- ── מה נמדד עכשיו, לפני שנכתב מסך ──────────────────────────────────────────
--
-- smel אינה מריצה שרת בייצור בכלל — apps/12-smel-ndln/_deploy הוא SPA סטטי
-- טהור (`buildCommand: "echo no-build"`), והלקוח כותב ישירות ל-Supabase
-- (client/src/lib/nadlanApi.ts). לכן אין כאן "אותו תבנית כמו chizukim"
-- (שרת Express+עוגיה) — התבנית הנכונה היא זו של kesef/imud/studio: קורא
-- ב-core (דרך FDW) + מסך סטטי ב-portal, בלי לגעת במקור/בפריסה של smel כלל.
--
-- נמדד חי (uhnrgujbdxhhmoxcjria, דרך csj_src_nadlan.research_leads):
--   10 לידים בסך הכל, 9 מהם עם questionnaire (jsonb) מלא, ואף אחד עם
--   report_generated=true — כל עשרת הלידים במצב status='new'. כלומר הלידים
--   נקלטים (הטופס עובד), אבל אין המשך: אין תהליך שמייצר דוח או מעדכן סטטוס
--   אחרי ההגשה. גם questionnaire_templates: שורה אחת, active=true.
--
-- אין כתיבה כאן — לא לטבלת nadlan.*, לא ל-smel. קורא בלבד, כמו כל אחיותיה.

create or replace function public.more30_admin_smel_report()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'core', 'csj_src_nadlan', 'auth'
as $function$
declare
  t_total    bigint;
  t_with_q   bigint;
  t_reported bigint;
  t_phones   bigint;
  t_emails   bigint;
  templ_total  bigint;
  templ_active bigint;
begin
  if not public.more30_is_super_admin() then
    raise exception 'super admin only' using errcode = '42501';
  end if;

  select count(*),
         count(*) filter (where questionnaire is not null),
         count(*) filter (where report_generated is true),
         count(distinct nullif(trim(phone), '')),
         count(distinct nullif(lower(trim(email)), ''))
    into t_total, t_with_q, t_reported, t_phones, t_emails
    from csj_src_nadlan.research_leads;

  select count(*), count(*) filter (where active)
    into templ_total, templ_active
    from csj_src_nadlan.questionnaire_templates;

  return jsonb_build_object(
    'generated_at', now(),
    'app_key', 'smel',
    'schema', 'csj_src_nadlan (FDW -> csjekrvukbdznetsrodj.nadlan)',
    'notes', jsonb_build_object(
      'what', 'לידי מחקר-נדל"ן של מערכת 12 (smel). המספרים כאן נקראים דרך FDW ישירות מ-nadlan.research_leads בפרויקט הזר, בזמן הקריאה.',
      'no_server', 'smel פועלת כ-SPA סטטי טהור בלי שרת בייצור — הלקוח כותב ישירות ל-Supabase. הדוח קורא בלבד, אין כאן כתיבה/עריכה/מחיקה.',
      'zero', '0 כאן הוא מדידה. סטטוס/דוח שלא הופק מדווח כפי שהוא, לא מוסתר.'
    ),
    'totals', jsonb_build_object(
      'leads', t_total,
      'leads_with_questionnaire', t_with_q,
      'leads_with_report', t_reported,
      'distinct_phones', t_phones,
      'distinct_emails', t_emails,
      'templates', templ_total,
      'templates_active', templ_active
    ),
    'status_breakdown', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.n desc)
        from (select status, count(*) as n
                from csj_src_nadlan.research_leads
               group by status) x
    ), '[]'::jsonb),
    'leads', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
        from (
          select lead_id, full_name, phone, email, query_address, status,
                 report_generated, (questionnaire is not null) as has_questionnaire,
                 created_at
            from csj_src_nadlan.research_leads
           order by created_at desc
           limit 500
        ) x
    ), '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.more30_admin_smel_report() to authenticated;

comment on function public.more30_admin_smel_report() is
  'לידי מחקר-נדל"ן של מערכת 12 (smel), דרך FDW — קורא בלבד, super-admin בלבד. core.issues #86.';
