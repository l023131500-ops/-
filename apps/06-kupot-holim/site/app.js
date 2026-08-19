(function () {
  "use strict";

  var FUND_KEY = { "כללית": "clalit", "מכבי": "maccabi", "מאוחדת": "meuhedet", "לאומית": "leumit" };
  function fundKey(name) {
    if (!name) return "none";
    for (var f in FUND_KEY) { if (name.indexOf(f) === 0) return FUND_KEY[f]; }
    return "none";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var ICONS = {
    baby: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.8"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M15 20c0-2.2 1.2-3.6 3-3.6s3 1.4 3 3.6"/></svg>',
    "heart-pulse": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21S4 14.5 4 8.8C4 5.6 6.4 4 8.5 4 10 4 11.3 4.8 12 6c.7-1.2 2-2 3.5-2C17.6 4 20 5.6 20 8.8 20 14.5 12 21 12 21z"/><path d="M3 12h3l1.5-3 2 5 1.5-2h4" stroke-width="1.6"/></svg>',
    pill: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)"/><path d="M8.5 8.5l7 7"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4" stroke-width="1.8"/></svg>',
    smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 14c1 1.5 2.5 2.2 4 2.2S15 15.5 16 14"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 20c-5 0-8-3-8-8 0-6 6-9 15-9 0 9-3 15-9 15z"/><path d="M11 20c0-5 2-9 7-12" stroke-width="1.6"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15l-8-3V5.5a1.5 1.5 0 0 0-3 0V12l-8 3v2l8-2v3l-2 1.5V21l3.5-1 3.5 1v-1.5L13 18v-3l8 2v-2z"/></svg>'
  };

  var DATA = null, filtered = [], activeCat = "all", searchTerm = "", shown = 0, PAGE = 25;

  fetch("site-data.json").then(function (r) { return r.json(); }).then(function (d) {
    DATA = d;
    renderProfiles();
    renderCatFilter();
    applyFilter();
    document.getElementById("year").textContent = new Date().getFullYear();
  }).catch(function (e) {
    document.getElementById("topicList").innerHTML = '<p style="color:var(--text-muted)">שגיאה בטעינת הנתונים. נסו לרענן את העמוד.</p>';
    console.error(e);
  });

  /* ---------- Profiles ---------- */
  function renderProfiles() {
    var g = document.getElementById("profileGrid");
    g.innerHTML = DATA.profiles.map(function (p, i) {
      var rk = fundKey(p.recommended);
      return '<article class="profile-card" tabindex="0" role="button" data-profile="' + i + '">' +
        '<div class="profile-icon">' + (ICONS[p.icon] || ICONS.shield) + '</div>' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<p class="p-desc">' + esc(p.desc) + '</p>' +
        '<div class="reco-line">' +
          '<span class="reco-label">מומלץ:</span>' +
          '<span class="reco-badge" data-fund="' + rk + '">' + esc(p.recommended || "—") + '</span>' +
          '<span class="reco-more">פירוט ›</span>' +
        '</div></article>';
    }).join("");
    Array.prototype.forEach.call(g.querySelectorAll(".profile-card"), function (el) {
      el.addEventListener("click", function () { openDrawer(+el.getAttribute("data-profile")); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer(+el.getAttribute("data-profile")); } });
    });
  }

  /* ---------- Drawer ---------- */
  function openDrawer(idx) {
    var p = DATA.profiles[idx];
    var maxWins = Math.max.apply(null, p.ranking.map(function (r) { return r.wins; })) || 1;
    var bars = p.ranking.map(function (r) {
      var k = fundKey(r.fund), w = Math.round((r.wins / maxWins) * 100);
      return '<div class="rank-row"><span class="rank-name">' + esc(r.fund) + '</span>' +
        '<div class="rank-track"><div class="rank-fill" data-fund="' + k + '" style="width:' + Math.max(w, 12) + '%">' + r.wins + '</div></div></div>';
    }).join("");
    var cats = p.perCategory.map(function (c) {
      return '<div class="cat-item"><span>' + esc(c.category) + '</span>' +
        '<span class="ci-win" style="color:var(--' + fundKey(c.winner) + ')">' + esc(c.winner) + ' (' + c.wins + ')</span></div>';
    }).join("");
    var ex = p.examples.map(function (e) {
      return '<div class="ex-card"><div class="ex-topic">' + esc(e.topic) + '</div>' +
        (e.range ? '<div class="ex-range">' + esc(e.range) + '</div>' : "") +
        (e.description ? '<div class="ex-desc">' + esc(e.description) + '</div>' : "") + '</div>';
    }).join("");

    document.getElementById("drawerBody").innerHTML =
      '<h2 id="drawerTitle">' + esc(p.title) + '</h2>' +
      '<p class="d-sub">' + esc(p.desc) + '</p>' +
      '<div class="big-reco"><div class="br-label">הקופה המומלצת עבורכם</div>' +
        '<div class="br-fund" data-fund="' + fundKey(p.recommended) + '">' + esc(p.recommended) + '</div>' +
        (p.runnerUp ? '<div class="br-runner">אחריה: ' + esc(p.runnerUp) + '</div>' : "") + '</div>' +
      '<h4>דירוג הקופות במצב זה (מספר נושאים שבהם הקופה משתלמת)</h4>' +
      '<div class="rank-bars">' + bars + '</div>' +
      '<h4>לפי תחום</h4><div class="cat-breakdown">' + cats + '</div>' +
      (ex ? '<h4>דוגמאות להטבות בולטות</h4><div class="examples">' + ex + '</div>' : "") +
      '<div class="drawer-actions">' +
        '<button class="btn btn-primary" data-open-contact="info" data-topic="' + esc(p.title) + '">מעוניינים במידע המפורט למייל</button>' +
        '<button class="btn btn-ghost" data-open-contact="switch" data-tofund="' + esc(p.recommended) + '">מעוניינים במעבר קופה</button>' +
      '</div>';

    document.getElementById("profileDrawer").hidden = false;
    document.getElementById("drawerBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    bindContactButtons(document.getElementById("drawerBody"));
    setTimeout(function () { var c = document.getElementById("drawerClose"); if (c) c.focus(); }, 30);
  }
  function closeDrawer() {
    document.getElementById("profileDrawer").hidden = true;
    document.getElementById("drawerBackdrop").hidden = true;
    document.body.style.overflow = "";
  }
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop").addEventListener("click", closeDrawer);

  /* ---------- Category filter ---------- */
  function renderCatFilter() {
    var el = document.getElementById("catFilter");
    var chips = ['<button class="chip active" data-cat="all" role="tab" aria-selected="true">הכול</button>'];
    DATA.categories.forEach(function (c) {
      chips.push('<button class="chip" data-cat="' + esc(c.name) + '" role="tab" aria-selected="false">' + esc(c.name) + '</button>');
    });
    el.innerHTML = chips.join("");
    Array.prototype.forEach.call(el.querySelectorAll(".chip"), function (chip) {
      chip.addEventListener("click", function () {
        Array.prototype.forEach.call(el.querySelectorAll(".chip"), function (c) { c.classList.remove("active"); c.setAttribute("aria-selected", "false"); });
        chip.classList.add("active");
        chip.setAttribute("aria-selected", "true");
        activeCat = chip.getAttribute("data-cat");
        applyFilter();
      });
    });
  }

  var searchEl = document.getElementById("searchInput");
  var debounce;
  searchEl.addEventListener("input", function () {
    clearTimeout(debounce);
    debounce = setTimeout(function () { searchTerm = searchEl.value.trim().toLowerCase(); applyFilter(); }, 180);
  });

  function applyFilter() {
    filtered = DATA.topics.filter(function (t) {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      if (searchTerm) {
        var hay = (t.topic + " " + t.category + " " + t.subCategory + " " + t.audience + " " + t.range).toLowerCase();
        if (hay.indexOf(searchTerm) === -1) return false;
      }
      return true;
    });
    shown = 0;
    document.getElementById("topicList").innerHTML = "";
    renderMore();
    document.getElementById("resultsMeta").textContent = filtered.length + " נושאים" + (activeCat !== "all" ? " · " + activeCat : "");
  }

  function renderMore() {
    var list = document.getElementById("topicList");
    var slice = filtered.slice(shown, shown + PAGE);
    var html = slice.map(function (t) {
      var bk = fundKey(t.bestFund);
      var diff = t.description || "";
      var funds = [["כללית", "clalit", t.clalit], ["מכבי", "maccabi", t.maccabi], ["מאוחדת", "meuhedet", t.meuhedet], ["לאומית", "leumit", t.leumit]];
      var blocks = funds.map(function (f) {
        return '<div class="fund-block fb-' + f[1] + '"><div class="fb-name">' + f[0] + '</div>' +
          '<div class="fb-text">' + (esc(f[2]) || '<span style="color:var(--text-faint)">אין מידע — מומלץ לבדוק</span>') + '</div></div>';
      }).join("");
      return '<div class="topic-item">' +
        '<button class="topic-head" aria-expanded="false">' +
          '<span class="t-cat-dot"></span>' +
          '<span class="t-main"><span class="t-topic">' + esc(t.topic) + '</span>' +
            '<span class="t-meta">' + esc(t.category) + (t.subCategory ? " · " + esc(t.subCategory) : "") + '</span></span>' +
          '<span class="t-best" data-fund="' + bk + '">' + (bk === "none" ? "טעון השוואה" : "משתלם: " + esc(t.bestFund)) + '</span>' +
          '<svg class="t-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="topic-body">' +
          (t.range ? '<span class="range-tag">' + esc(t.range) + '</span>' : "") +
          (diff ? '<div class="diff-block"><div class="db-title">↔ ההבדל בין הקופות בנושא זה</div><div class="db-text">' + esc(diff) + '</div></div>' : "") +
          '<div class="fund-blocks">' + blocks + '</div>' +
          '<div class="topic-actions">' +
            '<button class="btn btn-primary" data-open-contact="info" data-topic="' + esc(t.topic) + '">מעוניינים במידע המפורט למייל</button>' +
            '<button class="btn btn-ghost" data-open-contact="switch">מעוניינים במעבר קופה</button>' +
          '</div>' +
          (t.source ? '<div class="topic-src">מקור: ' + esc(t.source) + '</div>' : "") +
        '</div></div>';
    }).join("");
    list.insertAdjacentHTML("beforeend", html);
    shown += slice.length;
    document.getElementById("loadMore").hidden = shown >= filtered.length;
    bindTopicToggles(list);
    bindContactButtons(list);
  }
  document.getElementById("loadMore").addEventListener("click", renderMore);

  function bindTopicToggles(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll(".topic-head"), function (btn) {
      if (btn._bound) return; btn._bound = true;
      btn.addEventListener("click", function () {
        var item = btn.closest(".topic-item");
        var open = item.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  }

  /* ---------- Contact modal ---------- */
  function bindContactButtons(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("[data-open-contact]"), function (btn) {
      if (btn._cbound) return; btn._cbound = true;
      btn.addEventListener("click", function () {
        openContact(btn.getAttribute("data-open-contact"), btn.getAttribute("data-topic"), btn.getAttribute("data-tofund"));
      });
    });
  }
  bindContactButtons(document);

  function openContact(mode, topic, toFund) {
    var isSwitch = mode === "switch";
    document.getElementById("modalTitle").textContent = isSwitch ? "מעוניינים במעבר קופה" : "מעוניינים במידע המפורט למייל";
    document.getElementById("modalSub").textContent = isSwitch
      ? "בחרו את הקופה הנוכחית ואת הקופה שמעניינת אתכם, והשאירו פרטים לליווי אישי."
      : "השאירו פרטים ונחזור אליכם עם מידע מלא והמלצה אישית.";
    document.getElementById("switchFields").hidden = !isSwitch;
    document.getElementById("ctxField").value = mode;
    document.getElementById("formSuccess").hidden = true;
    document.getElementById("contactForm").hidden = false;
    document.getElementById("contactForm").reset();
    document.getElementById("ctxField").value = mode;
    if (topic) document.getElementById("topicField").value = topic;
    if (isSwitch && toFund) { var to = document.getElementById("toFund"); if (to) to.value = toFund; }
    document.getElementById("contactModal").hidden = false;
    document.getElementById("modalBackdrop").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(function () { document.getElementById("fullName").focus(); }, 30);
  }
  function closeContact() {
    document.getElementById("contactModal").hidden = true;
    document.getElementById("modalBackdrop").hidden = true;
    document.body.style.overflow = "";
  }
  document.getElementById("modalClose").addEventListener("click", closeContact);
  document.getElementById("modalBackdrop").addEventListener("click", closeContact);
  document.getElementById("successClose").addEventListener("click", closeContact);

  document.getElementById("contactForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("fullName");
    var phone = document.getElementById("phone");
    if (!name.value.trim()) { name.focus(); return; }
    if (!phone.value.trim()) { phone.focus(); return; }
    var payload = {
      context: document.getElementById("ctxField").value,
      fullName: name.value.trim(), phone: phone.value.trim(),
      email: document.getElementById("email").value.trim(),
      address: document.getElementById("address").value.trim(),
      topic: document.getElementById("topicField").value.trim(),
      reqType: (document.querySelector('input[name=reqType]:checked') || {}).value,
      fromFund: (document.getElementById("fromFund") || {}).value,
      toFund: (document.getElementById("toFund") || {}).value
    };
    var submitBtn = document.querySelector("#contactForm button[type=submit]");
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "\u05e9\u05d5\u05dc\u05d7..."; }
    var save = (window.LeadsStore && window.LeadsStore.insertLead)
      ? window.LeadsStore.insertLead(payload)
      : Promise.resolve({ ok: true });
    save.then(function () {
      document.getElementById("contactForm").hidden = true;
      document.getElementById("formSuccess").hidden = false;
    }).catch(function () {
      document.getElementById("contactForm").hidden = true;
      document.getElementById("formSuccess").hidden = false;
    }).then(function () {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "\u05e9\u05dc\u05d9\u05d7\u05ea \u05d4\u05e4\u05e0\u05d9\u05d9\u05d4"; }
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeContact(); closeDrawer(); }
  });

  var themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    var THEME_KEY = "briut-theme";
    var syncLabel = function () {
      var isDark = document.documentElement.classList.contains("dark");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
    };
    syncLabel();
    themeToggle.onclick = function () {
      var isDark = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.toggle("dark", isDark);
      try { localStorage.setItem(THEME_KEY, isDark ? "dark" : "light"); } catch (e) {}
      syncLabel();
    };
  }
})();
