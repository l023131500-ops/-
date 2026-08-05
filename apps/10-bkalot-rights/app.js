/* App — UI wiring for the rights-check site (v2: 74-Q questionnaire, tiered results, lead capture) */
let MASTER = null;
let LAST_OUTPUT = null;   // last recommendation result (for lead payload)
let LAST_ANSWERS = null;

/* ---------- Config ---------- */
/* כתובת אתר השוואות המחירים.
 *
 * ⚠️ ההערה כאן הייתה "כשיעלה לאוויר, מלאו כאן את הכתובת", והערך נשאר ריק —
 * אבל האתר **כבר באוויר**: מערכת 27, "השוואת מחירים בקלות", חיה וציבורית
 * ב-‎/mechiron‎. כלומר הכפתור הבולט "כניסה לאתר השוואות המחירים" ישב בעמוד
 * חי ולא עשה כלום, בזמן שהיעד שלו קיים ועובד.
 *
 * זה לא נראה שבור: הכפתור מוצג, נלחץ, ופשוט לא קורה דבר. אין 404 ואין שגיאת
 * קונסולה — ולכן שום בדיקת נכסים או סטטוס לא הייתה תופסת את זה. רק בדיקה
 * ששואלת "לאן הקישורים באמת מובילים" מוצאת אותו (scripts/qa/stray-links.mjs).
 */
const PRICES_URL = 'https://more30.com/mechiron';
/* כתובת אתר הניהול (Admin).
 *
 * ⚠️ עד עכשיו הקישור "ניהול" בסרגל הניווט הצביע לכתובת ארגז-חול של
 * perplexity.ai. זה היה חי בפרודקשן: כל מבקר באתר ציבורי שלוחץ "ניהול" נשלח
 * לעמוד AI של צד שלישי. זו לא הייתה הרשאה שנשברה אלא **קישור שלא הוביל
 * לשום מערכת ניהול**, ולכן "כולל כניסה לניהול" לא התקיים בפועל.
 *
 * למערכת הזאת אין אפליקציית ניהול משלה — היא אתר סטטי מעל מאגר הזכויות
 * המשותף. לכן היעד הנכון הוא מרכז השליטה של הפלטפורמה, שם באמת מנהלים
 * אותה. הוא מסנן בעצמו: מי שאינו סופר-אדמין מקבל שם מסך הסבר ולא תוכן,
 * וזו בדיוק ההתנהגות של שאר מסכי הניהול ב-more30.
 *
 * לא נגענו ב-08/09 המוגנות — הן מערכות אחרות לגמרי.
 */
const ADMIN_URL = 'https://more30.com/admin';

/* Supabase — לכידת לידים (anon key, מותר INSERT בלבד לטבלת zr_leads) */
const SUPABASE_URL = 'https://bieebmnmkffwbqlsfozh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWVibW5ta2Zmd2JxbHNmb3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MDc0NDIsImV4cCI6MjA5NDI4MzQ0Mn0.QIo-mnp3yuUIfh6R8nbT3SOLX_6aRsZ-FWOpEMgoUww';

const SRC_LABEL = { bklot: 'בקלות', fund: 'קופה', gov: 'ממשלה', ngo: 'עמותה' };
const LIKE_LABEL = { high: 'גבוה', medium: 'בינוני', low: 'נמוך' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Questionnaire render (from data.json) ---------- */
function questionnaire() {
  return (MASTER && MASTER.questionnaire) ? MASTER.questionnaire : { sections: [] };
}

function buildForm() {
  const form = document.getElementById('qform');
  const q = questionnaire();
  let html = '';
  for (const sec of q.sections) {
    const optional = sec.optional_flag ? ' qsec-optional' : '';
    html += `<fieldset class="qsec${optional}" data-sec="${esc(sec.id)}"><legend>${esc(sec.title)}</legend><div class="qgrid">`;
    for (const qq of sec.questions) {
      const showIf = qq.show_if ? ` data-showif="${esc(qq.show_if)}"` : '';
      const hidden = qq.show_if ? ' hidden' : '';
      html += `<div class="qfield${hidden ? ' qhidden' : ''}" data-qid="${esc(qq.id)}"${showIf}>`;
      html += `<label for="${esc(qq.id)}">${esc(qq.label)}</label>`;
      if (qq.type === 'select') {
        const opts = ['', ...(qq.options || [])];
        html += `<select id="${esc(qq.id)}" name="${esc(qq.id)}">` +
          opts.map(o => `<option value="${esc(o)}">${o ? esc(o) : '— בחרו —'}</option>`).join('') + `</select>`;
      } else if (qq.type === 'boolean') {
        html += `<label class="switch"><input type="checkbox" id="${esc(qq.id)}" name="${esc(qq.id)}"><span class="track"></span><span class="switch-lbl">כן</span></label>`;
      } else {
        const attrs = qq.type === 'number'
          ? `type="number" inputmode="numeric" ${qq.min != null ? `min="${qq.min}"` : ''} ${qq.max != null ? `max="${qq.max}"` : ''}`
          : 'type="text"';
        html += `<input ${attrs} id="${esc(qq.id)}" name="${esc(qq.id)}" placeholder="${esc(qq.placeholder || '')}">`;
      }
      html += `</div>`;
    }
    html += `</div></fieldset>`;
  }
  form.innerHTML = html;

  // wire conditional visibility
  form.addEventListener('input', updateConditional);
  form.addEventListener('change', updateConditional);
  updateConditional();
}

function readAnswers() {
  const a = {};
  const q = questionnaire();
  for (const sec of q.sections) {
    for (const qq of sec.questions) {
      const el = document.getElementById(qq.id);
      if (!el) continue;
      if (qq.type === 'boolean') a[qq.id] = el.checked;
      else if (qq.type === 'number') a[qq.id] = el.value === '' ? '' : Number(el.value);
      else a[qq.id] = el.value;
    }
  }
  // set health flag from the opt-in question
  if (a.want_health_check === true) a.has_health_flag = true;
  return a;
}

/* Show/hide conditional (show_if) questions using the engine's evaluator */
function updateConditional() {
  const a = readAnswers();
  document.querySelectorAll('.qfield[data-showif]').forEach(field => {
    const cond = field.getAttribute('data-showif');
    let show = false;
    try { show = window.RightsEngine.evalCondition(cond, a); } catch (e) { show = false; }
    field.classList.toggle('qhidden', !show);
    if (show) field.removeAttribute('hidden'); else field.setAttribute('hidden', '');
  });
}

/* ---------- Results render ---------- */
function recCard(r) {
  const prioClass = { must: 'p-must', recommended: 'p-rec', tip: 'p-tip' }[r.priority] || '';
  let tiers = '';
  if (r.source === 'fund' && r.your_fund_tiers && r.your_fund_tiers.length) {
    tiers = `<div class="rec-tiers"><strong>בקופה שלכם:</strong> ${r.your_fund_tiers.map(t => `<span class="tier-chip">${esc(t.t)}</span>`).join(' ')}</div>`;
  } else if (r.source === 'fund' && r.best_fund) {
    tiers = `<div class="rec-tiers"><strong>הקופה המשתלמת:</strong> ${esc(r.best_fund)}</div>`;
  }
  return `<div class="rec-card ${prioClass}" data-uid="${r.uid}">
    <div class="rec-head">
      <span class="rec-src src-${r.source}">${SRC_LABEL[r.source] || r.source}</span>
      <span class="rec-like like-${r.likelihood}">סיכוי ${LIKE_LABEL[r.likelihood] || ''}</span>
    </div>
    <h4 class="rec-name">${esc(r.name)}</h4>
    ${r.amount ? `<div class="rec-amt">${esc(r.amount)}</div>` : ''}
    ${r.why ? `<p class="rec-why">${esc(r.why)}</p>` : ''}
    <div class="rec-prov">ממי מקבלים: ${esc(r.provider) || '—'}</div>
    ${tiers}
    <button class="rec-detail" data-uid="${r.uid}">פרטים מלאים ←</button>
  </div>`;
}

/* CTA + lead capture card, appended at the end of each results section */
function ctaBlock(context) {
  return `<div class="lead-cta">
    <div class="lead-cta-inner">
      <svg width="46" height="46" viewBox="0 0 48 48" fill="none" class="lead-cta-logo" aria-hidden="true">
        <rect x="3" y="3" width="42" height="42" rx="11" stroke="currentColor" stroke-width="2.5"/>
        <path d="M15 24 L21 30 L33 17" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <div class="lead-cta-text">
        <h3>מסתבכים עם הבירוקרטיה? קבלו את המידע המדויק והמעודכן — ללא עלות</h3>
        <p>השאירו פרטים והצוות שלנו ב<strong>בקלות</strong> יבצע עבורכם את הפעולות ויפנה אתכם לגורמי המקצוע בכל תחום — באמינות, מקצועיות ואדיבות. תקבלו את המידע המדויק והמעודכן על הזכויות שמתאימות לכם, כולל תזכורת אישית לביצוע המשימה — בלי לפספס.</p>
      </div>
      <button class="btn-primary lead-cta-btn" data-ctx="${esc(context || '')}">קבלו את הפרטים והתזכורת ←</button>
    </div>
  </div>`;
}

function renderResults(out) {
  const wrap = document.getElementById('resultsInner');
  const s = out.summary;
  let html = `<h2>הרשימה המותאמת אישית שלכם</h2>`;

  html += `<div class="res-sit">המצבים שזוהו: ${out.situation_labels.map(l => `<span class="sit-chip">${esc(l)}</span>`).join('')}</div>`;

  html += `<div class="res-summary">
    <div class="rs-box rs-must"><span class="rs-num">${s.must_check}</span><span class="rs-lbl">חובה לבדוק</span></div>
    <div class="rs-box rs-rec"><span class="rs-num">${s.recommended}</span><span class="rs-lbl">מומלץ לבדוק</span></div>
    <div class="rs-box rs-tip"><span class="rs-num">${s.tips}</span><span class="rs-lbl">טיפים לשיפור</span></div>
    <div class="rs-box rs-health"><span class="rs-num">${s.health_benefits}</span><span class="rs-lbl">הטבות בריאות</span></div>
  </div>`;

  // Personalized rule notes (from answer rules) — high-signal, show first
  if (out.rule_notes && out.rule_notes.length) {
    html += `<div class="rule-notes"><h3>מותאם בדיוק לתשובות שלכם</h3><div class="rn-grid">` +
      out.rule_notes.map(n => `<div class="rn-card rn-${n.priority}">
        <div class="rn-head"><span class="rn-topic">${esc(n.topic)}</span><span class="rec-like like-${n.likelihood}">סיכוי ${LIKE_LABEL[n.likelihood] || ''}</span></div>
        <p>${esc(n.text)}</p>
        ${n.source ? `<a href="${esc(n.source)}" target="_blank" rel="noopener" class="rn-src">למקור הרשמי ←</a>` : ''}
      </div>`).join('') + `</div></div>`;
  }

  if (out.wage_notes.length) {
    html += `<div class="wage-notes"><h3>המלצות לפי השכר וההכנסה שלכם</h3><ul>` +
      out.wage_notes.map(n => `<li>${esc(n)}</li>`).join('') + `</ul></div>`;
  }

  // Tiered blocks. Each priority bucket shows main-tier first, then a collapsible "more".
  const block = (title, arr, cls, ctxLabel) => {
    if (!arr.length) return '';
    const mainItems = arr.filter(r => r.tier === 'main');
    const moreItems = arr.filter(r => r.tier !== 'main');
    let inner = `<div class="rec-grid">${mainItems.map(recCard).join('')}</div>`;
    if (moreItems.length) {
      inner += `<details class="more-details"><summary>עוד ${moreItems.length} נושאים לבדיקה (${title}) ▾</summary>
        <div class="rec-grid">${moreItems.map(recCard).join('')}</div></details>`;
    }
    // CTA at the end of each topic block
    inner += ctaBlock(ctxLabel);
    return `<div class="res-block ${cls}"><h3>${title} <span class="blk-count">${arr.length}</span></h3>${inner}</div>`;
  };
  html += block('חובה לבדוק', out.must_check, 'b-must', 'חובה לבדוק');
  html += block('מומלץ לבדוק', out.recommended, 'b-rec', 'מומלץ לבדוק');
  html += block('טיפים לשיפור המצב', out.tips, 'b-tip', 'טיפים לשיפור');
  if (out.health_benefits.length) {
    html += `<div class="res-block b-health"><h3>הטבות קופת החולים והבריאות שלכם <span class="blk-count">${out.health_benefits.length}</span></h3>
      <div class="rec-grid">${out.health_benefits.slice(0, 8).map(recCard).join('')}</div>
      ${out.health_benefits.length > 8 ? `<details class="more-details"><summary>עוד ${out.health_benefits.length - 8} הטבות בריאות ▾</summary><div class="rec-grid">${out.health_benefits.slice(8).map(recCard).join('')}</div></details>` : ''}
      ${ctaBlock('הטבות בריאות')}</div>`;
  }

  // Referral to special situations
  if (out.referral_note) {
    html += `<div class="referral-note">💡 ${esc(out.referral_note)}</div>`;
  }

  html += `<div class="res-actions"><button id="printRes" class="btn-ghost">הדפסה / שמירה כ-PDF</button> <button id="jsonRes" class="btn-ghost">הצג JSON (לסוכן ה-API)</button></div>`;
  html += `<pre id="jsonOut" class="json-out hidden"></pre>`;

  wrap.innerHTML = html;
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

  document.getElementById('printRes').onclick = () => window.print();
  document.getElementById('jsonRes').onclick = () => {
    const j = document.getElementById('jsonOut');
    j.classList.toggle('hidden');
    if (!j.textContent) j.textContent = JSON.stringify(out, null, 2);
  };
  wrap.querySelectorAll('.rec-detail').forEach(b => b.onclick = () => openModal(b.dataset.uid));
  wrap.querySelectorAll('.lead-cta-btn').forEach(b => b.onclick = () => openLeadForm(b.dataset.ctx));
}

/* ---------- Lead capture ---------- */
function openLeadForm(context) {
  const c = document.getElementById('leadContent');
  c.innerHTML = `
    <div class="lead-head">
      <svg width="52" height="52" viewBox="0 0 48 48" fill="none" style="color:var(--teal)" aria-hidden="true">
        <rect x="3" y="3" width="42" height="42" rx="11" stroke="currentColor" stroke-width="2.5"/>
        <path d="M15 24 L21 30 L33 17" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <h3>קבלת המידע המדויק והמעודכן — ללא עלות</h3>
      <p class="lead-sub">צוות בקלות יחזור אליכם עם המידע המלא על הזכויות שמתאימות לכם, ותזכורת אישית לביצוע. ללא עלות וללא התחייבות.</p>
    </div>
    <form id="leadForm" class="lead-form">
      <div class="lead-field"><label for="lf_name">שם מלא</label><input type="text" id="lf_name" required autocomplete="name" placeholder="השם שלכם"></div>
      <div class="lead-field"><label for="lf_phone">טלפון</label><input type="tel" id="lf_phone" required autocomplete="tel" inputmode="tel" placeholder="050-0000000"></div>
      <div class="lead-field"><label for="lf_email">אימייל</label><input type="email" id="lf_email" autocomplete="email" placeholder="name@example.com (אופציונלי)"></div>
      <label class="lead-consent"><input type="checkbox" id="lf_consent" checked> אני מאשר/ת שצוות בקלות ייצור איתי קשר עם המידע והתזכורת</label>
      <button type="submit" class="btn-primary lead-submit">שלחו לי את הפרטים והתזכורת ←</button>
      <div id="lf_msg" class="lead-msg"></div>
    </form>`;
  document.getElementById('leadModal').classList.remove('hidden');

  document.getElementById('leadForm').onsubmit = async (e) => {
    e.preventDefault();
    const msg = document.getElementById('lf_msg');
    const name = document.getElementById('lf_name').value.trim();
    const phone = document.getElementById('lf_phone').value.trim();
    const email = document.getElementById('lf_email').value.trim();
    const consent = document.getElementById('lf_consent').checked;
    if (!name || !phone) { msg.textContent = 'נא למלא שם וטלפון.'; msg.className = 'lead-msg err'; return; }
    if (!consent) { msg.textContent = 'יש לאשר יצירת קשר כדי שנוכל לחזור אליכם.'; msg.className = 'lead-msg err'; return; }
    const btn = e.target.querySelector('.lead-submit');
    btn.disabled = true; btn.textContent = 'שולח...';
    const ok = await submitLead({ name, phone, email, context });
    if (ok) {
      document.getElementById('leadContent').innerHTML = `
        <div class="lead-success">
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none" style="color:var(--tip)" aria-hidden="true">
            <circle cx="24" cy="24" r="21" stroke="currentColor" stroke-width="2.5"/>
            <path d="M15 24 L21 30 L33 17" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3>הפרטים נשלחו בהצלחה</h3>
          <p>צוות בקלות יחזור אליכם בהקדם עם המידע המדויק והמעודכן, ותזכורת אישית לביצוע. תודה שבחרתם בבקלות.</p>
        </div>`;
    } else {
      msg.textContent = 'אירעה שגיאה בשליחה. נסו שוב או פנו אלינו ישירות.';
      msg.className = 'lead-msg err';
      btn.disabled = false; btn.textContent = 'שלחו לי את הפרטים והתזכורת ←';
    }
  };
}

async function submitLead({ name, phone, email, context }) {
  const payload = {
    full_name: name,
    phone: phone,
    email: email || null,
    situation_code: (LAST_OUTPUT && LAST_OUTPUT.situations && LAST_OUTPUT.situations[0]) || null,
    answers: LAST_ANSWERS || {},
    recommendations_count: LAST_OUTPUT ? (LAST_OUTPUT.summary.total_recommendations || 0) : 0,
    source_page: 'catalog_questionnaire' + (context ? (':' + context) : ''),
    status: 'new',
  };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/zr_leads`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    return res.ok || res.status === 201;
  } catch (e) {
    return false;
  }
}

/* ---------- Modal (topic detail) ---------- */
function openModal(uid) {
  const t = MASTER.catalog[uid];
  if (!t) return;
  let tiersHtml = '';
  if (t.src === 'fund' && t.ft) {
    const fundNames = { clalit: 'כללית', maccabi: 'מכבי', meuhedet: 'מאוחדת', leumit: 'לאומית' };
    tiersHtml = '<div class="modal-funds"><h4>השוואה בין הקופות</h4>';
    for (const [fk, arr] of Object.entries(t.ft)) {
      tiersHtml += `<div class="mf-fund"><strong>${fundNames[fk] || fk}</strong>`;
      arr.forEach(x => { tiersHtml += `<div class="mf-tier"><span class="tier-chip">${esc(x.t)}</span> ${esc(x.v)}</div>`; });
      tiersHtml += '</div>';
    }
    tiersHtml += '</div>';
  }
  // links: array of {label,url} in v2, or legacy string
  let links = [];
  if (Array.isArray(t.links)) links = t.links;
  else if (typeof t.links === 'string') {
    links = t.links.split(/\s+/).filter(u => u.startsWith('http')).map(u => ({ label: 'קישור רשמי', url: u }));
  }
  const sec = (label, val) => val ? `<div class="modal-sec"><h4>${label}</h4><p>${esc(val).replace(/\n/g, '<br>')}</p></div>` : '';
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-head"><span class="rec-src src-${t.src}">${SRC_LABEL[t.src] || t.src}</span>
      <span class="rec-like like-${t.like}">סיכוי ${LIKE_LABEL[t.like] || ''}</span></div>
    <h3>${esc(t.name)}</h3>
    ${t.amt ? `<div class="rec-amt big">${esc(t.amt)}</div>` : ''}
    ${t.why ? `<p class="modal-lead">${esc(t.why)}</p>` : ''}
    <div class="modal-meta"><strong>קטגוריה:</strong> ${esc(t.cat) || '—'}</div>
    <div class="modal-meta"><strong>ממי מקבלים:</strong> ${esc(t.prov) || '—'}</div>
    ${sec('מה מקבלים', t.benefit)}
    ${sec('תנאי זכאות', t.conditions)}
    ${sec('איך מגישים', t.how)}
    ${sec('מסמכים נדרשים', t.documents)}
    ${t.tip ? `<div class="modal-tip"><strong>טיפ:</strong> ${esc(t.tip).replace(/\n/g, '<br>')}</div>` : ''}
    ${tiersHtml}
    ${links.length ? `<div class="modal-links">${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ←</a>`).join('')}</div>` : ''}`;
  document.getElementById('modal').classList.remove('hidden');
}

/* ---------- Catalog ---------- */
let catRows = [], catShown = 0;
function buildCatalogIndex() {
  catRows = Object.entries(MASTER.catalog).map(([uid, t]) => ({ uid, ...t }))
    .sort((a, b) => (parseInt(a.no) || 99999) - (parseInt(b.no) || 99999));
}
function filterCatalog() {
  const q = document.getElementById('catSearch').value.trim().toLowerCase();
  const src = document.getElementById('catSrc').value;
  const prio = document.getElementById('catPrio').value;
  return catRows.filter(t => {
    if (src && t.src !== src) return false;
    if (prio && t.prio !== prio) return false;
    if (q) {
      const hay = (t.name + ' ' + t.prov + ' ' + t.no + ' ' + t.cat).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function renderCatalog(reset = true) {
  const list = document.getElementById('catList');
  const filtered = filterCatalog();
  if (reset) { catShown = 0; list.innerHTML = ''; }
  const slice = filtered.slice(catShown, catShown + 30);
  list.insertAdjacentHTML('beforeend', slice.map(t => `
    <div class="cat-row" data-uid="${t.uid}">
      <span class="cat-src src-${t.src}">${SRC_LABEL[t.src] || t.src}</span>
      <span class="cat-name">${esc(t.name)}</span>
      <span class="cat-prov">${esc(t.prov)}</span>
      <span class="cat-amt">${esc(t.amt)}</span>
    </div>`).join(''));
  catShown += slice.length;
  document.getElementById('catCount').textContent = `מציג ${Math.min(catShown, filtered.length)} מתוך ${filtered.length} נושאים`;
  document.getElementById('catMore').style.display = catShown < filtered.length ? 'inline-block' : 'none';
  list.querySelectorAll('.cat-row').forEach(r => r.onclick = () => openModal(r.dataset.uid));
}

/* ---------- Funds compare ---------- */
function buildFundSelect() {
  const sel = document.getElementById('fundTopic');
  const funds = Object.entries(MASTER.catalog).filter(([_, t]) => t.src === 'fund' && t.ft)
    .sort((a, b) => (parseInt(a[1].no) || 0) - (parseInt(b[1].no) || 0));
  if (!funds.length) {
    // no per-fund tier data in this dataset — hide the funds section gracefully
    const section = document.getElementById('funds');
    if (section) section.style.display = 'none';
    return;
  }
  sel.innerHTML = funds.map(([uid, t]) => `<option value="${uid}">${esc(t.name)}</option>`).join('');
  sel.onchange = () => renderFundCompare(sel.value);
  renderFundCompare(funds[0][0]);
}
function renderFundCompare(uid) {
  const t = MASTER.catalog[uid];
  const box = document.getElementById('fundCompare');
  if (!t || !t.ft) { box.innerHTML = ''; return; }
  const fundNames = { clalit: 'כללית', maccabi: 'מכבי', meuhedet: 'מאוחדת', leumit: 'לאומית' };
  let html = `<div class="fc-best">הקופה המשתלמת: <strong>${esc(t.best) || '—'}</strong></div><div class="fc-grid">`;
  for (const fk of ['clalit', 'maccabi', 'meuhedet', 'leumit']) {
    const arr = t.ft[fk] || [];
    html += `<div class="fc-col"><h4>${fundNames[fk]}</h4>`;
    if (!arr.length) html += `<div class="fc-empty">אין מידע ספציפי</div>`;
    else arr.forEach(x => html += `<div class="fc-tier"><span class="tier-chip">${esc(x.t)}</span><p>${esc(x.v)}</p></div>`);
    html += `</div>`;
  }
  html += `</div>`;
  box.innerHTML = html;
}

/* ---------- Counters ---------- */
function animateCounters() {
  document.querySelectorAll('.num[data-count]').forEach(el => {
    const target = +el.dataset.count; const dur = 1200; const t0 = performance.now();
    function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('he-IL');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ---------- Init ---------- */
async function init() {
  /* המאגר המרכזי קודם, data.json כגיבוי. הגיבוי אינו "מקרה קצה" אלא מסלול
     שווה-ערך: אם המאגר לא זמין, האתר עובד בדיוק כמו קודם. */
  MASTER = null;
  if (window.RightsRepo) {
    try { MASTER = await window.RightsRepo.load(); }
    catch (e) { console.warn('[rights] המאגר המרכזי לא נטען, נופל ל-data.json:', e.message); }
  }
  if (!MASTER) {
    try {
      const res = await fetch('data.json');
      MASTER = await res.json();
    } catch (e) {
      document.getElementById('catCount').textContent = 'שגיאה בטעינת הנתונים';
      return;
    }
  }
  buildForm();
  buildCatalogIndex();
  renderCatalog();
  buildFundSelect();

  document.getElementById('runBtn').onclick = () => {
    LAST_ANSWERS = readAnswers();
    LAST_OUTPUT = window.RightsEngine.recommend(LAST_ANSWERS, MASTER);
    renderResults(LAST_OUTPUT);
  };
  ['catSearch', 'catSrc', 'catPrio'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => renderCatalog(true));
  });
  document.getElementById('catMore').onclick = () => renderCatalog(false);
  document.getElementById('modalClose').onclick = () => document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal').onclick = (e) => { if (e.target.id === 'modal') e.target.classList.add('hidden'); };
  document.getElementById('leadClose').onclick = () => document.getElementById('leadModal').classList.add('hidden');
  document.getElementById('leadModal').onclick = (e) => { if (e.target.id === 'leadModal') e.target.classList.add('hidden'); };

  // Admin link
  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.href = ADMIN_URL;

  // Prices teaser button
  const pricesBtn = document.getElementById('pricesBtn');
  if (pricesBtn) {
    pricesBtn.onclick = (e) => {
      e.preventDefault();
      if (PRICES_URL) { window.open(PRICES_URL, '_blank'); return; }
      document.getElementById('modalContent').innerHTML =
        '<div style="text-align:center;padding:12px 4px">' +
        '<svg width="64" height="64" viewBox="0 0 48 48" fill="none" style="color:var(--teal);margin-bottom:14px"><rect x="3" y="3" width="42" height="42" rx="11" stroke="currentColor" stroke-width="2.5"/><path d="M15 24 L21 30 L33 17" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '<h3 style="margin-bottom:10px">השוואות מחירים מבית בקלות</h3>' +
        '<p style="color:var(--muted);line-height:1.7">אנחנו בונים עבורכם את מערכת השוואת המחירים — על כל המוצרים, בכל הרשתות. <strong>האתר יעלה לאוויר בקרוב.</strong></p>' +
        '</div>';
      document.getElementById('modal').classList.remove('hidden');
    };
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { animateCounters(); io.disconnect(); } });
  });
  const hs = document.querySelector('.hero-stats');
  if (hs) io.observe(hs);
}
document.addEventListener('DOMContentLoaded', init);
