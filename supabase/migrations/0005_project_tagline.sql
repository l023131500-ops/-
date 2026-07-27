-- 0005_project_tagline.sql
--
-- משפט ההטבה שמוצג מעל שם המערכת באתר התדמית (מערכת 33).
--
-- למה בעמודה ולא בקוד של הפורטל: השמות והתיאורים כבר נקראים חיים מ-core, ואם
-- הקופי יישב בקוד ייווצרו שתי גרסאות של אותו טקסט שיתפצלו עם הזמן. כאן אפשר
-- לנסח מחדש בלי build ובלי פריסה.
--
-- כלל תוכן: הניסוח נגזר אך ורק מ-name_he ומ-what_it_does של אותה מערכת. אין
-- להבטיח יכולת שהתיאור לא תומך בה.

alter table core.projects add column if not exists tagline text;

comment on column core.projects.tagline is
'משפט ההטבה שמוצג מעל שם המערכת באתר התדמית (מערכת 33). נגזר אך ורק מ-name_he ומ-what_it_does — לא להמציא יכולות שאין. קול: מור מערכות תוכנה. בלי קלישאות (חדשני/פורץ דרך/מהפכני).';

-- ‎more30_project_overview‎ נבנה מחדש עם tagline **בסוף** רשימת העמודות:
-- ‎CREATE OR REPLACE VIEW‎ אינו יכול לשנות סדר או שם של עמודה קיימת, והוספה
-- באמצע נכשלת עם "cannot change name of view column".
create or replace view public.more30_project_overview as
 select p.number, p.slug, p.name, p.name_he, p.what_it_does, p.functions,
    p.department, p.category, p.stage, p.live, p.is_deployed, p.deploy_target,
    p.live_url, p.old_url, p.admin_url, p.is_protected, p.to_delete,
    p.supabase_project, p.supabase_schema, p.note, p.fixed_notes, p.changed_notes,
    coalesce(b.open_bugs, 0::bigint) as open_bugs,
    coalesce(t.open_tasks, 0::bigint) as open_tasks,
    coalesce(m.missing_count, 0::bigint) as missing_tokens,
    p.path,
    p.tagline
   from core.projects p
     left join ( select project_bugs.project_num, count(*) as open_bugs
           from core.project_bugs where project_bugs.status <> 'closed'::text
          group by project_bugs.project_num) b on b.project_num = p.number
     left join ( select project_tasks.project_num, count(*) as open_tasks
           from core.project_tasks where project_tasks.status <> 'done'::text
          group by project_tasks.project_num) t on t.project_num = p.number
     left join ( select missing_tokens.project_num, count(*) as missing_count
           from core.missing_tokens where missing_tokens.status = 'missing'::text
          group by missing_tokens.project_num) m on m.project_num = p.number
  order by p.number;
