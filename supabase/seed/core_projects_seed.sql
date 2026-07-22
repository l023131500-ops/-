-- more30 · core.projects registry seed (Phase 1, 32 systems)
-- Mirrors packages/config/src/registry.ts. Idempotent upsert. Apply after 0001+0002.
--
-- supabase_project values are VERIFIED by reading each repo's client/.env. Systems
-- are on ~10 DISTINCT Supabase projects — NOT one shared project. null = no ref
-- found in the repo (stub, or uses env placeholder only).
--   uhnrgujb=nadlan(ops) · bieebmnm=igud group · csjekrvu=bkalut/kupot/chizukim/smel
--   mwljkonw=chatzor/galilee · pwcswdfg=bkalut-app · trerolyv=get-your-rights
--   jhbeelzv=zchuyotpro · hkkky…=egod · aypsq…=mthbram · ygaqq…=hebrew-bridge

insert into core.projects
  (number, slug, repo, name, department, category, stage, live, is_deployed,
   supabase_project, supabase_schema, deploy_target, live_url, admin_url, is_protected, note) values
 ('01','torah-platform','torah-platform','Torah Platform (HUB)','torah','hub','live',true,true,'bieebmnmkffwbqlsfozh','public','vercel',null,null,false,'HUB לאיגוד. סליקת נדרים פלוס (edge nedarim-webhook/create-payment/admin). על bieebmnm — לא uhnrgujb.'),
 ('02','igud-transcribe','igud-transcribe','Igud Transcribe','torah','transcription','beta',true,true,'bieebmnmkffwbqlsfozh','public','vercel',null,null,false,'Next.js 14 + OpenAI Whisper/GPT-4. חסר OPENAI_API_KEY + Google OAuth + SERVICE_ROLE.'),
 ('03','igud-ads','igud-ads','Igud Ads','torah','advertising','live',true,true,'bieebmnmkffwbqlsfozh','public','vercel',null,null,false,'מערכת הכנסות (גובה). נדרים דרך lib/nedarim.ts. חסר OPENAI_API_KEY.'),
 ('04','imud-torani','imud-torani','Imud Torani','torah','torah','beta',true,false,null,null,'railway',null,null,false,'עימוד. באג ידוע: X-Visitor-Id header. ref Supabase לא נמצא בקוד — לאמת.'),
 ('05','financial-marketing-site','03-financial-marketing-site','Financial Marketing Site','finance','finance','wip',false,false,null,null,'unknown',null,null,false,'שלד שיווקי פיננסי (7 קבצים).'),
 ('06','kupot-holim','kupot-holim','Kupot Holim','health','health','wip',false,false,'csjekrvukbdznetsrodj','public','unknown',null,null,false,'משתף Supabase csjekrvu עם bkalut-price/chizukim/smel.'),
 ('07','zol','zol','Zol','misc','commerce','wip',false,false,null,null,'unknown',null,null,false,'שלד (2 קבצים).'),
 ('08','bkalut-app','bkalut-app','Bkalut App','bkalut','commerce','protected',true,true,'pwcswdfgorvlpdflzylm','public','unknown',null,null,true,'🔒 מוגן — לא לייבא/לגעת. Supabase pwcswdfg.'),
 ('09','bkalot-admin','bkalot-admin','Bkalot Admin','bkalut','commerce','protected',true,true,null,null,'unknown',null,null,true,'🔒 מוגן — לא לייבא/לגעת. schema zr_* + webhook NEDARIM3873.'),
 ('10','bkalot-rights','bkalot-rights','Bkalot Rights','rights','rights','wip',false,false,'bieebmnmkffwbqlsfozh','public','unknown',null,null,false,'משתף Supabase bieebmnm (igud).'),
 ('11','bkalut-marketing2','bkalut-marketing2','Bkalut Marketing 2','bkalut','marketing','wip',false,false,null,null,'unknown',null,null,false,'שלד שיווקי (6 קבצים).'),
 ('12','smel-ndln','smel-ndln','Smel Ndln','realestate','realestate','wip',false,false,'csjekrvukbdznetsrodj','public','unknown',null,null,false,'נדל"ן — variant. משתף csjekrvu. לשקול מיזוג עם 32-nadlan-berega.'),
 ('13','property-identity','property-identity','Property Identity','realestate','realestate','wip',false,false,null,null,'unknown',null,null,false,'נדל"ן — variant. לשקול מיזוג עם 32-nadlan-berega.'),
 ('14','bsmachot-plus','bsmachot-plus','Bsmachot Plus','misc','events','wip',false,false,null,null,'unknown',null,null,false,'אירועים/שמחות (36 קבצים).'),
 ('15','egod','egod','egod','torah','hub','live',true,false,'hkkkynyoigzlttpynoeo','public','lovable',null,null,false,'נולד ב-Lovable. Supabase משלו (hkkky) — לא משותף עם torah-platform כפי שהונח.'),
 ('16','chatzor-connect','chatzor-connect','Chatzor Connect','community','other','wip',false,true,'mwljkonwdeuaahsigjdp','public','vercel',null,null,false,'קהילתי. משתף mwljkonw עם galilee.'),
 ('17','chizukim-transcribe','chizukim-transcribe','Chizukim Transcribe','torah','transcription','wip',false,true,'csjekrvukbdznetsrodj','public','vercel',null,null,false,'תמלול. משתף csjekrvu. לאמת מפתח תמלול.'),
 ('18','torah-editor-mvp','torah-editor-mvp','Torah Editor MVP','torah','torah','wip',false,false,'bieebmnmkffwbqlsfozh','public','unknown',null,null,false,'OCR: Kraken/Transkribus/DictaLM/Anthropic. משתף bieebmnm.'),
 ('19','igud-shiurim-portal','igud-shiurim-portal','Igud Shiurim Portal','torah','torah','wip',false,false,null,null,'unknown',null,null,false,'שלד פורטל (6 קבצים).'),
 ('20','igud-portal','igud-portal','Igud Portal','torah','torah','wip',false,false,null,null,'unknown',null,null,false,'שלד פורטל (7 קבצים).'),
 ('21','mthbram','mthbram','Mthbram','misc','other','wip',false,false,'aypsqqvfohekxxuqsmrw','public','unknown',null,null,false,'Supabase משלו (aypsq). 204 קבצים.'),
 ('22','get-your-rights','get-your-rights','Get Your Rights','rights','rights','wip',false,false,'trerolyveytzgksawrme','public','unknown',null,null,false,'edge: leads-api/leads-webhook/n8n-notify/rights-agent. Supabase משלו (trerolyv).'),
 ('23','haorech-torani','haorech-torani','Haorech Torani','torah','torah','wip',false,false,null,null,'unknown',null,null,false,'שלד (קובץ אחד).'),
 ('24','galilee-connect-hub','galilee-connect-hub','Galilee Connect Hub','community','other','wip',false,false,'mwljkonwdeuaahsigjdp','public','unknown',null,null,false,'קהילתי. משתף mwljkonw עם chatzor.'),
 ('25','mor1-main-site','mor1-main-site','Mor1 Main Site','misc','marketing','wip',false,false,null,null,'unknown',null,null,false,'ריפו ריק (0 קבצים). הקוד החי של more30.com אינו כאן — origin לא מזוהה.'),
 ('26','modaot-studio','modaot-studio','Modaot Studio','torah','advertising','wip',false,false,null,null,'unknown',null,null,false,'סטודיו AI: Anthropic/Gemini/Recraft. ללא Supabase.'),
 ('27','bkalut-price','bkalut-price','Bkalut Price','bkalut','commerce','wip',false,false,'csjekrvukbdznetsrodj','public','unknown',null,null,false,'משתף csjekrvu. 255 קבצים.'),
 ('28','kupot-health-funds','kupot-health-funds','Kupot Health Funds','health','health','wip',false,true,null,null,'vercel',null,null,false,'env: SUPABASE_URL/ANON_KEY + ADMIN_TOKEN. ref לא נמצא בקוד (placeholder).'),
 ('29','bkalot-design','bkalot-design','Bkalot Design','bkalut','marketing','wip',false,false,null,null,'unknown',null,null,false,'שלד עיצוב (7 קבצים).'),
 ('30','zchuyotpro-crm','zchuyotpro-crm','ZchuyotPro CRM','rights','crm','wip',false,false,'jhbeelzvjvhnkxldqvxx','public','unknown',null,null,false,'CRM זכויות. Supabase משלו (jhbeelzv).'),
 ('31','hebrew-bridge-crm','hebrew-bridge-crm','Hebrew Bridge CRM','community','crm','wip',false,false,'ygaqqnuyfnumezxxmtbh','public','unknown',null,null,false,'Supabase משלו (ygaqq). 155 קבצים.'),
 ('32','nadlan-berega','nadlan-berega','נדל"ן ברגע','realestate','realestate','live',true,true,'uhnrgujbdxhhmoxcjria','nadlan','vercel','https://nadlan-berega.vercel.app',null,false,'המערכת הראשונה שהושקה. 7 שכבות אמת. schema nadlan על ה-ops.')
on conflict (number) do update set
  slug=excluded.slug, repo=excluded.repo, name=excluded.name, department=excluded.department,
  category=excluded.category, stage=excluded.stage, live=excluded.live, is_deployed=excluded.is_deployed,
  supabase_project=excluded.supabase_project, supabase_schema=excluded.supabase_schema,
  deploy_target=excluded.deploy_target, live_url=excluded.live_url, admin_url=excluded.admin_url,
  is_protected=excluded.is_protected, note=excluded.note, updated_at=now();
