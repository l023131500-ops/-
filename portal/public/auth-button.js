/**
 * more30 — כפתור הכניסה המשותף לכל מערכות הפלטפורמה.
 *
 * למה קובץ אחד ולא רכיב React: 33 המערכות בנויות בטכנולוגיות שונות (Next,
 * Vite+React, סטטי), נפרסות כפרויקטים נפרדים ואין להן node_modules משותף.
 * קובץ יחיד שכולן טוענות מ-more30.com הוא הדרך היחידה שבה זה באמת **אותו**
 * רכיב: תיקון אחד כאן משנה את הכפתור בכולן, בלי לבנות 33 אפליקציות מחדש.
 *
 * שילוב במערכת: שורה אחת ב-HTML.
 *   <script src="https://more30.com/auth-button.js" defer></script>
 *
 * העיצוב יושב ב-Shadow DOM, ולכן ה-CSS של המערכת המארחת אינו נוגע בו ואינו
 * מושפע ממנו. זה מה שמבטיח מראה זהה בכל המערכות ולא רק כוונה לזהות.
 */
(function () {
  'use strict';

  var TAG = 'more30-auth';
  if (window.__more30AuthButton || document.querySelector(TAG)) return;
  window.__more30AuthButton = true;

  var HOME = 'https://more30.com';
  var ADMIN_URL = HOME + '/admin';
  var LOGIN_URL = HOME + '/login';
  var ME_URL = HOME + '/me';

  // כל המערכות מוגשות תחת more30.com (ניתוב בנתיבים, לא בתת-דומיינים), ולכן
  // הן חולקות origin אחד — והסשן שנוצר ב-/login נגיש מכל מערכת כמו שהוא.
  // זה מה שמאפשר לכפתור לדעת מי מחובר בלי קריאת רשת ובלי תלות ב-supabase-js.
  var SESSION_KEY = 'more30-auth';
  var SUPABASE_URL = 'https://uhnrgujbdxhhmoxcjria.supabase.co';
  var SUPABASE_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVobnJndWpiZHhoaG1veGNqcmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNjE3MjgsImV4cCI6MjA5ODkzNzcyOH0.nHuOhw-WQEU17lNa7XOlORnBhVAYbJBHudKafWkSHBw';

  // סשן שפג תוקפו הוא לא סשן. עדיף להציג "כניסה" מאשר להציג שם של מי
  // שכבר לא מחובר ולתת לו למצוא את זה לבד במסך הראשון שיידחה אותו.
  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.user) return null;
      if (s.expires_at && s.expires_at * 1000 <= Date.now()) return null;
      return {
        token: s.access_token,
        label: (s.user.user_metadata && s.user.user_metadata.username) || s.user.email,
      };
    } catch (e) {
      return null;
    }
  }

  function signOut(token) {
    // מנקים מקומית תמיד — גם אם הבקשה לשרת נכשלת, המשתמש ביקש לצאת ולא
    // יישאר מחובר בדפדפן שלו בגלל תקלת רשת.
    var done = function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      location.reload();
    };
    if (!token) return done();
    fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token },
    }).then(done, done);
  }

  var CSS = [
    ':host{all:initial;direction:rtl}',
    '*,*::before,*::after{box-sizing:border-box}',
    '.wrap{position:fixed;inset-inline-start:16px;inset-block-end:16px;z-index:2147483000;',
    "font-family:'Heebo',system-ui,-apple-system,'Segoe UI',sans-serif}",
    '.pill{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;',
    'padding:10px 16px;border-radius:999px;background:#0B0D2E;color:#ECE9F5;',
    'font-size:14px;font-weight:700;line-height:1;',
    'box-shadow:0 6px 20px rgba(11,13,46,.28);transition:transform .12s ease,box-shadow .12s ease}',
    '.pill:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(11,13,46,.34)}',
    // שם משתמש יכול להיות כתובת אימייל ארוכה; בלי גבול הכפתור גולש מהמסך במובייל.
    '.pill>span:last-child{max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pill:disabled{cursor:progress;opacity:.7}',
    '.pill:focus-visible{outline:3px solid #C9A227;outline-offset:2px}',
    '.dot{width:9px;height:9px;border-radius:50%;background:#C9A227;flex:none;',
    'box-shadow:0 0 0 3px rgba(201,162,39,.25)}',
    '.menu{position:absolute;inset-block-end:calc(100% + 10px);inset-inline-start:0;',
    'min-width:232px;background:#fff;border-radius:14px;padding:8px;',
    'box-shadow:0 18px 44px rgba(11,13,46,.22);border:1px solid #e7e8f0}',
    '.menu[hidden]{display:none}',
    '.head{padding:8px 10px 6px;font-size:11px;font-weight:700;color:#6b7086;letter-spacing:.02em}',
    '.item{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;',
    'cursor:pointer;padding:11px 10px;border-radius:10px;text-align:start;',
    'font-size:14px;font-weight:600;color:#0B0D2E;font-family:inherit;text-decoration:none}',
    '.item:hover{background:#f3f4fa}',
    '.item:focus-visible{outline:2px solid #C9A227;outline-offset:-2px}',
    '.item .sub{display:block;font-size:11px;font-weight:400;color:#6b7086;margin-top:2px}',
    '.ico{width:26px;height:26px;flex:none;border-radius:8px;display:grid;place-items:center;',
    'background:#eef0fa;color:#0B0D2E}',
    '.ico svg{width:15px;height:15px;display:block}',
    '.sep{height:1px;background:#eceef6;margin:6px 8px}',
    '@media print{.wrap{display:none}}',
  ].join('');

  var USER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var ADMIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';

  var EXIT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>' +
    '<line x1="21" y1="12" x2="9" y2="12"/></svg>';

  // שם המשתמש מגיע ממאגר המשתמשים ונשתל ב-HTML, ולכן הוא עובר בריחה.
  function escapeText(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  class More30AuthElement extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      var root = this.attachShadow({ mode: 'open' });
      var style = document.createElement('style');
      style.textContent = CSS;

      // הכתובת הנוכחית נוסעת עם הכניסה, כדי שאחריה יחזירו את המשתמש לאן שהיה.
      var back = encodeURIComponent(location.href);
      var session = readSession();

      var adminItem =
        '<a class="item" role="menuitem" href="' + ADMIN_URL + '">' +
          '<span class="ico">' + ADMIN_ICON + '</span>' +
          '<span>כניסת ניהול<span class="sub">מרכז השליטה של הפלטפורמה</span></span>' +
        '</a>';

      var meItem =
        '<a class="item" role="menuitem" href="' + ME_URL + '">' +
          '<span class="ico">' + USER_ICON + '</span>' +
          '<span>האזור האישי<span class="sub">החשבון, התוכנית וההיסטוריה שלך</span></span>' +
        '</a>';

      var menuInner = session
        ? '<div class="head">מחובר כ־' + escapeText(session.label) + '</div>' +
          meItem +
          adminItem +
          '<div class="sep"></div>' +
          '<button class="item" role="menuitem" type="button" data-act="signout">' +
            '<span class="ico">' + EXIT_ICON + '</span>' +
            '<span>יציאה<span class="sub">מכל מערכות more30</span></span>' +
          '</button>'
        : '<div class="head">כניסה למערכות more30</div>' +
          '<a class="item" role="menuitem" href="' + LOGIN_URL + '?from=' + back + '">' +
            '<span class="ico">' + USER_ICON + '</span>' +
            '<span>כניסת משתמש<span class="sub">לאזור האישי ולמערכות שלך</span></span>' +
          '</a>' +
          '<div class="sep"></div>' +
          adminItem;

      var wrap = el(
        '<div class="wrap">' +
          '<div class="menu" hidden role="menu" aria-label="כניסה למערכות more30">' +
            menuInner +
          '</div>' +
          '<button class="pill" type="button" aria-haspopup="true" aria-expanded="false">' +
            '<span class="dot"></span>' +
            '<span>' + (session ? escapeText(session.label) : 'כניסה') + '</span>' +
          '</button>' +
        '</div>',
      );

      root.appendChild(style);
      root.appendChild(wrap);

      var btn = root.querySelector('.pill');
      var menu = root.querySelector('.menu');

      var setOpen = function (open) {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

      var out = root.querySelector('[data-act="signout"]');
      if (out) {
        out.addEventListener('click', function () {
          out.disabled = true;
          signOut(session && session.token);
        });
      }

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(menu.hidden);
      });
      document.addEventListener('click', function () {
        setOpen(false);
      });
      root.addEventListener('click', function (e) {
        e.stopPropagation();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setOpen(false);
      });
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, More30AuthElement);

  function mount() {
    if (document.querySelector(TAG)) return;
    document.body.appendChild(document.createElement(TAG));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
