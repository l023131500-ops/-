-- more30 · core.projects registry seed
-- Mirrors packages/config/src/registry.ts. Idempotent upsert.
-- Apply AFTER 0001_core_schema.sql. Does not touch any existing schema.

insert into core.projects (number, slug, repo, name, category, stage, live, supabase_schema, deploy_target, is_protected, note) values
  ('01','torah-platform','torah-platform','Torah Platform (HUB, +egod)','hub','live',true,'public','lovable',false,'Main hub; billing via Nedarim.'),
  ('02','igud-transcribe','igud-transcribe','Igud Transcribe','transcription','wip',false,null,'unknown',false,'MISSING transcription API token.'),
  ('03','igud-ads','igud-ads','Igud Ads','advertising','live',true,null,'unknown',false,'Revenue system.'),
  ('04','imud-torani','imud-torani','Imud Torani','torah','beta',true,null,'railway',false,'Known bug: X-Visitor-Id header.'),
  ('05','financial-marketing-site','03-financial-marketing-site','Financial Marketing Site','finance','wip',false,null,'unknown',false,null),
  ('06','kupot-holim','kupot-holim','Kupot Holim','health','wip',false,null,'unknown',false,null),
  ('07','zol','zol','Zol','commerce','wip',false,null,'unknown',false,null),
  ('08','bkalut-app','bkalut-app','Bkalut App','commerce','protected',true,null,'unknown',true,'PROTECTED — do not touch.'),
  ('09','bkalot-admin','bkalot-admin','Bkalot Admin','commerce','protected',true,null,'unknown',true,'PROTECTED — do not touch.'),
  ('10','bkalot-rights','bkalot-rights','Bkalot Rights','rights','wip',false,null,'unknown',false,null),
  ('11','bkalut-marketing2','bkalut-marketing2','Bkalut Marketing 2','marketing','wip',false,null,'unknown',false,null),
  ('12','smel-ndln','smel-ndln','Smel Ndln','other','wip',false,null,'unknown',false,null),
  ('13','property-identity','property-identity','Property Identity','realestate','wip',false,null,'unknown',false,null),
  ('14','bsmachot-plus','bsmachot-plus','Bsmachot Plus','events','wip',false,null,'unknown',false,null),
  ('15','egod','egod','egod (HUB pair with 01)','hub','live',true,'public','lovable',false,'Born in Lovable; shares Supabase with torah-platform.'),
  ('16','chatzor-connect','chatzor-connect','Chatzor Connect','other','wip',false,null,'unknown',false,null),
  ('17','chizukim-transcribe','chizukim-transcribe','Chizukim Transcribe','transcription','wip',false,null,'unknown',false,'Verify transcription token.'),
  ('18','torah-editor-mvp','torah-editor-mvp','Torah Editor MVP','torah','wip',false,null,'unknown',false,null),
  ('19','igud-shiurim-portal','igud-shiurim-portal','Igud Shiurim Portal','torah','wip',false,null,'unknown',false,null),
  ('20','igud-portal','igud-portal','Igud Portal','torah','wip',false,null,'unknown',false,null),
  ('21','mthbram','mthbram','Mthbram','other','wip',false,null,'unknown',false,null),
  ('22','get-your-rights','get-your-rights','Get Your Rights','rights','wip',false,null,'unknown',false,null),
  ('23','haorech-torani','haorech-torani','Haorech Torani','torah','wip',false,null,'unknown',false,null),
  ('24','galilee-connect-hub','galilee-connect-hub','Galilee Connect Hub','other','wip',false,null,'unknown',false,null),
  ('25','mor1-main-site','mor1-main-site','Mor1 Main Site','marketing','wip',false,null,'unknown',false,null),
  ('26','modaot-studio','modaot-studio','Modaot Studio','advertising','wip',false,null,'unknown',false,null),
  ('27','bkalut-price','bkalut-price','Bkalut Price','commerce','wip',false,null,'unknown',false,null),
  ('28','kupot-health-funds','kupot-health-funds','Kupot Health Funds','health','wip',false,null,'unknown',false,null),
  ('29','bkalot-design','bkalot-design','Bkalot Design','marketing','wip',false,null,'unknown',false,null),
  ('30','zchuyotpro-crm','zchuyotpro-crm','ZchuyotPro CRM','crm','wip',false,null,'unknown',false,null),
  ('31','hebrew-bridge-crm','hebrew-bridge-crm','Hebrew Bridge CRM','crm','wip',false,null,'unknown',false,null)
on conflict (number) do update set
  slug = excluded.slug, repo = excluded.repo, name = excluded.name,
  category = excluded.category, stage = excluded.stage, live = excluded.live,
  supabase_schema = excluded.supabase_schema, deploy_target = excluded.deploy_target,
  is_protected = excluded.is_protected, note = excluded.note, updated_at = now();

-- Known open items captured during the mapping ---------------------------------
insert into core.project_bugs (project_num, title, severity, status)
select '04','X-Visitor-Id header bug','high','open'
where not exists (select 1 from core.project_bugs where project_num='04' and title='X-Visitor-Id header bug');

insert into core.project_tasks (project_num, title, status)
select '02','Provide missing transcription API token','todo'
where not exists (select 1 from core.project_tasks where project_num='02' and title='Provide missing transcription API token');
