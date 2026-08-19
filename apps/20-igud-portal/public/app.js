// Igud HaShiurim unified portal - client-side router + views
const app = document.getElementById("app");

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
};

const escapeHtml = (s) => (s || "").toString().replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const TYPE_LABEL = {
  organization: "ארגון",
  synagogue: "בית כנסת",
  gabbai: "גבאי",
  teacher: "מגיד שיעור",
};

// Fetch helpers - published sites need /port/5000 prefix for backend routes
const API_BASE = (typeof window !== 'undefined' && window.location.hostname.endsWith('.pplx.app'))
  ? '/port/5000'
  : '';
function apiPath(p) { return API_BASE + p; }
async function apiGet(path) {
  const res = await fetch(apiPath(path));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(apiPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---------- Views ----------

async function viewDirectory() {
  app.innerHTML = "";
  const hero = el("section", { class: "hero wrap" },
    el("h1", {}, "פורטל אחוד — איגוד השיעורים"),
    el("p", {}, "מדריך ארצי לארגונים, בתי כנסת, גבאים ומגידי שיעור. חיפוש חופשי, קישורי פרסום לכל ישות + לוח ניהול ייחודי לכל קישור."),
    el("div", { class: "search-bar" },
      el("input", { id: "q", placeholder: "חיפוש שם, נושא, שם הרב…" }),
      el("input", { id: "city", placeholder: "עיר" }),
      el("select", { id: "type" },
        el("option", { value: "" }, "הכל"),
        el("option", { value: "organization" }, "ארגון"),
        el("option", { value: "synagogue" }, "בית כנסת"),
        el("option", { value: "gabbai" }, "גבאי"),
      ),
      el("button", { class: "btn", onClick: runSearch }, "חיפוש"),
    ),
  );

  const results = el("section", { class: "wrap", id: "results" }, el("div", { class: "loading" }, "טוען מדריך…"));
  app.append(hero, results);

  async function runSearch() {
    const q = document.getElementById("q").value.trim();
    const city = document.getElementById("city").value.trim();
    const type = document.getElementById("type").value;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (type) params.set("type", type);
    results.innerHTML = "";
    results.append(el("div", { class: "loading" }, "טוען…"));
    try {
      const data = await apiGet("/api/directory?" + params.toString());
      renderDirectory(data);
    } catch (e) {
      results.innerHTML = "";
      results.append(el("div", { class: "notice error" }, "שגיאה בטעינה: " + e.message));
    }
  }

  function renderDirectory(data) {
    results.innerHTML = "";
    const orgs = data?.organizations || [];
    const teachers = data?.teachers || [];

    // Organizations
    results.append(el("h2", {}, `ארגונים ובתי כנסת (${orgs.length})`));
    if (orgs.length === 0) {
      results.append(el("div", { class: "empty" }, "לא נמצאו ארגונים. אולי צריך להוסיף חדשים."));
    } else {
      const grid = el("div", { class: "grid" });
      for (const o of orgs) {
        const link = "#/t/" + o.public_token;
        grid.append(el("a", { href: link, class: "card" },
          el("h3", {}, o.display_name || o.name),
          el("div", { class: "meta" },
            (o.city ? o.city : "") + (o.region ? " · " + o.region : "")
          ),
          el("span", { class: "badge primary" }, TYPE_LABEL[o.type] || o.type || "ארגון"),
        ));
      }
      results.append(grid);
    }

    // Teachers
    if (teachers.length > 0) {
      results.append(el("h2", { style: "margin-top:40px" }, `מגידי שיעור (${teachers.length})`));
      const grid2 = el("div", { class: "grid" });
      for (const t of teachers) {
        const link = "#/te/" + t.public_token;
        grid2.append(el("a", { href: link, class: "card" },
          el("h3", {}, t.display_name || t.full_name),
          el("div", { class: "meta" }, t.city || ""),
          el("span", { class: "badge primary" }, "מגיד שיעור"),
        ));
      }
      results.append(grid2);
    }
  }

  runSearch();
}

async function viewTenant(token) {
  app.innerHTML = "";
  app.append(el("div", { class: "loading" }, "טוען דף…"));
  try {
    const data = await apiGet("/api/public/tenant/" + encodeURIComponent(token));
    renderTenant(data, token);
  } catch (e) {
    app.innerHTML = "";
    app.append(el("section", { class: "wrap" }, el("div", { class: "notice error" }, "דף לא נמצא או שאינו פעיל.")));
  }
}

function renderTenant(data, token) {
  app.innerHTML = "";
  const t = data.tenant || {};
  const lessons = data.lessons || [];
  const ads = data.ads || [];

  const hero = el("section", { class: "tenant-hero" },
    el("div", { class: "wrap" },
      el("div", { class: "title" },
        el("h1", {}, t.display_name || t.name || "ארגון"),
        el("span", { class: "badge primary" }, TYPE_LABEL[t.type] || t.type || "ארגון"),
      ),
      el("div", { class: "meta" }, [t.city, t.region, t.address].filter(Boolean).join(" · ")),
      t.about_text ? el("p", { style: "max-width:700px;margin-top:16px" }, t.about_text) : null,
      el("div", { class: "cta-row" },
        t.contact_phone ? el("a", { class: "btn", href: "tel:" + t.contact_phone }, "📞 " + t.contact_phone) : null,
        t.contact_whatsapp ? el("a", { class: "btn secondary", href: "https://wa.me/" + t.contact_whatsapp.replace(/\D/g, "") }, "וואטסאפ") : null,
        t.contact_email ? el("a", { class: "btn secondary", href: "mailto:" + t.contact_email }, "אימייל") : null,
      ),
    )
  );
  app.append(hero);

  const body = el("section", { class: "wrap" });

  // Ads block
  if (ads.length > 0) {
    body.append(el("h2", {}, "מודעות"));
    for (const a of ads) {
      body.append(el("div", { class: "ad-block" },
        a.image_url ? el("img", { src: a.image_url, alt: a.title || "" }) : null,
        el("div", { class: "body" },
          el("strong", {}, a.title || ""),
          el("p", {}, a.body || ""),
          a.link_url ? el("a", { href: a.link_url, class: "btn small", target: "_blank" }, a.cta_label || "פרטים נוספים") : null,
        ),
      ));
    }
  }

  // Lessons
  body.append(el("h2", {}, `שיעורים (${lessons.length})`));
  if (lessons.length === 0) {
    body.append(el("div", { class: "empty" }, "טרם התווספו שיעורים לישות זו."));
  } else {
    const list = el("div");
    for (const l of lessons) {
      list.append(el("div", { class: "lesson-row" },
        el("div", { class: "info" },
          el("strong", {}, l.title || l.topic_free_text || "שיעור"),
          el("div", { class: "sub" }, `${l.rabbi_name || ""} ${l.city ? "· " + l.city : ""} ${l.time_hhmm ? "· " + l.time_hhmm : ""}`),
        ),
        l.contact_phone ? el("a", { class: "btn small secondary", href: "tel:" + l.contact_phone }, "התקשר") : null,
      ));
    }
    body.append(list);
  }

  // Contact form
  body.append(el("h2", { style: "margin-top:40px" }, "צור קשר"));
  const form = el("form", { class: "contact", onSubmit: async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    const notice = el("div", { class: "notice" }, "שולח…");
    form.parentNode.insertBefore(notice, form);
    const res = await apiPost("/api/public/tenant/" + encodeURIComponent(token) + "/message", payload);
    if (res.success) {
      notice.className = "notice success";
      notice.textContent = "הפנייה נשלחה בהצלחה. ניצור קשר בהקדם.";
      form.reset();
    } else {
      notice.className = "notice error";
      notice.textContent = "שגיאה בשליחה: " + (res.error || "נסה שוב");
    }
  }},
    el("label", {}, "שם מלא", el("input", { name: "name", required: true })),
    el("label", {}, "טלפון", el("input", { name: "phone", type: "tel" })),
    el("label", {}, "אימייל", el("input", { name: "email", type: "email" })),
    el("label", {}, "נושא", el("input", { name: "subject" })),
    el("label", {}, "הודעה", el("textarea", { name: "body", required: true })),
    el("button", { class: "btn", type: "submit" }, "שליחה"),
  );
  body.append(form);

  app.append(body);
}

async function viewTeacher(token) {
  app.innerHTML = "";
  app.append(el("div", { class: "loading" }, "טוען דף מגיד שיעור…"));
  try {
    const data = await apiGet("/api/public/teacher/" + encodeURIComponent(token));
    const t = data.teacher || {};
    const lessons = data.lessons || [];
    app.innerHTML = "";
    app.append(el("section", { class: "tenant-hero" },
      el("div", { class: "wrap" },
        el("h1", {}, t.display_name || t.full_name),
        el("div", { class: "meta" }, t.city || ""),
        t.bio ? el("p", { style: "max-width:700px;margin-top:12px" }, t.bio) : null,
        el("div", { class: "cta-row" },
          t.phone ? el("a", { class: "btn", href: "tel:" + t.phone }, "📞 " + t.phone) : null,
          t.whatsapp ? el("a", { class: "btn secondary", href: "https://wa.me/" + t.whatsapp.replace(/\D/g, "") }, "וואטסאפ") : null,
        ),
      )
    ));
    const body = el("section", { class: "wrap" });
    body.append(el("h2", {}, `שיעורים (${lessons.length})`));
    if (lessons.length === 0) {
      body.append(el("div", { class: "empty" }, "טרם התווספו שיעורים למגיד שיעור זה."));
    } else {
      const list = el("div");
      for (const l of lessons) {
        list.append(el("div", { class: "lesson-row" },
          el("div", { class: "info" },
            el("strong", {}, l.title || "שיעור"),
            el("div", { class: "sub" }, `${l.city || ""} ${l.time_hhmm ? "· " + l.time_hhmm : ""}`),
          ),
        ));
      }
      body.append(list);
    }
    app.append(body);
  } catch (e) {
    app.innerHTML = "";
    app.append(el("section", { class: "wrap" }, el("div", { class: "notice error" }, "מגיד שיעור לא נמצא.")));
  }
}

async function viewAdmin(adminToken) {
  app.innerHTML = "";
  app.append(el("div", { class: "loading" }, "טוען לוח ניהול…"));
  try {
    const data = await apiGet("/api/admin/tenant/" + encodeURIComponent(adminToken));
    const t = data.tenant || {};
    const lessons = data.lessons || [];
    const messages = data.messages || [];
    const ads = data.ads || [];
    const origin = window.location.origin;
    const publicLink = `${origin}/#/t/${t.public_token}`;

    app.innerHTML = "";
    app.append(el("section", { class: "tenant-hero" },
      el("div", { class: "wrap" },
        el("h1", {}, "לוח ניהול · " + (t.display_name || t.name)),
        el("div", { class: "meta" }, "גישה פרטית — אל תשתפו את הקישור הזה"),
      )
    ));

    const body = el("section", { class: "wrap" });

    body.append(el("h2", {}, "קישור פרסום ציבורי"));
    body.append(el("div", { class: "share-box" },
      el("strong", {}, "URL:"),
      el("code", {}, publicLink),
      el("button", { class: "btn small", onClick: async () => { await navigator.clipboard.writeText(publicLink); alert("הועתק"); } }, "העתק"),
    ));

    // Tabs
    const tabs = el("div", { class: "admin-tabs" });
    const contentBox = el("div");
    const tabDefs = [
      { key: "messages", label: `פניות (${messages.length})`, render: () => renderMessages(messages) },
      { key: "lessons", label: `שיעורים (${lessons.length})`, render: () => renderLessons(lessons) },
      { key: "ads", label: `מודעות (${ads.length})`, render: () => renderAds(ads) },
      { key: "info", label: "פרטי ישות", render: () => renderInfo(t) },
    ];
    function setActive(k) {
      contentBox.innerHTML = "";
      contentBox.append(tabDefs.find(d => d.key === k).render());
      Array.from(tabs.children).forEach(btn => btn.classList.toggle("active", btn.dataset.key === k));
    }
    for (const d of tabDefs) {
      tabs.append(el("button", { "data-key": d.key, onClick: () => setActive(d.key) }, d.label));
    }
    body.append(tabs, contentBox);
    setActive("messages");

    app.append(body);
  } catch (e) {
    app.innerHTML = "";
    app.append(el("section", { class: "wrap" }, el("div", { class: "notice error" }, "קישור ניהול לא תקין או פג תוקף.")));
  }
}

function renderMessages(list) {
  if (list.length === 0) return el("div", { class: "empty" }, "אין פניות עדיין.");
  const tbl = el("table", { class: "data" },
    el("thead", {}, el("tr", {}, el("th", {}, "שם"), el("th", {}, "טלפון"), el("th", {}, "אימייל"), el("th", {}, "נושא"), el("th", {}, "הודעה"), el("th", {}, "תאריך"))),
    el("tbody", {}, ...list.map(m => el("tr", {},
      el("td", {}, m.from_name || ""),
      el("td", {}, m.from_phone || ""),
      el("td", {}, m.from_email || ""),
      el("td", {}, m.subject || ""),
      el("td", {}, m.body || ""),
      el("td", {}, new Date(m.created_at).toLocaleDateString("he-IL")),
    ))),
  );
  return tbl;
}
function renderLessons(list) {
  if (list.length === 0) return el("div", { class: "empty" }, "טרם התווספו שיעורים.");
  return el("table", { class: "data" },
    el("thead", {}, el("tr", {}, el("th", {}, "כותרת"), el("th", {}, "מגיד"), el("th", {}, "עיר"), el("th", {}, "שעה"), el("th", {}, "מאושר"))),
    el("tbody", {}, ...list.map(l => el("tr", {},
      el("td", {}, l.title || l.topic_free_text || ""),
      el("td", {}, l.rabbi_name || ""),
      el("td", {}, l.city || ""),
      el("td", {}, l.time_hhmm || ""),
      el("td", {}, l.is_approved ? "✔️" : "—"),
    ))),
  );
}
function renderAds(list) {
  if (list.length === 0) return el("div", { class: "empty" }, "אין מודעות פעילות.");
  return el("table", { class: "data" },
    el("thead", {}, el("tr", {}, el("th", {}, "כותרת"), el("th", {}, "פעיל"), el("th", {}, "צפיות"), el("th", {}, "קליקים"))),
    el("tbody", {}, ...list.map(a => el("tr", {},
      el("td", {}, a.title || ""),
      el("td", {}, a.is_active ? "✔️" : "—"),
      el("td", {}, a.view_count || 0),
      el("td", {}, a.click_count || 0),
    ))),
  );
}
function renderInfo(t) {
  const rows = [
    ["שם", t.display_name || t.name],
    ["סוג", TYPE_LABEL[t.type] || t.type],
    ["עיר", t.city],
    ["אזור", t.region],
    ["טלפון", t.contact_phone],
    ["אימייל", t.contact_email],
    ["וואטסאפ", t.contact_whatsapp],
    ["סטטוס", t.status],
    ["Public Token", t.public_token],
    ["Admin Token", t.admin_token],
  ];
  return el("table", { class: "data" },
    el("tbody", {}, ...rows.filter(r => r[1]).map(r => el("tr", {}, el("th", {}, r[0]), el("td", {}, r[1])))),
  );
}

function viewJoin() {
  app.innerHTML = "";
  app.append(el("section", { class: "wrap" },
    el("h1", { style: "margin-top:32px" }, "הצטרפות למערכת"),
    el("p", { style: "color:var(--muted);max-width:600px" },
      "בקרוב יתאפשר להירשם ישירות מהאתר. כרגע ניתן ליצור ישות (ארגון/בית כנסת/מגיד שיעור) דרך צוות המערכת ולקבל בחזרה 2 קישורים: קישור פרסום ציבורי + קישור ניהול פרטי."),
    el("p", {},
      el("strong", {}, "לפניות: "),
      el("a", { href: "tel:0231330600" }, "02-313-3060"),
    ),
  ));
}

function viewAbout() {
  app.innerHTML = "";
  app.append(el("section", { class: "wrap" },
    el("h1", { style: "margin-top:32px" }, "אודות איגוד השיעורים"),
    el("p", { style: "max-width:700px;color:var(--muted);font-size:18px;line-height:1.7" },
      "פורטל אחוד לחיפוש ופרסום שיעורי תורה, בתי כנסת, גבאים, ארגונים ומגידי שיעור בכל רחבי הארץ. המערכת מאפשרת לכל ישות לקבל דף פרסום ציבורי ולוח ניהול פרטי — בקישור אחד."),
    el("h2", {}, "מבנה המערכת"),
    el("ul", {},
      el("li", {}, "כל ארגון/בית כנסת/מגיד שיעור מקבל שני קישורים ייחודיים בהרשמה"),
      el("li", {}, el("strong", {}, "/#/t/{public_token} "), " — דף פרסום ציבורי (נגיש לכולם)"),
      el("li", {}, el("strong", {}, "/#/admin/{admin_token} "), " — לוח ניהול פרטי (רק בעל הישות)"),
      el("li", {}, "כולל: פרטי הישות, שיעורים, מודעות פעילות, פניות מהציבור"),
    ),
  ));
}

// ---------- Router ----------

function route() {
  const hash = window.location.hash || "#/";
  const parts = hash.slice(2).split("/");
  const path = parts[0] || "";
  if (path === "" || path === "/") return viewDirectory();
  if (path === "join") return viewJoin();
  if (path === "about") return viewAbout();
  if (path === "t") return viewTenant(parts[1] || "");
  if (path === "te") return viewTeacher(parts[1] || "");
  if (path === "admin") return viewAdmin(parts[1] || "");
  return viewDirectory();
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);
