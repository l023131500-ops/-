// ============================================================================
// איגוד השיעורים — Phase 0 (פיילוט: חצור הגלילית)
// server.js — שרת Express, עוטף RPC-ים של Supabase. אין גישה ישירה ל-DB מהלקוח.
//
// משתני סביבה נדרשים:
//   SUPABASE_URL        - כתובת פרויקט הסופאבייס
//   SUPABASE_ANON_KEY    - מפתח anon (מוגן ע"י RLS + RPC, מותר לחשוף)
//   PORT                 - פורט (ברירת מחדל 3000)
//
// לא נדרש SERVICE_ROLE_KEY בשלב זה: כל פעולות הסופר-אדמין רצות תחת ה-JWT
// של המשתמש המחובר (auth.uid() נבדק בתוך הפונקציות ב-01_schema.sql).// ============================================================================
const _express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
function express(...args) {
  const app = _express(...args);
  const GATEWAY_ROUTES = { '/imud': 'http://imud-torani.railway.internal:8080', '/bkalut': 'http://bkalut-app.railway.internal:8080', '/ads': 'http://innovative-truth.railway.internal:8080', '/kupot-holim': 'http://kupot-holim.railway.internal:8080', '/rights': 'http://get-your-rights.railway.internal:8080', '/transcribe': 'http://igud-transcribe.railway.internal:8080', '/editor': 'http://torah-editor-mvp.railway.internal:8080' };
  for (const [prefix, target] of Object.entries(GATEWAY_ROUTES)) {
    app.use(
      prefix,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: true,
        pathRewrite: { ['^' + prefix]: '' },
        on: {
          error: (err, req, res) => {
            console.error('[gateway] proxy error for ' + prefix + ':', err.message);
            if (res && res.writeHead && !res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
              res.end('המערכת המבוקשת אינה זמינה כרגע. נסו שוב בעוד רגע.');
            }
          },
        },
      })
    );
  }
  return app;
}
express.json = _express.json;
express.static = _express.static;
express.urlencoded = _express.urlencoded;
express.Router = _express.Router;
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 3000;

// --- העלאת קבצים (לוגו/תמונות פרסום/קבצי שירות) ---
// דורש משתנה סביבה נוסף: SUPABASE_SERVICE_ROLE_KEY (Settings > API בסופאבייס).
// לא נחשף ללקוח בשום שלב - משמש רק כאן, בשרת, לאחר אימות admin_token דרך
// ה-RPC-ים הרגילים. זה מה שמאפשר ל-Storage bucket 'media' להישאר בלי אף
// policy עבור anon/authenticated (עקבי עם דפוס "RLS דלוקה, בלי פוליסות" של
// כל שאר הפרויקט) — רק ה-service_role (שעוקף RLS) יכול לכתוב אליו.
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseService = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// --- נדרים פלוס: חשבון האיגוד עצמו (לגביית תשלומי מנוי מארגונים) ---
// יש להגדיר את שני אלה כמשתני סביבה ב-Railway לאחר קבלתם ממשרד נדרים פלוס.
// אינם נשמרים ב-DB בכוונה (סוד ברמת פלטפורמה, לא ברמת ארגון בודד).
const PLATFORM_NEDARIM_MOSAD = process.env.PLATFORM_NEDARIM_MOSAD || '';
const PLATFORM_NEDARIM_API_VALID = process.env.PLATFORM_NEDARIM_API_VALID || '';
// כתובת הבסיס של האתר החי (לבניית CallBack URL לנדרים פלוס)
const APP_BASE_URL = process.env.APP_BASE_URL || '';
const NEDARIM_HISTORY_URL = 'https://matara.pro/nedarimplus/Reports/Manage2.aspx';
const NEDARIM_IFRAME_BASE = 'https://www.matara.pro/nedarimplus/iframe/';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('חסרים משתני סביבה: SUPABASE_URL / SUPABASE_ANON_KEY');
  process.exit(1);
}

// קליינט בסיסי (anon) — לשימוש ציבורי + ניהול ע"פ טוקן
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// קליינט מבוקש-ספציפי (מזריק Authorization: Bearer <JWT>) — לשימוש סופר-אדמין
function supabaseForRequest(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

const app = express();
app.use(express.json());

// ----------------------------------------------------------------------------
// תשתית
// ----------------------------------------------------------------------------

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// חשיפת קונפיג ציבורי ללקוח (כדי שה-SPA יוכל לאתחל supabase-js להתחברות סופר-אדמין)
app.get('/api/config', (req, res) => {
  res.json({ supabaseUrl: SUPABASE_URL, supabaseAnonKey: SUPABASE_ANON_KEY });
});

// req.query.X מגיע כמערך אם הפרמטר חוזר בכתובת (?type=a&type=b) - RPC-ים
// מצפים לערך טקסט יחיד, אז לוקחים את האיבר הראשון (אותו דפוס שכבר תוקן
// ב-20-igud-portal /api/directory, סבב 490).
function singleQueryParam(v) {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function handleRpcResult(res, { data, error }, notFoundIfNull = true) {
  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
  if (notFoundIfNull && (data === null || data === undefined)) {
    return res.status(404).json({ error: 'לא נמצא' });
  }
  return res.json(data);
}

// עבור פונקציות שמחזירות boolean false כשהטוקן לא תקין (ולא זורקות שגיאה) —
// הופך false ל-400 ברור ללקוח, כדי שטופס יציג שגיאה ולא "הצלחה" מזויפת.
function handleBooleanRpcResult(res, { data, error }, errorMessage = 'קישור לא תקין') {
  if (error) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }
  if (data !== true) {
    return res.status(400).json({ error: errorMessage });
  }
  return res.json(true);
}

// ----------------------------------------------------------------------------
// ציבורי
// ----------------------------------------------------------------------------

app.get('/api/directory', async (req, res) => {
  const type = singleQueryParam(req.query.type);
  const city = singleQueryParam(req.query.city);
  const q = singleQueryParam(req.query.q);
  const result = await supabaseAnon.rpc('public_directory', {
    p_type: type || null,
    p_city: city || null,
    p_search: q || null,
  });
  handleRpcResult(res, result, false);
});

// באנר פרסומות ציבורי לדף הבית - מכל הארגונים המפרסמים כרגע
app.get('/api/ads', async (req, res) => {
  const result = await supabaseAnon.rpc('public_active_ads', { p_city: singleQueryParam(req.query.city) || null });
  handleRpcResult(res, result, false);
});

app.get('/api/public/tenant/:token', async (req, res) => {
  const result = await supabaseAnon.rpc('get_public_tenant', { p_token: req.params.token });
  handleRpcResult(res, result);
});

app.get('/api/public/synagogue/:token', async (req, res) => {
  const result = await supabaseAnon.rpc('get_public_synagogue', { p_token: req.params.token });
  handleRpcResult(res, result);
});

app.get('/api/public/teacher/:token', async (req, res) => {
  const result = await supabaseAnon.rpc('get_public_teacher', { p_token: req.params.token });
  handleRpcResult(res, result);
});

app.post('/api/public/tenant/:token/message', async (req, res) => {
  const { name, phone, email, subject, body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'שם והודעה הם שדות חובה' });
  const result = await supabaseAnon.rpc('submit_public_lead', {
    p_token: req.params.token,
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_subject: subject || null,
    p_body: body,
  });
  handleBooleanRpcResult(res, result, 'הקישור אינו תקין, בדוק שהעתקת אותו במלואו');
});

app.post('/api/public/join', async (req, res) => {
  const { name, phone, email, city, org_name, body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'שם והודעה הם שדות חובה' });
  const result = await supabaseAnon.rpc('submit_join_request', {
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_city: city || null,
    p_org_name: org_name || null,
    p_body: body,
  });
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// Phase 2 — זמנים הלכתיים + פיד תפילות קרובות + חיפוש ארצי
// ----------------------------------------------------------------------------

app.get('/api/city/:city/zmanim', async (req, res) => {
  const dateParam = req.query.date || null;
  const result = await supabaseAnon.rpc('get_city_zmanim', {
    p_city: req.params.city,
    p_date: dateParam,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/city/:city/prayer-feed', async (req, res) => {
  const dayType = req.query.day_type === 'shabbat' ? 'shabbat' : 'weekday';
  const result = await supabaseAnon.rpc('get_city_prayer_feed', {
    p_city: req.params.city,
    p_day_type: dayType,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/search/lessons', async (req, res) => {
  const topic = singleQueryParam(req.query.topic);
  const city = singleQueryParam(req.query.city);
  const audience = singleQueryParam(req.query.audience);
  const q = singleQueryParam(req.query.q);
  const result = await supabaseAnon.rpc('national_lesson_search', {
    p_topic: topic || null,
    p_city: city || null,
    p_audience: audience || null,
    p_search: q || null,
  });
  handleRpcResult(res, result, false);
});

// טופס "שאל את הרב" — פונה למורה/רב ספציפי לפי public_token שלו
app.post('/api/public/teacher/:token/ask-rabbi', async (req, res) => {
  const { name, phone, email, body } = req.body || {};
  if (!name || !body) return res.status(400).json({ error: 'שם ושאלה הם שדות חובה' });
  const result = await supabaseAnon.rpc('submit_ask_rabbi', {
    p_teacher_token: req.params.token,
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_body: body,
  });
  handleBooleanRpcResult(res, result, 'הקישור אינו תקין');
});

// טופס פנייה לשירות קהילה ספציפי (כשרות/מקוואות/אבלות/וכו') של ארגון
app.post('/api/public/tenant/:token/service-request', async (req, res) => {
  const { service_type, name, phone, email, body } = req.body || {};
  if (!service_type || !name || !body) {
    return res.status(400).json({ error: 'סוג שירות, שם והודעה הם שדות חובה' });
  }
  const result = await supabaseAnon.rpc('submit_service_request', {
    p_tenant_token: req.params.token,
    p_service_type: service_type,
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_body: body,
  });
  handleBooleanRpcResult(res, result, 'הקישור אינו תקין');
});

// טופס ארצי: הקמת שיעור בהתאמה אישית / הצטרפות כרב מלמד / טופס הצטרפות משולב עם תפקיד
app.post('/api/national/request', async (req, res) => {
  const {
    request_type, name, phone, email, city, topic, audience, preferred_time, notes,
    role, role_details, topics, wants_login,
  } = req.body || {};
  if (!request_type || !name) return res.status(400).json({ error: 'סוג הבקשה ושם הם שדות חובה' });
  if (!['custom_lesson', 'join_teacher'].includes(request_type)) {
    return res.status(400).json({ error: 'סוג בקשה לא תקין' });
  }
  const result = await supabaseAnon.rpc('submit_national_request', {
    p_request_type: request_type,
    p_name: name,
    p_phone: phone || null,
    p_email: email || null,
    p_city: city || null,
    p_topic: topic || null,
    p_audience: audience || null,
    p_preferred_time: preferred_time || null,
    p_notes: notes || null,
    p_role: role || null,
    p_role_details: role_details || null,
    p_topics: Array.isArray(topics) && topics.length ? topics : null,
    p_wants_login: !!wants_login,
  });
  handleRpcResult(res, result, false);
});

// משתמש מחובר (gabbai/מגיד שיעור/ארגון) — הגופים שהוא מקושר אליהם
// (requireAuth מוגדר בהמשך הקובץ כ-function declaration, ולכן מורם (hoisted) וזמין כאן)
app.get('/api/my/entities', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('get_my_entities');
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// ניהול Tenant (לפי admin_token — אין סיסמה, הטוקן = ההרשאה)
// ----------------------------------------------------------------------------

app.get('/api/admin/tenant/:adminToken', async (req, res) => {
  const result = await supabaseAnon.rpc('get_admin_tenant', { p_admin_token: req.params.adminToken });
  handleRpcResult(res, result);
});

app.put('/api/admin/tenant/:adminToken/profile', async (req, res) => {
  const { name, about_text, logo_url, contact_email, contact_phone, is_public, website_url } = req.body || {};
  const result = await supabaseAnon.rpc('admin_update_tenant_profile', {
    p_admin_token: req.params.adminToken,
    p_name: name || null,
    p_about_text: about_text || null,
    p_logo_url: logo_url || null,
    p_contact_email: contact_email || null,
    p_contact_phone: contact_phone || null,
    p_is_public: typeof is_public === 'boolean' ? is_public : null,
    p_website_url: website_url || null,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/tenant/:adminToken/lessons', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_lesson', {
    p_admin_token: req.params.adminToken,
    p_lesson_id: b.lesson_id || null,
    p_teacher_id: b.teacher_id || null,
    p_synagogue_id: b.synagogue_id || null,
    p_title: b.title,
    p_description: b.description || null,
    p_topic: b.topic || null,
    p_day_of_week: b.day_of_week ?? null,
    p_start_time: b.start_time || null,
    p_duration_minutes: b.duration_minutes || 45,
    p_is_active: b.is_active ?? true,
    p_logo_url: b.logo_url || null,
    p_audience: b.audience || 'men',
    p_is_recorded: b.is_recorded ?? false,
    p_is_live: b.is_live ?? false,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/tenant/:adminToken/lessons/:lessonId', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_lesson', {
    p_admin_token: req.params.adminToken,
    p_lesson_id: req.params.lessonId,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/tenant/:adminToken/ads', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_ad', {
    p_admin_token: req.params.adminToken,
    p_ad_id: b.ad_id || null,
    p_title: b.title,
    p_body: b.body || null,
    p_image_url: b.image_url || null,
    p_link_url: b.link_url || null,
    p_starts_at: b.starts_at || null,
    p_ends_at: b.ends_at || null,
    p_is_published: b.is_published ?? true,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/tenant/:adminToken/ads/:adId', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_ad', {
    p_admin_token: req.params.adminToken,
    p_ad_id: req.params.adId,
  });
  handleRpcResult(res, result, false);
});

app.patch('/api/admin/tenant/:adminToken/messages/:messageId', async (req, res) => {
  const { is_read } = req.body || {};
  const result = await supabaseAnon.rpc('admin_mark_message_read', {
    p_admin_token: req.params.adminToken,
    p_message_id: req.params.messageId,
    p_is_read: typeof is_read === 'boolean' ? is_read : true,
  });
  handleRpcResult(res, result, false);
});

// --- שירותי קהילה (כשרות/מקוואות/בית דין/הלכה יומית/אבלות/עלון) ---

app.post('/api/admin/tenant/:adminToken/services', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_service', {
    p_admin_token: req.params.adminToken,
    p_id: b.id || null,
    p_service_type: b.service_type,
    p_title: b.title,
    p_body: b.body || null,
    p_contact_name: b.contact_name || null,
    p_contact_phone: b.contact_phone || null,
    p_contact_email: b.contact_email || null,
    p_address: b.address || null,
    p_file_url: b.file_url || null,
    p_is_published: b.is_published ?? true,
    p_sort_order: b.sort_order ?? 0,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/tenant/:adminToken/services/:id', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_service', {
    p_admin_token: req.params.adminToken,
    p_id: req.params.id,
  });
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// פורטל גבאים — ניהול בית כנסת ספציפי (לפי admin_token של בית הכנסת)
// ----------------------------------------------------------------------------

app.get('/api/admin/synagogue/:adminToken', async (req, res) => {
  const result = await supabaseAnon.rpc('get_admin_synagogue', { p_admin_token: req.params.adminToken });
  handleRpcResult(res, result);
});

app.put('/api/admin/synagogue/:adminToken/profile', async (req, res) => {
  const { name, nusach, gabbai_name, gabbai_phone, address, neighborhood, is_public, website_url, logo_url } = req.body || {};
  const result = await supabaseAnon.rpc('admin_update_synagogue_profile', {
    p_admin_token: req.params.adminToken,
    p_name: name || null,
    p_nusach: nusach || null,
    p_gabbai_name: gabbai_name || null,
    p_gabbai_phone: gabbai_phone || null,
    p_address: address || null,
    p_neighborhood: neighborhood || null,
    p_is_public: typeof is_public === 'boolean' ? is_public : null,
    p_website_url: website_url || null,
    p_logo_url: logo_url || null,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/synagogue/:adminToken/prayer-times', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_prayer_time', {
    p_admin_token: req.params.adminToken,
    p_id: b.id || null,
    p_day_type: b.day_type || 'weekday',
    p_prayer_name: b.prayer_name,
    p_prayer_time: b.prayer_time,
    p_sort_order: b.sort_order ?? 0,
    p_is_active: b.is_active ?? true,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/synagogue/:adminToken/prayer-times/:id', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_prayer_time', {
    p_admin_token: req.params.adminToken,
    p_id: req.params.id,
  });
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// Phase 4.3 — העלאת קבצים (לוגו ארגון/בית כנסת/שיעור, תמונת פרסום, קובץ שירות)
//
// זרימה: הלקוח שולח קובץ + admin_token -> השרת מאמת את הטוקן דרך ה-RPC
// הרגיל (get_admin_tenant / get_admin_synagogue) -> אם תקין, מעלה את הקובץ
// ל-Storage עם ה-service_role (עוקף RLS) תחת נתיב המבוסס על ה-id הפנימי
// (uuid) של הגוף — לא על הטוקן עצמו, כדי שלא לחשוף admin_token סודי בתוך
// כתובת URL ציבורית של תמונה. מחזיר את ה-public URL; שמירתו בפועל בפרופיל
// נעשית ע"י הלקוח דרך אותם RPC-ים הקיימים (PUT profile / lessons / ads / services).
// ----------------------------------------------------------------------------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const IMAGE_MIME_EXT = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg',
};
const DOC_MIME_EXT = { ...IMAGE_MIME_EXT, 'application/pdf': 'pdf' };

function extForMime(mime, allowDocs) {
  const map = allowDocs ? DOC_MIME_EXT : IMAGE_MIME_EXT;
  return map[mime] || null;
}

async function uploadToMedia(folder, file, allowDocs) {
  if (!supabaseService) {
    const err = new Error('העלאת קבצים טרם הוגדרה בשרת (חסר SUPABASE_SERVICE_ROLE_KEY)');
    err.status = 503;
    throw err;
  }
  const ext = extForMime(file.mimetype, allowDocs);
  if (!ext) {
    const err = new Error(allowDocs
      ? 'סוג קובץ לא נתמך - יש להעלות תמונה (PNG/JPG/WEBP/GIF) או PDF'
      : 'סוג קובץ לא נתמך - יש להעלות תמונה (PNG/JPG/WEBP/GIF)');
    err.status = 400;
    throw err;
  }
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseService.storage.from('media').upload(path, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) {
    const err = new Error(`העלאה נכשלה: ${error.message}`);
    err.status = 502;
    throw err;
  }
  const { data } = supabaseService.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// העלאת קובץ עבור ארגון (לוגו/תמונת מודעה/קובץ שירות) - נתיב לפי ה-id הפנימי
app.post('/api/admin/tenant/:adminToken/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ' });
    const tenantResult = await supabaseAnon.rpc('get_admin_tenant', { p_admin_token: req.params.adminToken });
    if (tenantResult.error || !tenantResult.data) return res.status(404).json({ error: 'קישור ניהול לא תקין' });
    const tenantId = tenantResult.data.tenant.id;
    const allowDocs = req.query.kind === 'service';
    const url = await uploadToMedia(`tenants/${tenantId}`, req.file, allowDocs);
    res.json({ url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'שגיאה בהעלאה' });
  }
});

// העלאת קובץ עבור בית כנסת (לוגו)
app.post('/api/admin/synagogue/:adminToken/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ' });
    const synResult = await supabaseAnon.rpc('get_admin_synagogue', { p_admin_token: req.params.adminToken });
    if (synResult.error || !synResult.data) return res.status(404).json({ error: 'קישור ניהול לא תקין' });
    const synId = synResult.data.synagogue.id;
    const url = await uploadToMedia(`synagogues/${synId}`, req.file, false);
    res.json({ url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'שגיאה בהעלאה' });
  }
});

// העלאת קובץ עבור מגיד שיעור (תמונת פרופיל / תמונת מודעה)
app.post('/api/admin/teacher/:adminToken/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'לא נשלח קובץ' });
    const teacherResult = await supabaseAnon.rpc('get_admin_teacher', { p_admin_token: req.params.adminToken });
    if (teacherResult.error || !teacherResult.data) return res.status(404).json({ error: 'קישור ניהול לא תקין' });
    const teacherId = teacherResult.data.teacher.id;
    const url = await uploadToMedia(`teachers/${teacherId}`, req.file, false);
    res.json({ url });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'שגיאה בהעלאה' });
  }
});

// multer מחזיר שגיאות (למשל חריגה מגודל קובץ) כ-error middleware, לא כ-throw רגיל
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'הקובץ גדול מדי (מקסימום 5MB)' : err.message });
  }
  next(err);
});

// ----------------------------------------------------------------------------
// Phase 8 — פורטל מגידי שיעורים (עצמאי, לפי admin_token של teachers)
// ----------------------------------------------------------------------------

app.get('/api/admin/teacher/:adminToken', async (req, res) => {
  const result = await supabaseAnon.rpc('get_admin_teacher', { p_admin_token: req.params.adminToken });
  handleRpcResult(res, result);
});

app.put('/api/admin/teacher/:adminToken/profile', async (req, res) => {
  const { full_name, title, bio, photo_url, topics, city, phone, email, is_public } = req.body || {};
  const result = await supabaseAnon.rpc('admin_update_teacher_profile', {
    p_admin_token: req.params.adminToken,
    p_full_name: full_name || null,
    p_title: title || null,
    p_bio: bio || null,
    p_photo_url: photo_url || null,
    p_topics: Array.isArray(topics) ? topics : null,
    p_city: city || null,
    p_phone: phone || null,
    p_email: email || null,
    p_is_public: typeof is_public === 'boolean' ? is_public : null,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/teacher/:adminToken/lessons', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_teacher_lesson', {
    p_admin_token: req.params.adminToken,
    p_lesson_id: b.id || null,
    p_title: b.title,
    p_description: b.description || null,
    p_topic: b.topic || null,
    p_day_of_week: b.day_of_week ?? null,
    p_start_time: b.start_time || null,
    p_duration_minutes: b.duration_minutes || 45,
    p_audience: b.audience || 'men',
    p_is_live: !!b.is_live,
    p_is_recorded: !!b.is_recorded,
    p_logo_url: b.logo_url || null,
    p_is_active: typeof b.is_active === 'boolean' ? b.is_active : true,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/teacher/:adminToken/lessons/:lessonId', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_teacher_lesson', {
    p_admin_token: req.params.adminToken,
    p_lesson_id: req.params.lessonId,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/teacher/:adminToken/ads', async (req, res) => {
  const b = req.body || {};
  const result = await supabaseAnon.rpc('admin_upsert_teacher_ad', {
    p_admin_token: req.params.adminToken,
    p_ad_id: b.id || null,
    p_title: b.title,
    p_body: b.body || null,
    p_image_url: b.image_url || null,
    p_link_url: b.link_url || null,
    p_starts_at: b.starts_at || null,
    p_ends_at: b.ends_at || null,
    p_is_published: typeof b.is_published === 'boolean' ? b.is_published : true,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/admin/teacher/:adminToken/ads/:adId', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_delete_teacher_ad', {
    p_admin_token: req.params.adminToken,
    p_ad_id: req.params.adId,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/teacher/:adminToken/messages/:messageId/read', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_mark_teacher_message_read', {
    p_admin_token: req.params.adminToken,
    p_message_id: req.params.messageId,
  });
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// סופר-אדמין (דורש Authorization: Bearer <supabase JWT>)
// ----------------------------------------------------------------------------

function requireAuth(req, res, next) {
  const client = supabaseForRequest(req);
  if (!client) return res.status(401).json({ error: 'נדרשת התחברות' });
  req.supabase = client;
  next();
}

app.get('/api/superadmin/stats', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_stats');
  handleRpcResult(res, result, false);
});

app.get('/api/superadmin/tenants', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_list_tenants', { p_city: singleQueryParam(req.query.city) || null });
  handleRpcResult(res, result, false);
});

app.post('/api/superadmin/tenants', requireAuth, async (req, res) => {
  const { name, type, city, contact_email, contact_phone } = req.body || {};
  if (!name || !city) return res.status(400).json({ error: 'שם ועיר הם שדות חובה' });
  const result = await req.supabase.rpc('sa_create_tenant', {
    p_name: name,
    p_type: type || 'organization',
    p_city: city,
    p_contact_email: contact_email || null,
    p_contact_phone: contact_phone || null,
  });
  handleRpcResult(res, result, false);
});

app.patch('/api/superadmin/tenants/:tenantId', requireAuth, async (req, res) => {
  const { is_public, status } = req.body || {};
  const result = await req.supabase.rpc('sa_set_tenant_flags', {
    p_tenant_id: req.params.tenantId,
    p_is_public: typeof is_public === 'boolean' ? is_public : null,
    p_status: status || null,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/superadmin/join-requests', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_list_join_requests');
  handleRpcResult(res, result, false);
});

app.get('/api/superadmin/national-requests', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_list_national_requests', {
    p_request_type: singleQueryParam(req.query.type) || null,
  });
  handleRpcResult(res, result, false);
});

app.patch('/api/superadmin/national-requests/:id', requireAuth, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status הוא שדה חובה' });
  const result = await req.supabase.rpc('sa_set_national_request_status', {
    p_id: req.params.id,
    p_status: status,
  });
  handleRpcResult(res, result, false);
});

// --- קישורי משתמש<->גוף (gabbai/מגיד שיעור/ארגון מקבלים גישה לניהול לפי אימייל) ---

app.get('/api/superadmin/role-links', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_list_role_links');
  handleRpcResult(res, result, false);
});

app.post('/api/superadmin/role-links', requireAuth, async (req, res) => {
  const { email, entity_type, entity_id } = req.body || {};
  if (!email || !entity_type || !entity_id) {
    return res.status(400).json({ error: 'email, entity_type ו-entity_id הם שדות חובה' });
  }
  const result = await req.supabase.rpc('sa_link_account', {
    p_email: email,
    p_entity_type: entity_type,
    p_entity_id: entity_id,
  });
  handleRpcResult(res, result, false);
});

app.delete('/api/superadmin/role-links/:id', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_unlink_account', { p_link_id: req.params.id });
  handleRpcResult(res, result, false);
});

// ----------------------------------------------------------------------------
// Phase 4 — נדרים פלוס: דוחות תרומות לכל ארגון (מוסד+מפתח משלו)
// ----------------------------------------------------------------------------

// שמירת/עדכון פרטי חיבור לנדרים פלוס עבור ארגון (מספר מוסד + ApiPassword)
app.put('/api/admin/tenant/:adminToken/nedarim/config', async (req, res) => {
  const { mosad_id, api_password, is_active } = req.body || {};
  const result = await supabaseAnon.rpc('admin_set_nedarim_donation_config', {
    p_admin_token: req.params.adminToken,
    p_mosad_id: mosad_id || null,
    p_api_password: api_password || null,
    p_is_active: typeof is_active === 'boolean' ? is_active : true,
  });
  handleRpcResult(res, result, false);
});

// סטטוס חיבור (בלי לחשוף את הסיסמה עצמה)
app.get('/api/admin/tenant/:adminToken/nedarim/config', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_get_nedarim_donation_config', {
    p_admin_token: req.params.adminToken,
  });
  handleRpcResult(res, result, false);
});

// רשימת תרומות מסונכרנות (עם סינון תאריכים אופציונלי) + סכום כולל
app.get('/api/admin/tenant/:adminToken/nedarim/donations', async (req, res) => {
  const from = singleQueryParam(req.query.from);
  const to = singleQueryParam(req.query.to);
  const limit = singleQueryParam(req.query.limit);
  const result = await supabaseAnon.rpc('admin_list_donations', {
    p_admin_token: req.params.adminToken,
    p_from: from || null,
    p_to: to || null,
    p_limit: limit ? parseInt(limit, 10) : 200,
  });
  handleRpcResult(res, result, false);
});

// מפענח שורת תגובה בודדת שחוזרת מ-GetHistoryJson של נדרים פלוס לפורמט אחיד.
// שים לב: מבנה ה-JSON המדויק (עטיפה/שמות שדות) מתועד באתר נדרים פלוס אך לא
// נבדק מול חשבון אמיתי בשלב זה - הפונקציה סובלנית לשמות שדות חלופיים.
function normalizeNedarimRecord(mosadId, raw) {
  const pick = (...keys) => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k];
    }
    return null;
  };
  return {
    mosad_id: String(mosadId),
    transaction_id: pick('TransactionId', 'transactionId', 'Shovar'),
    donor_name: pick('ClientName', 'FirstName') && pick('LastName')
      ? `${pick('ClientName', 'FirstName')} ${pick('LastName') || ''}`.trim()
      : pick('ClientName', 'FirstName'),
    donor_phone: pick('Phone'),
    donor_email: pick('Mail', 'Email'),
    donor_zeout: pick('Zeout'),
    amount: pick('Amount'),
    currency: pick('Currency') === '2' || pick('Currency') === 2 ? 'USD' : 'ILS',
    transaction_time: parseNedarimDate(pick('TransactionTime', 'Tarich')),
    transaction_type: pick('TransactionType'),
    groupe: pick('Groupe'),
    comments: pick('Comments', 'Comment'),
    confirmation_number: pick('Confirmation'),
    keva_id: pick('KevaId'),
    masof_name: pick('MasofName'),
  };
}

// תאריכים אצל נדרים פלוס בפורמט dd/mm/yyyy (או dd/mm/yyyy hh:mm) - ממירים ל-ISO
function parseNedarimDate(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [, d, mo, y, h, mi] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${(h || '00').padStart(2, '0')}:${(mi || '00').padStart(2, '0')}:00`;
  return iso;
}

// סנכרון: השרת קורא ל-API ההיסטוריה של נדרים פלוס עם פרטי הארגון, ושומר בענן
app.post('/api/admin/tenant/:adminToken/nedarim/sync', async (req, res) => {
  const adminToken = req.params.adminToken;
  const credsResult = await supabaseAnon.rpc('admin_get_nedarim_sync_credentials', { p_admin_token: adminToken });
  if (credsResult.error) {
    return res.status(400).json({ error: credsResult.error.message });
  }
  const creds = credsResult.data;
  try {
    const body = new URLSearchParams({
      Action: 'GetHistoryJson',
      MosadId: creds.mosad_id,
      ApiPassword: creds.api_password,
      MaxId: '2000',
    });
    if (creds.last_sync_last_id) body.set('LastId', creds.last_sync_last_id);

    const nedarimRes = await fetch(NEDARIM_HISTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const text = await nedarimRes.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('תגובה לא תקינה מנדרים פלוס (לא JSON) - ייתכן שפרטי המוסד/הסיסמה שגויים');
    }
    const rows = Array.isArray(parsed) ? parsed : (parsed.Data || parsed.data || parsed.Rows || []);
    const normalized = rows.map((r) => normalizeNedarimRecord(creds.mosad_id, r));
    let newLastId = creds.last_sync_last_id || null;
    if (rows.length) {
      const lastRow = rows[rows.length - 1];
      newLastId = lastRow.TransactionId || lastRow.Shovar || newLastId;
    }

    const upsertResult = await supabaseAnon.rpc('admin_upsert_nedarim_donations', {
      p_admin_token: adminToken,
      p_donations: normalized,
      p_new_last_id: newLastId,
      p_sync_status: 'ok',
      p_sync_error: null,
    });
    handleRpcResult(res, upsertResult, false);
  } catch (err) {
    await supabaseAnon.rpc('admin_upsert_nedarim_donations', {
      p_admin_token: adminToken,
      p_donations: [],
      p_new_last_id: null,
      p_sync_status: 'error',
      p_sync_error: String(err.message || err),
    });
    res.status(502).json({ error: `סנכרון נכשל: ${err.message || err}` });
  }
});

// ----------------------------------------------------------------------------
// Phase 5 — נדרים פלוס: דוח תרומות לכל בית כנסת (מוסד+מפתח משלו) - מקביל
// בדיוק לתבנית הארגון למעלה, פשוט עם admin_token/RPCs של בית הכנסת.
// ----------------------------------------------------------------------------

app.put('/api/admin/synagogue/:adminToken/nedarim/config', async (req, res) => {
  const { mosad_id, api_password, is_active } = req.body || {};
  const result = await supabaseAnon.rpc('admin_set_synagogue_nedarim_config', {
    p_admin_token: req.params.adminToken,
    p_mosad_id: mosad_id || null,
    p_api_password: api_password || null,
    p_is_active: typeof is_active === 'boolean' ? is_active : true,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/admin/synagogue/:adminToken/nedarim/config', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_get_synagogue_nedarim_config', {
    p_admin_token: req.params.adminToken,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/admin/synagogue/:adminToken/nedarim/donations', async (req, res) => {
  const from = singleQueryParam(req.query.from);
  const to = singleQueryParam(req.query.to);
  const limit = singleQueryParam(req.query.limit);
  const result = await supabaseAnon.rpc('admin_list_synagogue_donations', {
    p_admin_token: req.params.adminToken,
    p_from: from || null,
    p_to: to || null,
    p_limit: limit ? parseInt(limit, 10) : 200,
  });
  handleRpcResult(res, result, false);
});

app.post('/api/admin/synagogue/:adminToken/nedarim/sync', async (req, res) => {
  const adminToken = req.params.adminToken;
  const credsResult = await supabaseAnon.rpc('admin_get_synagogue_nedarim_sync_credentials', { p_admin_token: adminToken });
  if (credsResult.error) {
    return res.status(400).json({ error: credsResult.error.message });
  }
  const creds = credsResult.data;
  try {
    const body = new URLSearchParams({
      Action: 'GetHistoryJson',
      MosadId: creds.mosad_id,
      ApiPassword: creds.api_password,
      MaxId: '2000',
    });
    if (creds.last_sync_last_id) body.set('LastId', creds.last_sync_last_id);

    const nedarimRes = await fetch(NEDARIM_HISTORY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    const text = await nedarimRes.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new Error('תגובה לא תקינה מנדרים פלוס (לא JSON) - ייתכן שפרטי המוסד/הסיסמה שגויים');
    }
    const rows = Array.isArray(parsed) ? parsed : (parsed.Data || parsed.data || parsed.Rows || []);
    const normalized = rows.map((r) => normalizeNedarimRecord(creds.mosad_id, r));
    let newLastId = creds.last_sync_last_id || null;
    if (rows.length) {
      const lastRow = rows[rows.length - 1];
      newLastId = lastRow.TransactionId || lastRow.Shovar || newLastId;
    }

    const upsertResult = await supabaseAnon.rpc('admin_upsert_synagogue_nedarim_donations', {
      p_admin_token: adminToken,
      p_donations: normalized,
      p_new_last_id: newLastId,
      p_sync_status: 'ok',
      p_sync_error: null,
    });
    handleRpcResult(res, upsertResult, false);
  } catch (err) {
    await supabaseAnon.rpc('admin_upsert_synagogue_nedarim_donations', {
      p_admin_token: adminToken,
      p_donations: [],
      p_new_last_id: null,
      p_sync_status: 'error',
      p_sync_error: String(err.message || err),
    });
    res.status(502).json({ error: `סנכרון נכשל: ${err.message || err}` });
  }
});

// ----------------------------------------------------------------------------
// Phase 4 — נדרים פלוס: תשלומי מנוי לאיגוד (סליקה על חשבון האיגוד)
// ----------------------------------------------------------------------------

app.get('/api/admin/tenant/:adminToken/subscription-payments', async (req, res) => {
  const result = await supabaseAnon.rpc('admin_list_my_subscription_payments', {
    p_admin_token: req.params.adminToken,
  });
  handleRpcResult(res, result, false);
});

// בונה את כתובת ה-iframe לתשלום, עם פרטי חשבון האיגוד (לא נחשפים ללקוח כטקסט)
app.get('/api/admin/tenant/:adminToken/subscription-payments/:paymentId/checkout', async (req, res) => {
  if (!PLATFORM_NEDARIM_MOSAD || !PLATFORM_NEDARIM_API_VALID) {
    return res.status(503).json({ error: 'סליקת האיגוד טרם הוגדרה (חסרים משתני סביבה בשרת)' });
  }
  const result = await supabaseAnon.rpc('admin_get_subscription_payment_for_checkout', {
    p_admin_token: req.params.adminToken,
    p_payment_id: req.params.paymentId,
  });
  if (result.error) return res.status(400).json({ error: result.error.message });
  const payment = result.data;
  if (payment.status === 'paid') {
    return res.json({ alreadyPaid: true });
  }

  const [firstName, ...rest] = String(payment.tenant_name || 'ארגון').split(' ');
  const params = new URLSearchParams({
    Mosad: PLATFORM_NEDARIM_MOSAD,
    ApiValid: PLATFORM_NEDARIM_API_VALID,
    PaymentType: 'Ragil',
    Amount: String(payment.amount),
    Tashlumim: '1',
    Currency: payment.currency === 'USD' ? '2' : '1',
    FirstName: firstName || 'ארגון',
    LastName: rest.join(' ') || '-',
    Mail: payment.tenant_email || '',
    Phone: payment.tenant_phone || '',
    Groupe: 'תשלום מנוי איגוד השיעורים',
    Comment: `תשלום מנוי #${payment.id}`,
    Param1: payment.correlation_token,
  });
  if (APP_BASE_URL) {
    params.set('CallBack', `${APP_BASE_URL.replace(/\/$/, '')}/api/webhooks/nedarim`);
  }
  res.json({ iframeUrl: `${NEDARIM_IFRAME_BASE}?${params.toString()}` });
});

// ----------------------------------------------------------------------------
// Phase 6 — עמוד הרשמה פומבי לתרומה/מנוי כללי לאיגוד (לא קשור לארגון ספציפי)
// משתמש באותו חשבון נדרים פלוס של האיגוד (PLATFORM_NEDARIM_MOSAD/API_VALID),
// ובאותה טבלה platform_subscription_payments (tenant_id=null = תשלום פומבי).
// אין כאן admin_token בכלל - כל אחד יכול ליצור בקשת תשלום (זה בכוונה, כמו כל
// עמוד "תרומה" ציבורי) - ההגנה היחידה הנדרשת היא על שלב הצ'ק-אאוט עצמו, ושם
// משתמשים בצמד id+correlation_token (32 hex אקראי, לא ניתן לניחוש).
// ----------------------------------------------------------------------------

app.post('/api/public/payments', async (req, res) => {
  const { payer_name, payer_phone, payer_email, payment_type, purpose, amount, currency } = req.body || {};
  const result = await supabaseAnon.rpc('public_create_subscription_payment', {
    p_payer_name: payer_name || null,
    p_payer_phone: payer_phone || null,
    p_payer_email: payer_email || null,
    p_payment_type: payment_type || 'one_time',
    p_purpose: purpose || null,
    p_amount: amount,
    p_currency: currency || 'ILS',
  });
  handleRpcResult(res, result, false);
});

// בדיקת סטטוס בלבד (בלי לבנות iframe, ובלי תלות בהגדרת חשבון האיגוד) - נועד
// לוודא בפועל אצלנו ב-DB (שמתעדכן רק דרך ה-webhook האמיתי מנדרים פלוס) שהתשלום
// אכן הושלם, לפני שמציגים למשתמש הודעת הצלחה. אף פעם לא מסתמכים על postMessage
// מהאייפרם בלבד לצורך הודעת הצלחה - זה עלול לקרות גם בלי שהתשלום הושלם בפועל.
app.get('/api/public/payments/:id/status', async (req, res) => {
  const token = singleQueryParam(req.query.token);
  if (!token) return res.status(400).json({ error: 'חסר טוקן גישה' });
  const result = await supabaseAnon.rpc('public_get_subscription_payment_for_checkout', {
    p_id: req.params.id,
    p_correlation_token: token,
  });
  if (result.error) return res.status(400).json({ error: result.error.message });
  res.json({ status: result.data.status });
});

app.get('/api/public/payments/:id/checkout', async (req, res) => {
  if (!PLATFORM_NEDARIM_MOSAD || !PLATFORM_NEDARIM_API_VALID) {
    return res.status(503).json({ error: 'סליקת האיגוד טרם הוגדרה (חסרים משתני סביבה בשרת)' });
  }
  const token = singleQueryParam(req.query.token);
  if (!token) return res.status(400).json({ error: 'חסר טוקן גישה' });
  const result = await supabaseAnon.rpc('public_get_subscription_payment_for_checkout', {
    p_id: req.params.id,
    p_correlation_token: token,
  });
  if (result.error) return res.status(400).json({ error: result.error.message });
  const payment = result.data;
  if (payment.status === 'paid') {
    return res.json({ alreadyPaid: true });
  }

  const [firstName, ...rest] = String(payment.payer_name || 'תורם').split(' ');
  const params = new URLSearchParams({
    Mosad: PLATFORM_NEDARIM_MOSAD,
    ApiValid: PLATFORM_NEDARIM_API_VALID,
    // הערה: 'Hk' עבור הוראת קבע הוא הניחוש הסביר לפי תיעוד נדרים פלוס, אך טרם
    // אומת מול חשבון אמיתי - כמו שצוין גם ב-normalizeNedarimRecord למעלה.
    PaymentType: payment.payment_type === 'monthly' ? 'Hk' : 'Ragil',
    Amount: String(payment.amount),
    Tashlumim: '1',
    Currency: payment.currency === 'USD' ? '2' : '1',
    FirstName: firstName || 'תורם',
    LastName: rest.join(' ') || '-',
    Mail: payment.payer_email || '',
    Phone: payment.payer_phone || '',
    Groupe: payment.purpose || 'תרומה/מנוי לאיגוד השיעורים',
    Comment: `תשלום ציבורי #${payment.id}`,
    Param1: payment.correlation_token,
  });
  if (APP_BASE_URL) {
    params.set('CallBack', `${APP_BASE_URL.replace(/\/$/, '')}/api/webhooks/nedarim`);
  }
  res.json({ iframeUrl: `${NEDARIM_IFRAME_BASE}?${params.toString()}` });
});

// --- סופר-אדמין: יצירת/רשימת בקשות תשלום מנוי לארגונים ---

app.post('/api/superadmin/subscription-payments', requireAuth, async (req, res) => {
  const { tenant_id, amount, currency, payment_type, notes } = req.body || {};
  if (!tenant_id || !amount) return res.status(400).json({ error: 'tenant_id וסכום הם שדות חובה' });
  const result = await req.supabase.rpc('sa_create_subscription_payment', {
    p_tenant_id: tenant_id,
    p_amount: amount,
    p_currency: currency || 'ILS',
    p_payment_type: payment_type || 'one_time',
    p_notes: notes || null,
  });
  handleRpcResult(res, result, false);
});

app.get('/api/superadmin/subscription-payments', requireAuth, async (req, res) => {
  const result = await req.supabase.rpc('sa_list_subscription_payments', {
    p_tenant_id: singleQueryParam(req.query.tenant_id) || null,
    p_status: singleQueryParam(req.query.status) || null,
  });
  handleRpcResult(res, result, false);
});

// --- Webhook ציבורי: נדרים פלוס קורא לכתובת הזו בסיום עסקה (CallBack) ---
// מאובטח באמצעות correlation_token אקראי בן 32 תווים (Param1) - לא ניתן לניחוש,
// באותה רמת אבטחה כמו admin_token/public_token הקיימים בפרויקט.
app.post('/api/webhooks/nedarim', express.urlencoded({ extended: true }), async (req, res) => {
  const data = { ...req.query, ...req.body };
  const correlationToken = data.Param1 || data.param1;
  const transactionId = data.TransactionId || data.transactionId || data.Shovar;
  const amount = data.Amount || data.amount;
  if (!correlationToken) {
    // Field names only. This used to log `data` whole, and a Nedarim Plus
    // callback carries the payer's name, phone and e-mail alongside the
    // transaction fields — so the one branch that fires when the callback is
    // misconfigured was the branch that wrote a donor's details to the log.
    // The key list is what a misconfiguration actually needs to diagnose.
    console.warn(
      'נדרים פלוס callback ללא Param1 - מתעלם. שדות שהתקבלו:',
      Object.keys(data).join(', ') || '(אין)',
    );
    return res.status(200).send('ok'); // עדיין מאשרים קבלה כדי שלא ינסו שוב לשווא
  }
  const result = await supabaseAnon.rpc('mark_subscription_payment_paid', {
    p_correlation_token: correlationToken,
    p_nedarim_transaction_id: transactionId ? String(transactionId) : null,
    p_amount: amount ? Number(amount) : null,
  });
  if (result.error) {
    // Unlike the missing-Param1 branch above, this is a transient failure
    // (DB/RPC error), not a permanent misconfiguration - a non-200 here lets
    // נדרים פלוס retry the callback until mark_subscription_payment_paid
    // actually runs, instead of silently leaving a paid subscription marked
    // unpaid with no trace beyond a console line.
    console.error('mark_subscription_payment_paid failed:', result.error);
    return res.status(500).send('error');
  }
  res.status(200).send('ok');
});

// GET fallback לאותה כתובת (חלק מהתצורות של נדרים פלוס עשויות לשלוח GET)
app.get('/api/webhooks/nedarim', async (req, res) => {
  const correlationToken = req.query.Param1 || req.query.param1;
  const transactionId = req.query.TransactionId || req.query.Shovar;
  if (correlationToken) {
    const result = await supabaseAnon.rpc('mark_subscription_payment_paid', {
      p_correlation_token: correlationToken,
      p_nedarim_transaction_id: transactionId ? String(transactionId) : null,
      p_amount: null,
    });
    if (result.error) {
      console.error('mark_subscription_payment_paid failed (GET):', result.error);
      return res.status(500).send('error');
    }
  }
  res.status(200).send('ok');
});

// ----------------------------------------------------------------------------
// SPA — כל שאר הבקשות מחזירות את מעטפת ה-SPA (Hash Router בצד לקוח)
//
// שימו לב: קבצי הלקוח יושבים בתיקיית /public (העבירו לשם את
// igud_index.html -> public/index.html, igud_app.js -> public/app.js,
// igud_style.css -> public/style.css לפני הפריסה. ראה README).
// אנחנו מגישים רק את שלושת הקבצים האלה במפורש — לא תיקייה שלמה —
// כדי לא לחשוף בטעות קבצי SQL/README אם ישבו באותה תיקייה בזמן פיתוח.
// ----------------------------------------------------------------------------

const PUBLIC_DIR = path.join(__dirname, 'public');

app.get('/app.js', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'app.js')));
app.get('/style.css', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'style.css')));

app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`איגוד השיעורים — הפורטל פעיל על פורט ${PORT}`);
});
