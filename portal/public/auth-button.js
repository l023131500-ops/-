/**
 * more30 — כפתור הכניסה המשותף לכל מערכות הפלטפורמה.
 *
 * למה קובץ אחד ולא רכיב React: 33 המערכות בנויות בטכנולוגיות שונות (Next,
 * Vite+React, TanStack, סטטי), נפרסות כפרויקטים נפרדים ואין להן node_modules
 * משותף. קובץ יחיד שכולן טוענות מ-more30.com הוא הדרך היחידה שבה זה באמת
 * **אותו** רכיב: תיקון אחד כאן משנה את הכפתור בכולן, בלי לבנות 33 אפליקציות.
 *
 * שילוב במערכת: שורה אחת ב-HTML.
 *   <script src="https://more30.com/auth-button.js" defer></script>
 *
 * העיצוב יושב ב-Shadow DOM, ולכן ה-CSS של המערכת המארחת אינו נוגע בו ואינו
 * מושפע ממנו. זה מה שמבטיח מראה זהה בכל המערכות ולא רק כוונה לזהות.
 *
 * מה הכפתור עושה מעבר לתצוגה:
 *  · רושם את המשתמש כחבר באתר שבו הוא נמצא (core.app_memberships) — כניסה
 *    לאתר X נותנת חברות ל-X בלבד.
 *  · שואל את השרת אם הוא מנהל **של האתר הזה**, ורק אז מציג "ניהול".
 *    ההרשאה לא נקבעת לפי מה שהדפדפן חושב.
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
      var meta = s.user.user_metadata || {};
      return {
        token: s.access_token,
        label: meta.full_name || meta.username || shortEmail(s.user.email),
      };
    } catch (e) {
      return null;
    }
  }

  // כתובת פנימית (eueu1234@more30.com) היא בפועל שם משתמש — מציגים אותו ככזה.
  function shortEmail(email) {
    var e = String(email || '');
    return e.indexOf('@more30.com') > -1 ? e.split('@')[0] : e;
  }

  function rpc(name, body, token) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: 'Bearer ' + token,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    }).then(function (r) {
      return r.ok ? r.json() : null;
    });
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
    // הכפתור יושב בראש העמוד, באותו מקום בכל 33 המערכות — זה מה שהופך אותו
    // ל"נווט עליון אחיד" ולא לפריט שכל מערכת ממקמת אחרת. inset-inline-end
    // כי בעברית פעולות החשבון יושבות בקצה השמאלי של הסרגל.
    '.wrap{position:fixed;inset-inline-end:16px;inset-block-start:12px;z-index:2147483000;',
    "font-family:'Heebo',system-ui,-apple-system,'Segoe UI',sans-serif}",
    '.pill{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;',
    'padding:9px 15px;border-radius:999px;background:#0B0D2E;color:#ECE9F5;',
    'font-size:14px;font-weight:700;line-height:1;min-height:36px;',
    'box-shadow:0 6px 20px rgba(11,13,46,.28);transition:transform .12s ease,box-shadow .12s ease}',
    '.pill:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(11,13,46,.34)}',
    // שם משתמש יכול להיות כתובת אימייל ארוכה; בלי גבול הכפתור גולש מהמסך במובייל.
    '.pill>span:last-child{max-width:11ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.pill:disabled{cursor:progress;opacity:.7}',
    '.pill:focus-visible{outline:3px solid #C9A227;outline-offset:2px}',
    '.dot{width:9px;height:9px;border-radius:50%;background:#C9A227;flex:none;',
    'box-shadow:0 0 0 3px rgba(201,162,39,.25)}',
    // התפריט נפתח כלפי מטה, כי הכפתור בראש העמוד.
    '.menu{position:absolute;inset-block-start:calc(100% + 10px);inset-inline-end:0;',
    'min-width:248px;background:#fff;border-radius:14px;padding:8px;',
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
    '.gold .ico{background:#fbf3d8;color:#8a6d10}',
    '.sep{height:1px;background:#eceef6;margin:6px 8px}',
    '@media print{.wrap{display:none}}',
    '@media (max-width:480px){.wrap{inset-inline-end:10px;inset-block-start:8px}}',
  ].join('');

  var USER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  var ADMIN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  var STAR_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<polygon points="12 2 15.1 8.6 22 9.6 17 14.5 18.2 21.4 12 18.1 5.8 21.4 7 14.5 2 9.6 8.9 8.6 12 2"/></svg>';
  var ADD_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>' +
    '<line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>';
  var EXIT_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/>' +
    '<line x1="21" y1="12" x2="9" y2="12"/></svg>';

  // ── המשתנה --more30-auth-inset ─────────────────────────────────────────
  // הכדור הוא `position: fixed` בקצה האינליין-סופי, ובעברית זו הפינה
  // השמאלית העליונה — בדיוק המקום שבו נווט עם `justify-between` מניח את
  // הפקד האחרון שלו. נמדד על 24 הנתיבים החיים: ב-11 מהם הלחיצה הגיעה
  // **לכדור** ולא לפקד, כלומר הפקד לא היה ניתן ללחיצה כלל.
  //
  // הפתרון אינו מספר קשיח בכל מערכת — הרוחב של הכדור משתנה לפי שם
  // המשתמש ("כניסה" לעומת "אברהם"), לפי הפונט שנטען ולפי רוחב המסך. לכן
  // הרכיב מפרסם את המקום שהוא **באמת** תופס, וכל נווט מפנה לו מקום דרך
  // `padding-inline-end: var(--more30-auth-inset)`.
  //
  // ערך התחלתי נכתב מיד, לפני המדידה, כדי שהנווט לא יקפוץ בין שני מצבים.
  var GAP = 12;
  function edgeInset() {
    return window.innerWidth <= 480 ? 10 : 16;
  }
  function setVars(pillWidth, pillHeight) {
    var d = document.documentElement;
    d.style.setProperty('--more30-auth-inset', Math.round(edgeInset() + pillWidth + GAP) + 'px');
    d.style.setProperty('--more30-auth-height', Math.round(pillHeight) + 'px');
    d.style.setProperty(
      '--more30-auth-block',
      Math.round((window.innerWidth <= 480 ? 8 : 12) + pillHeight + GAP) + 'px',
    );
  }
  setVars(96, 36);

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

  function item(href, icon, title, sub, cls) {
    return (
      '<a class="item ' + (cls || '') + '" role="menuitem" href="' + href + '">' +
        '<span class="ico">' + icon + '</span>' +
        '<span>' + title + '<span class="sub">' + sub + '</span></span>' +
      '</a>'
    );
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

      var wrap = el(
        '<div class="wrap">' +
          '<button class="pill" type="button" aria-haspopup="true" aria-expanded="false">' +
            '<span class="dot"></span>' +
            '<span>' + (session ? escapeText(session.label) : 'כניסה') + '</span>' +
          '</button>' +
          '<div class="menu" hidden role="menu" aria-label="חשבון more30"></div>' +
        '</div>',
      );

      root.appendChild(style);
      root.appendChild(wrap);

      var btn = root.querySelector('.pill');
      var menu = root.querySelector('.menu');

      // התפריט נבנה מחדש בכל שינוי הקשר (למשל כשהשרת עונה מי מנהל), כדי
      // שלא יהיו שתי גרסאות של אותו תפריט שמתפצלות בתיקון הראשון.
      function render(ctx) {
        if (!session) {
          menu.innerHTML =
            '<div class="head">כניסה למערכות more30</div>' +
            item(LOGIN_URL + '?from=' + back, USER_ICON, 'כניסה',
                 'חשבון אחד לכל המערכות') +
            item(LOGIN_URL + '?mode=signup&from=' + back, ADD_ICON, 'הרשמה',
                 'פתיחת חשבון חדש — לוקח פחות מדקה');
          return;
        }

        var label = (ctx && ctx.full_name) || session.label;
        // בסרגל מוצג השם הפרטי בלבד — "עולם הסטארטאפים" נחתך באמצע מילה
        // ונראה כמו תקלה. השם המלא מופיע בכותרת התפריט.
        btn.querySelector('span:last-child').textContent = String(label).split(/\s+/)[0];

        var html =
          '<div class="head">מחובר כ־' + escapeText(label) + '</div>' +
          item(ME_URL, USER_ICON, 'האזור האישי', 'החשבון, התוכנית והאתרים שלך');

        // "ניהול" מוצג רק למי שהשרת אישר שהוא מנהל של האתר הזה — סופר-אדמין
        // גלובלי או אדמין מקומי. עד שהתשובה מגיעה, אין פריט.
        if (ctx && ctx.is_admin) {
          html += item(
            ctx.admin_href || ADMIN_URL, ADMIN_ICON, 'ניהול',
            ctx.is_super_admin && ctx.app_name
              ? 'ניהול ' + escapeText(ctx.app_name)
              : 'ניהול המערכת',
          );
        }
        // מסכי הניהול החדשים מוגשים מהפורטל ולא מאפליקציית ‎/admin‎, ולכן
        // אין להם שום קישור נכנס משם — ‎/admin‎ הוא מעטפת SPA שמצייר את
        // התוכן שלה ב-JS. בלי הפריטים האלה הם פשוט לא ניתנים למציאה.
        // הכפתור הזה נטען בכל 24 המערכות, ולכן זה גם הופך אותם לנגישים
        // מכל מקום בלי לגעת באפליקציית הניהול החיה.
        if (ctx && ctx.is_super_admin) {
          html += item(ADMIN_URL, ADMIN_ICON, 'מרכז השליטה', 'כל המערכות במקום אחד');
          html += item(HOME + '/admin/systems', ADMIN_ICON, 'דוח מערכות',
                       'סטטוס, משתמשים, מנויים והכנסה');
          html += item(HOME + '/admin/pricing', STAR_ICON, 'מחירים ותצוגה',
                       'מחיר לכל מערכת · הצגה בעולם הסטארטאפים', 'gold');
          html += item(HOME + '/admin/customers', ADD_ICON, 'לקוחות',
                       'צירוף לקוח למערכת וצפייה ברשומים');
          html += item(HOME + '/admin/automation', STAR_ICON, 'אוטומציית תוכן',
                       'נושאים, תצוגה מקדימה ותור שליחה — מצב בדיקה');
          html += item(HOME + '/admin/credits', STAR_ICON, 'יתרות וחיבורים',
                       'האם כל ספק פועל, כמה נשאר, ואיפה מוסיפים');
          html += item(HOME + '/admin/issues', ADMIN_ICON, 'תקלות ומה דורש אותך',
                       'פתוח, בטיפול ותוקן — מופרד לפי מי יכול לסגור');
          html += item(HOME + '/admin/rights', STAR_ICON, 'מאגר הזכויות',
                       'ניהול התוכן של מערכת 10 — מה יש ואיפה חסר');
        }

        // שדרוג מוצג למשתמש רגיל בתוכנית החינמית. למנהל אין מה לשדרג.
        if (ctx && ctx.plan === 'free' && !ctx.is_super_admin) {
          html += item(ME_URL + '?upgrade=1', STAR_ICON, 'שדרוג לפרימיום',
                       'פתיחת כל היכולות בכל המערכות', 'gold');
        }

        html +=
          '<div class="sep"></div>' +
          '<button class="item" role="menuitem" type="button" data-act="signout">' +
            '<span class="ico">' + EXIT_ICON + '</span>' +
            '<span>יציאה<span class="sub">מכל מערכות more30</span></span>' +
          '</button>';

        menu.innerHTML = html;

        var out = menu.querySelector('[data-act="signout"]');
        if (out) {
          out.addEventListener('click', function () {
            out.disabled = true;
            signOut(session.token);
          });
        }
      }

      // המדידה נעשית על הכדור עצמו ולא על מספר משוער, כי רוחבו נקבע משם
      // המשתמש ומהפונט שנטען — שניהם לא ידועים בזמן כתיבת הקוד.
      function measure() {
        var r = btn.getBoundingClientRect();
        if (r.width) setVars(r.width, r.height);
      }

      render(null);
      measure();

      // שני הרגעים שבהם הרוחב משתנה אחרי הציור הראשון: הפונט מסיים לרדת,
      // והשרת עונה מי המשתמש ("כניסה" → שם פרטי).
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(measure).catch(function () {});
      }
      addEventListener('resize', measure);

      // רישום החברות באתר הנוכחי + שאלת ההרשאה, בקריאה אחת. נכשלת בשקט:
      // תקלת רשת לא אמורה להשאיר את המשתמש בלי כפתור.
      if (session && session.token) {
        rpc('more30_join_app', { p_app: location.href }, session.token)
          .then(function (ctx) { if (ctx && ctx.ok) { render(ctx); measure(); } })
          .catch(function () {});
      }

      var setOpen = function (open) {
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };

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

  /**
   * קרדיט הפוטר — "פותח ע״י עולם הסטארטאפים", בכל מערכת.
   *
   * למה כאן ולא ב-24 קודקודים נפרדים: זה בדיוק אותו שיקול שבגללו הכפתור
   * עצמו יושב בקובץ הזה. שורה שצריכה להופיע בכל אתר ולהיראות אותו דבר בכולם
   * חייבת לחיות במקום אחד, אחרת היא תהיה 24 גרסאות שמתפצלות.
   *
   * ── למה **לא** בתוך ה-<footer> הקיים, אף שזה נראה הטבעי יותר
   * הגרסה הראשונה הכניסה את השורה לתוך ה-`<footer>` של האתר, כדי שתיראה חלק
   * מהעיצוב. זה עבד — ושבר את ההידרציה. ב-`/modaot` קפצו שלוש שגיאות React
   * (#425, #418, #423) שלא היו שם לפני כן: ה-`<footer>` הוא חלק מהעץ ש-React
   * מרנדר, והוספת צומת לתוכו לפני ההידרציה גורמת ל-HTML מהשרת ולרינדור
   * בדפדפן לא להסכים. התוצאה אינה קוסמטית — React זורק את כל העץ ומרנדר מחדש
   * בצד הלקוח, כלומר האתר מאבד את ה-SSR שלו בגלל שורת קרדיט.
   *
   * לכן הכלל: **לא נוגעים בעץ של המסגרת.** הקרדיט נוסף כבלוק משלו בסוף
   * ה-`<body>`, בדיוק כמו הכפתור — ושם הוא מעולם לא הפריע לאף אתר, כי הוא
   * מחוץ לשורש שהמסגרת מרנדרת. ויזואלית הוא יושב מתחת לפוטר במקום בתוכו;
   * זה מחיר קטן לעומת שבירת ההידרציה של מערכת עם סליקה חיה.
   *
   * שני כללים נוספים:
   *  · יורש `color` ו-`font` מהסביבה ומורד לשקיפות חלקית, ולכן הוא מתאים
   *    את עצמו למצב כהה ולפלטה של כל אתר בלי שנצטרך לדעת מה הם.
   *  · אם כבר קיים קרדיט כזה בדף (למשל בפורטל עצמו) — לא מוסיף שני.
   */
  var CREDIT_CLASS = 'more30-credit';

  function mountCredit() {
    if (document.querySelector('.' + CREDIT_CLASS)) return;

    // בפורטל עצמו הקרדיט מיותר — הוא כבר הבית.
    try {
      if (location.hostname === 'more30.com' && location.pathname === '/') return;
    } catch (e) {}

    var link = document.createElement('a');
    link.className = CREDIT_CLASS;
    link.href = HOME;
    link.textContent = 'פותח ע״י עולם הסטארטאפים';
    link.rel = 'noopener';
    link.setAttribute('dir', 'rtl');
    link.style.cssText = [
      'display:block',
      'text-align:center',
      'font:inherit',
      'font-size:12px',
      'line-height:1.6',
      'padding:10px 12px',
      'color:inherit',
      'opacity:.65',
      'text-decoration:none',
    ].join(';');
    link.addEventListener('mouseenter', function () { link.style.opacity = '1'; });
    link.addEventListener('mouseleave', function () { link.style.opacity = '.65'; });

    var box = document.createElement('div');
    box.setAttribute('data-more30-credit', '');
    box.style.cssText = 'padding:8px 0 18px;color:inherit';
    box.appendChild(link);
    document.body.appendChild(box);
  }

  function mount() {
    if (!document.querySelector(TAG)) {
      document.body.appendChild(document.createElement(TAG));
    }
    mountCredit();
  }

  /**
   * שמירה על הכפתור אחרי הידרציה — ולא רק הוספה שלו.
   *
   * ב-`/nadlan` (Next.js) הכפתור פשוט לא היה שם, ולא בגלל שגיאת טעינה: הקובץ
   * חזר 200, הקוד רץ, `window.__more30AuthButton` היה `true` — ובכל זאת
   * `<more30-auth>` לא היה ב-DOM. הסיבה היא React #418 ו-#423 שהופיעו באותו
   * דף: כשההידרציה נכשלת React מרנדר את העץ מחדש מאפס, **ומוחק כל צומת
   * שהוא לא יצר** — כולל מה שהזרקנו לפניה.
   *
   * מכאן ההבחנה: "להוסיף את הכפתור" ו"שהכפתור יישאר" הן שתי דרישות שונות,
   * והקוד הכיר רק את הראשונה. מסגרת שמרנדרת מחדש היא התנהגות נורמלית ולא
   * תקלה, ולכן התיקון אינו לתזמן טוב יותר — אין רגע שבטוח בכל 33 המערכות —
   * אלא לשמור על הנוכחות: אם הצומת נעלם, הוא חוזר.
   *
   * מוגבל בזמן ובמספר ניסיונות כדי שלא ייווצר לולאה אינסופית מול מסגרת
   * שמתעקשת למחוק — עדיף כפתור חסר מאשר דף שנלחם בעצמו לנצח.
   */
  function keepMounted() {
    if (!window.MutationObserver) return;

    var restores = 0;
    var pending = false;

    var observer = new MutationObserver(function () {
      if (pending) return;
      if (document.querySelector(TAG) && document.querySelector('.' + CREDIT_CLASS)) return;
      if (restores >= 20) {
        observer.disconnect();
        return;
      }
      pending = true;
      // אחרי ה-microtask הנוכחי: נותן למסגרת לסיים את מחזור הרינדור שלה
      // במקום להתחרות איתה באמצע.
      requestAnimationFrame(function () {
        pending = false;
        restores++;
        mount();
      });
    });

    observer.observe(document.body, { childList: true });

    // ההידרציה של רוב המסגרות מסתיימת אחרי `load`; ניסיון אחד נוסף שם מכסה
    // את המקרה שבו העץ הוחלף בלי שהתצפית תפסה את הסדר.
    window.addEventListener('load', function () {
      setTimeout(mount, 0);
    });

    // ‎`pageshow` מכסה חזרה מ-bfcache, שבה הדף חוזר בלי להריץ את הסקריפט שוב.
    window.addEventListener('pageshow', function () { mount(); });
  }

  function boot() {
    mount();
    keepMounted();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
