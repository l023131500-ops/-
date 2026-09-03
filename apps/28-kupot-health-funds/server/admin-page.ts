// ---------------------------------------------------------------------------
// עמוד ניהול עצמאי, ללא תלות בבנייה של הלקוח (Vite/React) — HTML+JS מוטבעים
// ומוגשים ישירות מ-Express תחת /api/admin. נתוני הפניות מוצגים דרך textContent
// בלבד (לא innerHTML עם מחרוזות שהורכבו), כדי לא לפתוח XTS מאוחסן דרך שדות
// שהוזנו בטופס הציבורי (שם/טלפון/הערה וכו').
// ---------------------------------------------------------------------------
export function renderAdminPage(): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>ניהול — קופות חולים</title>
<style>
  body { font-family: system-ui, sans-serif; background:#f4f6f8; color:#1b2733; margin:0; padding:2rem; direction:rtl; }
  h1 { font-size:1.25rem; margin:0 0 1rem; }
  #login-box { max-width:320px; margin:4rem auto; background:#fff; border-radius:12px; padding:2rem; box-shadow:0 2px 10px rgba(0,0,0,.08); }
  #login-box label { display:block; font-size:.9rem; margin-bottom:.4rem; }
  #login-box input { width:100%; box-sizing:border-box; padding:.6rem .7rem; border:1px solid #ccd3da; border-radius:8px; font-size:1rem; }
  .pw-wrap { position:relative; }
  .pw-wrap input { padding-left:2.4rem; }
  .pw-toggle { position:absolute; left:.3rem; top:50%; transform:translateY(-50%); width:2rem; height:2rem; padding:0; margin:0; border:0; background:transparent; color:#5a6672; cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:6px; }
  .pw-toggle:hover { background:#eef1f4; }
  .pw-toggle svg { width:1.15rem; height:1.15rem; }
  #login-box button, #logout-btn { margin-top:1rem; width:100%; padding:.6rem; border:0; border-radius:8px; background:#1b6fd1; color:#fff; font-size:1rem; cursor:pointer; }
  #logout-btn { width:auto; padding:.4rem 1rem; font-size:.85rem; }
  #error { color:#c0392b; font-size:.85rem; margin-top:.6rem; min-height:1.1em; }
  table { border-collapse:collapse; width:100%; background:#fff; border-radius:8px; overflow:hidden; }
  th, td { padding:.5rem .7rem; text-align:right; border-bottom:1px solid #e6e9ec; font-size:.85rem; white-space:nowrap; }
  th { background:#eef1f4; position:sticky; top:0; }
  #app { display:none; }
  #topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
  #count { color:#5a6672; font-size:.85rem; }
  #table-wrap { overflow-x:auto; }
</style>
</head>
<body>

<div id="login-box">
  <h1>ניהול — פניות מעבר קופה</h1>
  <label for="pw">סיסמת ניהול</label>
  <div class="pw-wrap">
    <input id="pw" type="password" autocomplete="current-password" />
    <button id="pwToggle" class="pw-toggle" type="button"
            aria-pressed="false" aria-controls="pw" aria-label="הצג סיסמה" title="הצג סיסמה">
      <svg id="pwEye" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
        <circle cx="12" cy="12" r="2.8" />
      </svg>
      <svg id="pwEyeOff" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" hidden>
        <path d="M2 12s3.6-6.5 10-6.5c1.7 0 3.2.5 4.5 1.1M22 12s-1.3 2.4-3.9 4.2M12 18.5C5.6 18.5 2 12 2 12" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        <path d="M3.5 3.5l17 17" />
      </svg>
    </button>
  </div>
  <button id="login-btn" type="button">כניסה</button>
  <div id="error"></div>
</div>

<div id="app">
  <div id="topbar">
    <h1>פניות מעבר קופה — <span id="count"></span></h1>
    <button id="logout-btn" type="button">יציאה</button>
  </div>
  <div id="table-wrap"></div>
</div>

<script>
(function () {
  var loginBox = document.getElementById("login-box");
  var app = document.getElementById("app");
  var errorEl = document.getElementById("error");
  var pwInput = document.getElementById("pw");
  var COLUMNS = ["id","created_at","topic","full_name","phone","email","id_number","city","current_fund","current_supplemental","target_fund","people_count","status","note"];

  function renderTable(rows) {
    var wrap = document.getElementById("table-wrap");
    wrap.textContent = "";
    document.getElementById("count").textContent = rows.length + " פניות";
    if (!rows.length) {
      var p = document.createElement("p");
      p.textContent = "אין פניות עדיין.";
      wrap.appendChild(p);
      return;
    }
    var table = document.createElement("table");
    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    COLUMNS.forEach(function (col) {
      var th = document.createElement("th");
      th.textContent = col;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);
    var tbody = document.createElement("tbody");
    rows.forEach(function (row) {
      var tr = document.createElement("tr");
      COLUMNS.forEach(function (col) {
        var td = document.createElement("td");
        var val = row[col];
        td.textContent = val === null || val === undefined ? "" : String(val);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function loadLeads() {
    fetch("switch-leads", { credentials: "include" })
      .then(function (r) {
        if (!r.ok) throw new Error("לא ניתן לטעון פניות");
        return r.json();
      })
      .then(function (rows) {
        loginBox.style.display = "none";
        app.style.display = "block";
        renderTable(rows);
      })
      .catch(function () {
        // עוגייה לא תקפה/לא קיימת — נשארים במסך הכניסה.
      });
  }

  document.getElementById("login-btn").addEventListener("click", function () {
    errorEl.textContent = "";
    fetch("admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: pwInput.value }),
    })
      .then(function (r) { return r.json().then(function (body) { return { ok: r.ok, body: body }; }); })
      .then(function (res) {
        if (!res.ok) {
          errorEl.textContent = (res.body && res.body.error) || "כניסה נכשלה";
          return;
        }
        pwInput.value = "";
        loadLeads();
      })
      .catch(function () {
        errorEl.textContent = "שגיאת רשת";
      });
  });

  pwInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("login-btn").click();
  });

  // הצגת סיסמה: type/aria/אייקון חייבים להסכים תמיד, אותה תבנית כמו /login.
  document.getElementById("pwToggle").addEventListener("click", function () {
    var btn = this;
    var on = pwInput.type === "password";
    pwInput.type = on ? "text" : "password";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var label = on ? "הסתר סיסמה" : "הצג סיסמה";
    btn.setAttribute("aria-label", label);
    btn.title = label;
    document.getElementById("pwEye").toggleAttribute("hidden", on);
    document.getElementById("pwEyeOff").toggleAttribute("hidden", !on);
    pwInput.focus();
  });

  document.getElementById("logout-btn").addEventListener("click", function () {
    fetch("admin/logout", { method: "POST", credentials: "include" }).finally(function () {
      app.style.display = "none";
      loginBox.style.display = "block";
    });
  });

  // כניסה עם עוגייה קיימת (רענון עמוד אחרי כניסה קודמת).
  loadLeads();
})();
</script>
</body>
</html>`;
}
