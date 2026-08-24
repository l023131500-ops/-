/* Admin panel: login gate + leads management.
 *
 * SECURITY: this file used to carry the admin username and password as plain
 * literals, and this repo is public — so they were published, not merely
 * readable by a visitor. They have been removed. There is no env var to move
 * them to: this is a static site with no build step, so anything the gate could
 * compare against would ship to the browser just the same. The gate therefore
 * fails closed, exactly as apps/27-bkalut-price/server/auth.ts does when no
 * credential is configured, rather than falling back to a known-public default.
 *
 * Measured 07/08/2026, so this is not a live regression: production does not
 * serve this page at all. more30.com/briut/admin.html returns the SPA fallback
 * — byte-identical to more30.com/briut/ — so nothing that works today stops
 * working. Real access needs server-side auth (an Edge Function or an RPC in
 * SECURITY DEFINER), which is the same fix /galil/gabai is waiting on.
 */
(function () {
  "use strict";

  var SESSION_KEY = "kupot_admin_session";

  var loginView = document.getElementById("loginView");
  var dashView = document.getElementById("dashView");
  var loginForm = document.getElementById("loginForm");
  var loginErr = document.getElementById("loginErr");

  var ALL = [];   // all leads
  var VIEW = [];  // filtered

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fundKey(name) {
    if (!name) return "";
    if (name.indexOf("כללית") >= 0) return "clalit";
    if (name.indexOf("מכבי") >= 0) return "maccabi";
    if (name.indexOf("מאוחדת") >= 0) return "meuhedet";
    if (name.indexOf("לאומית") >= 0) return "leumit";
    return "";
  }
  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      var p = function (n) { return (n < 10 ? "0" : "") + n; };
      return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() +
        " " + p(d.getHours()) + ":" + p(d.getMinutes());
    } catch (e) { return iso; }
  }

  // --- Session ---
  // isLoggedIn/setSession are gone with the credentials. They were the real
  // hole anyway: the "session" was a localStorage key with an expiry and no
  // signature, so setting it by hand opened the dashboard without ever seeing
  // the password. clearSession stays because logout still has to clear any key
  // left over from before this change.
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  function showDashboard() {
    loginView.hidden = true;
    dashView.hidden = false;
    loadLeads();
  }
  function showLogin() {
    dashView.hidden = true;
    loginView.hidden = false;
    document.getElementById("adminUser").value = "";
    document.getElementById("adminPass").value = "";
    document.getElementById("adminUser").setAttribute("aria-invalid", "false");
    document.getElementById("adminPass").setAttribute("aria-invalid", "false");
    setTimeout(function () { document.getElementById("adminUser").focus(); }, 30);
  }

  // --- Show password ---
  // type="button" matters: the toggle sits inside a form with a real submit
  // handler, so a bare <button> would attempt a login on every click.
  (function () {
    var input = document.getElementById("adminPass");
    var btn = document.getElementById("adminPassToggle");
    if (!input || !btn) return;
    btn.addEventListener("click", function () {
      var reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      // aria-pressed also drives which icon paints — see admin.html.
      btn.setAttribute("aria-pressed", reveal ? "true" : "false");
      var label = reveal ? "הסתר סיסמה" : "הצג סיסמה";
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      input.focus();
    });
  })();

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // No credential is configured, and none can be: see the note at the top of
    // this file. Refusing every login is the honest state — the alternative is
    // a password that every visitor can read.
    loginErr.textContent = "התחברות לניהול אינה מוגדרת בסביבה זו";
    document.getElementById("adminUser").setAttribute("aria-invalid", "true");
    document.getElementById("adminPass").setAttribute("aria-invalid", "true");
    document.getElementById("adminPass").value = "";
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    clearSession();
    showLogin();
  });

  // --- Load + render ---
  function loadLeads() {
    var body = document.getElementById("leadsBody");
    body.innerHTML = '<tr><td colspan="10" class="loading">טוען פניות...</td></tr>';
    window.LeadsStore.listLeads().then(function (res) {
      ALL = res.rows || [];
      renderStorageNote(res.storage, res.reason);
      applyFilter();
    }).catch(function () {
      body.innerHTML = '<tr><td colspan="10" class="empty">שגיאה בטעינת הפניות</td></tr>';
    });
  }

  // "local" has three causes and they are not interchangeable: a refusal that
  // no retry will fix, a network fault that one might, and no configuration at
  // all. Until 07/08/2026 all three said "could not connect to Supabase" — and
  // the one that actually happens here is the refusal (see leads-store.js).
  function renderStorageNote(storage, reason) {
    var el = document.getElementById("storageNote");
    if (storage === "supabase") {
      el.innerHTML = '<span class="dot ok"></span>מחובר ל-Supabase — הפניות נשמרות במסד מרכזי.';
    } else if (reason === "denied") {
      el.innerHTML = '<span class="dot local"></span>המסד סירב לקריאה (401). המפתח שהאתר נושא מורשה להוספת פנייה בלבד, ולכן מסך הניהול אינו יכול להציג פניות אמיתיות — נדרשת קריאה מצד השרת. מוצגות רק פניות מדפדפן זה.';
    } else if (reason === "unconfigured") {
      el.innerHTML = '<span class="dot local"></span>לא הוגדר חיבור למסד. מוצגות רק פניות מדפדפן זה.';
    } else {
      el.innerHTML = '<span class="dot local"></span>מצב מקומי (localStorage) — מוצגות רק פניות מדפדפן זה. לא הצליח להתחבר ל-Supabase.';
    }
  }

  function applyFilter() {
    var q = document.getElementById("search").value.trim().toLowerCase();
    var ft = document.getElementById("filterType").value;
    var fs = document.getElementById("filterStatus").value;
    VIEW = ALL.filter(function (r) {
      if (ft && (r.req_type || "info") !== ft) return false;
      if (fs && (r.status || "new") !== fs) return false;
      if (q) {
        var hay = [r.full_name, r.phone, r.email, r.topic, r.address, r.from_fund, r.to_fund]
          .join(" ").toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    renderTable();
    renderKpis();
  }

  function renderKpis() {
    document.getElementById("kTotal").textContent = ALL.length;
    document.getElementById("kNew").textContent = ALL.filter(function (r) { return (r.status || "new") === "new"; }).length;
    document.getElementById("kSwitch").textContent = ALL.filter(function (r) { return (r.req_type || "") === "switch"; }).length;
    document.getElementById("kDone").textContent = ALL.filter(function (r) { return r.status === "done"; }).length;
  }

  function renderTable() {
    var body = document.getElementById("leadsBody");
    if (!VIEW.length) {
      body.innerHTML = '<tr><td colspan="10" class="empty">אין פניות להצגה</td></tr>';
      return;
    }
    body.innerHTML = VIEW.map(function (r) {
      var type = (r.req_type || "info") === "switch"
        ? '<span class="badge switch">מעבר קופה</span>'
        : '<span class="badge info">מידע מפורט</span>';
      var status = r.status === "done"
        ? '<span class="badge done">טופל</span>'
        : '<span class="badge new">חדש</span>';
      var move = "";
      if (r.from_fund || r.to_fund) {
        var fromK = fundKey(r.from_fund), toK = fundKey(r.to_fund);
        move = '<span class="fund-tag ' + fromK + '">' + esc(r.from_fund || "?") + '</span> ← ' +
               '<span class="fund-tag ' + toK + '">' + esc(r.to_fund || "?") + '</span>';
      } else { move = '<span style="color:var(--text-faint)">—</span>'; }
      var toggleLabel = r.status === "done" ? "החזר לחדש" : "סמן טופל";
      var newStatus = r.status === "done" ? "new" : "done";
      var mail = r.email ? '<span dir="ltr"><a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a></span>' : '<span style="color:var(--text-faint)">—</span>';
      var phoneLink = r.phone ? '<span dir="ltr"><a href="tel:' + esc(r.phone) + '">' + esc(r.phone) + '</a></span>' : "";
      return '<tr>' +
        '<td>' + esc(fmtDate(r.created_at)) + '</td>' +
        '<td>' + type + '</td>' +
        '<td>' + esc(r.full_name) + '</td>' +
        '<td>' + phoneLink + '</td>' +
        '<td>' + mail + '</td>' +
        '<td>' + (esc(r.topic) || '<span style="color:var(--text-faint)">—</span>') + '</td>' +
        '<td>' + move + '</td>' +
        '<td>' + (esc(r.address) || '<span style="color:var(--text-faint)">—</span>') + '</td>' +
        '<td>' + status + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="act-btn" data-toggle="' + esc(r.id) + '" data-status="' + newStatus + '">' + toggleLabel + '</button>' +
          '<button class="act-btn del" data-del="' + esc(r.id) + '">מחק</button>' +
        '</div></td>' +
      '</tr>';
    }).join("");

    Array.prototype.forEach.call(body.querySelectorAll("[data-toggle]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-toggle"), st = b.getAttribute("data-status");
        b.disabled = true;
        window.LeadsStore.updateStatus(id, st).then(function (res) {
          if (!res || !res.ok) {
            b.disabled = false;
            alert("עדכון הסטטוס נכשל");
            return;
          }
          var row = ALL.filter(function (x) { return String(x.id) === String(id); })[0];
          if (row) row.status = st;
          applyFilter();
        });
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll("[data-del]"), function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del");
        if (!confirm("למחוק את הפנייה? פעולה זו אינה הפיכה.")) return;
        b.disabled = true;
        window.LeadsStore.deleteLead(id).then(function (res) {
          if (!res || !res.ok) {
            b.disabled = false;
            alert("מחיקת הפנייה נכשלה");
            return;
          }
          ALL = ALL.filter(function (x) { return String(x.id) !== String(id); });
          applyFilter();
        });
      });
    });
  }

  document.getElementById("search").addEventListener("input", applyFilter);
  document.getElementById("filterType").addEventListener("change", applyFilter);
  document.getElementById("filterStatus").addEventListener("change", applyFilter);
  document.getElementById("refreshBtn").addEventListener("click", loadLeads);

  // --- Export ---
  var COLS = [
    ["created_at", "תאריך", fmtDate],
    ["req_type", "סוג בקשה", function (v) { return v === "switch" ? "מעבר קופה" : "מידע מפורט"; }],
    ["full_name", "שם מלא"],
    ["phone", "טלפון"],
    ["email", "מייל"],
    ["topic", "נושא"],
    ["contact_reason", "סיבת פנייה"],
    ["from_fund", "קופה נוכחית"],
    ["to_fund", "קופת יעד"],
    ["address", "כתובת"],
    ["status", "סטטוס", function (v) { return v === "done" ? "טופל" : "חדש"; }]
  ];

  function cellVal(r, col) {
    var v = r[col[0]];
    if (col[2]) return col[2](v);
    return v == null ? "" : v;
  }

  function download(filename, content, mime) {
    var BOM = "\uFEFF"; // UTF-8 BOM so Hebrew/Excel opens correctly
    var blob = new Blob([BOM + content], { type: mime + ";charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  // full_name/phone/email/topic/address/from_fund/to_fund come straight from
  // the public contact form (app.js payload -> LeadsStore.insertLead), so a
  // value starting with =/+/-/@ is parsed as a formula by Excel/Sheets the
  // moment an admin opens this export -- a classic CSV-injection vector
  // (e.g. DDE execution or data exfiltration via =HYPERLINK). Prefixing with
  // a tab neutralizes the formula parse without changing the visible value.
  function csvEscape(v) {
    var s = String(v);
    if (/^[=+\-@]/.test(s)) s = "\t" + s;
    return s.replace(/"/g, '""');
  }

  function exportCSV() {
    var rows = [COLS.map(function (c) { return c[1]; })];
    VIEW.forEach(function (r) {
      rows.push(COLS.map(function (c) {
        var v = csvEscape(cellVal(r, c));
        return '"' + v + '"';
      }));
    });
    var csv = rows.map(function (r) { return r.join(","); }).join("\r\n");
    download("kupot-leads-" + Date.now() + ".csv", csv, "text/csv");
  }

  function exportExcel() {
    // Excel-readable HTML table (.xls). Opens natively in Excel with Hebrew RTL.
    var head = COLS.map(function (c) { return "<th>" + esc(c[1]) + "</th>"; }).join("");
    var bodyRows = VIEW.map(function (r) {
      return "<tr>" + COLS.map(function (c) { return "<td>" + esc(cellVal(r, c)) + "</td>"; }).join("") + "</tr>";
    }).join("");
    var html = '<html dir="rtl"><head><meta charset="UTF-8"></head><body>' +
      '<table border="1"><thead><tr>' + head + '</tr></thead><tbody>' + bodyRows + '</tbody></table>' +
      '</body></html>';
    download("kupot-leads-" + Date.now() + ".xls", html, "application/vnd.ms-excel");
  }

  document.getElementById("csvBtn").addEventListener("click", exportCSV);
  document.getElementById("xlsBtn").addEventListener("click", exportExcel);

  // --- Boot ---
  // Always the login view. A stale localStorage session from before this change
  // must not be honoured — it was forgeable, and there is no credential behind
  // it any more either way.
  clearSession();
  showLogin();
})();
