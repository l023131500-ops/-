// ============================================================================
// איגוד השיעורים — לקוח SPA (Hash Router, ללא פריימוורק) — v2
// דשבורד ארצי מאוחד (פיד שיעורים) + עמודי ארגון/בית כנסת חדשניים +
// טופס הצטרפות משולב עם תפקידים + התחברות מייל/סיסמה לכל בעלי התפקידים.
// ============================================================================

const APP = document.getElementById('app');
const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const TYPE_LABELS = { organization: 'ארגון', synagogue: 'בית כנסת', yeshiva: 'ישיבה', teacher: 'מגיד שיעור' };
const AUDIENCE_LABELS = { men: 'גברים', women: 'נשים', mixed: 'מעורב' };
const ROLE_LABELS = { gabbai: 'גבאי', maggid_shiur: 'מגיד שיעור', achrai: 'אחראי מטעם הארגון', other: 'אחר' };
const CANONICAL_TOPICS = [
  'תנ"ך', 'גמרא', 'הלכה', 'הלכה יומית', 'מוסר', 'חסידות', 'מחשבת ישראל',
  'פרשת השבוע', 'דף היומי', 'משנה יומית', 'אמונה', 'גיל הרך ונוער', 'נשים', 'הכנה לחגים',
];
const IGUD_LOGO_INITIAL = 'א';

// לוגו ברירת מחדל ממותג (ספר פתוח + נר) — מוצג בכל מקום שאין לוגו מותאם אישית,
// במקום אות בודדת. אותו סמל בדיוק מופיע גם בסרגל הניווט העליון (index.html).
const DEFAULT_LOGO_SVG = `<svg class="default-logo-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M6 15c6-3.5 12-3.5 18 1.5c6-5 12-5 18-1.5v19c-6-3.5-12-3.5-18 1.5c-6-5-12-5-18-1.5z" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>
  <line x1="24" y1="17.5" x2="24" y2="35.5" stroke="#fff" stroke-width="2.3"/>
  <path d="M24 3c2.4 3.2 4.4 5.6 4.4 8.6a4.4 4.4 0 1 1-8.8 0c0-3 2-5.4 4.4-8.6z" fill="#f0c168"/>
</svg>`;

// אייקון קובץ כללי (למסמכים כמו PDF, שאין להם תצוגה מקדימה גרפית)
const DOC_FILE_ICON_SVG = `<svg class="default-logo-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M13 5h16l8 8v30a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M29 5v8h8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/>
  <line x1="16" y1="24" x2="30" y2="24" stroke="#f0c168" stroke-width="2.2"/>
  <line x1="16" y1="30" x2="30" y2="30" stroke="#f0c168" stroke-width="2.2"/>
  <line x1="16" y1="36" x2="25" y2="36" stroke="#f0c168" stroke-width="2.2"/>
</svg>`;

let supabaseClient = null;
let currentSession = null;

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// BreadcrumbList JSON-LD for the entity-detail pages (/t/, /s/, /te/) — the only
// routes with a real 2-level hierarchy (home directory -> entity). Built from
// location.href (not location.origin) so it stays correct under any deploy mount.
function setBreadcrumbJsonLd(items) {
  let script = document.getElementById('breadcrumb-jsonld');
  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-jsonld';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  });
}

function clearBreadcrumbJsonLd() {
  const script = document.getElementById('breadcrumb-jsonld');
  if (script) script.remove();
}

// ---------------------------------------------------------------------------
// «הצג סיסמה» (priority §1א)
// ---------------------------------------------------------------------------
// Every screen here is drawn by assigning to APP.innerHTML, so a listener bound
// after a render dies at the next one. One delegated listener on the document
// covers fields drawn now and fields drawn later, including the two admin
// screens that only exist behind a session.
//
// The id is generated per call because these fields carry name= and not id=,
// and the reveal has to be able to name its own field in aria-controls.

let pwFieldSeq = 0;
const PW_EYE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const PW_EYE_OFF = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="21" x2="21" y2="3"/></svg>`;

// attrs is spliced in raw — every call site below is a literal in this file.
function pwField(attrs = '', id) {
  id = id || `pw-${++pwFieldSeq}`;
  return `<div class="pw-wrap">
      <input id="${id}" type="password" ${attrs} />
      <button type="button" class="pw-toggle" data-pw-for="${id}" aria-controls="${id}"
        aria-pressed="false" aria-label="הצג סיסמה" title="הצג סיסמה">${PW_EYE}</button>
    </div>`;
}

// type="button" on the markup above is what keeps this from submitting the form
// it sits in; the listener only ever toggles.
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.pw-toggle');
  if (!btn) return;
  const input = document.getElementById(btn.getAttribute('data-pw-for'));
  if (!input) return;
  const reveal = input.getAttribute('type') === 'password';
  input.setAttribute('type', reveal ? 'text' : 'password');
  btn.setAttribute('aria-pressed', String(reveal));
  btn.setAttribute('aria-label', reveal ? 'הסתר סיסמה' : 'הצג סיסמה');
  btn.setAttribute('title', reveal ? 'הסתר סיסמה' : 'הצג סיסמה');
  btn.innerHTML = reveal ? PW_EYE_OFF : PW_EYE;
});

async function api(path, options = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (options.auth && currentSession) {
    headers['Authorization'] = `Bearer ${currentSession.access_token}`;
  }
  const res = await fetch(path, Object.assign({}, options, { headers }));
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    throw new Error((data && data.error) || `שגיאה (${res.status})`);
  }
  return data;
}

function formatTime(t) {
  if (!t) return '';
  return t.slice(0, 5);
}

function logoCircle(name, url, small) {
  const cls = 'logo-circle' + (small ? ' sm' : '');
  if (url) return `<div class="${cls}"><img src="${esc(url)}" alt="${esc(name || '')}" /></div>`;
  return `<div class="${cls} logo-default" title="${esc(name || '')}">${DEFAULT_LOGO_SVG}</div>`;
}

function setActiveNav() {
  document.querySelectorAll('#nav-links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + currentPath());
  });
}

function currentPath() {
  return (location.hash || '#/').replace(/^#/, '') || '/';
}

function queryParams() {
  const hash = location.hash || '';
  const qIdx = hash.indexOf('?');
  return new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : '');
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// מודל תשלום נדרים פלוס (iframe) — לתשלומי מנוי לאיגוד
// iframeUrl: כתובת נדרים פלוס. onCheckStatus: פונקציה async שנקראת בכל "רמז"
// שאולי הסתיים תשלום (postMessage / לחיצה על "סיימתי לשלם"), חייבת לבדוק בפועל
// מול השרת (שמקבל את הסטטוס האמיתי רק מה-webhook של נדרים פלוס) ולהחזיר true
// רק אם התשלום אכן סומן כ"paid" ב-DB. חשוב: קבלת postMessage כלשהו מהאייפרם,
// או פשוט סגירת החלון ע"י המשתמש, אינה הוכחה לתשלום מוצלח - לכן המודל לעולם לא
// מציג בעצמו הודעת הצלחה; זו אחריות onCheckStatus (הקורא) להציג זאת רק אחרי
// אימות אמיתי, וה-modal נסגר אוטומטית רק כש-onCheckStatus מחזיר true.
function openNedarimCheckoutModal(iframeUrl, onCheckStatus) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(20,20,30,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:14px;max-width:480px;width:100%;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #eee;">
        <strong>תשלום מאובטח — נדרים פלוס</strong>
        <button id="nedarim-modal-close" style="border:none;background:none;font-size:20px;cursor:pointer;">×</button>
      </div>
      <iframe src="${iframeUrl}" style="border:none;width:100%;height:520px;"></iframe>
      <div style="padding:10px 18px;border-top:1px solid #eee;display:flex;flex-direction:column;gap:8px;">
        <div id="nedarim-modal-status" class="muted" style="font-size:.85rem;"></div>
        <button id="nedarim-modal-refresh" class="btn btn-outline btn-sm">סיימתי לשלם — רענון סטטוס</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function cleanup() {
    window.removeEventListener('message', onMessage);
    overlay.remove();
  }
  let iframeOrigin = null;
  try { iframeOrigin = new URL(iframeUrl).origin; } catch (e) { /* ignore */ }

  async function handleCheck() {
    const statusEl = overlay.querySelector('#nedarim-modal-status');
    if (statusEl) statusEl.textContent = 'בודק סטטוס תשלום…';
    let isPaid = false;
    try { isPaid = await onCheckStatus(); } catch (e) { /* treat as not paid */ }
    if (isPaid) {
      cleanup();
    } else if (statusEl) {
      statusEl.textContent = 'התשלום עדיין לא אושר. אם השלמת את הטופס בנדרים פלוס, נסו שוב בעוד כמה שניות.';
    }
  }

  function onMessage(event) {
    // postMessage מהאייפרם הוא רק "רמז" לבדוק סטטוס - לעולם לא הוכחה לתשלום.
    if (iframeOrigin && event.origin !== iframeOrigin) return;
    setTimeout(handleCheck, 800);
  }
  window.addEventListener('message', onMessage);
  overlay.querySelector('#nedarim-modal-close').onclick = () => { cleanup(); };
  overlay.querySelector('#nedarim-modal-refresh').onclick = handleCheck;
}

// ---------------------------------------------------------------------------
// ווידג'ט העלאת קובץ (לוגו/תמונת פרסום/קובץ שירות) — dropzone + תצוגה מקדימה
// חיה + מד מצב טעינה/הצלחה/שגיאה. ההעלאה עצמה מיידית (אל השרת), אך השמירה
// בפועל בפרופיל/שיעור/מודעה מתבצעת רק כששולחים את הטופס המכיל אותו (input
// מוסתר בשם name נושא את ה-URL שהתקבל) — עקבי עם שאר שדות הטופס.
// ---------------------------------------------------------------------------

function uploadFieldHtml({ id, label, currentUrl, name, hint, accept }) {
  return `
    <div class="form-field upload-field">
      <label>${esc(label)}</label>
      <div class="dropzone" id="${id}-dropzone" tabindex="0" role="button" aria-label="${esc(label)}">
        <div class="dropzone-preview" id="${id}-preview">
          ${currentUrl ? `<img src="${esc(currentUrl)}" alt="" />` : DEFAULT_LOGO_SVG}
        </div>
        <div class="dropzone-body">
          <span class="dropzone-cta">גררו קובץ לכאן או לחצו לבחירה</span>
          <span class="dropzone-status muted" id="${id}-status">${currentUrl ? 'קובץ קיים — ניתן להחליף' : 'לא הועלה קובץ עדיין'}</span>
        </div>
        <span class="dropzone-spinner" aria-hidden="true"></span>
      </div>
      <input type="file" id="${id}-file" accept="${accept || 'image/*'}" style="display:none;" />
      ${hint ? `<div class="form-hint">${esc(hint)}</div>` : ''}
      <input type="hidden" name="${esc(name)}" id="${id}-url" value="${esc(currentUrl || '')}" />
    </div>
  `;
}

function wireUploadField({ id, uploadUrl }) {
  const dropzone = document.getElementById(`${id}-dropzone`);
  const fileInput = document.getElementById(`${id}-file`);
  const preview = document.getElementById(`${id}-preview`);
  const status = document.getElementById(`${id}-status`);
  const urlInput = document.getElementById(`${id}-url`);
  if (!dropzone || !fileInput) return;

  const openPicker = () => fileInput.click();
  dropzone.addEventListener('click', openPicker);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
  });
  ['dragover', 'dragenter'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.add('dropzone-over');
  }));
  ['dragleave', 'drop'].forEach(evt => dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); dropzone.classList.remove('dropzone-over');
  }));
  dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) handleFile(f);
  });

  async function handleFile(file) {
    const previousPreviewHtml = preview.innerHTML;
    dropzone.classList.remove('dropzone-success', 'dropzone-error');
    dropzone.classList.add('dropzone-loading');
    status.textContent = 'מעלה…';
    const isImage = file.type && file.type.startsWith('image/');
    const localUrl = URL.createObjectURL(file);
    preview.innerHTML = isImage ? `<img src="${localUrl}" alt="" />` : DOC_FILE_ICON_SVG;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: fd });
      let json = {};
      try { json = await res.json(); } catch (e) { /* no body */ }
      if (!res.ok) throw new Error(json.error || `העלאה נכשלה (${res.status})`);
      urlInput.value = json.url;
      preview.innerHTML = isImage ? `<img src="${esc(json.url)}" alt="" />` : DOC_FILE_ICON_SVG;
      status.textContent = 'הועלה בהצלחה ✓';
      dropzone.classList.add('dropzone-success');
      setTimeout(() => dropzone.classList.remove('dropzone-success'), 1500);
    } catch (err) {
      preview.innerHTML = previousPreviewHtml;
      status.textContent = err.message || 'העלאה נכשלה';
      dropzone.classList.add('dropzone-error');
    } finally {
      dropzone.classList.remove('dropzone-loading');
      URL.revokeObjectURL(localUrl);
    }
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

async function router() {
  const path = currentPath().split('?')[0];
  setActiveNav();
  clearBreadcrumbJsonLd();
  APP.innerHTML = '<div class="page-loading"><span class="spinner-lg" aria-hidden="true"></span><p class="muted">טוען…</p></div>';

  try {
    if (path === '/' || path === '') await renderDirectory();
    else if (path === '/about') await renderAbout();
    else if (path === '/join') await renderJoin();
    else if (path === '/donate') await renderDonate();
    else if (path === '/login') await renderLogin();
    else if (path.startsWith('/t/')) await renderTenantPublic(path.slice(3));
    else if (path.startsWith('/s/')) await renderSynagoguePublic(path.slice(3));
    else if (path.startsWith('/te/')) await renderTeacherPublic(path.slice(4));
    else if (path.startsWith('/admin-syn/')) await renderSynagogueAdmin(path.slice(11));
    else if (path.startsWith('/admin-te/')) await renderTeacherAdmin(path.slice(10));
    else if (path.startsWith('/admin/')) await renderAdmin(path.slice(7));
    else if (path === '/superadmin') await renderSuperadmin();
    else await renderNotFound();
    // מעבר-דף עדין: מפעילים מחדש את אנימציית הכניסה בכל ניווט (לא רק בטעינה ראשונה)
    APP.classList.remove('route-fade');
    void APP.offsetWidth;
    APP.classList.add('route-fade');
  } catch (err) {
    APP.innerHTML = `<div class="alert alert-error">שגיאה בטעינת העמוד: ${esc(err.message)}</div>`;
  }
}

window.addEventListener('hashchange', router);

// ---------------------------------------------------------------------------
// עמוד: הדשבורד הארצי — איגוד השיעורים (פיד מאוחד + ארגונים)
// ---------------------------------------------------------------------------

const TOPIC_EMOJI = {
  'תנ"ך': '📜', 'גמרא': '📖', 'הלכה': '✡️', 'הלכה יומית': '✡️', 'מוסר': '💭',
  'חסידות': '🌟', 'מחשבת ישראל': '🧠', 'פרשת השבוע': '🔥', 'דף היומי': '📚',
  'משנה יומית': '📚', 'אמונה': '🙏', 'גיל הרך ונוער': '🎈', 'נשים': '👩', 'הכנה לחגים': '🕎',
};
function topicEmoji(topic) { return TOPIC_EMOJI[topic] || '📖'; }

// "בעוד כמה ימים" מתחילת השבוע הבא, ביחס להיום (day_of_week: 0=ראשון..6=שבת)
function daysUntilLabel(dayOfWeek) {
  if (dayOfWeek === null || dayOfWeek === undefined) return '';
  const today = new Date().getDay();
  const diff = (dayOfWeek - today + 7) % 7;
  if (diff === 0) return 'היום';
  if (diff === 1) return 'מחר';
  return `בעוד ${diff} ימים`;
}
function daysUntilRank(dayOfWeek) {
  const today = new Date().getDay();
  return (dayOfWeek - today + 7) % 7;
}

function lessonLine(l) {
  const href = l.teacher_token ? `#/te/${esc(l.teacher_token)}` : null;
  const badges = [
    l.is_live ? '<span class="live-badge">LIVE</span>' : '',
    l.is_recorded ? '<span class="rec-badge">מוקלט</span>' : '',
  ].join(' ');
  const dayLabel = daysUntilLabel(l.day_of_week);
  return `
    <div class="lesson-row">
      ${logoCircle(l.teacher_name || l.title, l.teacher_photo || l.lesson_logo, true)}
      <div class="time-badge">${esc(DAYS_HE[l.day_of_week] ?? '')}<br/>${esc(formatTime(l.start_time))}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;">${esc(l.title)} ${badges}</div>
        <div class="muted">
          ${l.topic ? topicEmoji(l.topic) + ' ' + esc(l.topic) + ' · ' : ''}
          ${href ? `<a href="${href}">${esc(l.teacher_name)}${l.teacher_title ? ' · ' + esc(l.teacher_title) : ''}</a>` : esc(l.teacher_name || '')}
          ${l.audience && l.audience !== 'men' ? ' · ' + esc(AUDIENCE_LABELS[l.audience] || l.audience) : ''}
        </div>
      </div>
      ${dayLabel ? `<span class="day-pill">${esc(dayLabel)}</span>` : ''}
    </div>`;
}

function groupLessonsByVenue(lessons) {
  const map = new Map();
  lessons.forEach(l => {
    const key = (l.venue_type || '') + '|' + (l.venue_token || '') + '|' + (l.venue_name || '');
    if (!map.has(key)) map.set(key, { venue_name: l.venue_name, venue_type: l.venue_type, venue_token: l.venue_token, venue_logo: l.venue_logo, website_url: l.website_url, city: l.city, items: [] });
    map.get(key).items.push(l);
  });
  return [...map.values()];
}

async function renderDirectory() {
  const state = {
    city: sessionStorage.getItem('igud_city_filter') ?? '',
    topic: '',
    audience: '',
    q: '',
  };

  async function loadFeed() {
    const qs = new URLSearchParams();
    if (state.topic) qs.set('topic', state.topic);
    if (state.city) qs.set('city', state.city);
    if (state.audience) qs.set('audience', state.audience);
    if (state.q) qs.set('q', state.q);
    const [lessons, orgs, ads] = await Promise.all([
      api('/api/search/lessons?' + qs.toString()),
      api('/api/directory?' + new URLSearchParams({ city: state.city || '' }).toString()),
      api('/api/ads?' + new URLSearchParams({ city: state.city || '' }).toString()).catch(() => []),
    ]);
    renderStats(lessons, orgs);
    renderAds(ads || []);
    renderUpcoming(lessons);
    renderFeed(lessons);
    renderOrgs(orgs);
  }

  function renderStats(lessons, orgs) {
    const el = document.getElementById('hero-stats');
    if (!el) return;
    const cities = new Set(orgs.map(o => o.city).filter(Boolean));
    el.textContent = `🌍 ${cities.size} ערים · ${orgs.length} ארגונים ובתי כנסת · ${lessons.length} שיעורים במאגר`;
  }

  function renderAds(ads) {
    const wrap = document.getElementById('ads-banner');
    if (!wrap) return;
    if (!ads.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `
      <div class="ads-strip">
        ${ads.map(a => `
          <a class="ad-card" href="${a.link_url ? esc(a.link_url) : (a.tenant_token ? '#/t/' + esc(a.tenant_token) : '#')}" ${a.link_url ? 'target="_blank" rel="noopener"' : ''}>
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="${esc(a.title)}" />` : ''}
            <div class="ad-card-body">
              <strong>${esc(a.title)}</strong>
              ${a.body ? `<span>${esc(a.body)}</span>` : ''}
              <span class="ad-card-source">${esc(a.tenant_name || '')}${a.city ? ' · ' + esc(a.city) : ''}</span>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  }

  function renderUpcoming(lessons) {
    const wrap = document.getElementById('upcoming-list');
    if (!wrap) return;
    if (!lessons.length) { wrap.innerHTML = '<p class="muted">אין שיעורים קרובים כרגע.</p>'; return; }
    const sorted = [...lessons].sort((a, b) => {
      const ra = daysUntilRank(a.day_of_week), rb = daysUntilRank(b.day_of_week);
      if (ra !== rb) return ra - rb;
      return String(a.start_time || '').localeCompare(String(b.start_time || ''));
    }).slice(0, 10);
    wrap.innerHTML = sorted.map(l => {
      const dayLabel = daysUntilLabel(l.day_of_week);
      const badges = [
        l.is_live ? '<span class="live-badge">LIVE</span>' : '',
        l.is_recorded ? '<span class="rec-badge">מוקלט</span>' : '',
      ].join(' ');
      const href = l.teacher_token ? `#/te/${esc(l.teacher_token)}` : (l.venue_token ? `#/${l.venue_type === 'synagogue' ? 's' : 't'}/${esc(l.venue_token)}` : '#');
      return `
        <a class="upcoming-item" href="${href}">
          <div class="upcoming-day">${esc(dayLabel)}<span>${esc(formatTime(l.start_time))}</span></div>
          <div class="upcoming-info">
            <div class="upcoming-title">${esc(l.title)} ${badges}</div>
            <div class="muted">${esc(l.teacher_name || '')}${l.venue_name ? ' · ' + esc(l.venue_name) : ''}</div>
            <div class="muted">📍 ${esc(l.city || '')}</div>
          </div>
        </a>`;
    }).join('');
  }

  function renderFeed(lessons) {
    const wrap = document.getElementById('feed-wrap');
    if (!lessons.length) {
      wrap.innerHTML = `<div class="empty-state">אין עדיין שיעורים תואמים${state.city ? ' ב' + esc(state.city) : ''}.</div>`;
      return;
    }
    const groups = groupLessonsByVenue(lessons);
    wrap.innerHTML = groups.map(g => `
      <div class="card" style="margin-top:14px;">
        <div class="row-between">
          <div class="row-top" style="gap:10px;">
            ${logoCircle(g.venue_name, g.venue_logo, true)}
            <div>
              <h3 style="margin:0;">${esc(g.venue_name || '')}</h3>
              <span class="type-tag">${g.venue_type === 'synagogue' ? 'בית כנסת' : 'ארגון'} · ${esc(g.city || '')}</span>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            ${g.venue_token ? `<a class="btn btn-outline btn-sm" href="#/${g.venue_type === 'synagogue' ? 's' : 't'}/${esc(g.venue_token)}">לוח מלא</a>` : ''}
            ${g.website_url ? `<a class="btn btn-quiet" href="${esc(g.website_url)}" target="_blank" rel="noopener">אתר מלא ↗</a>` : ''}
          </div>
        </div>
        <div style="margin-top:8px;">${g.items.map(lessonLine).join('')}</div>
      </div>
    `).join('');
  }

  function renderOrgs(items) {
    const grid = document.getElementById('org-grid');
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state">
        עדיין אין ארגונים רשומים${state.city ? ' ב' + esc(state.city) : ''}.
        <div style="margin-top:10px;"><button class="btn btn-outline btn-sm" id="clear-filters-btn">הצג את כל הערים</button></div>
      </div>`;
      const btn = document.getElementById('clear-filters-btn');
      if (btn) btn.onclick = () => { state.city = ''; sessionStorage.setItem('igud_city_filter', ''); document.getElementById('f-city').value = ''; loadFeed(); };
      return;
    }
    grid.innerHTML = items.map(item => {
      const href = item.entity_type === 'teacher' ? `#/te/${item.public_token}`
        : item.entity_type === 'synagogue' ? `#/s/${item.public_token}`
        : `#/t/${item.public_token}`;
      return `
        <a href="${href}" class="card entity-card card-link">
          <div class="row-top">
            ${logoCircle(item.name, item.image_url)}
            <span class="type-tag">${esc(TYPE_LABELS[item.entity_type] || item.entity_type)}</span>
          </div>
          <h3>${esc(item.name)}</h3>
          ${item.subtitle ? `<p class="muted" style="margin:0;">${esc(item.subtitle)}</p>` : ''}
          <div class="city">📍 ${esc(item.city || '')}</div>
        </a>`;
    }).join('');
  }

  APP.innerHTML = `
    <section class="hero" style="margin: -1px -20px 0;">
      <div class="hero-badge" id="hero-stats">טוען נתונים…</div>
      <h1>איגוד השיעורים</h1>
      <p>כל שיעורי התורה, בתי הכנסת ומגידי השיעור — במקום אחד, עדכני ונגיש לכולם, בכל עיר בארץ.</p>
    </section>

    <div class="topic-pills" id="topic-pills">
      <button type="button" class="topic-pill active" data-topic="">✨ הכל</button>
      ${CANONICAL_TOPICS.map(t => `<button type="button" class="topic-pill" data-topic="${esc(t)}">${topicEmoji(t)} ${esc(t)}</button>`).join('')}
    </div>

    <div class="filters">
      <input id="f-city" type="text" placeholder="עיר (השאירו ריק לכל הארץ)" value="${esc(state.city)}" aria-label="סינון לפי עיר" />
      <select id="f-audience" aria-label="סינון לפי קהל יעד">
        <option value="">כל הקהלים</option>
        <option value="men">גברים</option>
        <option value="women">נשים</option>
        <option value="mixed">מעורב</option>
      </select>
      <input id="f-q" type="text" placeholder="חיפוש חופשי (שם השיעור)…" aria-label="חיפוש חופשי לפי שם השיעור" />
      <a class="btn btn-quiet" href="#/join?intent=lesson">+ הוספת שיעור</a>
    </div>

    <div id="ads-banner"></div>

    <div class="dashboard-layout">
      <div class="dashboard-main">
        <div class="section">
          <div class="section-head"><h2>שיעורים קרובים — לפי בית כנסת / ארגון</h2></div>
          <div id="feed-wrap"></div>
        </div>

        <div class="section">
          <div class="section-head"><h2>ארגונים ובתי כנסת</h2></div>
          <div class="grid" id="org-grid"></div>
        </div>
      </div>

      <aside class="dashboard-aside">
        <div class="card upcoming-card">
          <h3>🗓️ שיעורים קרובים</h3>
          <div id="upcoming-list"></div>
        </div>
      </aside>
    </div>

    <div class="section quiet-cta-row">
      <a class="btn btn-quiet" href="#/join?role=maggid_shiur">מחפשים מגיד שיעור?</a>
      <a class="btn btn-quiet" href="#/join?intent=lesson">רוצים לפתוח שיעור חדש?</a>
      <a class="btn btn-quiet" href="#/join?intent=org">ארגון/בית כנסת מצטרפים לאיגוד</a>
    </div>
  `;

  document.getElementById('f-city').onchange = e => { state.city = e.target.value.trim(); sessionStorage.setItem('igud_city_filter', state.city); loadFeed(); };
  document.getElementById('f-audience').onchange = e => { state.audience = e.target.value; loadFeed(); };
  document.getElementById('f-q').oninput = debounce(e => { state.q = e.target.value.trim(); loadFeed(); }, 300);
  document.querySelectorAll('.topic-pill').forEach(btn => btn.onclick = () => {
    state.topic = btn.dataset.topic;
    document.querySelectorAll('.topic-pill').forEach(b => b.classList.toggle('active', b === btn));
    loadFeed();
  });

  loadFeed();
}

// ---------------------------------------------------------------------------
// עמוד: אודות
// ---------------------------------------------------------------------------

function renderAbout() {
  APP.innerHTML = `
    <div class="stack" style="max-width:720px;margin:30px auto;">
      <h1>אודות איגוד השיעורים</h1>
      <p>איגוד השיעורים הוא פלטפורמה אחודה המרכזת שיעורי תורה מארגונים, בתי כנסת, גבאים ומגידי שיעור,
        ומאפשרת לציבור למצוא בקלות שיעור מתאים — לפי עיר, נושא או מגיד.</p>
      <p>המערכת פרושה כיום על פני ערים וארגונים רבים ברחבי הארץ, וממשיכה לצמוח כל הזמן —
        ומצטרפים אליה ארגונים, בתי כנסת ומגידי שיעור חדשים באופן שוטף.</p>
      <div class="quiet-cta-row" style="justify-content:flex-start;margin-top:20px;">
        <a class="btn btn-quiet" href="#/join?role=maggid_shiur">מחפשים מגיד שיעור?</a>
        <a class="btn btn-quiet" href="#/join?intent=lesson">פתיחת שיעור חדש</a>
        <a class="btn btn-quiet" href="#/join?intent=org">הצטרפות ארגון/בית כנסת</a>
      </div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// עמוד: הרשמה פומבית לתרומה/מנוי כללי לאיגוד (חד פעמי או הוראת קבע), דרך
// חשבון נדרים פלוס של האיגוד עצמו. עמוד זה גנרי במכוון כך שאפשר יהיה לעשות
// בו שימוש חוזר לכל מיני פרויקטים עתידיים של האיגוד (לא רק תרומה כללית).
// ---------------------------------------------------------------------------

function renderDonate() {
  APP.innerHTML = `
    <div class="stack" style="max-width:520px;margin:30px auto;">
      <h1>תרומה / מנוי לאיגוד השיעורים</h1>
      <p class="muted">
        עמוד זה משמש לכל תשלום כללי לטובת האיגוד — תרומה חד פעמית, מנוי חודשי קבוע,
        או תשלום עבור פרויקט ספציפי שנקים בעתיד. התשלום מתבצע באופן מאובטח דרך נדרים פלוס.
      </p>
      <div id="donate-alert"></div>
      <form id="donate-form" class="card">
        <div class="form-row">
          <div class="form-field"><label for="f19-payer-name">שם מלא *</label><input id="f19-payer-name" name="payer_name" required /></div>
          <div class="form-field"><label for="f19-payer-phone">טלפון</label><input id="f19-payer-phone" name="payer_phone" /></div>
        </div>
        <div class="form-field"><label for="f19-payer-email">אימייל</label><input id="f19-payer-email" name="payer_email" type="email" /></div>
        <div class="form-field"><label for="f19-purpose">עבור מה התשלום? (אופציונלי)</label>
          <input id="f19-purpose" name="purpose" placeholder="לדוגמה: תרומה כללית / מנוי חודשי / פרויקט X" />
        </div>
        <div class="role-choice" id="payment-type-choice">
          <label><input type="radio" name="payment_type" value="one_time" checked/><span>💳 תשלום חד פעמי</span></label>
          <label><input type="radio" name="payment_type" value="monthly"/><span>🔁 הוראת קבע חודשית</span></label>
        </div>
        <div class="form-field"><label for="f19-amount">סכום (₪) *</label><input id="f19-amount" name="amount" type="number" min="1" step="1" required /></div>
        <button class="btn btn-primary" type="submit" style="width:100%;">מעבר לתשלום מאובטח</button>
      </form>
    </div>
  `;

  document.getElementById('donate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const created = await api('/api/public/payments', {
        method: 'POST',
        body: JSON.stringify({
          payer_name: fd.get('payer_name'),
          payer_phone: fd.get('payer_phone'),
          payer_email: fd.get('payer_email'),
          purpose: fd.get('purpose'),
          payment_type: fd.get('payment_type'),
          amount: Number(fd.get('amount')),
        }),
      });
      const checkout = await api(`/api/public/payments/${encodeURIComponent(created.id)}/checkout?token=${encodeURIComponent(created.correlation_token)}`);
      document.getElementById('donate-alert').innerHTML = '<div class="alert alert-success">בקשת התשלום נוצרה. השלימו את התשלום בחלון שנפתח.</div>';
      openNedarimCheckoutModal(checkout.iframeUrl, async () => {
        // בודקים בפועל מול השרת (מקור אמת = webhook אמיתי מנדרים פלוס) - לעולם
        // לא מציגים "הצלחה" רק כי האייפרם שלח הודעה או שהמשתמש סגר את החלון.
        const statusRes = await api(`/api/public/payments/${encodeURIComponent(created.id)}/status?token=${encodeURIComponent(created.correlation_token)}`);
        const isPaid = statusRes.status === 'paid';
        if (isPaid) {
          document.getElementById('donate-alert').innerHTML = '<div class="alert alert-success">תודה רבה! התשלום אושר בהצלחה.</div>';
        }
        return isPaid;
      });
    } catch (err) {
      document.getElementById('donate-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// עמוד: הצטרפות משולב (ארגון / שיעור בהתאמה אישית / מגיד שיעור) + תפקיד + התחברות
// ---------------------------------------------------------------------------

function renderJoin() {
  const params = queryParams();
  let intent = params.get('intent') || 'lesson'; // 'org' | 'lesson' | 'teacher'
  const presetRole = params.get('role') || '';
  if (presetRole === 'maggid_shiur') intent = 'teacher';

  APP.innerHTML = `
    <div class="stack" style="max-width:640px;margin:30px auto;">
      <h1>הצטרפות ופניות</h1>
      <p class="muted">בחרו את סוג הפנייה, מלאו את הפרטים — ונחזור אליכם בהקדם.</p>
      <div class="role-choice" id="intent-choice">
        <label><input type="radio" name="intent" value="lesson" ${intent === 'lesson' ? 'checked' : ''}/><span>🕮 מחפש/ת שיעור מתאים</span></label>
        <label><input type="radio" name="intent" value="teacher" ${intent === 'teacher' ? 'checked' : ''}/><span>🎓 מגיד שיעור / פתיחת שיעור</span></label>
        <label><input type="radio" name="intent" value="org" ${intent === 'org' ? 'checked' : ''}/><span>🏛 ארגון / בית כנסת</span></label>
      </div>

      <div id="join-alert"></div>
      <form id="join-form" class="card">
        <div class="form-row">
          <div class="form-field"><label for="f19-name">שם מלא *</label><input id="f19-name" name="name" required /></div>
          <div class="form-field"><label for="f19-phone">טלפון</label><input id="f19-phone" name="phone" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="f19-email">אימייל</label><input id="f19-email" name="email" type="email" /></div>
          <div class="form-field"><label for="f19-city">עיר</label><input id="f19-city" name="city" placeholder="עיר מגורים" /></div>
        </div>

        <fieldset class="subform" id="fs-org" style="display:${intent === 'org' ? 'block' : 'none'}">
          <legend>פרטי הארגון / בית הכנסת</legend>
          <div class="form-field"><label for="f19-org-name">שם הארגון / בית כנסת</label><input id="f19-org-name" name="org_name" /></div>
          <div class="form-field"><label for="f19-org-body">ספרו לנו קצת</label><textarea id="f19-org-body" name="org_body"></textarea></div>
        </fieldset>

        <fieldset class="subform" id="fs-lesson" style="display:${intent === 'lesson' ? 'block' : 'none'}">
          <legend>מה מחפשים?</legend>
          <div class="form-row">
            <div class="form-field"><label for="f19-lesson-topic">נושא מבוקש</label>
              <select id="f19-lesson-topic" name="lesson_topic"><option value="">בחרו נושא…</option>${CANONICAL_TOPICS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select>
            </div>
            <div class="form-field"><label for="f19-preferred-time">שעה מועדפת</label><input id="f19-preferred-time" name="preferred_time" placeholder="למשל: אחרי ערבית" /></div>
          </div>
          <div class="form-field"><label for="f19-lesson-notes">הערות נוספות</label><textarea id="f19-lesson-notes" name="lesson_notes"></textarea></div>
        </fieldset>

        <fieldset class="subform" id="fs-teacher" style="display:${intent === 'teacher' ? 'block' : 'none'}">
          <legend>הצטרפות למערך מגידי השיעורים</legend>
          <div class="role-choice">
            <label><input type="radio" name="teacher_kind" value="new" checked /><span>מעוניין להתחיל למסור שיעור חדש</span></label>
            <label><input type="radio" name="teacher_kind" value="existing" /><span>יש לי כבר שיעור קיים</span></label>
          </div>
          <div class="form-field"><label for="f19-teacher-lesson-title">כותרת השיעור (אם רלוונטי)</label><input id="f19-teacher-lesson-title" name="teacher_lesson_title" /></div>
          <div class="form-field"><label>נושאים שמעניינים אותך (מהרשימה)</label></div>
          <div class="topic-picker" id="teacher-topics">
            ${CANONICAL_TOPICS.map(t => `<label><input type="checkbox" value="${esc(t)}" /><span>${esc(t)}</span></label>`).join('')}
          </div>
          <div class="form-field"><label for="f19-teacher-notes">פרטים נוספים</label><textarea id="f19-teacher-notes" name="teacher_notes"></textarea></div>
        </fieldset>

        <fieldset class="subform">
          <legend>תפקידכם בארגון / בבית הכנסת</legend>
          <div class="role-choice" id="role-choice">
            ${Object.entries(ROLE_LABELS).map(([val, label]) => `
              <label><input type="radio" name="role" value="${val}" ${presetRole === val ? 'checked' : ''}/><span>${esc(label)}</span></label>`).join('')}
          </div>
          <div class="form-field" id="role-other-wrap" style="display:none;">
            <label for="f19-role-details">פרטו (תפקיד "אחר")</label><input id="f19-role-details" name="role_details" />
          </div>
        </fieldset>

        <fieldset class="subform" id="fs-login" style="display:none;">
          <legend>יצירת התחברות לממשק ניהול</legend>
          <p class="form-hint">אם סימנתם "גבאי" או "מגיד שיעור" — אפשר ליצור כאן משתמש לכניסה עתידית לניהול (אימייל + סיסמה). לאחר אישור הבקשה נשייך אתכם לגוף המתאים.</p>
          <label style="display:flex;gap:8px;align-items:center;font-weight:700;margin-bottom:10px;">
            <input type="checkbox" id="wants-login-cb" style="width:auto;" /> ברצוני ליצור גישה לניהול
          </label>
          <div id="login-fields" style="display:none;">
            <div class="form-row">
              <div class="form-field"><label for="f19-login-email">אימייל להתחברות *</label><input id="f19-login-email" name="login_email" type="email" /></div>
              <div class="form-field"><label for="f19-login-password">סיסמה *</label>${pwField('name="login_password" minlength="6"', 'f19-login-password')}</div>
            </div>
          </div>
        </fieldset>

        <button class="btn btn-accent" type="submit">שליחה</button>
      </form>
    </div>
  `;

  const form = document.getElementById('join-form');

  function syncIntent(val) {
    document.getElementById('fs-org').style.display = val === 'org' ? 'block' : 'none';
    document.getElementById('fs-lesson').style.display = val === 'lesson' ? 'block' : 'none';
    document.getElementById('fs-teacher').style.display = val === 'teacher' ? 'block' : 'none';
  }
  document.querySelectorAll('#intent-choice input[name=intent]').forEach(r => r.onchange = () => syncIntent(r.value));

  function syncRole() {
    const role = form.querySelector('input[name=role]:checked');
    document.getElementById('role-other-wrap').style.display = role && role.value === 'other' ? 'flex' : 'none';
    document.getElementById('fs-login').style.display = role && (role.value === 'gabbai' || role.value === 'maggid_shiur') ? 'block' : 'none';
  }
  document.querySelectorAll('#role-choice input[name=role]').forEach(r => r.onchange = syncRole);
  syncRole();

  document.getElementById('wants-login-cb').onchange = e => {
    document.getElementById('login-fields').style.display = e.target.checked ? 'block' : 'none';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('join-alert');
    alertBox.innerHTML = '';
    const fd = new FormData(form);
    const intentVal = form.querySelector('input[name=intent]:checked').value;
    const roleEl = form.querySelector('input[name=role]:checked');
    const role = roleEl ? roleEl.value : null;
    const wantsLogin = document.getElementById('wants-login-cb').checked && (role === 'gabbai' || role === 'maggid_shiur');
    const loginEmail = fd.get('login_email');
    const loginPassword = fd.get('login_password');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      if (wantsLogin) {
        if (!loginEmail || !loginPassword || loginPassword.length < 6) {
          throw new Error('לצורך יצירת התחברות יש למלא אימייל וסיסמה (לפחות 6 תווים).');
        }
        const client = await ensureSupabaseClient();
        const { error } = await client.auth.signUp({ email: loginEmail, password: loginPassword });
        if (error) throw new Error('שגיאה ביצירת ההתחברות: ' + error.message);
      }

      if (intentVal === 'org') {
        await api('/api/public/join', {
          method: 'POST',
          body: JSON.stringify({
            name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
            city: fd.get('city'), org_name: fd.get('org_name'), body: fd.get('org_body') || 'בקשת הצטרפות ארגון/בית כנסת',
          }),
        });
      } else if (intentVal === 'lesson') {
        await api('/api/national/request', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'custom_lesson',
            name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), city: fd.get('city'),
            topic: fd.get('lesson_topic'), preferred_time: fd.get('preferred_time'), notes: fd.get('lesson_notes'),
            role, role_details: fd.get('role_details'), wants_login: wantsLogin,
          }),
        });
      } else {
        const topics = [...document.querySelectorAll('#teacher-topics input:checked')].map(x => x.value);
        const teacherKind = form.querySelector('input[name=teacher_kind]:checked').value;
        await api('/api/national/request', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'join_teacher',
            name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'), city: fd.get('city'),
            topic: fd.get('teacher_lesson_title') || null,
            notes: (teacherKind === 'existing' ? 'יש שיעור קיים. ' : 'מעוניין להתחיל שיעור חדש. ') + (fd.get('teacher_notes') || ''),
            role, role_details: fd.get('role_details'), topics, wants_login: wantsLogin,
          }),
        });
      }

      alertBox.innerHTML = `<div class="alert alert-success">
        הפנייה נשלחה בהצלחה! נחזור אליכם בקרוב.
        ${wantsLogin ? '<br/>נרשמת גם עם התחברות — לאחר אישור הבקשה תוכלו להתחבר דרך <a href="#/login">כניסת ניהול</a>.' : ''}
      </div>`;
      form.reset();
      syncIntent(intentVal);
      syncRole();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function renderNotFound() {
  APP.innerHTML = `<div class="empty-state">
    <h2>הקישור לא נמצא</h2>
    <p>ודאו שהעתקתם את הקישור במלואו, או <a href="#/" class="btn btn-outline btn-sm">חזרו לדשבורד</a>.</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// עמוד ציבורי: ארגון (עיצוב חדשני — זמנים, נוסח, תפילות, שירותים, פרסומים)
// ---------------------------------------------------------------------------

function lessonsTable(lessons) {
  if (!lessons || !lessons.length) return '<p class="muted">אין עדיין שיעורים מתוזמנים.</p>';
  const rows = [...lessons].sort((a, b) => (a.day_of_week - b.day_of_week) || (a.start_time || '').localeCompare(b.start_time || ''));
  return `<div>${rows.map(lessonLine).join('')}</div>`;
}

function zmanimStrip(data) {
  if (!data) return '';
  const labels = {
    alot_hashachar: 'עלות השחר', netz: 'נץ החמה', sof_zman_shma: 'סוף זמן ק"ש',
    sof_zman_tfila: 'סוף זמן תפילה', chatzot: 'חצות', mincha_gedola: 'מנחה גדולה',
    shkia: 'שקיעה', tzet_hakochavim: 'צאת הכוכבים',
  };
  const entries = Object.entries(labels).filter(([k]) => data[k]);
  if (!entries.length) return '';
  return `
    <div class="zmanim-strip">
      ${entries.map(([k, label]) => `<div class="zman-pill">${esc(label)} <b>${esc(formatTime(data[k]))}</b></div>`).join('')}
    </div>`;
}

function prayerMiniTable(prayerTimes, dayType) {
  const rows = (prayerTimes || []).filter(p => p.day_type === dayType && p.is_active !== false)
    .sort((a, b) => (a.sort_order - b.sort_order) || (a.prayer_time || '').localeCompare(b.prayer_time || ''));
  if (!rows.length) return '';
  return `<table class="prayer-mini-table">${rows.map(p => `<tr><td>${esc(p.prayer_name)}</td><td>${esc(formatTime(p.prayer_time))}</td></tr>`).join('')}</table>`;
}

function servicesBlock(services) {
  if (!services || !services.length) return '';
  const labels = {
    kashrut: 'כשרות', mikvaot: 'מקוואות', dat_community: 'שירותי דת', halacha_yomit: 'הלכה יומית',
    mourning: 'אבלות והנצחה', newsletter: 'עלון שבועי', religious_services: 'שירותי דת', general: 'כללי',
  };
  return `
    <div class="section">
      <div class="section-head"><h2>שירותי קהילה</h2></div>
      <div class="grid">
        ${services.map(s => `
          <div class="card">
            <span class="type-tag">${esc(labels[s.service_type] || s.service_type)}</span>
            <h3 style="margin-top:8px;">${esc(s.title)}</h3>
            ${s.body ? `<p class="muted">${esc(s.body)}</p>` : ''}
            ${s.contact_phone ? `<p class="muted">☎ ${esc(s.contact_phone)}</p>` : ''}
            ${s.file_url ? `<a class="btn btn-outline btn-sm" href="${esc(s.file_url)}" target="_blank" rel="noopener">קובץ להורדה</a>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function adsBlock(ads) {
  if (!ads || !ads.length) return '';
  return `
    <div class="section">
      <div class="section-head"><h2>פרסומים</h2></div>
      <div class="grid">
        ${ads.map(a => `
          <div class="card">
            <h3>${esc(a.title)}</h3>
            <p class="muted">${esc(a.body || '')}</p>
            ${a.link_url ? `<a class="btn btn-outline btn-sm" href="${esc(a.link_url)}" target="_blank" rel="noopener">לפרטים נוספים</a>` : ''}
          </div>`).join('')}
      </div>
    </div>`;
}

function contactForm() {
  return `
    <h2>יצירת קשר</h2>
    <div id="contact-alert"></div>
    <form id="contact-form" class="card" style="max-width:520px;">
      <div class="form-row">
        <div class="form-field"><label for="f19-name-2">שם *</label><input id="f19-name-2" name="name" required /></div>
        <div class="form-field"><label for="f19-phone-2">טלפון</label><input id="f19-phone-2" name="phone" /></div>
      </div>
      <div class="form-field"><label for="f19-email-2">אימייל</label><input id="f19-email-2" name="email" type="email" /></div>
      <div class="form-field"><label for="f19-subject">נושא</label><input id="f19-subject" name="subject" /></div>
      <div class="form-field"><label for="f19-body">הודעה *</label><textarea id="f19-body" name="body" required></textarea></div>
      <button class="btn btn-primary" type="submit">שליחה</button>
    </form>
  `;
}

function wireContactForm(submitUrl) {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const alertBox = document.getElementById('contact-alert');
    try {
      await api(submitUrl, { method: 'POST', body: JSON.stringify(f) });
      alertBox.innerHTML = '<div class="alert alert-success">ההודעה נשלחה, תודה!</div>';
      e.target.reset();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });
}

async function renderTenantPublic(token) {
  const data = await api(`/api/public/tenant/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  const t = data.tenant;
  const base = location.href.split('#')[0];
  setBreadcrumbJsonLd([{ name: 'דשבורד', url: base + '#/' }, { name: t.name, url: base + '#/t/' + encodeURIComponent(token) }]);
  let zmanim = null;
  try { zmanim = await api(`/api/city/${encodeURIComponent(t.city)}/zmanim`); } catch (e) { /* אופציונלי */ }

  APP.innerHTML = `
    <div style="margin-top:24px;">
      <div class="row-between">
        <div class="row-top" style="gap:12px;">
          ${logoCircle(t.name, t.logo_url)}
          <div>
            <span class="type-tag">${esc(TYPE_LABELS[t.type] || t.type)}</span>
            <h1 style="margin-top:4px;">${esc(t.name)}</h1>
            <div class="muted">📍 ${esc(t.city)}</div>
          </div>
        </div>
        ${t.website_url ? `<a class="btn btn-outline btn-sm" href="${esc(t.website_url)}" target="_blank" rel="noopener">אתר מלא ↗</a>` : ''}
      </div>

      ${zmanimStrip(zmanim)}

      ${t.about_text ? `<p style="margin-top:16px;">${esc(t.about_text)}</p>` : ''}
      ${(t.contact_email || t.contact_phone) ? `<p class="muted">
        ${t.contact_phone ? '☎ ' + esc(t.contact_phone) : ''} ${t.contact_email ? ' · ✉ ' + esc(t.contact_email) : ''}
      </p>` : ''}

      ${data.synagogues && data.synagogues.length ? `
        <div class="section">
          <div class="section-head"><h2>סניפים / בתי כנסת</h2></div>
          <div class="grid grid-2">
            ${data.synagogues.map(s => `
              <div class="card syn-card">
                <div class="row-between">
                  <div class="row-top" style="gap:10px;">
                    ${logoCircle(s.name, null, true)}
                    <div>
                      <a href="#/s/${esc(s.public_token)}" style="font-weight:800;">${esc(s.name)}</a>
                      ${s.nusach ? `<div class="nusach-tag">${esc(s.nusach)}</div>` : ''}
                    </div>
                  </div>
                  ${s.website_url ? `<a class="btn btn-quiet" href="${esc(s.website_url)}" target="_blank" rel="noopener">אתר מלא ↗</a>` : ''}
                </div>
                <div class="city">📍 ${esc(s.neighborhood || s.address || '')}</div>
                ${prayerMiniTable(s.prayer_times, 'weekday')}
              </div>`).join('')}
          </div>
        </div>` : ''}

      <div class="section">
        <div class="section-head"><h2>לוח שיעורים שבועי</h2></div>
        ${lessonsTable(data.lessons)}
      </div>

      ${servicesBlock(data.services)}
      ${adsBlock(data.ads)}

      <div class="section">
        ${contactForm()}
      </div>

      <div class="section quiet-cta-row">
        <a class="btn btn-quiet" href="#/join?role=maggid_shiur">מחפשים מגיד שיעור?</a>
        <a class="btn btn-quiet" href="#/join?intent=lesson">רוצים לפתוח שיעור חדש?</a>
      </div>
    </div>
  `;
  wireContactForm(`/api/public/tenant/${encodeURIComponent(token)}/message`);
}

async function renderSynagoguePublic(token) {
  const data = await api(`/api/public/synagogue/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  const s = data.synagogue;
  const base = location.href.split('#')[0];
  setBreadcrumbJsonLd([{ name: 'דשבורד', url: base + '#/' }, { name: s.name, url: base + '#/s/' + encodeURIComponent(token) }]);
  APP.innerHTML = `
    <div style="margin-top:24px;">
      <div class="row-between">
        <div>
          <span class="type-tag">בית כנסת</span>
          ${s.nusach ? `<span class="nusach-tag" style="margin-inline-start:6px;">${esc(s.nusach)}</span>` : ''}
          <h1>${esc(s.name)}</h1>
          <div class="muted">📍 ${esc(s.address || '')} ${s.neighborhood ? '· ' + esc(s.neighborhood) : ''}, ${esc(s.city)}</div>
          ${s.gabbai_name ? `<p class="muted">גבאי: ${esc(s.gabbai_name)} ${s.gabbai_phone ? '· ☎ ' + esc(s.gabbai_phone) : ''}</p>` : ''}
        </div>
        ${s.website_url ? `<a class="btn btn-outline btn-sm" href="${esc(s.website_url)}" target="_blank" rel="noopener">אתר מלא ↗</a>` : ''}
      </div>

      <div class="section">
        <div class="section-head"><h2>תפילות — ימות החול</h2></div>
        ${prayerMiniTable(data.prayer_times, 'weekday') || '<p class="muted">לוח התפילות טרם עודכן.</p>'}
      </div>
      <div class="section">
        <div class="section-head"><h2>תפילות — שבת</h2></div>
        ${prayerMiniTable(data.prayer_times, 'shabbat') || '<p class="muted">לוח התפילות טרם עודכן.</p>'}
      </div>

      <div class="section">
        <div class="section-head"><h2>לוח שיעורים שבועי</h2></div>
        ${lessonsTable(data.lessons)}
      </div>
    </div>
  `;
}

async function renderTeacherPublic(token) {
  const data = await api(`/api/public/teacher/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  const t = data.teacher;
  const base = location.href.split('#')[0];
  setBreadcrumbJsonLd([{ name: 'דשבורד', url: base + '#/' }, { name: t.full_name, url: base + '#/te/' + encodeURIComponent(token) }]);
  APP.innerHTML = `
    <div style="margin-top:24px;">
      <div class="row-top" style="gap:12px;">
        ${logoCircle(t.full_name, t.photo_url)}
        <div>
          <span class="type-tag">מגיד שיעור</span>
          <h1 style="margin-top:4px;">${esc(t.title ? t.title + ' ' : '')}${esc(t.full_name)}</h1>
          <div class="muted">📍 ${esc(t.city)}</div>
        </div>
      </div>
      ${t.bio ? `<p>${esc(t.bio)}</p>` : ''}
      ${(t.topics && t.topics.length) ? `<div>${t.topics.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
      ${t.phone ? `<p class="muted">☎ ${esc(t.phone)}</p>` : ''}

      ${(data.ads && data.ads.length) ? `
      <div class="section">
        <div class="grid">
          ${data.ads.map(a => `
            <div class="card">
              ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:100%;border-radius:10px;margin-bottom:10px;max-height:180px;object-fit:cover;" />` : ''}
              <h3>${esc(a.title)}</h3>
              ${a.body ? `<p class="muted">${esc(a.body)}</p>` : ''}
              ${a.link_url ? `<a class="btn btn-outline btn-sm" href="${esc(a.link_url)}" target="_blank" rel="noopener">לפרטים ↗</a>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}

      <div class="section">
        <div class="section-head"><h2>שיעורים</h2></div>
        ${lessonsTable(data.lessons)}
      </div>

      <div class="section">
        <h2>שאל את הרב</h2>
        <div id="ask-alert"></div>
        <form id="ask-form" class="card" style="max-width:520px;">
          <div class="form-row">
            <div class="form-field"><label for="f19-name-3">שם *</label><input id="f19-name-3" name="name" required /></div>
            <div class="form-field"><label for="f19-phone-3">טלפון</label><input id="f19-phone-3" name="phone" /></div>
          </div>
          <div class="form-field"><label for="f19-email-3">אימייל</label><input id="f19-email-3" name="email" type="email" /></div>
          <div class="form-field"><label for="f19-body-2">שאלה *</label><textarea id="f19-body-2" name="body" required></textarea></div>
          <button class="btn btn-primary" type="submit">שליחה</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('ask-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const alertBox = document.getElementById('ask-alert');
    try {
      await api(`/api/public/teacher/${encodeURIComponent(token)}/ask-rabbi`, { method: 'POST', body: JSON.stringify(f) });
      alertBox.innerHTML = '<div class="alert alert-success">השאלה נשלחה, תודה!</div>';
      e.target.reset();
    } catch (err) {
      alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
    }
  });
}

// ---------------------------------------------------------------------------
// דשבורד ניהול Tenant (admin_token)
// ---------------------------------------------------------------------------

async function renderAdmin(token) {
  const data = await api(`/api/admin/tenant/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  let tab = 'lessons';
  let editingLesson = null;
  let editingAd = null;

  function draw() {
    const t = data.tenant;
    const unread = data.messages.filter(m => !m.is_read).length;
    APP.innerHTML = `
      <div style="margin-top:20px;">
        <div class="row-between">
          <h1>ניהול: ${esc(t.name)}</h1>
          <a class="btn btn-outline btn-sm" href="#/t/${esc(t.public_token)}" target="_blank">צפייה בדף הציבורי ↗</a>
        </div>
        <div class="tabs">
          <button class="tab-btn ${tab==='lessons'?'active':''}" data-tab="lessons">שיעורים</button>
          <button class="tab-btn ${tab==='services'?'active':''}" data-tab="services">שירותי קהילה</button>
          <button class="tab-btn ${tab==='ads'?'active':''}" data-tab="ads">מודעות</button>
          <button class="tab-btn ${tab==='messages'?'active':''}" data-tab="messages">הודעות מהציבור${unread ? `<span class="badge-unread">${unread}</span>` : ''}</button>
          <button class="tab-btn ${tab==='billing'?'active':''}" data-tab="billing">סליקה ותרומות</button>
          <button class="tab-btn ${tab==='profile'?'active':''}" data-tab="profile">פרטי הארגון</button>
        </div>
        <div id="tab-content"></div>
      </div>
    `;
    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => { tab = b.dataset.tab; editingLesson = null; editingAd = null; draw(); });
    const content = document.getElementById('tab-content');
    if (tab === 'lessons') drawLessons(content);
    else if (tab === 'services') drawServices(content);
    else if (tab === 'ads') drawAds(content);
    else if (tab === 'messages') drawMessages(content);
    else if (tab === 'billing') drawBilling(content);
    else drawProfile(content);
  }

  async function refresh() { Object.assign(data, await api(`/api/admin/tenant/${encodeURIComponent(token)}`)); }

  function drawLessons(content) {
    const l = editingLesson;
    content.innerHTML = `
      <div id="lessons-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>${l ? 'עריכת שיעור' : 'הוספת שיעור'}</h3>
        <form id="lesson-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-title">כותרת *</label><input id="f19-title" name="title" required value="${esc(l?.title || '')}" /></div>
            <div class="form-field"><label for="f19-topic">נושא</label><input id="f19-topic" name="topic" value="${esc(l?.topic || '')}" /></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="f19-day-of-week">יום</label>
              <select id="f19-day-of-week" name="day_of_week">${DAYS_HE.map((d,i)=>`<option value="${i}" ${l && l.day_of_week === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
            </div>
            <div class="form-field"><label for="f19-start-time">שעה</label><input id="f19-start-time" name="start_time" type="time" value="${esc(l?.start_time || '')}" /></div>
            <div class="form-field"><label for="f19-duration-minutes">משך (דקות)</label><input id="f19-duration-minutes" name="duration_minutes" type="number" value="${l?.duration_minutes || 45}" /></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="f19-audience">קהל יעד</label>
              <select id="f19-audience" name="audience">
                <option value="men" ${(l?.audience || 'men') === 'men' ? 'selected' : ''}>גברים</option>
                <option value="women" ${l?.audience === 'women' ? 'selected' : ''}>נשים</option>
                <option value="mixed" ${l?.audience === 'mixed' ? 'selected' : ''}>מעורב</option>
              </select>
            </div>
          </div>
          <div class="form-field"><label for="f19-description">תיאור</label><textarea id="f19-description" name="description">${esc(l?.description || '')}</textarea></div>
          ${uploadFieldHtml({ id: 'lesson-logo', label: 'לוגו השיעור (אופציונלי)', name: 'logo_url', currentUrl: l?.logo_url || '' })}
          <label style="display:flex;gap:16px;">
            <span><input type="checkbox" name="is_live" style="width:auto;" ${l?.is_live ? 'checked' : ''} /> משודר LIVE</span>
            <span><input type="checkbox" name="is_recorded" style="width:auto;" ${l?.is_recorded ? 'checked' : ''} /> מוקלט</span>
          </label>
          <div style="display:flex;gap:10px;margin-top:12px;">
            <button class="btn btn-primary" type="submit">${l ? 'עדכון שיעור' : 'הוספת שיעור'}</button>
            ${l ? '<button class="btn btn-outline" type="button" id="lesson-cancel-edit">ביטול עריכה</button>' : ''}
          </div>
        </form>
      </div>
      <div>
        ${data.lessons.map(l => `
          <div class="lesson-row">
            ${logoCircle(l.title, l.logo_url, true)}
            <div class="time-badge">${esc(DAYS_HE[l.day_of_week] ?? '')}<br/>${esc(formatTime(l.start_time))}</div>
            <div style="flex:1;">${esc(l.title)} <span class="muted">${esc(l.topic || '')}</span></div>
            <button class="btn btn-outline btn-sm" data-edit="${l.id}">עריכה</button>
            <button class="btn btn-danger btn-sm" data-del="${l.id}">מחיקה</button>
          </div>`).join('') || '<p class="muted">אין שיעורים עדיין.</p>'}
      </div>
    `;
    wireUploadField({ id: 'lesson-logo', uploadUrl: `/api/admin/tenant/${encodeURIComponent(token)}/upload` });
    document.getElementById('lesson-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      f.day_of_week = Number(f.day_of_week);
      f.duration_minutes = Number(f.duration_minutes) || 45;
      f.is_live = e.target.is_live.checked;
      f.is_recorded = e.target.is_recorded.checked;
      if (editingLesson) f.lesson_id = editingLesson.id;
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/lessons`, { method: 'POST', body: JSON.stringify(f) });
        editingLesson = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('lessons-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    const cancelBtn = document.getElementById('lesson-cancel-edit');
    if (cancelBtn) cancelBtn.onclick = () => { editingLesson = null; drawLessons(content); };
    content.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
      editingLesson = data.lessons.find(x => String(x.id) === btn.dataset.edit) || null;
      drawLessons(content);
      document.getElementById('lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    content.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק את השיעור?')) return;
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/lessons/${btn.dataset.del}`, { method: 'DELETE' });
        if (editingLesson && String(editingLesson.id) === btn.dataset.del) editingLesson = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('lessons-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawServices(content) {
    const labels = {
      kashrut: 'כשרות', mikvaot: 'מקוואות', dat_community: 'שירותי דת', halacha_yomit: 'הלכה יומית',
      mourning: 'אבלות והנצחה', newsletter: 'עלון שבועי', religious_services: 'שירותי דת', general: 'כללי',
    };
    content.innerHTML = `
      <div id="services-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>שירות קהילה חדש</h3>
        <form id="service-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-service-type">סוג שירות *</label>
              <select id="f19-service-type" name="service_type">${Object.entries(labels).map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select>
            </div>
            <div class="form-field"><label for="f19-title-2">כותרת *</label><input id="f19-title-2" name="title" required /></div>
          </div>
          <div class="form-field"><label for="f19-body-3">תוכן</label><textarea id="f19-body-3" name="body"></textarea></div>
          <div class="form-row">
            <div class="form-field"><label for="f19-contact-name">איש קשר</label><input id="f19-contact-name" name="contact_name" /></div>
            <div class="form-field"><label for="f19-contact-phone">טלפון</label><input id="f19-contact-phone" name="contact_phone" /></div>
          </div>
          ${uploadFieldHtml({
            id: 'service-file', label: 'קובץ מצורף (עלון וכד\', אופציונלי)', name: 'file_url', currentUrl: '',
            hint: 'ניתן להעלות תמונה או PDF (עד 5MB).', accept: 'image/*,application/pdf',
          })}
          <button class="btn btn-primary" type="submit">פרסום</button>
        </form>
      </div>
      <div class="grid">
        ${(data.services || []).map(s => `
          <div class="card">
            <div class="row-between"><span class="type-tag">${esc(labels[s.service_type] || s.service_type)}</span>
              <button class="btn btn-danger btn-sm" data-del-service="${s.id}">מחיקה</button></div>
            <h3 style="margin-top:8px;">${esc(s.title)}</h3>
            <p class="muted">${esc(s.body || '')}</p>
            ${s.file_url ? `<a class="btn btn-outline btn-sm" href="${esc(s.file_url)}" target="_blank" rel="noopener">צפייה בקובץ ↗</a>` : ''}
          </div>`).join('') || '<p class="muted">אין שירותי קהילה עדיין.</p>'}
      </div>
    `;
    wireUploadField({ id: 'service-file', uploadUrl: `/api/admin/tenant/${encodeURIComponent(token)}/upload?kind=service` });
    document.getElementById('service-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/services`, { method: 'POST', body: JSON.stringify(f) });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('services-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    content.querySelectorAll('[data-del-service]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק את השירות?')) return;
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/services/${btn.dataset.delService}`, { method: 'DELETE' });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('services-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawAds(content) {
    const a = editingAd;
    content.innerHTML = `
      <div id="ads-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>${a ? 'עריכת מודעה' : 'מודעה חדשה'}</h3>
        <form id="ad-form">
          <div class="form-field"><label for="f19-title-3">כותרת *</label><input id="f19-title-3" name="title" required value="${esc(a?.title || '')}" /></div>
          <div class="form-field"><label for="f19-body-4">תוכן</label><textarea id="f19-body-4" name="body">${esc(a?.body || '')}</textarea></div>
          ${uploadFieldHtml({ id: 'ad-image', label: 'תמונת הפרסום (אופציונלי)', name: 'image_url', currentUrl: a?.image_url || '' })}
          <div class="form-field"><label for="f19-link-url">קישור (אופציונלי)</label><input id="f19-link-url" name="link_url" placeholder="https://" value="${esc(a?.link_url || '')}" /></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" type="submit">${a ? 'עדכון מודעה' : 'פרסום מודעה'}</button>
            ${a ? '<button class="btn btn-outline" type="button" id="ad-cancel-edit">ביטול עריכה</button>' : ''}
          </div>
        </form>
      </div>
      <div class="grid">
        ${data.ads.map(a => `
          <div class="card">
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:100%;border-radius:10px;margin-bottom:10px;max-height:160px;object-fit:cover;" />` : ''}
            <div class="row-between"><h3>${esc(a.title)}</h3>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-sm" data-edit-ad="${a.id}">עריכה</button>
                <button class="btn btn-danger btn-sm" data-del-ad="${a.id}">מחיקה</button>
              </div>
            </div>
            <p class="muted">${esc(a.body || '')}</p>
          </div>`).join('') || '<p class="muted">אין מודעות עדיין.</p>'}
      </div>
    `;
    wireUploadField({ id: 'ad-image', uploadUrl: `/api/admin/tenant/${encodeURIComponent(token)}/upload?kind=ad` });
    document.getElementById('ad-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (editingAd) f.ad_id = editingAd.id;
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/ads`, { method: 'POST', body: JSON.stringify(f) });
        editingAd = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('ads-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    const cancelBtn = document.getElementById('ad-cancel-edit');
    if (cancelBtn) cancelBtn.onclick = () => { editingAd = null; drawAds(content); };
    content.querySelectorAll('[data-edit-ad]').forEach(btn => btn.onclick = () => {
      editingAd = data.ads.find(x => String(x.id) === btn.dataset.editAd) || null;
      drawAds(content);
      document.getElementById('ad-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    content.querySelectorAll('[data-del-ad]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק את המודעה?')) return;
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/ads/${btn.dataset.delAd}`, { method: 'DELETE' });
        if (editingAd && String(editingAd.id) === btn.dataset.delAd) editingAd = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('ads-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawMessages(content) {
    content.innerHTML = `
      <div id="messages-alert"></div>
      <div class="stack">
        ${data.messages.map(m => `
          <div class="card">
            <div class="row-between">
              <strong>${esc(m.sender_name)}</strong>
              <span class="muted">${new Date(m.created_at).toLocaleString('he-IL')}</span>
            </div>
            <div class="muted">${m.sender_phone ? '☎ ' + esc(m.sender_phone) : ''} ${m.sender_email ? ' · ✉ ' + esc(m.sender_email) : ''} ${m.kind ? ' · ' + esc(m.kind) : ''}</div>
            ${m.subject ? `<p><strong>${esc(m.subject)}</strong></p>` : ''}
            <p>${esc(m.body)}</p>
            <button class="btn btn-outline btn-sm" data-toggle-read="${m.id}" data-current="${m.is_read}">
              ${m.is_read ? 'סמן כלא נקרא' : 'סמן כנקרא'}
            </button>
          </div>`).join('') || '<p class="muted">אין הודעות עדיין.</p>'}
      </div>
    `;
    content.querySelectorAll('[data-toggle-read]').forEach(btn => btn.onclick = async () => {
      const newVal = btn.dataset.current !== 'true';
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/messages/${btn.dataset.toggleRead}`, {
          method: 'PATCH', body: JSON.stringify({ is_read: newVal }),
        });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('messages-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  async function drawBilling(content) {
    content.innerHTML = '<div class="page-loading"><span class="spinner-lg" aria-hidden="true"></span><p class="muted">טוען…</p></div>';
    const [config, donationsData, payments] = await Promise.all([
      api(`/api/admin/tenant/${encodeURIComponent(token)}/nedarim/config`),
      api(`/api/admin/tenant/${encodeURIComponent(token)}/nedarim/donations`),
      api(`/api/admin/tenant/${encodeURIComponent(token)}/subscription-payments`),
    ]);

    const CURRENCY_SYMBOL = { ILS: '₪', USD: '$' };
    const money = (n, cur) => `${CURRENCY_SYMBOL[cur] || '₪'}${Number(n || 0).toLocaleString('he-IL')}`;

    content.innerHTML = `
      <div id="billing-alert"></div>

      <div class="card" style="margin-bottom:16px;max-width:640px;">
        <h3>חיבור לנדרים פלוס — דוח תרומות</h3>
        <p class="muted">
          כדי לראות כאן את דוח התרומות של הארגון, יש להזין את מספר המוסד בנדרים פלוס
          ואת סיסמת ה-API (מתקבלת ממשרד נדרים פלוס בפנייה ל-office@nedar.im). לאחר השמירה,
          לחצו על "סנכרון עכשיו" כדי למשוך את הנתונים.
        </p>
        <form id="nedarim-config-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-mosad-id">מספר מוסד (7 ספרות)</label>
              <input id="f19-mosad-id" name="mosad_id" value="${esc(config.mosad_id || '')}" placeholder="לדוגמה: 1234567" />
            </div>
            <div class="form-field"><label for="f19-api-password">סיסמת API ${config.has_api_password ? '(כבר מוגדרת — השאירו ריק כדי לא לשנות)' : ''}</label>
              ${pwField(`name="api_password" placeholder="${config.has_api_password ? '••••••••' : ''}"`, 'f19-api-password')}
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <input type="checkbox" name="is_active" style="width:auto;" ${config.is_active ? 'checked' : ''} /> סנכרון פעיל
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" type="submit">שמירת פרטי חיבור</button>
            <button class="btn btn-outline" type="button" id="sync-now-btn" ${config.configured ? '' : 'disabled'}>סנכרון עכשיו</button>
          </div>
        </form>
        ${config.last_sync_at ? `
          <p class="muted" style="margin-top:10px;">
            סנכרון אחרון: ${new Date(config.last_sync_at).toLocaleString('he-IL')} —
            <span style="color:${config.last_sync_status === 'error' ? '#c0392b' : '#2e7d32'}">
              ${config.last_sync_status === 'error' ? 'שגיאה: ' + esc(config.last_sync_error || '') : 'הצליח'}
            </span>
          </p>` : ''}
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="row-between">
          <h3>דוח תרומות (${donationsData.donations.length})</h3>
          <strong>סה"כ: ${money(donationsData.total_amount, 'ILS')}</strong>
        </div>
        <div style="overflow-x:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="text-align:right;color:#666;">
              <th style="padding:6px;">תאריך</th><th style="padding:6px;">שם</th>
              <th style="padding:6px;">סכום</th><th style="padding:6px;">סוג</th><th style="padding:6px;">הערות</th>
            </tr></thead>
            <tbody>
              ${donationsData.donations.map(d => `
                <tr style="border-top:1px solid #eee;">
                  <td style="padding:6px;">${d.transaction_time ? new Date(d.transaction_time).toLocaleDateString('he-IL') : ''}</td>
                  <td style="padding:6px;">${esc(d.donor_name || '')}</td>
                  <td style="padding:6px;">${money(d.amount, d.currency)}</td>
                  <td style="padding:6px;">${esc(d.transaction_type === 'HK' ? 'הוראת קבע' : 'רגיל')}</td>
                  <td style="padding:6px;" class="muted">${esc(d.comments || '')}</td>
                </tr>`).join('') || `<tr><td colspan="5" style="padding:12px;" class="muted">אין תרומות מסונכרנות עדיין.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card">
        <h3>תשלומי מנוי לאיגוד השיעורים</h3>
        <div class="stack" style="margin-top:10px;">
          ${payments.map(p => `
            <div class="row-between" style="padding:10px 0;border-top:1px solid #eee;">
              <div>
                <strong>${money(p.amount, p.currency)}</strong>
                <span class="muted"> · ${p.payment_type === 'monthly' ? 'מנוי חודשי' : 'חד פעמי'} · ${new Date(p.created_at).toLocaleDateString('he-IL')}</span>
                ${p.notes ? `<div class="muted">${esc(p.notes)}</div>` : ''}
              </div>
              ${p.status === 'paid'
                ? '<span class="badge" style="background:#e8f5e9;color:#2e7d32;">שולם ✓</span>'
                : `<button class="btn btn-primary btn-sm" data-pay="${p.id}">מעבר לתשלום</button>`}
            </div>`).join('') || '<p class="muted">אין בקשות תשלום כרגע.</p>'}
        </div>
      </div>
    `;

    document.getElementById('nedarim-config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/nedarim/config`, {
          method: 'PUT',
          body: JSON.stringify({
            mosad_id: fd.get('mosad_id'),
            api_password: fd.get('api_password') || undefined,
            is_active: fd.get('is_active') === 'on',
          }),
        });
        document.getElementById('billing-alert').innerHTML = '<div class="alert alert-success">פרטי החיבור נשמרו.</div>';
        await drawBilling(content);
      } catch (err) {
        document.getElementById('billing-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });

    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) syncBtn.onclick = async () => {
      syncBtn.disabled = true; syncBtn.textContent = 'מסנכרן…';
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/nedarim/sync`, { method: 'POST' });
        await drawBilling(content);
      } catch (err) {
        document.getElementById('billing-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    };

    content.querySelectorAll('[data-pay]').forEach(btn => btn.onclick = async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      try {
        const checkout = await api(`/api/admin/tenant/${encodeURIComponent(token)}/subscription-payments/${btn.dataset.pay}/checkout`);
        if (checkout.alreadyPaid) { await drawBilling(content); return; }
        openNedarimCheckoutModal(checkout.iframeUrl, async () => {
          // בודקים מחדש מול השרת (לא סומכים על postMessage/סגירת חלון) - קריאה
          // חוזרת לאותו endpoint מחזירה alreadyPaid:true רק אם ה-webhook האמיתי
          // מנדרים פלוס כבר עדכן את הסטטוס ב-DB.
          const recheck = await api(`/api/admin/tenant/${encodeURIComponent(token)}/subscription-payments/${btn.dataset.pay}/checkout`);
          const isPaid = !!recheck.alreadyPaid;
          if (isPaid) await drawBilling(content);
          return isPaid;
        });
      } catch (err) {
        document.getElementById('billing-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      } finally {
        btn.disabled = false;
      }
    });
  }

  function drawProfile(content) {
    const t = data.tenant;
    content.innerHTML = `
      <div id="profile-alert"></div>
      <form id="profile-form" class="card" style="max-width:560px;">
        ${uploadFieldHtml({
          id: 'tenant-logo', label: 'לוגו הארגון', name: 'logo_url', currentUrl: t.logo_url,
          hint: 'תמונה מרובעת עובדת הכי טוב (PNG/JPG/WEBP, עד 5MB). אם לא מעלים לוגו, יוצג סמל ברירת המחדל.',
        })}
        <div class="form-field"><label for="f19-name-4">שם הארגון</label><input id="f19-name-4" name="name" value="${esc(t.name)}" /></div>
        <div class="form-field"><label for="f19-about-text">אודות</label><textarea id="f19-about-text" name="about_text">${esc(t.about_text || '')}</textarea></div>
        <div class="form-row">
          <div class="form-field"><label for="f19-contact-email">אימייל ליצירת קשר</label><input id="f19-contact-email" name="contact_email" value="${esc(t.contact_email || '')}" /></div>
          <div class="form-field"><label for="f19-contact-phone-2">טלפון</label><input id="f19-contact-phone-2" name="contact_phone" value="${esc(t.contact_phone || '')}" /></div>
        </div>
        <div class="form-field"><label for="f19-website-url">קישור לאתר המלא (אם קיים)</label><input id="f19-website-url" name="website_url" value="${esc(t.website_url || '')}" placeholder="https://" /></div>
        <div class="form-field">
          <label><input type="checkbox" name="is_public" ${t.is_public ? 'checked' : ''} style="width:auto;display:inline;margin-left:8px;" /> הצג בספרייה הציבורית</label>
        </div>
        <button class="btn btn-primary" type="submit">שמירה</button>
      </form>
    `;
    wireUploadField({ id: 'tenant-logo', uploadUrl: `/api/admin/tenant/${encodeURIComponent(token)}/upload` });
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = {
        name: fd.get('name'), about_text: fd.get('about_text'),
        contact_email: fd.get('contact_email'), contact_phone: fd.get('contact_phone'),
        website_url: fd.get('website_url'), logo_url: fd.get('logo_url'),
        is_public: fd.get('is_public') === 'on',
      };
      try {
        await api(`/api/admin/tenant/${encodeURIComponent(token)}/profile`, { method: 'PUT', body: JSON.stringify(body) });
        document.getElementById('profile-alert').innerHTML = '<div class="alert alert-success">נשמר בהצלחה.</div>';
        await refresh();
      } catch (err) {
        document.getElementById('profile-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  draw();
}

// ---------------------------------------------------------------------------
// פורטל גבאים — ניהול בית כנסת (admin_token של בית הכנסת)
// ---------------------------------------------------------------------------

async function renderSynagogueAdmin(token) {
  const data = await api(`/api/admin/synagogue/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  let tab = 'prayers';

  async function refresh() { Object.assign(data, await api(`/api/admin/synagogue/${encodeURIComponent(token)}`)); }

  function draw() {
    const s = data.synagogue;
    APP.innerHTML = `
      <div style="margin-top:20px;">
        <div class="row-between">
          <h1>ניהול בית כנסת: ${esc(s.name)}</h1>
          <a class="btn btn-outline btn-sm" href="#/s/${esc(s.public_token)}" target="_blank">צפייה בדף הציבורי ↗</a>
        </div>
        <div class="tabs">
          <button class="tab-btn ${tab==='prayers'?'active':''}" data-tab="prayers">תפילות</button>
          <button class="tab-btn ${tab==='billing'?'active':''}" data-tab="billing">סליקה ותרומות</button>
          <button class="tab-btn ${tab==='profile'?'active':''}" data-tab="profile">פרטי בית הכנסת</button>
        </div>
        <div id="tab-content"></div>
      </div>
    `;
    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    const content = document.getElementById('tab-content');
    if (tab === 'prayers') drawPrayers(content);
    else if (tab === 'billing') drawBilling(content);
    else drawProfile(content);
  }

  async function drawBilling(content) {
    content.innerHTML = '<div class="page-loading"><span class="spinner-lg" aria-hidden="true"></span><p class="muted">טוען…</p></div>';
    const [config, donationsData] = await Promise.all([
      api(`/api/admin/synagogue/${encodeURIComponent(token)}/nedarim/config`),
      api(`/api/admin/synagogue/${encodeURIComponent(token)}/nedarim/donations`),
    ]);

    const CURRENCY_SYMBOL = { ILS: '₪', USD: '$' };
    const money = (n, cur) => `${CURRENCY_SYMBOL[cur] || '₪'}${Number(n || 0).toLocaleString('he-IL')}`;

    content.innerHTML = `
      <div id="billing-alert"></div>

      <div class="card" style="margin-bottom:16px;max-width:640px;">
        <h3>חיבור לנדרים פלוס — דוח תרומות</h3>
        <p class="muted">
          כאן ניתן לחבר את חשבון נדרים פלוס של בית הכנסת, כדי לראות באתר דוח תרומות
          שהתקבלו מהקהילה. יש להזין את מספר המוסד (7 ספרות) ואת סיסמת ה-API — שניהם
          מתקבלים ממשרד נדרים פלוס בפנייה טלפונית או במייל ל-office@nedar.im (יש לציין
          שמדובר בבקשה לסיסמת API לצורך "GetHistoryJson"). אחרי השמירה, לוחצים
          "סנכרון עכשיו" כדי למשוך את התרומות. פרטי הסיסמה מוצפנים ונשמרים אצלנו בשרת
          בלבד — הם לעולם לא מוצגים בדף.
        </p>
        <form id="nedarim-config-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-mosad-id-2">מספר מוסד (7 ספרות)</label>
              <input id="f19-mosad-id-2" name="mosad_id" value="${esc(config.mosad_id || '')}" placeholder="לדוגמה: 1234567" />
            </div>
            <div class="form-field"><label for="f19-api-password-2">סיסמת API ${config.has_api_password ? '(כבר מוגדרת — השאירו ריק כדי לא לשנות)' : ''}</label>
              ${pwField(`name="api_password" placeholder="${config.has_api_password ? '••••••••' : ''}"`, 'f19-api-password-2')}
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
            <input type="checkbox" name="is_active" style="width:auto;" ${config.is_active ? 'checked' : ''} /> סנכרון פעיל
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" type="submit">שמירת פרטי חיבור</button>
            <button class="btn btn-outline" type="button" id="sync-now-btn" ${config.configured ? '' : 'disabled'}>סנכרון עכשיו</button>
          </div>
        </form>
        ${config.last_sync_at ? `
          <p class="muted" style="margin-top:10px;">
            סנכרון אחרון: ${new Date(config.last_sync_at).toLocaleString('he-IL')} —
            <span style="color:${config.last_sync_status === 'error' ? '#c0392b' : '#2e7d32'}">
              ${config.last_sync_status === 'error' ? 'שגיאה: ' + esc(config.last_sync_error || '') : 'הצליח'}
            </span>
          </p>` : ''}
      </div>

      <div class="card">
        <div class="row-between">
          <h3>דוח תרומות (${donationsData.donations.length})</h3>
          <strong>סה"כ: ${money(donationsData.total_amount, 'ILS')}</strong>
        </div>
        <div style="overflow-x:auto;margin-top:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="text-align:right;color:#666;">
              <th style="padding:6px;">תאריך</th><th style="padding:6px;">שם</th>
              <th style="padding:6px;">סכום</th><th style="padding:6px;">סוג</th><th style="padding:6px;">הערות</th>
            </tr></thead>
            <tbody>
              ${donationsData.donations.map(d => `
                <tr style="border-top:1px solid #eee;">
                  <td style="padding:6px;">${d.transaction_time ? new Date(d.transaction_time).toLocaleDateString('he-IL') : ''}</td>
                  <td style="padding:6px;">${esc(d.donor_name || '')}</td>
                  <td style="padding:6px;">${money(d.amount, d.currency)}</td>
                  <td style="padding:6px;">${esc(d.transaction_type === 'HK' ? 'הוראת קבע' : 'רגיל')}</td>
                  <td style="padding:6px;" class="muted">${esc(d.comments || '')}</td>
                </tr>`).join('') || `<tr><td colspan="5" style="padding:12px;" class="muted">אין תרומות מסונכרנות עדיין.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('nedarim-config-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api(`/api/admin/synagogue/${encodeURIComponent(token)}/nedarim/config`, {
          method: 'PUT',
          body: JSON.stringify({
            mosad_id: fd.get('mosad_id'),
            api_password: fd.get('api_password') || undefined,
            is_active: fd.get('is_active') === 'on',
          }),
        });
        document.getElementById('billing-alert').innerHTML = '<div class="alert alert-success">פרטי החיבור נשמרו.</div>';
        await drawBilling(content);
      } catch (err) {
        document.getElementById('billing-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });

    const syncBtn = document.getElementById('sync-now-btn');
    if (syncBtn) syncBtn.onclick = async () => {
      syncBtn.disabled = true; syncBtn.textContent = 'מסנכרן…';
      try {
        await api(`/api/admin/synagogue/${encodeURIComponent(token)}/nedarim/sync`, { method: 'POST' });
        await drawBilling(content);
      } catch (err) {
        document.getElementById('billing-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    };
  }

  function drawPrayers(content) {
    content.innerHTML = `
      <div id="prayers-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>הוספת זמן תפילה</h3>
        <form id="prayer-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-day-type">סוג יום</label>
              <select id="f19-day-type" name="day_type"><option value="weekday">חול</option><option value="shabbat">שבת</option></select>
            </div>
            <div class="form-field"><label for="f19-prayer-name">שם התפילה *</label><input id="f19-prayer-name" name="prayer_name" placeholder="שחרית / מנחה / ערבית" required /></div>
            <div class="form-field"><label for="f19-prayer-time">שעה *</label><input id="f19-prayer-time" name="prayer_time" type="time" required /></div>
          </div>
          <button class="btn btn-primary" type="submit">הוספה</button>
        </form>
      </div>
      <div class="grid grid-2">
        <div>
          <h3>חול</h3>
          ${prayerMiniTable(data.prayer_times, 'weekday') || '<p class="muted">אין עדיין.</p>'}
        </div>
        <div>
          <h3>שבת</h3>
          ${prayerMiniTable(data.prayer_times, 'shabbat') || '<p class="muted">אין עדיין.</p>'}
        </div>
      </div>
      <div class="section">
        ${(data.prayer_times || []).map(p => `
          <div class="row-between" style="padding:6px 0;border-bottom:1px dashed var(--color-border);">
            <span>${p.day_type === 'shabbat' ? 'שבת' : 'חול'} · ${esc(p.prayer_name)} · ${esc(formatTime(p.prayer_time))}</span>
            <button class="btn btn-danger btn-sm" data-del-prayer="${p.id}">מחיקה</button>
          </div>`).join('')}
      </div>
    `;
    document.getElementById('prayer-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      try {
        await api(`/api/admin/synagogue/${encodeURIComponent(token)}/prayer-times`, { method: 'POST', body: JSON.stringify(f) });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('prayers-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    content.querySelectorAll('[data-del-prayer]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק?')) return;
      try {
        await api(`/api/admin/synagogue/${encodeURIComponent(token)}/prayer-times/${btn.dataset.delPrayer}`, { method: 'DELETE' });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('prayers-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawProfile(content) {
    const s = data.synagogue;
    content.innerHTML = `
      <div id="syn-profile-alert"></div>
      <form id="syn-profile-form" class="card" style="max-width:560px;">
        ${uploadFieldHtml({
          id: 'syn-logo', label: 'לוגו בית הכנסת', name: 'logo_url', currentUrl: s.logo_url,
          hint: 'תמונה מרובעת עובדת הכי טוב (PNG/JPG/WEBP, עד 5MB). אם לא מעלים לוגו, יוצג סמל ברירת המחדל.',
        })}
        <div class="form-field"><label for="f19-name-5">שם בית הכנסת</label><input id="f19-name-5" name="name" value="${esc(s.name)}" /></div>
        <div class="form-row">
          <div class="form-field"><label for="f19-nusach">נוסח/עדה</label><input id="f19-nusach" name="nusach" value="${esc(s.nusach || '')}" placeholder="אשכנזי / ספרדי / עדות המזרח" /></div>
          <div class="form-field"><label for="f19-gabbai-name">שם הגבאי</label><input id="f19-gabbai-name" name="gabbai_name" value="${esc(s.gabbai_name || '')}" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="f19-gabbai-phone">טלפון גבאי</label><input id="f19-gabbai-phone" name="gabbai_phone" value="${esc(s.gabbai_phone || '')}" /></div>
          <div class="form-field"><label for="f19-neighborhood">שכונה</label><input id="f19-neighborhood" name="neighborhood" value="${esc(s.neighborhood || '')}" /></div>
        </div>
        <div class="form-field"><label for="f19-address">כתובת</label><input id="f19-address" name="address" value="${esc(s.address || '')}" /></div>
        <div class="form-field"><label for="f19-website-url-2">קישור לאתר מלא (אם קיים)</label><input id="f19-website-url-2" name="website_url" value="${esc(s.website_url || '')}" placeholder="https://" /></div>
        <div class="form-field">
          <label><input type="checkbox" name="is_public" ${s.is_public ? 'checked' : ''} style="width:auto;display:inline;margin-left:8px;" /> הצג בספרייה הציבורית</label>
        </div>
        <button class="btn btn-primary" type="submit">שמירה</button>
      </form>
    `;
    wireUploadField({ id: 'syn-logo', uploadUrl: `/api/admin/synagogue/${encodeURIComponent(token)}/upload` });
    document.getElementById('syn-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd);
      body.is_public = fd.get('is_public') === 'on';
      try {
        await api(`/api/admin/synagogue/${encodeURIComponent(token)}/profile`, { method: 'PUT', body: JSON.stringify(body) });
        document.getElementById('syn-profile-alert').innerHTML = '<div class="alert alert-success">נשמר בהצלחה.</div>';
        await refresh();
      } catch (err) {
        document.getElementById('syn-profile-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  draw();
}

// ---------------------------------------------------------------------------
// פורטל מגיד שיעור — עצמאי לגמרי (פרופיל, שיעורים, מודעות, הודעות מלומדים),
// לפי admin_token של teachers (אותו דגם אבטחה כמו תשלום/סינכרון/העלאה בכל
// שאר הפורטלים בפרויקט הזה).
// ---------------------------------------------------------------------------

async function renderTeacherAdmin(token) {
  const data = await api(`/api/admin/teacher/${encodeURIComponent(token)}`);
  if (!data) return renderNotFound();
  let tab = 'profile';
  let editingLesson = null;
  let editingAd = null;

  async function refresh() { Object.assign(data, await api(`/api/admin/teacher/${encodeURIComponent(token)}`)); }

  function draw() {
    const t = data.teacher;
    const unread = (data.messages || []).filter(m => !m.is_read).length;
    APP.innerHTML = `
      <div style="margin-top:20px;">
        <div class="row-between">
          <h1>פורטל מגיד שיעור: ${esc(t.full_name)}</h1>
          <a class="btn btn-outline btn-sm" href="#/te/${esc(t.public_token)}" target="_blank">צפייה בדף הציבורי ↗</a>
        </div>
        <div class="tabs">
          <button class="tab-btn ${tab==='profile'?'active':''}" data-tab="profile">פרופיל</button>
          <button class="tab-btn ${tab==='lessons'?'active':''}" data-tab="lessons">שיעורים</button>
          <button class="tab-btn ${tab==='ads'?'active':''}" data-tab="ads">מודעות</button>
          <button class="tab-btn ${tab==='messages'?'active':''}" data-tab="messages">הודעות מלומדים${unread ? `<span class="badge-unread">${unread}</span>` : ''}</button>
        </div>
        <div id="tab-content"></div>
      </div>
    `;
    document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => { tab = b.dataset.tab; editingLesson = null; editingAd = null; draw(); });
    const content = document.getElementById('tab-content');
    if (tab === 'lessons') drawLessons(content);
    else if (tab === 'ads') drawAds(content);
    else if (tab === 'messages') drawMessages(content);
    else drawProfile(content);
  }

  function drawProfile(content) {
    const t = data.teacher;
    content.innerHTML = `
      <div id="te-profile-alert"></div>
      <form id="te-profile-form" class="card" style="max-width:560px;">
        ${uploadFieldHtml({
          id: 'te-photo', label: 'תמונת פרופיל', name: 'photo_url', currentUrl: t.photo_url,
          hint: 'תמונה מרובעת עובדת הכי טוב (PNG/JPG/WEBP, עד 5MB).',
        })}
        <div class="form-field"><label for="f19-full-name">שם מלא</label><input id="f19-full-name" name="full_name" value="${esc(t.full_name)}" /></div>
        <div class="form-row">
          <div class="form-field"><label for="f19-title-4">תואר/כינוי</label><input id="f19-title-4" name="title" value="${esc(t.title || '')}" placeholder="הרב / הרבנית / ר'" /></div>
          <div class="form-field"><label for="f19-city-2">עיר</label><input id="f19-city-2" name="city" value="${esc(t.city || '')}" /></div>
        </div>
        <div class="form-row">
          <div class="form-field"><label for="f19-phone-4">טלפון</label><input id="f19-phone-4" name="phone" value="${esc(t.phone || '')}" /></div>
          <div class="form-field"><label for="f19-email-4">אימייל</label><input id="f19-email-4" name="email" type="email" value="${esc(t.email || '')}" /></div>
        </div>
        <div class="form-field"><label for="f19-bio">ביוגרפיה / קורות</label><textarea id="f19-bio" name="bio">${esc(t.bio || '')}</textarea></div>
        <div class="form-field"><label for="f19-topics-text">נושאי הוראה (מופרדים בפסיק)</label>
          <input id="f19-topics-text" name="topics_text" value="${esc((t.topics||[]).join(', '))}" placeholder="גמרא, הלכה, מוסר" />
        </div>
        <div class="form-field">
          <label><input type="checkbox" name="is_public" ${t.is_public ? 'checked' : ''} style="width:auto;display:inline;margin-left:8px;" /> הצג בספרייה הציבורית</label>
        </div>
        <button class="btn btn-primary" type="submit">שמירה</button>
      </form>
    `;
    wireUploadField({ id: 'te-photo', uploadUrl: `/api/admin/teacher/${encodeURIComponent(token)}/upload` });
    document.getElementById('te-profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const body = Object.fromEntries(fd);
      body.is_public = fd.get('is_public') === 'on';
      body.topics = (fd.get('topics_text') || '').split(',').map(s => s.trim()).filter(Boolean);
      delete body.topics_text;
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/profile`, { method: 'PUT', body: JSON.stringify(body) });
        document.getElementById('te-profile-alert').innerHTML = '<div class="alert alert-success">נשמר בהצלחה.</div>';
        await refresh();
      } catch (err) {
        document.getElementById('te-profile-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawLessons(content) {
    const l = editingLesson;
    content.innerHTML = `
      <div id="te-lessons-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>${l ? 'עריכת שיעור' : 'הוספת שיעור'}</h3>
        <form id="te-lesson-form">
          <div class="form-row">
            <div class="form-field"><label for="f19-title-5">כותרת *</label><input id="f19-title-5" name="title" required value="${esc(l?.title || '')}" /></div>
            <div class="form-field"><label for="f19-topic-2">נושא</label><input id="f19-topic-2" name="topic" value="${esc(l?.topic || '')}" /></div>
          </div>
          <div class="form-row">
            <div class="form-field"><label for="f19-day-of-week-2">יום</label>
              <select id="f19-day-of-week-2" name="day_of_week">${DAYS_HE.map((d,i)=>`<option value="${i}" ${l && l.day_of_week === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
            </div>
            <div class="form-field"><label for="f19-start-time-2">שעה</label><input id="f19-start-time-2" name="start_time" type="time" value="${esc(l?.start_time || '')}" /></div>
            <div class="form-field"><label for="f19-duration-minutes-2">משך (דקות)</label><input id="f19-duration-minutes-2" name="duration_minutes" type="number" value="${l?.duration_minutes || 45}" /></div>
          </div>
          <div class="form-field"><label for="f19-audience-2">קהל יעד</label>
            <select id="f19-audience-2" name="audience">
              <option value="men" ${(l?.audience || 'men') === 'men' ? 'selected' : ''}>גברים</option>
              <option value="women" ${l?.audience === 'women' ? 'selected' : ''}>נשים</option>
              <option value="mixed" ${l?.audience === 'mixed' ? 'selected' : ''}>מעורב</option>
            </select>
          </div>
          <div class="form-field"><label for="f19-description-2">תיאור / מהלך השיעור</label><textarea id="f19-description-2" name="description">${esc(l?.description || '')}</textarea></div>
          ${uploadFieldHtml({ id: 'te-lesson-logo', label: 'תמונת השיעור (אופציונלי)', name: 'logo_url', currentUrl: l?.logo_url || '' })}
          <label style="display:flex;gap:16px;">
            <span><input type="checkbox" name="is_live" style="width:auto;" ${l?.is_live ? 'checked' : ''} /> משודר LIVE</span>
            <span><input type="checkbox" name="is_recorded" style="width:auto;" ${l?.is_recorded ? 'checked' : ''} /> מוקלט</span>
          </label>
          <div style="display:flex;gap:10px;margin-top:12px;">
            <button class="btn btn-primary" type="submit">${l ? 'עדכון שיעור' : 'הוספת שיעור'}</button>
            ${l ? '<button class="btn btn-outline" type="button" id="te-lesson-cancel-edit">ביטול עריכה</button>' : ''}
          </div>
        </form>
      </div>
      <div>
        ${data.lessons.map(l => `
          <div class="lesson-row">
            ${logoCircle(l.title, l.logo_url, true)}
            <div class="time-badge">${esc(DAYS_HE[l.day_of_week] ?? '')}<br/>${esc(formatTime(l.start_time))}</div>
            <div style="flex:1;">${esc(l.title)} <span class="muted">${esc(l.topic || '')}</span></div>
            <button class="btn btn-outline btn-sm" data-edit="${l.id}">עריכה</button>
            <button class="btn btn-danger btn-sm" data-del="${l.id}">מחיקה</button>
          </div>`).join('') || '<p class="muted">אין שיעורים עדיין.</p>'}
      </div>
    `;
    wireUploadField({ id: 'te-lesson-logo', uploadUrl: `/api/admin/teacher/${encodeURIComponent(token)}/upload` });
    document.getElementById('te-lesson-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      f.day_of_week = Number(f.day_of_week);
      f.duration_minutes = Number(f.duration_minutes) || 45;
      f.is_live = e.target.is_live.checked;
      f.is_recorded = e.target.is_recorded.checked;
      if (editingLesson) f.id = editingLesson.id;
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/lessons`, { method: 'POST', body: JSON.stringify(f) });
        editingLesson = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('te-lessons-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    const cancelBtn = document.getElementById('te-lesson-cancel-edit');
    if (cancelBtn) cancelBtn.onclick = () => { editingLesson = null; drawLessons(content); };
    content.querySelectorAll('[data-edit]').forEach(btn => btn.onclick = () => {
      editingLesson = data.lessons.find(x => String(x.id) === btn.dataset.edit) || null;
      drawLessons(content);
      document.getElementById('te-lesson-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    content.querySelectorAll('[data-del]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק את השיעור?')) return;
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/lessons/${btn.dataset.del}`, { method: 'DELETE' });
        if (editingLesson && String(editingLesson.id) === btn.dataset.del) editingLesson = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('te-lessons-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawAds(content) {
    const a = editingAd;
    content.innerHTML = `
      <div id="te-ads-alert"></div>
      <div class="card" style="margin-bottom:16px;">
        <h3>${a ? 'עריכת מודעה' : 'מודעה חדשה'}</h3>
        <p class="muted">מודעות מוצגות בדף הציבורי שלך — טוב לפרסום שיעור מיוחד, ספר חדש, אירוע וכו'.</p>
        <form id="te-ad-form">
          <div class="form-field"><label for="f19-title-6">כותרת *</label><input id="f19-title-6" name="title" required value="${esc(a?.title || '')}" /></div>
          <div class="form-field"><label for="f19-body-5">תוכן</label><textarea id="f19-body-5" name="body">${esc(a?.body || '')}</textarea></div>
          ${uploadFieldHtml({ id: 'te-ad-image', label: 'תמונת המודעה (אופציונלי)', name: 'image_url', currentUrl: a?.image_url || '' })}
          <div class="form-field"><label for="f19-link-url-2">קישור (אופציונלי)</label><input id="f19-link-url-2" name="link_url" placeholder="https://" value="${esc(a?.link_url || '')}" /></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-primary" type="submit">${a ? 'עדכון מודעה' : 'פרסום מודעה'}</button>
            ${a ? '<button class="btn btn-outline" type="button" id="te-ad-cancel-edit">ביטול עריכה</button>' : ''}
          </div>
        </form>
      </div>
      <div class="grid">
        ${data.ads.map(a => `
          <div class="card">
            ${a.image_url ? `<img src="${esc(a.image_url)}" alt="" style="width:100%;border-radius:10px;margin-bottom:10px;max-height:160px;object-fit:cover;" />` : ''}
            <div class="row-between"><h3>${esc(a.title)}</h3>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-sm" data-edit-ad="${a.id}">עריכה</button>
                <button class="btn btn-danger btn-sm" data-del-ad="${a.id}">מחיקה</button>
              </div>
            </div>
            <p class="muted">${esc(a.body || '')}</p>
          </div>`).join('') || '<p class="muted">אין מודעות עדיין.</p>'}
      </div>
    `;
    wireUploadField({ id: 'te-ad-image', uploadUrl: `/api/admin/teacher/${encodeURIComponent(token)}/upload` });
    document.getElementById('te-ad-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      if (editingAd) f.id = editingAd.id;
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/ads`, { method: 'POST', body: JSON.stringify(f) });
        editingAd = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('te-ads-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
    const cancelBtn = document.getElementById('te-ad-cancel-edit');
    if (cancelBtn) cancelBtn.onclick = () => { editingAd = null; drawAds(content); };
    content.querySelectorAll('[data-edit-ad]').forEach(btn => btn.onclick = () => {
      editingAd = data.ads.find(x => String(x.id) === btn.dataset.editAd) || null;
      drawAds(content);
      document.getElementById('te-ad-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    content.querySelectorAll('[data-del-ad]').forEach(btn => btn.onclick = async () => {
      if (!confirm('למחוק את המודעה?')) return;
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/ads/${btn.dataset.delAd}`, { method: 'DELETE' });
        if (editingAd && String(editingAd.id) === btn.dataset.delAd) editingAd = null;
        await refresh(); draw();
      } catch (err) {
        document.getElementById('te-ads-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  function drawMessages(content) {
    content.innerHTML = `
      <div id="messages-alert"></div>
      <div class="stack">
        ${data.messages.map(m => `
          <div class="card">
            <div class="row-between">
              <strong>${esc(m.sender_name)}</strong>
              <span class="muted">${new Date(m.created_at).toLocaleString('he-IL')}</span>
            </div>
            <div class="muted">${m.sender_phone ? '☎ ' + esc(m.sender_phone) : ''} ${m.sender_email ? ' · ✉ ' + esc(m.sender_email) : ''}</div>
            <p>${esc(m.body)}</p>
            ${!m.is_read ? `<button class="btn btn-outline btn-sm" data-mark-read="${m.id}">סמן כנקרא</button>` : '<span class="muted">נקרא</span>'}
          </div>`).join('') || '<p class="muted">אין הודעות מלומדים עדיין.</p>'}
      </div>
    `;
    content.querySelectorAll('[data-mark-read]').forEach(btn => btn.onclick = async () => {
      try {
        await api(`/api/admin/teacher/${encodeURIComponent(token)}/messages/${btn.dataset.markRead}/read`, { method: 'POST' });
        await refresh(); draw();
      } catch (err) {
        document.getElementById('messages-alert').innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });
  }

  draw();
}

// ---------------------------------------------------------------------------
// התחברות מאוחדת (אימייל+סיסמה) לכל בעלי התפקידים — גבאי / מגיד שיעור / ארגון / סופר-אדמין
// ---------------------------------------------------------------------------

async function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  const cfg = await api('/api/config');
  if (!window.supabase) throw new Error('ספריית supabase-js לא נטענה');
  supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentSession = session;
  supabaseClient.auth.onAuthStateChange((_event, session) => { currentSession = session; });
  return supabaseClient;
}

async function renderLogin() {
  const client = await ensureSupabaseClient();
  if (!currentSession) return renderLoginForm(client);
  return renderMyEntities(client);
}

function renderLoginForm(client) {
  APP.innerHTML = `
    <div class="stack" style="max-width:420px;margin:40px auto;">
      <h1>כניסת ניהול</h1>
      <p class="muted">לגבאים, מגידי שיעור, ארגונים וסופר-אדמינים — התחברות באימייל וסיסמה.</p>
      <div id="login-alert"></div>
      <form id="login-form" class="card">
        <div class="form-field"><label for="f19-email-5">אימייל</label><input id="f19-email-5" name="email" type="email" required /></div>
        <div class="form-field"><label for="f19-login-form-password">סיסמה</label>${pwField('name="password" required', 'f19-login-form-password')}</div>
        <button class="btn btn-primary" type="submit">התחברות</button>
      </form>
      <p class="muted">עדיין אין לך חשבון? אפשר ליצור אחד דרך <a href="#/join">טופס ההצטרפות</a> (סמנו "גבאי" או "מגיד שיעור").</p>
    </div>
  `;
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    const alertBox = document.getElementById('login-alert');
    const { data, error } = await client.auth.signInWithPassword({ email: fd.email, password: fd.password });
    if (error) { alertBox.innerHTML = `<div class="alert alert-error">${esc(error.message)}</div>`; return; }
    currentSession = data.session;
    renderMyEntities(client);
  });
}

async function renderMyEntities(client) {
  let entities = [];
  let isSuperAdmin = false;
  try { entities = await api('/api/my/entities', { auth: true }); } catch (e) { /* אין קישורים */ }
  try { await api('/api/superadmin/stats', { auth: true }); isSuperAdmin = true; } catch (e) { /* לא סופר-אדמין */ }

  const entityLinks = {
    tenant: id => `#/admin/`, synagogue: id => `#/admin-syn/`, teacher: id => `#/te/`,
  };

  APP.innerHTML = `
    <div style="margin-top:24px;max-width:640px;margin-inline:auto;">
      <div class="row-between">
        <h1>שלום!</h1>
        <button class="btn btn-outline btn-sm" id="logout-btn">התנתקות</button>
      </div>

      ${isSuperAdmin ? `<a class="card card-link" style="display:block;margin-bottom:14px;" href="#/superadmin">
        <h3>פאנל סופר-אדמין ↗</h3><p class="muted">ניהול כלל המערכת: ארגונים, פניות, קישורי תפקידים.</p>
      </a>` : ''}

      ${entities.length ? entities.map(en => `
        <a class="card card-link" style="display:block;margin-bottom:12px;" href="${entityLinks[en.entity_type] ? entityLinks[en.entity_type]() + esc(en.admin_token) : '#/'}">
          <span class="type-tag">${esc(TYPE_LABELS[en.entity_type] || en.entity_type)}</span>
          <h3 style="margin-top:6px;">${esc(en.name || '')}</h3>
          <div class="muted">כניסה לממשק הניהול ↗</div>
        </a>`).join('') : `
        <div class="empty-state">
          החשבון שלך מחובר, אך עדיין לא משויך לאף גוף לניהול.
          אם נרשמת דרך טופס ההצטרפות כגבאי/מגיד שיעור — צוות האיגוד ישייך את החשבון בקרוב.
        </div>`}
    </div>
  `;
  document.getElementById('logout-btn').onclick = async () => {
    await client.auth.signOut();
    currentSession = null;
    router();
  };
}

// ---------------------------------------------------------------------------
// פאנל סופר-אדמין
// ---------------------------------------------------------------------------

async function renderSuperadmin() {
  const client = await ensureSupabaseClient();
  if (!currentSession) return renderLoginForm(client);
  return renderSuperadminDashboard(client);
}

async function renderSuperadminDashboard(client) {
  let stats, tenants, joinRequests, nationalRequests, subscriptionPayments;
  try {
    [stats, tenants, joinRequests, nationalRequests, subscriptionPayments] = await Promise.all([
      api('/api/superadmin/stats', { auth: true }),
      api('/api/superadmin/tenants', { auth: true }),
      api('/api/superadmin/join-requests', { auth: true }),
      api('/api/superadmin/national-requests', { auth: true }),
      api('/api/superadmin/subscription-payments', { auth: true }),
    ]);
  } catch (err) {
    APP.innerHTML = `<div class="alert alert-error">אין הרשאת סופר-אדמין, או שהחיבור פג. (${esc(err.message)})</div>`;
    return;
  }

  function draw() {
    APP.innerHTML = `
      <div style="margin-top:20px;">
        <div class="row-between">
          <h1>פאנל סופר-אדמין</h1>
          <button class="btn btn-outline btn-sm" id="logout-btn">התנתקות</button>
        </div>

        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(140px,1fr));">
          ${statCard('ערים', stats.cities)}
          ${statCard('ארגונים', stats.tenants)}
          ${statCard('בתי כנסת', stats.synagogues)}
          ${statCard('מגידי שיעור', stats.teachers)}
          ${statCard('שיעורים פעילים', stats.lessons)}
          ${statCard('הודעות פתוחות', stats.open_messages)}
        </div>

        <div class="section">
          <h2>ארגון חדש</h2>
          <div id="create-alert"></div>
          <form id="create-form" class="card" style="max-width:560px;">
            <div class="form-row">
              <div class="form-field"><label for="f19-name-6">שם *</label><input id="f19-name-6" name="name" required /></div>
              <div class="form-field"><label for="f19-type">סוג</label>
                <select id="f19-type" name="type"><option value="organization">ארגון</option><option value="yeshiva">ישיבה</option></select>
              </div>
            </div>
            <div class="form-field"><label for="f19-city-3">עיר *</label><input id="f19-city-3" name="city" placeholder="עיר" required /></div>
            <div class="form-row">
              <div class="form-field"><label for="f19-contact-email-2">אימייל</label><input id="f19-contact-email-2" name="contact_email" /></div>
              <div class="form-field"><label for="f19-contact-phone-3">טלפון</label><input id="f19-contact-phone-3" name="contact_phone" /></div>
            </div>
            <button class="btn btn-accent" type="submit">יצירה</button>
          </form>
          <div id="new-tenant-links"></div>
        </div>

        <div class="section">
          <h2>כל הארגונים</h2>
          <table>
            <thead><tr><th>שם</th><th>עיר</th><th>סטטוס</th><th>ציבורי</th><th>קישורים</th></tr></thead>
            <tbody>
              ${tenants.map(t => `
                <tr>
                  <td>${esc(t.name)}</td>
                  <td>${esc(t.city)}</td>
                  <td><button class="btn btn-outline btn-sm" data-toggle-status="${t.id}" data-status="${t.status}">${t.status === 'active' ? 'פעיל' : 'מושבת'}</button></td>
                  <td><button class="btn btn-outline btn-sm" data-toggle-public="${t.id}" data-public="${t.is_public}">${t.is_public ? 'מוצג' : 'מוסתר'}</button></td>
                  <td class="muted">
                    <a href="#/t/${esc(t.public_token)}" target="_blank">ציבורי↗</a> ·
                    <a href="#/admin/${esc(t.admin_token)}" target="_blank">ניהול↗</a>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>תשלומי מנוי לאיגוד (נדרים פלוס)</h2>
          <div id="subpay-alert"></div>
          <form id="subpay-form" class="card" style="max-width:560px;">
            <div class="form-row">
              <div class="form-field"><label for="f19-tenant-id">ארגון *</label>
                <select id="f19-tenant-id" name="tenant_id" required>${tenants.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
              </div>
              <div class="form-field"><label for="f19-amount-2">סכום (₪) *</label><input id="f19-amount-2" name="amount" type="number" min="1" step="1" required /></div>
            </div>
            <div class="form-row">
              <div class="form-field"><label for="f19-payment-type">סוג תשלום</label>
                <select id="f19-payment-type" name="payment_type"><option value="one_time">חד פעמי</option><option value="monthly">מנוי חודשי</option></select>
              </div>
              <div class="form-field"><label for="f19-notes">הערה</label><input id="f19-notes" name="notes" placeholder="לדוגמה: דמי הצטרפות 2026" /></div>
            </div>
            <button class="btn btn-accent" type="submit">יצירת בקשת תשלום</button>
          </form>
          <table style="margin-top:14px;">
            <thead><tr><th>ארגון</th><th>סכום</th><th>סוג</th><th>סטטוס</th><th>נוצר</th></tr></thead>
            <tbody>
              ${subscriptionPayments.map(p => `
                <tr>
                  <td>${esc(p.tenant_name)}</td>
                  <td>${p.currency === 'USD' ? '$' : '₪'}${Number(p.amount).toLocaleString('he-IL')}</td>
                  <td>${p.payment_type === 'monthly' ? 'מנוי חודשי' : 'חד פעמי'}</td>
                  <td>${p.status === 'paid' ? '<span style="color:#2e7d32;">שולם ✓</span>' : 'ממתין'}</td>
                  <td class="muted">${new Date(p.created_at).toLocaleDateString('he-IL')}</td>
                </tr>`).join('') || '<tr><td colspan="5" class="muted">אין בקשות תשלום עדיין.</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>פניות הצטרפות (ארגונים/בתי כנסת)</h2>
          <div class="stack">
            ${joinRequests.map(j => `
              <div class="card">
                <div class="row-between"><strong>${esc(j.sender_name)}</strong><span class="muted">${new Date(j.created_at).toLocaleString('he-IL')}</span></div>
                <div class="muted">${esc(j.city || '')} ${j.subject ? '· ' + esc(j.subject) : ''} ${j.sender_phone ? '· ☎ ' + esc(j.sender_phone) : ''} ${j.sender_email ? '· ✉ ' + esc(j.sender_email) : ''}</div>
                <p>${esc(j.body)}</p>
              </div>`).join('') || '<p class="muted">אין פניות חדשות.</p>'}
          </div>
        </div>

        <div class="section">
          <h2>פניות ארציות (שיעור בהתאמה אישית / הצטרפות כמגיד שיעור)</h2>
          <div class="stack">
            ${nationalRequests.map(n => `
              <div class="card">
                <div class="row-between">
                  <strong>${esc(n.full_name)}</strong>
                  <span class="muted">${new Date(n.created_at).toLocaleString('he-IL')}</span>
                </div>
                <div class="muted">
                  ${n.request_type === 'custom_lesson' ? 'שיעור בהתאמה אישית' : 'הצטרפות כמגיד שיעור'}
                  ${n.role ? ' · תפקיד: ' + esc(ROLE_LABELS[n.role] || n.role) : ''}
                  ${n.city ? ' · ' + esc(n.city) : ''}
                  ${n.email ? ' · ✉ ' + esc(n.email) : ''}
                  ${n.phone ? ' · ☎ ' + esc(n.phone) : ''}
                </div>
                ${n.topic ? `<div class="muted">נושא: ${esc(n.topic)}</div>` : ''}
                ${n.topics && n.topics.length ? `<div>${n.topics.map(x => `<span class="chip">${esc(x)}</span>`).join('')}</div>` : ''}
                ${n.notes ? `<p>${esc(n.notes)}</p>` : ''}
                ${n.wants_login ? `<div class="muted">🔑 ביקש/ה גישה לניהול${n.email ? ' (' + esc(n.email) + ')' : ''}</div>
                  <form class="link-form" data-req-id="${n.id}" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;align-items:center;">
                    <select name="entity_type">
                      <option value="tenant">ארגון</option>
                      <option value="synagogue">בית כנסת</option>
                      <option value="teacher">מגיד שיעור</option>
                    </select>
                    <input name="entity_id" placeholder="מזהה (id) של הגוף" style="flex:1;min-width:180px;" />
                    <button class="btn btn-outline btn-sm" type="submit">קישור חשבון</button>
                  </form>` : ''}
                <div style="margin-top:8px;">
                  <span class="muted">סטטוס: ${esc(n.status)}</span>
                  <button class="btn btn-outline btn-sm" data-nr-status="${n.id}" data-next="contacted" style="margin-inline-start:8px;">סמן כ"נוצר קשר"</button>
                  <button class="btn btn-outline btn-sm" data-nr-status="${n.id}" data-next="closed">סגור</button>
                </div>
              </div>`).join('') || '<p class="muted">אין פניות חדשות.</p>'}
          </div>
        </div>
      </div>
    `;

    document.getElementById('logout-btn').onclick = async () => {
      await client.auth.signOut();
      currentSession = null;
      router();
    };

    document.getElementById('create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(e.target));
      const alertBox = document.getElementById('create-alert');
      try {
        const created = await api('/api/superadmin/tenants', { method: 'POST', auth: true, body: JSON.stringify(body) });
        document.getElementById('new-tenant-links').innerHTML = `
          <div class="alert alert-success">
            נוצר בהצלחה! קישורים לשליחה:<br/>
            ציבורי: <code>#/t/${esc(created.public_token)}</code><br/>
            ניהול: <code>#/admin/${esc(created.admin_token)}</code>
          </div>`;
        tenants.push(created);
        stats.tenants += 1;
        draw();
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
      }
    });

    document.querySelectorAll('[data-toggle-status]').forEach(btn => btn.onclick = async () => {
      const newStatus = btn.dataset.status === 'active' ? 'inactive' : 'active';
      await api(`/api/superadmin/tenants/${btn.dataset.toggleStatus}`, { method: 'PATCH', auth: true, body: JSON.stringify({ status: newStatus }) });
      const t = tenants.find(x => x.id === btn.dataset.toggleStatus);
      if (t) t.status = newStatus;
      draw();
    });

    document.querySelectorAll('[data-toggle-public]').forEach(btn => btn.onclick = async () => {
      const newVal = btn.dataset.public !== 'true';
      await api(`/api/superadmin/tenants/${btn.dataset.togglePublic}`, { method: 'PATCH', auth: true, body: JSON.stringify({ is_public: newVal }) });
      const t = tenants.find(x => x.id === btn.dataset.togglePublic);
      if (t) t.is_public = newVal;
      draw();
    });

    document.querySelectorAll('.link-form').forEach(form => form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const req = nationalRequests.find(x => x.id === e.target.dataset.reqId);
      try {
        await api('/api/superadmin/role-links', {
          method: 'POST', auth: true,
          body: JSON.stringify({ email: req.email, entity_type: fd.entity_type, entity_id: fd.entity_id }),
        });
        alert('הקישור בוצע בהצלחה.');
      } catch (err) {
        alert('שגיאה: ' + err.message);
      }
    }));

    document.querySelectorAll('[data-nr-status]').forEach(btn => btn.onclick = async () => {
      await api(`/api/superadmin/national-requests/${btn.dataset.nrStatus}`, { method: 'PATCH', auth: true, body: JSON.stringify({ status: btn.dataset.next }) });
      const n = nationalRequests.find(x => x.id === btn.dataset.nrStatus);
      if (n) n.status = btn.dataset.next;
      draw();
    });

    document.getElementById('subpay-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target));
      const alertBox = document.getElementById('subpay-alert');
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      try {
        await api('/api/superadmin/subscription-payments', {
          method: 'POST', auth: true,
          body: JSON.stringify({ tenant_id: fd.tenant_id, amount: Number(fd.amount), payment_type: fd.payment_type, notes: fd.notes || null }),
        });
        subscriptionPayments = await api('/api/superadmin/subscription-payments', { auth: true });
        alertBox.innerHTML = '<div class="alert alert-success">בקשת התשלום נוצרה — הארגון יראה כפתור תשלום בממשק הניהול שלו (טאב "סליקה ותרומות").</div>';
        draw();
      } catch (err) {
        alertBox.innerHTML = `<div class="alert alert-error">${esc(err.message)}</div>`;
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function statCard(label, value) {
    return `<div class="card" style="text-align:center;"><div style="font-size:1.6rem;font-weight:800;color:var(--color-primary);">${value}</div><div class="muted">${esc(label)}</div></div>`;
  }

  draw();
}

// ---------------------------------------------------------------------------
// אתחול
// ---------------------------------------------------------------------------

(async function init() {
  try { await ensureSupabaseClient(); } catch (e) { console.warn('supabase init skipped:', e.message); }
  router();
})();
