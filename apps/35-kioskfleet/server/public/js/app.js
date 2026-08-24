'use strict';

// ── tiny helpers ───────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let TOKEN = localStorage.getItem('kf_token') || '';
let ME = null;
let SOCK = null;
let DEVICES = [];

// The server can be mounted under a prefix (more30.com/kiosk) or at the root
// (the Railway URL, local dev). Derive it from where this page actually is
// instead of baking it in, so one build serves both.
const BASE = location.pathname.replace(/\/console(?:\.html)?\/?$/, '').replace(/\/$/, '');

// Filled from GET /api/config before the socket is opened. When the console is
// served through more30.com/kiosk the socket must NOT go to the page's own
// host — that path is a rewrite and answers an upgrade with 404.
let WS_HOST = null;

async function api(path, opts = {}) {
  const res = await fetch(BASE + '/api' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'שגיאה בשרת');
  return data;
}

function toast(msg, ok = true) {
  const t = el(`<div class="toast" style="background:${ok ? '#0b1220' : '#b91c1c'}">${esc(msg)}</div>`);
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// The .pw-wrap/.pw-toggle markup and CSS already live in console.html for the
// login field. This reproduces the same markup for password fields rendered
// dynamically here, so every password input gets the same "הצג סיסמה" toggle.
function pwField(id, labelText, autocomplete) {
  return `<div class="field">
      <label for="${id}">${esc(labelText)}</label>
      <div class="pw-wrap">
        <input id="${id}" type="password"${autocomplete ? ` autocomplete="${autocomplete}"` : ''} />
        <button type="button" class="pw-toggle" id="${id}-toggle" aria-pressed="false" aria-controls="${id}" aria-label="הצג סיסמה" title="הצג סיסמה">
          <svg data-icon="eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg data-icon="eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6A17.6 17.6 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.1-.9"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="m2 2 20 20"/></svg>
        </button>
      </div>
    </div>`;
}

function wirePwToggle(id) {
  const input = $('#' + id);
  const btn = $('#' + id + '-toggle');
  if (!input || !btn) return;
  btn.onclick = () => {
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
    const label = reveal ? 'הסתר סיסמה' : 'הצג סיסמה';
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    input.focus();
  };
}

// ── allowed-domain list editor ──────────────────────────────────
//
// The allow-list is the product: it is the line between a locked device and
// the open internet. It used to be one text input holding comma-separated
// hosts, which put the burden of getting the format right on whoever was
// standing at a venue with a tablet — and a malformed entry does not fail
// loudly, it just silently matches nothing.
//
// Same storage (comma-separated, unchanged on the wire and in the database),
// different surface: one row per domain, added and removed individually.

/** Mirror of normalizeHostInput on the server, so the UI rejects the same things. */
function normalizeHost(raw) {
  let s = String(raw ?? '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^[^/@]*@/, '');
  s = s.split('/')[0].split('?')[0].split('#')[0].replace(/:\d+$/, '');
  s = s.replace(/^\.+|\.+$/g, '').replace(/^\*\./, '');
  if (!/^[a-z0-9.-]+$/.test(s) || !s.includes('.') || s.includes('..')) return '';
  return s;
}

/**
 * Renders into `mountEl` and returns { value() } giving the comma-separated list.
 * `locked` is the device's own home-URL host: it is shown but cannot be removed,
 * because removing it would lock the device out of the page it exists to display.
 */
function hostListEditor(mountEl, initialCsv, locked) {
  const lockedHost = normalizeHost(locked || '');
  let hosts = String(initialCsv || '').split(',').map(normalizeHost).filter(Boolean)
    .filter((h, i, a) => a.indexOf(h) === i);
  if (lockedHost && !hosts.includes(lockedHost)) hosts.unshift(lockedHost);

  mountEl.innerHTML = `
    <div class="hostlist" role="group" aria-label="דומיינים מותרים"></div>
    <div class="row" style="gap:8px;margin-top:8px">
      <input class="hl-new" placeholder="example.com" dir="ltr" style="flex:1" aria-label="דומיין חדש" />
      <button type="button" class="btn btn-light btn-sm hl-add">הוספה</button>
    </div>
    <p class="hl-err" style="display:none"></p>
    <p style="color:var(--muted);font-size:12px;margin:6px 0 0">
      תת-דומיינים נכללים אוטומטית — <code dir="ltr">example.com</code> מתיר גם
      <code dir="ltr">pay.example.com</code>. הוסיפו כאן גם את שער התשלום.
    </p>`;

  const listEl = $('.hostlist', mountEl);
  const input = $('.hl-new', mountEl);
  const err = $('.hl-err', mountEl);

  const fail = (m) => { err.textContent = m; err.style.display = 'block'; };
  const clearFail = () => { err.style.display = 'none'; };

  function draw() {
    if (!hosts.length) {
      // Empty means "no lock configured", which the device treats as allow-all.
      // Saying so is the difference between a mistake and a decision.
      listEl.innerHTML = `<p class="hl-empty">
        אין דומיינים ברשימה — המכשיר יוכל לפתוח <b>כל</b> כתובת. הוסיפו לפחות אחד כדי לנעול.</p>`;
      return;
    }
    listEl.innerHTML = '';
    hosts.forEach((h, i) => {
      const isLocked = h === lockedHost;
      const row = el(`<div class="hl-row">
        <span class="hl-host" dir="ltr">${esc(h)}</span>
        ${isLocked ? '<span class="hl-tag">כתובת המכשיר</span>' : ''}
        <span style="flex:1"></span>
        ${isLocked ? '' : `<button type="button" class="btn btn-light btn-sm" data-edit="${i}">עריכה</button>
        <button type="button" class="btn btn-danger btn-sm" data-del="${i}" aria-label="הסרת ${esc(h)}">הסרה</button>`}
      </div>`);
      listEl.appendChild(row);
    });
    listEl.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
      hosts.splice(Number(b.dataset.del), 1); clearFail(); draw();
    });
    listEl.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => {
      const i = Number(b.dataset.edit);
      input.value = hosts[i]; hosts.splice(i, 1); clearFail(); draw(); input.focus();
    });
  }

  function add() {
    const h = normalizeHost(input.value);
    if (!h) return fail('דומיין לא תקין. הזינו כתובת כמו example.com (בלי https:// ובלי נתיב).');
    if (hosts.includes(h)) return fail(`${h} כבר ברשימה.`);
    hosts.push(h); input.value = ''; clearFail(); draw();
  }
  $('.hl-add', mountEl).onclick = add;
  // Enter adds a domain; it must not submit the surrounding dialog.
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });

  draw();
  return {
    value: () => hosts.join(','),
    /**
     * Take in anything typed but not yet added, and report whether the list is
     * safe to save.
     *
     * A domain sitting in the input is meant to be in the list — the person
     * typed it. Dropping it silently loses a domain the device then cannot
     * open; asking about it with confirm() is worse still, because a dismissed
     * dialog cancels the entire save and nothing at all is written. So: adopt
     * it if it is valid, and refuse to save with an inline error if it is not.
     */
    commitPending() {
      const raw = input.value.trim();
      if (!raw) return true;
      const h = normalizeHost(raw);
      if (!h) { fail('דומיין לא תקין. הזינו כתובת כמו example.com, או נקו את השדה כדי לשמור בלעדיו.'); return false; }
      if (!hosts.includes(h)) hosts.push(h);
      input.value = ''; clearFail(); draw();
      return true;
    },
  };
}

// ── dialogs ─────────────────────────────────────────────────────
//
// A `.modal-bg` is a sibling of `#app-view`, not a `<dialog>`, so the platform
// does nothing for it: focus stays on whatever opened the dialog, Tab walks the
// page *behind* it, and the only way out was the mouse — the backdrop click.
// Every destructive confirmation in the console is one of these, so a keyboard
// user could be reading a dialog while their focus was on a delete button
// underneath it.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let MODAL_N = 0;

// The Tab trap below covers Tab, which is what a keyboard user presses. It does
// not cover the other ways into the page behind a dialog: a screen reader's
// virtual cursor walks the whole document without ever pressing Tab, and so
// does Ctrl+F → Enter. `inert` is what actually removes that page — from the
// accessibility tree as well as from focus and from clicks.
//
// Driven off `#modal-root.children` rather than a boolean, so a dialog opened
// on top of another one does not un-inert the page when only the top one
// closes. `#toast-root` is deliberately NOT in this list: it is the live region
// that announces what a dialog's save did, and inert would silence it.
const BEHIND_MODAL = ['#login-view', '#app-view'];
function syncInert() {
  const open = $('#modal-root').children.length > 0;
  for (const sel of BEHIND_MODAL) { const n = $(sel); if (n) n.toggleAttribute('inert', open); }
}

function modal(html) {
  const bg = el(`<div class="modal-bg"><div class="modal" role="dialog" aria-modal="true" tabindex="-1">${html}</div></div>`);
  const box = $('.modal', bg);
  const opener = document.activeElement;
  bg.addEventListener('click', (e) => { if (e.target === bg) bg.remove(); });

  // Recomputed on every press, never cached: the wizard redraws its own list
  // after each tick, and a cached first/last would point at detached nodes.
  // `offsetParent` drops what is hidden — the exit-code dialog and the wizard
  // both toggle `.hidden` sections in place.
  const focusables = () => [...box.querySelectorAll(FOCUSABLE)].filter((e) => e.offsetParent !== null);

  const onKey = (e) => {
    // Only the topmost dialog acts. Two open at once would both preventDefault
    // and fight over where focus lands.
    if ($('#modal-root').lastElementChild !== bg) return;
    if (e.key === 'Escape') { e.preventDefault(); bg.remove(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables();
    if (!f.length) { e.preventDefault(); box.focus(); return; }
    const first = f[0], last = f[f.length - 1];
    const cur = document.activeElement;
    if (!box.contains(cur)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
    // `box` itself is the stop before `first` — it is what receives focus on
    // open — so Shift+Tab from either wraps to the end rather than leaving.
    if (e.shiftKey && (cur === first || cur === box)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && cur === last) { e.preventDefault(); first.focus(); }
  };
  // Capture, so a field inside the dialog that swallows the key (the domain
  // editor's Enter handler is one) cannot swallow Escape or Tab first.
  document.addEventListener('keydown', onKey, true);

  // Every close path in this file is `m.remove()` on the backdrop, so the
  // teardown belongs on that one method rather than in forty call sites.
  bg.remove = function () {
    document.removeEventListener('keydown', onKey, true);
    Element.prototype.remove.call(bg);
    // Before the focus() below, not after: focus() on an element inside an
    // inert subtree is a no-op, and the opener is one of those until this runs.
    syncInert();
    // Back to the button that opened it — but only if it is still on the page:
    // a save reloads the device list, and the opener is then a detached node
    // whose focus() silently sends focus to <body>, i.e. back to the top.
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
  };

  $('#modal-root').appendChild(bg);
  syncInert();
  // Every dialog here opens with an <h3>; that is its accessible name.
  const h = $('h3', box);
  if (h) { if (!h.id) h.id = 'modal-h-' + (++MODAL_N); box.setAttribute('aria-labelledby', h.id); }

  // Focus the **dialog**, not its first control. The first control is `כן, בצע`
  // in every confirmation here — landing there puts a reboot or a delete one
  // Space away from someone who was only tabbing. A text field is different:
  // it is why the dialog opened, and focusing it types nothing.
  const firstField = box.querySelector('input:not([type=checkbox]):not([type=radio]):not([disabled]), textarea:not([disabled]), select:not([disabled])');
  (firstField && firstField.offsetParent !== null ? firstField : box).focus();
  return bg;
}
// Not `innerHTML = ''` — that detaches the nodes without running the teardown
// above, leaving a keydown listener on document for a dialog nobody can see.
function closeModals() { [...$('#modal-root').children].forEach((c) => c.remove()); syncInert(); }

// ── auth ────────────────────────────────────────────────────────
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#login-error').classList.add('hidden');
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: $('#login-user').value, password: $('#login-pass').value }) });
    TOKEN = data.token; localStorage.setItem('kf_token', TOKEN);
    await boot();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').classList.remove('hidden');
  }
});

$('#logout-btn').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch {}
  TOKEN = ''; localStorage.removeItem('kf_token');
  stopPolling();
  if (SOCK) SOCK.close();
  location.reload();
});

async function boot() {
  try {
    const { user } = await api('/auth/me');
    ME = user;
  } catch {
    TOKEN = ''; localStorage.removeItem('kf_token');
    $('#login-view').classList.remove('hidden');
    $('#app-view').classList.add('hidden');
    return;
  }
  $('#login-view').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  $('#user-name').textContent = ME.fullName || ME.username;
  $('#user-quota').textContent = ME.role === 'admin' ? 'מנהל-על' : `${ME.devicesUsed}/${ME.deviceLimit} מכשירים`;
  if (ME.role === 'admin') $('#menu-admin').classList.remove('hidden');
  // Ask where the socket lives before opening it. A failure here is not fatal:
  // WS_HOST stays null, connectSocket falls back to this host, and if that
  // cannot upgrade the polling fallback covers it.
  try { WS_HOST = (await api('/config')).wsHost || null; } catch { WS_HOST = null; }
  connectSocket();
  route('devices');
}

// ── realtime ────────────────────────────────────────────────────
//
// The socket is the fast path, not the only path. When the console is reached
// through more30.com/kiosk the request goes via a path proxy, and a proxy that
// forwards HTTP does not necessarily forward the WebSocket upgrade — the
// handshake just fails. A dashboard that silently stops updating is worse than
// a slower one, so a failed socket falls back to polling instead of retrying
// into an empty screen.
let POLL = null;
let SOCK_EVER_OPEN = false;

function startPolling() {
  if (POLL) return;
  POLL = setInterval(() => {
    if (!TOKEN) return stopPolling();
    if (CURRENT === 'devices') loadDevices().catch(() => {});
  }, 15000);
}
function stopPolling() { if (POLL) { clearInterval(POLL); POLL = null; } }

/**
 * Where to dial. With a dedicated WS host the path is the bare one, because
 * that host points straight at this service rather than through the prefix.
 * Without one, fall back to the page's own host and prefix — right for local
 * dev and for reaching the service directly.
 */
function socketUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const q = `?token=${encodeURIComponent(TOKEN)}`;
  return WS_HOST
    ? `${proto}://${WS_HOST}/ws/console${q}`
    : `${proto}://${location.host}${BASE}/ws/console${q}`;
}

function connectSocket() {
  let sock;
  try {
    sock = new WebSocket(socketUrl());
  } catch {
    return startPolling();
  }
  SOCK = sock;
  sock.onopen = () => { SOCK_EVER_OPEN = true; stopPolling(); };
  sock.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'device_update' && m.device) {
      const i = DEVICES.findIndex((d) => d.id === m.device.id);
      const mapped = mapDevice(m.device);
      if (i >= 0) DEVICES[i] = { ...DEVICES[i], ...mapped }; else DEVICES.push(mapped);
      if (CURRENT === 'devices') renderDevices();
    }
  };
  sock.onclose = () => {
    if (!TOKEN) return stopPolling();
    // Never opened → this route cannot carry a socket at all. Keep polling and
    // retry rarely; reconnecting every 3s against a proxy that will never
    // upgrade is just noise in the console and in the server log.
    startPolling();
    setTimeout(() => { if (TOKEN) connectSocket(); }, SOCK_EVER_OPEN ? 3000 : 60000);
  };
}
function mapDevice(d) {
  return { id: d.id, name: d.name, serial: d.serial, ownerName: d.owner_name || d.ownerName,
    online: d.online === 1 || d.online === true, status: d.status, homeUrl: d.home_url || d.homeUrl,
    // §2★א's second field. `??` and not `||`: '' and null both mean "follows the
    // main site", and the card has to be able to tell that apart from a link
    // this device was actually given.
    displayUrl: d.display_url ?? d.displayUrl ?? null,
    allowedHost: d.allowed_host || d.allowedHost, idleReturnSeconds: d.idle_return_seconds ?? d.idleReturnSeconds ?? 0,
    lastSeen: d.last_seen || d.lastSeen,
    // §2★ז. Read from both shapes: the REST payload is publicDevice()'s camelCase,
    // while a device_update over the socket is the raw row.
    accessCode: d.access_code ?? d.accessCode ?? null,
    // §2★ה/§4's maintenance code. `??` again: '' can never be stored (the server
    // maps an empty submission to NULL), but reading it as falsy-or-null would
    // make "cleared" and "never set" indistinguishable from a socket frame.
    exitCode: d.exit_code ?? d.exitCode ?? null,
    battery: d.battery, model: d.model, appVersion: d.app_version || d.appVersion, ip: d.ip };
}

// ── routing ─────────────────────────────────────────────────────
let CURRENT = 'devices';
$('#menu').addEventListener('click', (e) => {
  const a = e.target.closest('[data-view]'); if (!a) return;
  route(a.dataset.view, true);
});
// `fromUser` is what tells a screen change from the boot render. Only the first
// moves focus: at boot nothing holds focus yet, and dragging it to a heading
// there would push the page past the login pill and the sidebar before anyone
// pressed a key.
function route(view, fromUser = false) {
  CURRENT = view;
  [...$('#menu').children].forEach((a) => a.classList.toggle('active', a.dataset.view === view));
  if (fromUser) focusNewScreen();
  ({ devices: viewDevices, links: viewLinks, clients: viewClients, enroll: viewEnroll, guide: viewGuide, admin: viewAdmin, settings: viewSettings }[view] || viewDevices)();
}

// ── where focus lands after a screen redraw (WCAG 2.4.3) ────────
//
// route() replaces the whole of `#content`, and the control that asked for the
// change is usually *inside* it — `➕ הוספת מכשיר` on the devices screen and
// `🚀 אשף התקנה` on the guide screen both route. When the node holding focus is
// removed the browser drops focus to `<body>`, so the next Tab restarts at the
// top of the document rather than continuing into the screen that just opened:
// on this console that is the whole sidebar again, seven stops, before the
// first control of the thing the person actually asked for.
//
// So focus moves to the new screen's `<h1>`. Not to its first control: that is
// `רענון` on one screen and a submit on another, and landing on a control means
// a Space away from pressing it — the same rule `modal()` follows. A heading
// also names the screen, which is what a screen reader announces after a route
// change that is otherwise silent.
//
// Driven by a MutationObserver rather than by the seven view functions because
// three of them `await` before they mount (`viewEnroll` loads the link library
// first), so route() cannot find the heading synchronously — and a per-view
// call is seven places to forget on the eighth screen.
let SCREEN_FOCUS = null;
function focusNewScreen() {
  if (SCREEN_FOCUS) SCREEN_FOCUS.disconnect();
  const root = $('#content');
  const obs = new MutationObserver(() => {
    const h = root.querySelector('h1');
    if (!h) return; // an intermediate mutation; the mount has not happened yet
    obs.disconnect(); if (SCREEN_FOCUS === obs) SCREEN_FOCUS = null;
    h.setAttribute('tabindex', '-1');
    h.focus();
  });
  // `childList` without `subtree`: every in-screen redraw — renderDevices(),
  // the links table, the codes box — replaces the children of a box *inside*
  // `#content`, and pulling focus back up to the heading on every list refresh
  // would fight the person using the screen. Only a whole-screen mount is a
  // direct-child change.
  obs.observe(root, { childList: true });
  SCREEN_FOCUS = obs;
}

// Cache of the customer's link library (used by enroll + edit selectors).
let LINKS = [];
async function loadLinksCache() { try { LINKS = (await api('/links')).links; } catch { LINKS = []; } return LINKS; }

// ── DEVICES ─────────────────────────────────────────────────────
async function viewDevices() {
  $('#content').innerHTML = `<div class="topbar"><h1>המכשירים שלי</h1>
    <div><button class="btn btn-light btn-sm" id="refresh">רענון</button>
    <button class="btn btn-primary btn-sm" id="add">➕ הוספת מכשיר</button></div></div>
    <div id="dev-list" class="device-grid"><p style="color:var(--muted)">טוען…</p></div>`;
  $('#add').onclick = () => route('enroll', true);
  $('#refresh').onclick = loadDevices;
  await loadDevices();
}
async function loadDevices() {
  const admin = ME.role === 'admin';
  const { devices } = await api('/devices' + (admin ? '?all=1' : ''));
  DEVICES = devices.map(mapDevice);
  renderDevices();
}
function renderDevices() {
  const list = $('#dev-list'); if (!list) return;
  if (!DEVICES.length) { list.innerHTML = `<div class="card"><p style="color:var(--muted);margin:0">אין עדיין מכשירים. לחצו על "הוספת מכשיר" כדי ליצור קוד רישום.</p></div>`; return; }
  list.innerHTML = '';
  for (const d of DEVICES) list.appendChild(deviceCard(d));
}
function deviceCard(d) {
  const owner = ME.role === 'admin' && d.ownerName ? `<div class="serial">לקוח: ${esc(d.ownerName)}</div>` : '';
  const c = el(`<div class="device">
    <div class="head">
      <div><div class="name"><span class="dot ${d.online ? 'on' : 'off'}"></span>${esc(d.name)}</div>
        <div class="serial">S/N: ${esc(d.serial)}</div>${owner}</div>
      <span class="pill ${d.online ? 'on' : 'off'}">${d.online ? 'מחובר' : 'מנותק'}</span>
    </div>
    <div class="meta">🌐 אתר ראשי: <span dir="ltr">${esc(d.homeUrl || '—')}</span><br/>
      ${d.displayUrl ? `📺 מוצג במכשיר: <span dir="ltr">${esc(d.displayUrl)}</span><br/>` : ''}
      🔋 ${d.battery != null ? d.battery + '%' : '—'} · 📱 ${esc(d.model || '—')} · v${esc(d.appVersion || '?')}<br/>
      🕑 ${d.lastSeen
        // ‎toLocaleString('he-IL')‎ מחזיר ‎"11.8.2026, 4:40:00"‎ — שני רצפי ספרות
        // מופרדים בפסיק־ורווח. הפסיק והרווח ניטרליים דו-כיווניים, ולכן בפסקה
        // בעברית שני הרצפים הם שני runs נפרדים והם מסודרים מימין לשמאל: המסך
        // הראה ‎"4:40:00 ,11.8.2026"‎ — השעה לפני התאריך, והפסיק על הצד הלא נכון.
        // המחרוזת עצמה תקינה, ולכן רק צילום מסך תפס את זה — בדיוק כמו חלון
        // ה-OTA ב-‎setupsteps.js‎, שהוצג ‎06:00–04:00‎. ‎dir="ltr"‎ הוא בידוד
        // (‎unicode-bidi: isolate‎ בגיליון הדפדפן), כלומר אותו LRI…PDI שם, ובאותה
        // צורה שבה שתי השורות מעל כבר עוטפות כתובות.
        ? `<span dir="ltr">${esc(new Date(d.lastSeen + 'Z').toLocaleString('he-IL'))}</span>`
        : 'טרם דיווח'}<br/>
      🔑 קוד גישה: ${d.accessCode
        ? `<span class="code-chip" dir="ltr" style="font-size:14px;letter-spacing:2px;padding:2px 9px">${esc(d.accessCode)}</span>`
        : '<span style="color:var(--warn-ink)">טרם הונפק</span>'}<br/>
      🚪 קוד יציאה: <span id="ex-state-${d.id}">${exitCodeState(d)}</span></div>
    <div class="actions"></div></div>`);
  const acts = $('.actions', c);
  const mk = (label, fn, cls = 'btn-light') => { const b = el(`<button class="btn ${cls} btn-sm">${label}</button>`); b.onclick = fn; acts.appendChild(b); };
  // §2★א ends at "הפעל", and §2★ב is what that button opens. First in the row on
  // purpose: on a device that is not installed yet it is the only button here
  // that does anything — the rest are commands to an agent that is not running.
  mk('🚀 הפעל', () => setupWizard(d), 'btn-primary');
  mk('🔄 רענן', () => cmd(d, 'reload'));
  mk('🔗 החלף אתר', () => promptUrl(d));
  mk('♻️ אתחל', () => confirmCmd(d, 'reboot', 'לאתחל את המכשיר?'));
  mk('🌙 כבה מסך', () => cmd(d, 'screen_off'));
  mk('☀️ הדלק מסך', () => cmd(d, 'screen_on'));
  mk('🧹 נקה מטמון', () => cmd(d, 'clear_cache'));
  mk('🆔 מזהי לקוח', () => clientApprovals(d));
  // §2★ה's other half. Next to the clients picker because on the device the two
  // are one screen: the person standing there picks a מזהה לקוח *or* a קישור,
  // and both lists are bounded by what was ticked here.
  mk('📚 קישורים מאושרים', () => linkApprovals(d));
  mk('🔑 קוד גישה', () => accessCodeDialog(d));
  mk('🚪 קוד יציאה', () => exitCodeDialog(d));
  mk('✏️ עריכה', () => editDevice(d));
  mk('🗑️', () => confirmDelete(d), 'btn-danger');
  return c;
}
async function cmd(d, type, payload) {
  try { await api(`/devices/${d.id}/command`, { method: 'POST', body: JSON.stringify({ type, payload }) }); toast('הפקודה נשלחה למכשיר'); }
  catch (e) { toast(e.message, false); }
}
function confirmCmd(d, type, q) {
  const m = modal(`<h3>${esc(q)}</h3><p style="color:var(--muted)">מכשיר: ${esc(d.name)}</p>
    <div class="row"><button class="btn btn-danger" id="y">כן, בצע</button><button class="btn btn-light" id="n">ביטול</button></div>`);
  $('#y', m).onclick = () => { cmd(d, type); m.remove(); };
  $('#n', m).onclick = () => m.remove();
}
function promptUrl(d) {
  const m = modal(`<h3>החלפת אתר</h3><div class="field"><label>כתובת (חייבת להיות תחת ${esc(d.allowedHost || 'הדומיין המורשה')})</label>
    <input id="u" value="${esc(d.homeUrl || '')}" dir="ltr" /></div>
    <div class="row"><button class="btn btn-primary" id="go">שלח</button><button class="btn btn-light" id="c">ביטול</button></div>`);
  $('#go', m).onclick = () => { const url = $('#u', m).value.trim(); if (url) cmd(d, 'set_url', { url }); m.remove(); };
  $('#c', m).onclick = () => m.remove();
}
async function editDevice(d) {
  await loadLinksCache();
  const linkOpts = LINKS.length
    ? `<div class="field"><label>החלף קישור נעילה מהספרייה (יעדכן כתובת ודומיינים)</label>
        <select id="lk"><option value="">— ללא שינוי —</option>${LINKS.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></div>` : '';
  const m = modal(`<h3>עריכת מכשיר</h3>
    <div class="field"><label>שם ידידותי</label><input id="n" value="${esc(d.name)}" /></div>
    ${linkOpts}
    <div class="field"><label>אתר ראשי</label><input id="h" value="${esc(d.homeUrl || '')}" dir="ltr" />
      <div style="color:var(--muted);font-size:12px;margin-top:4px">הקישור שהמכשיר נעול עליו, ושאליו הוא חוזר אחרי חוסר פעילות או אתחול.</div></div>
    <div class="field"><label>קישור שיוצג על המכשיר</label>
      <input id="disp" value="${esc(d.displayUrl || '')}" dir="ltr" placeholder="ריק = מציג את האתר הראשי" />
      <div style="color:var(--muted);font-size:12px;margin-top:4px" id="disp-hint"></div></div>
    <div class="field"><label>דומיינים מותרים לפתיחה במכשיר</label><div id="hl"></div></div>
    <div class="field"><label>חזרה אוטומטית לקישור לאחר חוסר פעילות (שניות; 0 = כבוי)</label><input id="idle" type="number" min="0" value="${d.idleReturnSeconds || 0}" dir="ltr" /></div>
    <div class="row"><button class="btn btn-primary" id="s">שמירה</button><button class="btn btn-light" id="c">ביטול</button></div>`);

  let homeHost = '';
  try { homeHost = new URL(d.homeUrl).host; } catch { /* no home URL yet */ }
  const hl = hostListEditor($('#hl', m), d.allowedHost, homeHost);

  // What the second field does depends on the first one and on the domain list,
  // so the hint is recomputed rather than written once: an owner who clears the
  // list in this same dialog is told the widening no longer applies.
  const disp = $('#disp', m), dispHint = $('#disp-hint', m);
  const refreshDispHint = () => {
    dispHint.textContent = !disp.value.trim()
      ? 'ריק — המכשיר מציג את האתר הראשי, וממשיך לעקוב אחריו גם כשישתנה.'
      : String(hl.value() || '').trim()
        ? 'המכשיר יציג את הקישור הזה. הדומיין שלו מתווסף אוטומטית לרשימת הדומיינים הנשלחת למכשיר, כדי שלא ייחסם.'
        : 'המכשיר יציג את הקישור הזה. במכשיר הזה לא מוגדרת נעילת דומיינים, ולכן אין מה להתיר.';
  };
  refreshDispHint();
  disp.addEventListener('input', refreshDispHint);
  // The host editor has no change hook; its buttons all live under this mount,
  // and the re-draw happens in the same click.
  $('#hl', m).addEventListener('click', () => setTimeout(refreshDispHint, 0));

  $('#s', m).onclick = async () => {
    // Adopt a domain that was typed but not added, rather than dropping it.
    if (!hl.commitPending()) return;
    // `displayUrl` is sent on every save, empty included: the server reads it by
    // presence, and an omitted key would make clearing the field impossible.
    const body = { name: $('#n', m).value, homeUrl: $('#h', m).value, displayUrl: disp.value.trim(),
      allowedHost: hl.value(), idleReturnSeconds: Number($('#idle', m).value) };
    const lk = $('#lk', m); if (lk && lk.value) body.linkId = Number(lk.value);
    try { await api(`/devices/${d.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast('נשמר. המכשיר יתעדכן מיד.'); m.remove(); loadDevices(); }
    catch (e) { toast(e.message, false); }
  };
  $('#c', m).onclick = () => m.remove();
}
// Which "מזהי לקוח" may come up on this device (§2★ה). The registry screen says
// who the owner's clients are; this says which of them the staff standing at
// *this* device can reach. Until now that was an HTTP call only.
async function clientApprovals(d) {
  let data;
  try { data = await api(`/devices/${d.id}/clients`); }
  catch (e) { return toast(e.message, false); }
  const rows = data.clients || [];

  if (!rows.length) {
    const m = modal(`<h3>מזהי לקוח למכשיר "${esc(d.name)}"</h3>
      <p style="color:var(--muted)">עדיין אין לקוחות רשומים. רשמו לקוח ב"מזהי לקוח", ואז אפשר יהיה לאשר אותו למכשיר הזה.</p>
      <div class="row"><button class="btn btn-primary" id="go">למסך מזהי לקוח</button><button class="btn btn-light" id="c">סגירה</button></div>`);
    $('#go', m).onclick = () => { m.remove(); route('clients', true); };
    $('#c', m).onclick = () => m.remove();
    return;
  }

  // Approving widens the device's allowed-domain list — but only if it has one.
  // An unset list means "no lock configured" to the device, and the server
  // leaves it unset rather than creating a lock; say which of the two this is,
  // because "האתר חסום" in a hall looks like a broken kiosk.
  const hint = d.allowedHost
    ? 'הדומיינים של הלקוחות שתאשרו יתווספו אוטומטית לדומיינים המותרים של המכשיר.'
    : 'למכשיר הזה לא הוגדרה רשימת דומיינים מותרים, ולכן הוא אינו חוסם כתובות. אישור מזהה אינו משנה זאת.';

  const m = modal(`<h3>מזהי לקוח מאושרים</h3>
    <p style="color:var(--muted);margin:-6px 0 14px">מכשיר: ${esc(d.name)}. רק המזהים המסומנים כאן יעלו עליו — מי שיקיש מזהה אחר לא יקבל דבר.</p>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <button class="btn btn-light btn-sm" id="all">סמן הכל</button>
      <button class="btn btn-light btn-sm" id="none">נקה הכל</button>
      <span id="cnt" style="color:var(--muted);font-size:13px"></span></div>
    <div id="ap-list"></div>
    <p style="color:var(--muted);font-size:12px;margin:12px 0 0">${hint}</p>
    <div class="row"><button class="btn btn-primary" id="s">שמירה</button><button class="btn btn-light" id="c">ביטול</button></div>`);
  $('.modal', m).style.maxWidth = '560px';

  const list = $('#ap-list', m);
  // A disabled client that is already approved is shown checked, not dropped:
  // the server would happily store the row, and silently un-approving it here
  // would mean re-enabling the client no longer brings it back to this device.
  list.innerHTML = rows.map((c) => `
    <label style="display:flex;gap:10px;align-items:flex-start;padding:10px 2px;border-bottom:1px solid var(--line);cursor:pointer">
      <input type="checkbox" data-id="${c.id}"${c.approved ? ' checked' : ''} style="flex:none;width:18px;height:18px;margin-top:4px" />
      <span style="min-width:0;flex:1">
        <b>${esc(c.name)}</b>
        <span dir="ltr" style="font-family:monospace;font-size:13px;background:var(--bg);color:var(--muted);border-radius:6px;padding:1px 7px;margin-inline-start:6px">${esc(c.code)}</span>
        <span dir="ltr" style="display:block;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(c.siteUrl || '')}">${esc(c.siteUrl || '')}</span>
        ${c.active ? '' : '<span style="display:block;font-size:12px;color:var(--warn-ink)">⛔ הלקוח מושבת — לא יעלה על המכשיר עד להפעלתו מחדש</span>'}
      </span></label>`).join('');

  const boxes = [...list.querySelectorAll('input[type=checkbox]')];
  const count = () => { $('#cnt', m).textContent = `${boxes.filter((b) => b.checked).length} מתוך ${boxes.length} מאושרים`; };
  boxes.forEach((b) => b.addEventListener('change', count));
  $('#all', m).onclick = () => { boxes.forEach((b) => { b.checked = true; }); count(); };
  $('#none', m).onclick = () => { boxes.forEach((b) => { b.checked = false; }); count(); };
  count();

  $('#c', m).onclick = () => m.remove();
  $('#s', m).onclick = async () => {
    const clientIds = boxes.filter((b) => b.checked).map((b) => Number(b.dataset.id));
    try {
      const res = await api(`/devices/${d.id}/clients`, { method: 'PUT', body: JSON.stringify({ clientIds }) });
      // An empty list is a legitimate save and it means "nothing" — absence of a
      // row is a "no" here — so it must not read as the same success as an
      // approval the owner just granted.
      const n = (res.approvedIds || []).length;
      toast(n ? `נשמר — ${n} מזהי לקוח מאושרים למכשיר` : 'נשמר — לא אושר למכשיר אף מזהה לקוח');
      m.remove(); loadDevices();
    } catch (e) { toast(e.message, false); }
  };
}

/**
 * Which library links may come up on this device (§2★ה, second half).
 *
 * The mirror of `clientApprovals()` above, and a separate dialog for the same
 * reason the routes are separate: `PUT /devices/:id/links` replaces the whole
 * set, so one modal carrying both lists would make un-approving every client the
 * price of touching the links. They are also different things to tick — a client
 * is a business whose staff type a code on a keypad, a link is an address the
 * server has already decided to offer.
 *
 * Until now `device_links` was writable only by hand-writing an HTTP call, which
 * is what left the second half of the selection screen unreachable: the owner's
 * link library is fleet-wide, so without this every device offered nothing but
 * its own main site and its approved clients.
 */
async function linkApprovals(d) {
  let data;
  try { data = await api(`/devices/${d.id}/links`); }
  catch (e) { return toast(e.message, false); }
  const rows = data.links || [];

  if (!rows.length) {
    const m = modal(`<h3>קישורים מאושרים למכשיר "${esc(d.name)}"</h3>
      <p style="color:var(--muted)">ספריית הקישורים ריקה. הוסיפו קישור במסך "ספריית קישורים", ואז אפשר יהיה לאשר אותו למכשיר הזה.</p>
      <div class="row"><button class="btn btn-primary" id="go">לספריית הקישורים</button><button class="btn btn-light" id="c">סגירה</button></div>`);
    $('#go', m).onclick = () => { m.remove(); route('links', true); };
    $('#c', m).onclick = () => m.remove();
    return;
  }

  // Same two branches as the clients picker, and for the same reason: approving
  // widens the device's allowed-domain list, but only if it has one. An unset
  // list means "no lock configured", and the server leaves it unset rather than
  // creating a lock — say which of the two this device is, because "האתר חסום"
  // on a tablet in a hall reads as a broken kiosk.
  const hint = d.allowedHost
    ? 'הדומיינים של הקישורים שתאשרו יתווספו אוטומטית לדומיינים המותרים של המכשיר.'
    : 'למכשיר הזה לא הוגדרה רשימת דומיינים מותרים, ולכן הוא אינו חוסם כתובות. אישור קישור אינו משנה זאת.';

  const m = modal(`<h3>קישורים מאושרים</h3>
    <p style="color:var(--muted);margin:-6px 0 14px">מכשיר: ${esc(d.name)}. רק הקישורים המסומנים כאן יוצעו במסך הבחירה שלו. זו אינה החלפת האתר הראשי — המכשיר נשאר נעול עליו וחוזר אליו.</p>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
      <button class="btn btn-light btn-sm" id="all">סמן הכל</button>
      <button class="btn btn-light btn-sm" id="none">נקה הכל</button>
      <span id="cnt" style="color:var(--muted);font-size:13px"></span></div>
    <div id="lk-list"></div>
    <p style="color:var(--muted);font-size:12px;margin:12px 0 0">${hint}</p>
    <div class="row"><button class="btn btn-primary" id="s">שמירה</button><button class="btn btn-light" id="c">ביטול</button></div>`);
  $('.modal', m).style.maxWidth = '560px';

  const list = $('#lk-list', m);
  // No disabled state to render, unlike a client: `links` has no `active`
  // column, so the only ways a link leaves this list are being deleted from the
  // library or un-ticked here — and both remove the row rather than greying it.
  list.innerHTML = rows.map((l) => `
    <label style="display:flex;gap:10px;align-items:flex-start;padding:10px 2px;border-bottom:1px solid var(--line);cursor:pointer">
      <input type="checkbox" data-id="${l.id}"${l.approved ? ' checked' : ''} style="flex:none;width:18px;height:18px;margin-top:4px" />
      <span style="min-width:0;flex:1">
        <b>${esc(l.name)}</b>
        <span dir="ltr" style="display:block;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(l.url || '')}">${esc(l.url || '')}</span>
      </span></label>`).join('');

  const boxes = [...list.querySelectorAll('input[type=checkbox]')];
  const count = () => { $('#cnt', m).textContent = `${boxes.filter((b) => b.checked).length} מתוך ${boxes.length} מאושרים`; };
  boxes.forEach((b) => b.addEventListener('change', count));
  $('#all', m).onclick = () => { boxes.forEach((b) => { b.checked = true; }); count(); };
  $('#none', m).onclick = () => { boxes.forEach((b) => { b.checked = false; }); count(); };
  count();

  $('#c', m).onclick = () => m.remove();
  $('#s', m).onclick = async () => {
    const linkIds = boxes.filter((b) => b.checked).map((b) => Number(b.dataset.id));
    try {
      const res = await api(`/devices/${d.id}/links`, { method: 'PUT', body: JSON.stringify({ linkIds }) });
      // Saving nothing is a legitimate save and it means "nothing" — absence of
      // a row is a "no" here — so it must not read as the same success as an
      // approval the owner just granted.
      const n = (res.approvedIds || []).length;
      toast(n ? `נשמר — ${n} קישורים מאושרים למכשיר` : 'נשמר — לא אושר למכשיר אף קישור');
      m.remove(); loadDevices();
    } catch (e) { toast(e.message, false); }
  };
}

/**
 * The device's own access code (§2★ז) — read it out, or replace it.
 *
 * The code existed in the API and in the database and nowhere a person could
 * see it, which makes it useless: it is meant to be read off this screen by the
 * owner and typed by whoever is standing at the device. It is shown in full
 * rather than masked — a credential you cannot read is not one you can hand
 * over, and this screen is already behind the owner's own session.
 */
function accessCodeDialog(d) {
  const m = modal(`<h3>קוד גישה למכשיר</h3>
    <p style="color:var(--muted);margin:-6px 0 14px">מכשיר: ${esc(d.name)} · S/N ${esc(d.serial)}</p>
    <div style="text-align:center;padding:6px 0 2px">
      <span class="code-chip" id="ac-code" dir="ltr" style="font-size:30px;letter-spacing:8px;padding:10px 18px">${esc(d.accessCode || '—')}</span>
    </div>
    <p style="color:var(--muted);font-size:13px;margin:14px 0 0">הקוד מזהה את המכשיר הזה במסך הפתיחה של הקיוסק. מי שמחזיק בו יכול לפתוח את המכשיר — על המזהים שאושרו לו בלבד — ולכן אם הקוד דלף (צולם, עובד עזב), הנפיקו חדש: הישן מפסיק לעבוד מיד.</p>
    <div class="row" id="ac-actions">
      <button class="btn btn-primary" id="cp">העתקה</button>
      <button class="btn btn-light" id="new">הנפקת קוד חדש</button>
      <button class="btn btn-light" id="c">סגירה</button></div>
    <div id="ac-confirm"></div>`);
  $('#c', m).onclick = () => m.remove();

  $('#cp', m).onclick = async () => {
    if (!d.accessCode) return toast('אין עדיין קוד להעתקה', false);
    if (await copyText(d.accessCode)) toast('הקוד הועתק');
    // A browser served over plain HTTP has no clipboard API at all, and failing
    // silently would look like a copy that worked. The code is on screen either
    // way, so the honest answer is "read it off".
    else toast('לא ניתן להעתיק בדפדפן הזה — העתיקו את הקוד מהמסך', false);
  };

  // The confirmation is inline rather than a second modal: replacing a code that
  // is taped to a wall next to a tablet strands whoever is standing there, so it
  // must not be one stray click, but it also must not lose the code being shown.
  $('#new', m).onclick = () => {
    $('#ac-actions', m).classList.add('hidden');
    $('#ac-confirm', m).innerHTML = `
      <p style="color:var(--warn-ink);font-size:13px;margin:14px 0 0">הקוד הנוכחי יפסיק לעבוד מיד. כל מי שרשם אותו יצטרך לקבל את החדש.</p>
      <div class="row"><button class="btn btn-danger" id="y">כן, הנפק קוד חדש</button>
        <button class="btn btn-light" id="n">ביטול</button></div>`;
    $('#n', m).onclick = () => { $('#ac-confirm', m).innerHTML = ''; $('#ac-actions', m).classList.remove('hidden'); };
    $('#y', m).onclick = async () => {
      $('#y', m).disabled = true;
      try {
        const res = await api(`/devices/${d.id}/access-code`, { method: 'POST' });
        d.accessCode = res.accessCode;
        $('#ac-code', m).textContent = res.accessCode;
        $('#ac-confirm', m).innerHTML = '';
        $('#ac-actions', m).classList.remove('hidden');
        toast('הונפק קוד חדש');
        loadDevices();
      } catch (e) { $('#y', m).disabled = false; toast(e.message, false); }
    };
  };
}

/**
 * The maintenance code that lets a person out of the kiosk (§2★ה, §4).
 *
 * The column, the validation and the three config pushes landed server-side and
 * left the field reachable only by hand-writing a PATCH — so on every device the
 * corner-tap dialog still answers `קוד תחזוקה לא הוגדר`, and the only way out of
 * a locked tablet is the remote `unlock` command, which needs the network.
 *
 * It gets its own dialog rather than a row in `editDevice()`, and it is **not**
 * printed on the card the way the access code is. The two codes look alike and
 * are opposites: the access code is meant to be printed and taped beside the
 * tablet, so leaking is its normal end state, while this one is the way *out* of
 * the lock. A console left open on a desk in an office would otherwise show the
 * exit code of every device in the fleet at once. It is still readable on
 * demand — that is the whole point of storing it recoverable (see
 * `exitcode.js`): the scenario it exists for is an offline tablet, where reading
 * the code off this screen and walking over is the only remaining route in.
 *
 * The length range in the hint is wrapped U+2066…U+2069. `4–32` is
 * directionally-neutral inside a Hebrew sentence and renders as `32–4` without
 * the isolates — the same defect `windowLabel()` was written for, and again only
 * the screenshot caught it: the source string and `innerText` are both correct.
 */
function exitCodeDialog(d) {
  const has = !!d.exitCode;
  const m = modal(`<h3>קוד יציאה מהקיוסק</h3>
    <p style="color:var(--muted);margin:-6px 0 14px">מכשיר: ${esc(d.name)} · S/N ${esc(d.serial)}</p>
    <p style="color:var(--muted);font-size:13px;margin:0 0 14px">חמש הקשות ברציפות בפינת המסך פותחות במכשיר חלון שמבקש את הקוד הזה. הבדיקה מתבצעת על המכשיר עצמו, ולכן זו הדרך היחידה לצאת מהנעילה כשאין אינטרנט — פקודת השחרור מרחוק דורשת רשת.</p>
    <div id="ex-err"></div>
    <div class="field"><label>הקוד</label>
      <input id="ex-val" value="${esc(d.exitCode || '')}" dir="ltr" autocomplete="off" placeholder="${has ? '' : 'לדוגמה: keter7291'}" />
      <div style="color:var(--muted);font-size:12px;margin-top:4px">⁦4–32⁩ תווים. לא רצף ולא תו חוזר ⁦(1234, 0000)⁩, ולא קוד הגישה של המכשיר — הוא מודבק לידו.</div></div>
    <div class="row" id="ex-actions">
      <button class="btn btn-primary" id="ex-save">שמירה</button>
      <button class="btn btn-light" id="ex-close">סגירה</button></div>
    <div id="ex-confirm"></div>`);
  $('#ex-close', m).onclick = () => m.remove();

  const showErr = (msg) => {
    $('#ex-err', m).innerHTML = msg ? `<div class="alert alert-error">${esc(msg)}</div>` : '';
  };

  // The code is written straight into the device's `Prefs`, so it is saved
  // through the ordinary PATCH: that is the one path that also pushes
  // `update_config`, and a code stored here but never pushed is a code the
  // device does not have.
  const save = async (value) => {
    try {
      const res = await api(`/devices/${d.id}`, { method: 'PATCH', body: JSON.stringify({ exitCode: value }) });
      d.exitCode = res.device.exitCode ?? null;
      const cell = $(`#ex-state-${d.id}`);
      if (cell) cell.innerHTML = exitCodeState(d);
      toast(d.exitCode ? 'הקוד נשמר ונשלח למכשיר' : 'הקוד בוטל');
      m.remove();
      loadDevices();
    } catch (e) {
      // Inline rather than only as a toast: a toast is gone by the time the
      // person has re-read what they typed, and every one of these messages is
      // an instruction for the next attempt.
      showErr(e.message);
      throw e;
    }
  };

  $('#ex-save', m).onclick = async () => {
    showErr('');
    const value = $('#ex-val', m).value.trim();
    // Emptying the field and saving is a clear, and a clear is destructive: it
    // takes the offline way out away. Both routes to it land on the same
    // confirmation rather than one being a quiet side effect of a blank field.
    if (!value) {
      if (!has) return showErr('לא הוזן קוד.');
      $('#ex-actions', m).classList.add('hidden');
      $('#ex-confirm', m).innerHTML = `
        <p style="color:var(--warn-ink);font-size:13px;margin:14px 0 0">ביטול הקוד מסיר את הדרך היחידה לצאת מהנעילה במכשיר עצמו. אם המכשיר יאבד חיבור לאינטרנט, לא תהיה דרך לפתוח אותו בלי איפוס להגדרות היצרן.</p>
        <div class="row"><button class="btn btn-danger" id="ex-y">כן, בטל את הקוד</button>
          <button class="btn btn-light" id="ex-n">ביטול</button></div>`;
      $('#ex-n', m).onclick = () => {
        $('#ex-confirm', m).innerHTML = '';
        $('#ex-actions', m).classList.remove('hidden');
        $('#ex-val', m).value = d.exitCode || '';
      };
      $('#ex-y', m).onclick = async () => {
        $('#ex-y', m).disabled = true;
        try { await save(''); }
        catch { $('#ex-y', m).disabled = false; $('#ex-confirm', m).innerHTML = ''; $('#ex-actions', m).classList.remove('hidden'); }
      };
      return;
    }
    $('#ex-save', m).disabled = true;
    try { await save(value); } catch { $('#ex-save', m).disabled = false; }
  };
}

/**
 * The card's one-line state. The code itself is not printed here — see above.
 *
 * Neither state is coloured, deliberately — and it stays that way now that
 * `--warn-ink` exists, because only half of the reason was the contrast. There
 * is still no `--ok`, so colouring `מוגדר` has nothing to read from, and a pair
 * where only the bad half is coloured reads as an error rather than as a state.
 * So the distinction is carried by the words, which have to say it anyway, and
 * by weight; both states inherit `.meta`'s `--muted`, which measures 5.49:1 on
 * the card. (`טרם הונפק` on the line above is amber because that one *is* a
 * single state worth flagging, and it now uses `--warn-ink`.)
 */
function exitCodeState(d) {
  return d.exitCode ? 'מוגדר' : '<strong>לא הוגדר — אין יציאה מקומית</strong>';
}

/**
 * The installation wizard (§2★ב) — the live checklist behind "הפעל".
 *
 * What this replaces is `viewGuide()`: four paragraphs, no boxes, not tied to a
 * device, stopping at enrollment — i.e. never reaching the part that actually
 * locks the tablet. §2★ב asks for a step-by-step list where every step has a
 * tick box and says exactly what to tap, which button to confirm and what should
 * appear, ending with kiosk mode switched on. The content is `setupsteps.js` and
 * the ticks are `setupprogress.js`; both landed already, and this is the screen
 * between them and the owner.
 *
 * The list is **never rendered from local state**. Every tick round-trips and
 * the answer redraws the ticks, because §2★ב's flow is two people at once — the
 * owner here and an installer at the tablet — and the one failure that matters
 * is progress appearing to go backwards while someone is watching it.
 */
async function setupWizard(d) {
  let data;
  try { data = await api(`/devices/${d.id}/setup`); }
  catch (e) { return toast(e.message, false); }

  const m = modal(`<h3>🚀 הפעלה — אשף התקנה</h3>
    <p class="wz-sub">מכשיר: ${esc(d.name)} · S/N ${esc(d.serial)}. סמנו כל שלב אחרי שביצעתם אותו. הסימון נשמר על המכשיר עצמו — הוא שורד רענון, אתחול של הטאבלט, ומעבר בין מי שפותח את האשף בקונסולה לבין מי שעומד ליד המכשיר.</p>
    <div class="wz-track" id="wz-track"></div>
    <div class="wz-progress"><div class="wz-bar"><span id="wz-fill" style="width:0"></span></div>
      <span class="wz-count" id="wz-count"></span></div>
    <div class="wz-complete hidden" id="wz-complete">✅ כל השלבים סומנו — המכשיר נעול ומוכן. מכאן היציאה היא רק בקוד הניהול המקומי או בפקודת "פתיחה" מהקונסולה.</div>
    <div id="wz-list"></div>
    <div class="row">
      <button class="btn btn-primary" id="wz-close">סגירה</button>
      <button class="btn btn-light" id="wz-reset">התחל מחדש</button></div>
    <div id="wz-reset-confirm"></div>`);
  $('.modal', m).style.maxWidth = '720px';
  $('#wz-close', m).onclick = () => m.remove();

  // §2★ו's two tracks. Switching them keeps the ticks (the server does that
  // deliberately — the tracks are one list with a flag), so the wizard says so
  // rather than letting a switch look like it might wipe the work.
  const drawTrack = () => {
    $('#wz-track', m).innerHTML = (data.tracks || []).map((t) => `
      <label><input type="radio" name="wz-track" value="${esc(t.id)}"${t.id === data.track ? ' checked' : ''} />
        <span style="min-width:0"><b>${esc(t.name)}</b><span>${esc(t.hint)}</span></span></label>`).join('');
    $('#wz-track', m).querySelectorAll('input').forEach((r) => r.onchange = async () => {
      try {
        data = await api(`/devices/${d.id}/setup/track`, { method: 'POST', body: JSON.stringify({ track: r.value }) });
        draw();
        toast('המסלול עודכן — הסימונים נשמרו');
      } catch (e) { toast(e.message, false); drawTrack(); }
    });
  };

  const drawProgress = () => {
    const p = data.progress || { done: 0, total: 0, percent: 0, complete: false };
    $('#wz-fill', m).style.width = p.percent + '%';
    $('#wz-count', m).textContent = `${p.done} מתוך ${p.total} שלבים`;
    $('#wz-complete', m).classList.toggle('hidden', !p.complete);
  };

  const drawSteps = () => {
    const doneIds = (data.progress && data.progress.doneIds) || [];
    const nextId = data.progress && data.progress.nextId;
    $('#wz-list', m).innerHTML = (data.steps || []).map((s, i) => {
      const ticked = doneIds.includes(s.id);
      return `<label class="wz-step${ticked ? ' wz-ticked' : ''}${s.id === nextId ? ' wz-next' : ''}" data-step="${esc(s.id)}">
        <input type="checkbox" data-id="${esc(s.id)}"${ticked ? ' checked' : ''} />
        <span class="wz-body">
          <span class="wz-title">${i + 1}. ${esc(s.title)}</span>
          <span class="wz-do">${esc(s.do)}</span>
          ${s.command ? `<span class="wz-cmd"><code>${esc(s.command)}</code>
            <button type="button" class="btn btn-light btn-sm" data-copy="${esc(s.command)}">העתקה</button></span>` : ''}
          ${s.expect ? `<span class="wz-expect">✅ אמור להופיע: ${esc(s.expect)}</span>` : ''}
          ${s.warn ? `<span class="wz-warn">⚠️ ${esc(s.warn)}</span>` : ''}
        </span></label>`;
    }).join('');

    // The copy button sits inside the <label>, so a click on it would toggle the
    // box as well — the command steps are exactly the ones nobody wants to tick
    // by accident, since ticking `set-owner` early hides where the install
    // actually stopped.
    $('#wz-list', m).querySelectorAll('[data-copy]').forEach((b) => b.onclick = async (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      if (await copyText(b.dataset.copy)) toast('הפקודה הועתקה');
      else toast('לא ניתן להעתיק בדפדפן הזה — העתיקו את הפקודה מהמסך', false);
    });

    $('#wz-list', m).querySelectorAll('input[type=checkbox]').forEach((b) => b.onchange = async () => {
      const want = b.checked;
      b.disabled = true;
      try {
        data = await api(`/devices/${d.id}/setup/step`, {
          method: 'POST', body: JSON.stringify({ stepId: b.dataset.id, done: want }),
        });
        draw();
      } catch (e) {
        // Put the box back where the server still has it. A tick that failed but
        // stayed on screen is the worst outcome here: the next person reads the
        // list as "this was done".
        b.checked = !want; b.disabled = false;
        toast(e.message, false);
      }
    });
  };

  const draw = () => { drawTrack(); drawProgress(); drawSteps(); };
  draw();

  // Starting over is separate from unticking twelve boxes, and confirmed inline
  // rather than in a second modal — a device being re-installed is a real case,
  // but so is a stray click on a list somebody spent an hour filling in.
  $('#wz-reset', m).onclick = () => {
    $('#wz-reset-confirm', m).innerHTML = `
      <p style="color:var(--warn-ink);font-size:13px;margin:14px 0 0">כל הסימונים יימחקו והרשימה תחזור לשלב הראשון. ההגדרות של המכשיר עצמו לא ישתנו.</p>
      <div class="row"><button class="btn btn-danger" id="wz-y">כן, התחל מחדש</button>
        <button class="btn btn-light" id="wz-n">ביטול</button></div>`;
    $('#wz-n', m).onclick = () => { $('#wz-reset-confirm', m).innerHTML = ''; };
    $('#wz-y', m).onclick = async () => {
      $('#wz-y', m).disabled = true;
      try {
        data = await api(`/devices/${d.id}/setup`, { method: 'DELETE' });
        $('#wz-reset-confirm', m).innerHTML = '';
        draw();
        toast('הצ׳קליסט אופס');
      } catch (e) { $('#wz-y', m).disabled = false; toast(e.message, false); }
    };
  };
}

// Clipboard, with the fallback that matters: the console is reached over
// more30.com, but a venue laptop pointed straight at the Railway host over
// http:// gets no navigator.clipboard, and execCommand still works there.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  const ta = el(`<textarea style="position:fixed;top:-1000px;opacity:0"></textarea>`);
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

function confirmDelete(d) {
  const m = modal(`<h3>מחיקת מכשיר</h3><p style="color:var(--muted)">"${esc(d.name)}" יוסר מהמערכת. פעולה זו אינה הפיכה.</p>
    <div class="row"><button class="btn btn-danger" id="y">מחק</button><button class="btn btn-light" id="n">ביטול</button></div>`);
  $('#y', m).onclick = async () => { try { await api(`/devices/${d.id}`, { method: 'DELETE' }); toast('נמחק'); m.remove(); loadDevices(); } catch (e) { toast(e.message, false); } };
  $('#n', m).onclick = () => m.remove();
}

// ── ENROLL ──────────────────────────────────────────────────────
async function viewEnroll() {
  await loadLinksCache();
  const linkOptions = LINKS.length
    ? `<option value="">— בחרו קישור מהספרייה —</option>` + LINKS.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')
    : '';
  $('#content').innerHTML = `<div class="topbar"><h1>הוספת מכשיר</h1></div>
    <div class="card" style="max-width:640px">
      <h3>יצירת קוד רישום</h3>
      <p style="color:var(--muted)">בחרו איזה קישור ינעל את המכשיר — מהספרייה, או הזנה ידנית. תקבלו קוד בן 6 תווים להזנה באפליקציה.</p>
      <div class="field"><label>שם המכשיר (לזיהוי בדשבורד)</label><input id="e-name" placeholder="למשל: כניסה ראשית" /></div>
      ${LINKS.length ? `<div class="field"><label>קישור מהספרייה</label><select id="e-link">${linkOptions}</select></div>` : `<p style="color:var(--muted);font-size:13px">אין עדיין קישורים בספרייה. הוסיפו ב"ספריית קישורים" או הזינו ידנית למטה.</p>`}
      <div class="field"><label>או כתובת אתר ידנית (הקישור הספציפי של האירוע/אולם)</label><input id="e-url" placeholder="https://example.com/event/123" dir="ltr" /></div>
      <div class="field"><label>חזרה אוטומטית לקישור האירוע לאחר חוסר פעילות (שניות; 0 = כבוי)</label><input id="e-idle" type="number" min="0" value="60" dir="ltr" /></div>
      <button class="btn btn-primary" id="e-create">צור קוד רישום</button>
      <div id="e-result"></div>
    </div>
    <div class="card" style="max-width:640px"><h3>קודי רישום פתוחים</h3><div id="e-list">טוען…</div></div>`;
  $('#e-create').onclick = createEnrollment;
  loadEnrollments();
}
async function createEnrollment() {
  const homeUrl = $('#e-url').value.trim();
  const name = $('#e-name').value.trim();
  const linkId = $('#e-link') ? ($('#e-link').value || null) : null;
  const idleReturnSeconds = Math.max(0, Number($('#e-idle').value) || 0);
  if (!linkId && !homeUrl) return toast('בחרו קישור מהספרייה או הזינו כתובת אתר', false);
  // The fields are only cleared on success, further down — so without a guard
  // here, a second click (or a double-tap) fired while the first request is
  // still in flight reads the same still-filled form and creates a second,
  // independent enrollment. Nothing rejects that as a duplicate: it is a
  // second code for what was meant to be one device, sitting in "קודי רישום
  // פתוחים" until someone notices and deletes it — or worse, gets handed to
  // an installer instead of the first one.
  const btn = $('#e-create');
  btn.disabled = true;
  try {
    const body = linkId ? { linkId: Number(linkId), name, idleReturnSeconds } : { homeUrl, name, idleReturnSeconds };
    const { enrollment } = await api('/enrollments', { method: 'POST', body: JSON.stringify(body) });
    // The code alone was never enough (§2★א): the app asks for a server address
    // too, and that is the value nobody can guess and everybody mistypes. The
    // install link carries both, so it — not the code — is what gets sent on.
    $('#e-result').innerHTML = `<div class="alert alert-ok" style="margin-top:16px">
      נוצר קוד רישום! הזינו אותו באפליקציה במכשיר:<br/><br/>
      <span class="code-chip">${esc(enrollment.code)}</span>
      ${enrollment.installUrl ? `<div style="margin-top:14px">
        <b>קישור ההתקנה</b> — שלחו אותו למי שמתקין. הוא נפתח בדפדפן של המכשיר ומכיל
        גם את כתובת השרת, גם את הקוד וגם את השלבים:<br/>
        <a href="${esc(enrollment.installUrl)}" target="_blank" rel="noopener" dir="ltr"
           style="display:inline-block;margin-top:6px;word-break:break-all">${esc(enrollment.installUrl)}</a>
        <button class="btn btn-light btn-sm" style="margin-inline-start:8px"
          data-copy-link="${esc(enrollment.installUrl)}">העתקת הקישור</button>
      </div>` : ''}</div>`;
    const cp = $('#e-result').querySelector('[data-copy-link]');
    if (cp) cp.onclick = async () => {
      if (await copyText(cp.dataset.copyLink)) toast('קישור ההתקנה הועתק');
      else toast('לא ניתן להעתיק בדפדפן הזה — הקישור מופיע במסך', false);
    };
    $('#e-url').value = ''; $('#e-name').value = '';
    loadEnrollments();
  } catch (e) { toast(e.message, false); }
  finally { btn.disabled = false; }
}
async function loadEnrollments() {
  const { enrollments } = await api('/enrollments');
  const open = enrollments.filter((e) => !e.used);
  const box = $('#e-list'); if (!box) return;
  if (!open.length) { box.innerHTML = '<p style="color:var(--muted);margin:0">אין קודים פתוחים.</p>'; return; }
  // Four columns ending in two buttons, and the אתר cell is an untruncated URL:
  // the table wants 548px inside a 276px card at 390px and dragged the whole
  // console sideways. Same wrapper, same reason, as loadClients() and loadUsers().
  // The other two URL-bearing tables (loadLinks' l-list, loadClients' c-list)
  // cap their URL cell at 220px/230px; this one was contained (wrapped in the
  // overflow-x:auto div) but not bounded, so a long pasted URL alone could
  // still push the cell — and with it every other column on the row — wider
  // than the card. Same cap+ellipsis+title pattern as c-list's `trunc`.
  box.innerHTML = '<div style="overflow-x:auto"><table><tr><th>קוד</th><th>אתר</th><th>שם</th><th></th></tr>' +
    open.map((e) => `<tr><td><span class="code-chip" style="font-size:15px">${esc(e.code)}</span></td><td dir="ltr" style="font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(e.home_url)}">${esc(e.home_url)}</td><td>${esc(e.name || '')}</td><td class="row" style="gap:6px">${
      // A code created in an earlier session is still handed to an installer, so
      // the link belongs on every open row and not only on the one just created.
      // nowrap: the cell is narrow and a two-line button in a row of one-line
      // buttons is what pushed a column off the card edge in clients-console-0811.
      e.installUrl ? `<button class="btn btn-light btn-sm" style="white-space:nowrap" data-copy-link="${esc(e.installUrl)}">קישור התקנה</button>` : ''
    }<button class="btn btn-danger btn-sm" data-del="${e.id}">מחק</button></td></tr>`).join('') + '</table></div>';
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await api('/enrollments/' + b.dataset.del, { method: 'DELETE' }); loadEnrollments(); });
  box.querySelectorAll('[data-copy-link]').forEach((b) => b.onclick = async () => {
    if (await copyText(b.dataset.copyLink)) toast('קישור ההתקנה הועתק');
    else toast('לא ניתן להעתיק בדפדפן הזה', false);
  });
}

// ── LINK LIBRARY ────────────────────────────────────────────────
async function viewLinks() {
  $('#content').innerHTML = `<div class="topbar"><h1>ספריית קישורים</h1></div>
    <div class="card" style="max-width:680px">
      <h3>קישור חדש</h3>
      <p style="color:var(--muted)">שמרו כאן את הקישורים הספציפיים של האירועים/אולמות. בעת הוספת מכשיר תבחרו מתוך הרשימה איזה קישור ינעל אותו.</p>
      <div class="field"><label>שם הקישור</label><input id="l-name" placeholder="למשל: אולם הדר — חתונה 12/8" /></div>
      <div class="field"><label>כתובת הקישור (הדף הספציפי של האירוע)</label><input id="l-url" placeholder="https://example.com/event/123" dir="ltr" /></div>
      <div class="field"><label>דומיינים נוספים מותרים — למשל שער התשלום</label><div id="l-hl"></div></div>
      <button class="btn btn-primary" id="l-create">שמור קישור</button>
    </div>
    <div class="card" style="max-width:680px"><h3>הקישורים שלי</h3><div id="l-list">טוען…</div></div>`;
  const linkHl = hostListEditor($('#l-hl'), '', '');
  $('#l-create').onclick = async () => {
    const name = $('#l-name').value.trim(), url = $('#l-url').value.trim(), allowedHost = linkHl.value();
    if (!name || !url) return toast('נא למלא שם וכתובת', false);
    try { await api('/links', { method: 'POST', body: JSON.stringify({ name, url, allowedHost }) });
      toast('הקישור נשמר'); $('#l-name').value = ''; $('#l-url').value = ''; loadLinks(); }
    catch (e) { toast(e.message, false); }
  };
  loadLinks();
}
async function loadLinks() {
  const { links } = await api('/links'); LINKS = links;
  const box = $('#l-list'); if (!box) return;
  if (!links.length) { box.innerHTML = '<p style="color:var(--muted);margin:0">אין עדיין קישורים.</p>'; return; }
  // The URL column is capped at 220px, which is not enough on its own: four
  // columns still want 408px in a 276px card at 390px.
  box.innerHTML = '<div style="overflow-x:auto"><table><tr><th>שם</th><th>כתובת</th><th>דומיינים מותרים</th><th></th></tr>' +
    links.map((l) => `<tr><td><b>${esc(l.name)}</b></td><td dir="ltr" style="font-size:12px;max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(l.url)}</td>
      <td dir="ltr" style="font-size:12px;color:var(--muted)">${esc(l.allowed_host || '')}</td>
      <td><button class="btn btn-danger btn-sm" data-del="${l.id}">מחק</button></td></tr>`).join('') + '</table></div>';
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await api('/links/' + b.dataset.del, { method: 'DELETE' }); loadLinks(); });
}

// ── CLIENT REGISTRY (§2★ד) ──────────────────────────────────────
//
// Two tiers. Our customer — a hall operator, a chain — registers the businesses
// *they* serve: each gets a short code and a brand site. Staff type the code on
// a device and that business's site comes up, identical on every device. The
// rows live behind /api/clients; this is the only screen that writes them.

let CLIENTS = [];

/** The host of a URL, or '' — used to pin a client's own site in the allow-list. */
function hostOf(url) {
  try { return new URL(url).host.toLowerCase(); } catch { return ''; }
}

async function viewClients() {
  $('#content').innerHTML = `<div class="topbar"><h1>מזהי לקוח</h1></div>
    <div class="card" style="max-width:680px">
      <h3>לקוח חדש</h3>
      <p style="color:var(--muted)">לכל לקוח מזהה קצר ואתר משלו. מי שיזין את המזהה על המכשיר יראה בדיוק את האתר הזה — אותה תצוגה בכל מכשיר.</p>
      <div class="field"><label>שם הלקוח</label><input id="c-name" placeholder="למשל: אולם הדר" /></div>
      <div class="field"><label>מזהה לקוח — אפשר להשאיר ריק ואנחנו נפיק אחד</label><input id="c-code" dir="ltr" placeholder="למשל: 1234" /></div>
      <div class="field"><label>אתר הלקוח שיוצג על המכשיר</label><input id="c-url" placeholder="https://example.com" dir="ltr" /></div>
      <div class="field"><label>דומיינים נוספים מותרים — למשל שער התשלום</label><div id="c-hl"></div></div>
      <div class="field"><label>הערה פנימית (לא מוצגת על המכשיר)</label><input id="c-notes" /></div>
      <button class="btn btn-primary" id="c-create">שמור לקוח</button>
    </div>
    <div class="card"><h3>הלקוחות שלי</h3><div id="c-list">טוען…</div></div>`;
  // The site's own host is added by the server, so nothing is pinned here.
  let hl = hostListEditor($('#c-hl'), '', '');
  $('#c-create').onclick = async () => {
    if (!hl.commitPending()) return;
    const name = $('#c-name').value.trim(), siteUrl = $('#c-url').value.trim();
    if (!name || !siteUrl) return toast('נא למלא שם וכתובת אתר', false);
    // The fields are only cleared on success, below — so without a guard here,
    // a second click while the first POST is still in flight reads the same
    // still-filled form and creates a second client row. Unlike a duplicate
    // enrollment code, an *explicit* code is the one case the server's
    // UNIQUE(owner_id, code) constraint would catch — but "מזהה לקוח" documents
    // leaving the field blank so the server mints one, and a minted code is
    // different on every call, so nothing rejects a second business record for
    // what was meant to be one registration.
    const btn = $('#c-create');
    btn.disabled = true;
    try {
      const { client } = await api('/clients', { method: 'POST', body: JSON.stringify({
        name, code: $('#c-code').value, siteUrl, allowedHost: hl.value(), notes: $('#c-notes').value }) });
      // The generated code is the whole point of the row — say it out loud,
      // because whoever adds the client is the one who has to hand it to staff.
      toast(`הלקוח נשמר. המזהה: ${client.code}`);
      for (const id of ['#c-name', '#c-code', '#c-url', '#c-notes']) $(id).value = '';
      hl = hostListEditor($('#c-hl'), '', '');
      loadClients();
    } catch (e) { toast(e.message, false); }
    finally { btn.disabled = false; }
  };
  loadClients();
}

async function loadClients() {
  const { clients } = await api('/clients'); CLIENTS = clients;
  const box = $('#c-list'); if (!box) return;
  if (!clients.length) {
    box.innerHTML = '<p style="color:var(--muted);margin:0">אין עדיין לקוחות רשומים. הוסיפו לקוח כדי שאפשר יהיה לבחור אותו לפי מזהה על המכשיר.</p>';
    return;
  }
  // Six columns did not fit: the row ends in three buttons, and the table cut
  // the last one off at the edge of the card. The allow-list sits under the URL
  // it belongs to instead of in a column of its own, and the wrapper scrolls on
  // a narrow screen rather than clipping the actions.
  const trunc = 'max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
  box.innerHTML = '<div style="overflow-x:auto"><table>' +
    '<tr><th>מזהה</th><th>שם</th><th>אתר ודומיינים מותרים</th><th>סטטוס</th><th></th></tr>' +
    clients.map((c) => `<tr>
      <td><span class="code-chip" style="font-size:15px">${esc(c.code)}</span></td>
      <td style="min-width:120px"><b>${esc(c.name)}</b>${c.notes ? `<div class="serial">${esc(c.notes)}</div>` : ''}</td>
      <td>
        <div dir="ltr" style="font-size:12px;${trunc}" title="${esc(c.siteUrl)}">${esc(c.siteUrl)}</div>
        <div dir="ltr" style="font-size:12px;color:var(--muted);${trunc}" title="${esc(c.allowedHost || '')}">${esc(c.allowedHost || '')}</div>
      </td>
      <td style="white-space:nowrap">${c.active ? '✅ פעיל' : '⛔ מושבת'}</td>
      <td style="white-space:nowrap"><button class="btn btn-light btn-sm" data-edit="${c.id}">עריכה</button>
        <button class="btn btn-light btn-sm" data-toggle="${c.id}">${c.active ? 'השבתה' : 'הפעלה'}</button>
        <button class="btn btn-danger btn-sm" data-del="${c.id}">מחק</button></td></tr>`).join('') + '</table></div>';
  const find = (id) => CLIENTS.find((c) => String(c.id) === String(id));
  box.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => clientModal(find(b.dataset.edit)));
  box.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = async () => {
    const c = find(b.dataset.toggle);
    // Disabling beats deleting for a client that stopped: the code stays taken,
    // so it cannot be handed to a different business and reach the old site.
    try { await api('/clients/' + c.id, { method: 'PATCH', body: JSON.stringify({ active: !c.active }) }); loadClients(); }
    catch (e) { toast(e.message, false); }
  });
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => confirmDeleteClient(find(b.dataset.del)));
}

function clientModal(c) {
  if (!c) return;
  const m = modal(`<h3>עריכת לקוח</h3>
    <div class="field"><label>שם הלקוח</label><input id="k-name" value="${esc(c.name)}" /></div>
    <div class="field"><label>מזהה לקוח</label><input id="k-code" value="${esc(c.code)}" dir="ltr" /></div>
    <p style="color:var(--muted);font-size:12px;margin:-8px 0 14px">שינוי המזהה מבטל את הקוד שנמסר לצוות — הקוד הישן יפסיק להתאים לאף לקוח.</p>
    <div class="field"><label>אתר הלקוח</label><input id="k-url" value="${esc(c.siteUrl || '')}" dir="ltr" /></div>
    <div class="field"><label>דומיינים מותרים</label><div id="k-hl"></div></div>
    <div class="field"><label>הערה פנימית</label><input id="k-notes" value="${esc(c.notes || '')}" /></div>
    <div class="row"><button class="btn btn-primary" id="k-save">שמירה</button><button class="btn btn-light" id="k-cancel">ביטול</button></div>`);

  let pinned = hostOf(c.siteUrl);
  let hl = hostListEditor($('#k-hl', m), c.allowedHost, pinned);
  const urlIn = $('#k-url', m);
  urlIn.addEventListener('change', () => {
    const next = hostOf(urlIn.value);
    if (next === pinned) return;
    // The old host was pinned because it *was* the site. It no longer is, so it
    // must not stay on the list by inertia — moving a client to a new site
    // would otherwise leave the previous one permanently open on the device.
    const kept = hl.value().split(',').filter((h) => h && h !== pinned).join(',');
    pinned = next;
    hl = hostListEditor($('#k-hl', m), kept, next);
  });

  $('#k-cancel', m).onclick = () => m.remove();
  $('#k-save', m).onclick = async () => {
    if (!hl.commitPending()) return;
    try {
      await api('/clients/' + c.id, { method: 'PATCH', body: JSON.stringify({
        name: $('#k-name', m).value, code: $('#k-code', m).value, siteUrl: urlIn.value,
        allowedHost: hl.value(), notes: $('#k-notes', m).value }) });
      toast('נשמר'); m.remove(); loadClients();
    } catch (e) { toast(e.message, false); }
  };
}

function confirmDeleteClient(c) {
  if (!c) return;
  const m = modal(`<h3>מחיקת לקוח</h3>
    <p style="color:var(--muted)">"${esc(c.name)}" (מזהה ${esc(c.code)}) יימחק. מכשירים שהמזהה הזה אושר להם לא יוכלו עוד לפתוח את האתר שלו.</p>
    <div class="row"><button class="btn btn-danger" id="y">מחק</button><button class="btn btn-light" id="n">ביטול</button></div>`);
  $('#y', m).onclick = async () => {
    try { await api('/clients/' + c.id, { method: 'DELETE' }); toast('נמחק'); m.remove(); loadClients(); }
    catch (e) { toast(e.message, false); }
  };
  $('#n', m).onclick = () => m.remove();
}

// ── SETTINGS ────────────────────────────────────────────────────
function viewSettings() {
  $('#content').innerHTML = `<div class="topbar"><h1>הגדרות</h1></div>
    <div class="card" style="max-width:520px"><h3>שינוי סיסמה</h3>
      ${pwField('cp', 'סיסמה נוכחית', 'current-password')}
      ${pwField('np', 'סיסמה חדשה (8 תווים לפחות)', 'new-password')}
      <button class="btn btn-primary" id="chp">עדכן סיסמה</button></div>`;
  wirePwToggle('cp'); wirePwToggle('np');
  $('#chp').onclick = async () => {
    try { await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: $('#cp').value, newPassword: $('#np').value }) });
      toast('הסיסמה עודכנה'); $('#cp').value = ''; $('#np').value = ''; }
    catch (e) { toast(e.message, false); }
  };
}

// ── ADMIN ───────────────────────────────────────────────────────
async function viewAdmin() {
  if (ME.role !== 'admin') return route('devices');
  $('#content').innerHTML = `<div class="topbar"><h1>ניהול-על</h1><button class="btn btn-primary btn-sm" id="new-user">➕ לקוח חדש</button></div>
    <div class="stat-row" id="stats"></div>
    <div class="card"><h3>לקוחות</h3><div id="users">טוען…</div></div>`;
  $('#new-user').onclick = () => userModal();
  const { stats } = await api('/admin/stats');
  $('#stats').innerHTML = `
    <div class="stat"><div class="v">${stats.users}</div><div class="l">לקוחות</div></div>
    <div class="stat"><div class="v">${stats.devices}</div><div class="l">מכשירים</div></div>
    <div class="stat"><div class="v" style="color:var(--ok-ink)">${stats.online}</div><div class="l">מחוברים כעת</div></div>
    <div class="stat"><div class="v" style="color:var(--muted)">${stats.offline}</div><div class="l">מנותקים</div></div>`;
  loadUsers();
}
async function loadUsers() {
  const { users } = await api('/admin/users');
  // Seven columns ending in three buttons, in a card 276px wide on a phone. The
  // same shape `loadClients()` wraps, and for the same reason — except that here
  // the overflow is not merely cut off: the page is RTL, so it runs off the
  // *left*, and `documentElement.scrollWidth` stays at the window width. Nothing
  // scrolls to reach it. Measured at 390px before the wrapper: the table wanted
  // 444px, and 🗑️ מחק was painted at x = −89, i.e. off screen with no way back.
  // The scroll container is on a wrapper rather than on `#users` itself because
  // the handlers below query `#users`, and an `overflow` on the element holding
  // them would make the buttons scroll but not the header row above them.
  $('#users').innerHTML = '<div style="overflow-x:auto"><table><tr><th>משתמש</th><th>שם</th><th>תפקיד</th><th>מכשירים</th><th>מכסה</th><th>פעיל</th><th></th></tr>' +
    users.map((u) => `<tr>
      <td><b>${esc(u.username)}</b></td><td>${esc(u.full_name || '')}</td>
      <td>${u.role === 'admin' ? '👑 מנהל-על' : 'לקוח'}</td>
      <td>${u.devices_used}</td><td>${u.device_limit}</td>
      <td>${u.active ? '✅' : '⛔'}</td>
      <td>
        <button class="btn btn-light btn-sm" data-edit="${u.id}">ערוך</button>
        <button class="btn btn-light btn-sm" data-pw="${u.id}">סיסמה</button>
        ${u.role === 'admin' ? '' : `<button class="btn btn-danger btn-sm" data-del="${u.id}">מחק</button>`}
      </td></tr>`).join('') + '</table></div>';
  const box = $('#users');
  box.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => { const u = users.find((x) => x.id == b.dataset.edit); userModal(u); });
  box.querySelectorAll('[data-pw]').forEach((b) => b.onclick = () => resetPw(b.dataset.pw));
  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => delUser(b.dataset.del));
}
function userModal(u) {
  const isEdit = !!u;
  const m = modal(`<h3>${isEdit ? 'עריכת לקוח' : 'לקוח חדש'}</h3>
    ${isEdit ? '' : '<div class="field"><label>שם משתמש</label><input id="u-user" dir="ltr" /></div>'}
    <div class="field"><label>שם מלא</label><input id="u-name" value="${esc(u?.full_name || '')}" /></div>
    ${isEdit ? '' : '<div class="field"><label>סיסמה (8+ תווים)</label><input id="u-pass" type="text" dir="ltr" /></div>'}
    <div class="field"><label>מכסת מכשירים</label><input id="u-limit" type="number" min="1" value="${u?.device_limit || 1}" /></div>
    ${isEdit ? `<div class="field"><label>סטטוס</label><select id="u-active"><option value="1" ${u.active ? 'selected' : ''}>פעיל</option><option value="0" ${!u.active ? 'selected' : ''}>מושבת</option></select></div>` : ''}
    <div class="row"><button class="btn btn-primary" id="u-save">שמירה</button><button class="btn btn-light" id="u-cancel">ביטול</button></div>`);
  $('#u-cancel', m).onclick = () => m.remove();
  $('#u-save', m).onclick = async () => {
    try {
      if (isEdit) {
        await api('/admin/users/' + u.id, { method: 'PATCH', body: JSON.stringify({ fullName: $('#u-name', m).value, deviceLimit: Number($('#u-limit', m).value), active: Number($('#u-active', m).value) }) });
      } else {
        await api('/admin/users', { method: 'POST', body: JSON.stringify({ username: $('#u-user', m).value, password: $('#u-pass', m).value, fullName: $('#u-name', m).value, deviceLimit: Number($('#u-limit', m).value) }) });
      }
      toast('נשמר'); m.remove(); loadUsers();
    } catch (e) { toast(e.message, false); }
  };
}
function resetPw(id) {
  const m = modal(`<h3>איפוס סיסמה</h3><div class="field"><label>סיסמה חדשה (8+ תווים)</label><input id="pw" type="text" dir="ltr" /></div>
    <div class="row"><button class="btn btn-primary" id="ok">אפס</button><button class="btn btn-light" id="c">ביטול</button></div>`);
  $('#ok', m).onclick = async () => { try { await api(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: $('#pw', m).value }) }); toast('הסיסמה אופסה'); m.remove(); } catch (e) { toast(e.message, false); } };
  $('#c', m).onclick = () => m.remove();
}
function delUser(id) {
  const m = modal(`<h3>מחיקת לקוח</h3><p style="color:var(--muted)">כל המכשירים של הלקוח יימחקו. להמשיך?</p>
    <div class="row"><button class="btn btn-danger" id="y">מחק</button><button class="btn btn-light" id="n">ביטול</button></div>`);
  $('#y', m).onclick = async () => { try { await api('/admin/users/' + id, { method: 'DELETE' }); toast('נמחק'); m.remove(); loadUsers(); } catch (e) { toast(e.message, false); } };
  $('#n', m).onclick = () => m.remove();
}

// ── GUIDE (the way into the per-device wizard) ──────────────────
//
// This screen used to hold install instructions of its own: four paragraphs, no
// tick boxes, not tied to any device, and stopping at enrollment — it called
// Device Owner "מומלץ" and never reached the part that actually locks the
// tablet. Since `setupWizard()` landed, that made it the *second* description of
// the same install, and the two disagreed. Two sets of instructions that
// disagree are worse than one, and the wrong one to keep is the one that cannot
// know the device's enrollment code, its server address or how far the
// installer already got.
//
// So this screen no longer instructs. It says where the instructions are and
// opens them — which is a real job, because the wizard lives behind a button on
// a device card, and "הוראות הפעלה" in the sidebar is where someone looking for
// instructions goes first.
async function viewGuide() {
  $('#content').innerHTML = `<div class="topbar"><h1>הוראות הפעלה</h1></div>
  <div class="card" style="max-width:820px">
    <h3>ההוראות שייכות למכשיר עצמו</h3>
    <p style="color:var(--muted)">כל שלבי ההתקנה — מהעברת קובץ ה-APK ועד שהטאבלט עולה נעול מעצמו אחרי אתחול — נמצאים ב<b>אשף ההתקנה</b> של אותו מכשיר: רשימה שבה לכל שלב יש תיבת סימון, וכתוב בו מה בדיוק ללחוץ, על מה לאשר ומה אמור להופיע על המסך אחרי הלחיצה.</p>
    <p style="color:var(--muted)">האשף הוא היחיד שיכול להיות מדויק: הוא מציג בתוך השלבים את קוד הרישום ואת כתובת השרת של המכשיר שנבחר, ומתאים את הניסוח למסלול שלו (מכשיר עם שירותי Google או אנדרואיד גנרי). הסימונים נשמרים בשרת ולא בדפדפן, כך שאפשר לסמן חלק מהשלבים כאן, להמשיך ליד הטאבלט, ולעבור את האתחול שהרשימה עצמה מבקשת בלי לאבד אותם.</p>
    <div id="gd-list" style="margin-top:20px"><p style="color:var(--muted)">טוען…</p></div>
    <p style="margin:22px 0 0"><a href="${BASE}/docs/user-guide-he.md" target="_blank">📄 מדריך המשתמש המלא (רקע מורחב, מעבר לשלבי ההתקנה)</a></p>
  </div>`;

  // The devices are fetched rather than read off DEVICES: this screen can be the
  // first one opened in a session, and an empty cache would render as "no
  // devices" — the one state here that sends the reader somewhere else entirely.
  try { await loadDevices(); }
  catch (e) {
    const box = $('#gd-list'); if (box) box.innerHTML = `<p style="color:var(--danger-text)">${esc(e.message)}</p>`;
    return;
  }

  const box = $('#gd-list'); if (!box) return;   // navigated away while loading
  if (!DEVICES.length) {
    box.innerHTML = `<p style="color:var(--muted)">אין עדיין מכשירים, והאשף שייך למכשיר — הוא נפתח מכרטיס המכשיר ברשימה. השלב הראשון הוא ליצור קוד רישום; אחריו המכשיר מופיע כאן והאשף ממשיך משם.</p>`;
    const b = el('<button class="btn btn-primary">➕ הוספת מכשיר</button>');
    b.onclick = () => route('enroll', true);
    box.appendChild(b);
    return;
  }

  // No parentheses around the button's name: it is an LTR emoji next to Hebrew,
  // and a bracket pair that wraps across a line lands on the wrong sides of it.
  box.innerHTML = `<p style="color:var(--muted)">בחרו מכשיר כדי לפתוח את האשף שלו. אותו אשף נפתח גם מכרטיס המכשיר ברשימת המכשירים — הכפתור הראשון בכרטיס, <b>🚀 הפעל</b>.</p>`;
  // `.hl-row` is the console's existing row shape (the domain allow-list uses
  // it) and it is a flex row without spacing between rows, so the rows are laid
  // out by their container here rather than by a new class.
  const rows = el('<div style="display:grid;gap:8px"></div>');
  for (const d of DEVICES) {
    const row = el(`<div class="hl-row"><span style="flex:1;min-width:0">${esc(d.name)}
      <span style="display:block;color:var(--muted);font-size:12px;font-family:monospace">S/N: ${esc(d.serial)}</span></span></div>`);
    const b = el('<button class="btn btn-primary btn-sm">🚀 אשף התקנה</button>');
    b.onclick = () => setupWizard(d);
    row.appendChild(b);
    rows.appendChild(row);
  }
  box.appendChild(rows);
}

// ── start ───────────────────────────────────────────────────────
if (TOKEN) boot(); else { $('#login-view').classList.remove('hidden'); }
