// Client-side behaviors: modal open/close, smooth scroll, async form submission.
(function () {
  // Modal triggers
  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-modal]");
    if (trigger) {
      event.preventDefault();
      const id = "modal-" + trigger.getAttribute("data-modal");
      const dialog = document.getElementById(id);
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
      return;
    }
    const closer = event.target.closest("[data-close]");
    if (closer) {
      const dialog = closer.closest("dialog");
      if (dialog && dialog.open) dialog.close();
    }
  });

  // Click outside dialog content => close
  document.querySelectorAll("dialog.modal").forEach(function (d) {
    d.addEventListener("click", function (e) {
      const rect = d.getBoundingClientRect();
      if (
        e.clientY < rect.top || e.clientY > rect.bottom ||
        e.clientX < rect.left || e.clientX > rect.right
      ) {
        d.close();
      }
    });
  });

  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]:not([data-modal])').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Contact form — async POST to configured endpoint; gracefully degrade.
  const form = document.querySelector(".contact-form");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const status = ensureStatus(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    status.textContent = "שולח…";
    status.style.color = "var(--ink-soft)";
    try {
      const data = Object.fromEntries(new FormData(form).entries());
      // Build the unified payload expected by NEDARIM3873 (and the main-app webhook bus).
      // Every customer inquiry from the rights-marketing site must include source/origin,
      // request type, topic, questionnaire answers, score, selected path, contact, legal
      // acceptance and status.
      const enriched = {
        source: "bkalut_marketing_rights_lead",
        origin: { site: "bkalut-marketing", page: window.location.pathname + window.location.hash, form: form.getAttribute("data-form") || "bkalut-marketing-lead", leadKind: "rights" },
        submittedAt: new Date().toISOString(),
        requestType: data.request_type || "info",
        selectedPath: data.path || data.request_type || "מידע בלבד",
        topic: data.topic || data.category || "",
        module: "rights",
        score: Number(data.score || 0),
        status: "new",
        assignedAdmin: null,
        assignedUser: null,
        contact: { fullName: data.full_name || data.name || "", phone: data.phone || "", email: data.email || "", city: data.city || "", familyStatus: data.family_status || "" },
        questionnaireAnswers: data,
        requiredDocuments: {},
        legalAccepted: data.legal_accepted ? { terms: "1.0", privacy: "1.0" } : null,
      };
      Object.assign(data, enriched);
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        mode: "cors",
      });
      if (!res.ok) throw new Error(String(res.status));
      status.textContent = "תודה — קיבלנו את הפנייה. ניצור איתך קשר בערוץ שבחרת בתוך יום עסקים.";
      status.style.color = "var(--teal)";
      form.reset();
    } catch (err) {
      status.innerHTML =
        "קליטה אוטומטית לא הצליחה כרגע. אפשר ליצור קשר מיידי: " +
        '<a href="https://wa.me/97223131500">WhatsApp 02-3131500</a> או ' +
        '<a href="tel:023131500">בטלפון</a>.';
      status.style.color = "var(--rose)";
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // ---- Active app link wiring ----
  // The marketing site is static. The active app may be hosted at a different
  // origin. We read window.BKALUT_APP_BASE if set (or ?app= query string,
  // persisted in URL), otherwise we assume same-origin /app.
  function getAppBase() {
    const urlParam = new URLSearchParams(window.location.search).get("app");
    if (urlParam) return urlParam.replace(/\/+$/, "");
    if (typeof window.BKALUT_APP_BASE === "string") return window.BKALUT_APP_BASE.replace(/\/+$/, "");
    // Default: assume the active app is hosted on the same domain at /app, with hash router.
    return "/app";
  }
  const APP_BASE = getAppBase();
  document.querySelectorAll("[data-app-target]").forEach(function (el) {
    const target = el.getAttribute("data-app-target") || "/#/";
    el.setAttribute("href", APP_BASE + target);
    el.setAttribute("rel", "noopener");
  });

  // ---- Category cards: clicking sets the form topic and scrolls to the form ----
  document.querySelectorAll("[data-category]").forEach(function (card) {
    const topic = card.getAttribute("data-category");
    if (!topic) return;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    function activate() {
      const sel = document.querySelector('select[name="topic"]');
      if (sel) {
        // Find an option that matches the category, otherwise add one.
        const match = Array.from(sel.options).find(function (o) { return o.value === topic || o.textContent.includes(topic); });
        if (match) sel.value = match.value;
        else {
          const opt = document.createElement("option");
          opt.value = topic; opt.textContent = topic; sel.appendChild(opt); sel.value = topic;
        }
      }
      const target = document.getElementById("contact");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    card.addEventListener("click", activate);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }
    });
  });

  // ---- Smart assistant search ----
  const assistForm = document.getElementById("assistant-form");
  const assistInput = document.getElementById("assistant-q");
  const assistResults = document.getElementById("assistant-results");
  const assistSuggestions = document.getElementById("assistant-suggestions");
  if (assistForm && assistInput && assistResults) {
    assistForm.addEventListener("submit", function (e) {
      e.preventDefault();
      runAssistantSearch(assistInput.value.trim());
    });
    if (assistSuggestions) {
      assistSuggestions.addEventListener("click", function (e) {
        const btn = e.target.closest("button[data-suggest]");
        if (!btn) return;
        const q = btn.getAttribute("data-suggest") || "";
        assistInput.value = q;
        runAssistantSearch(q);
      });
    }
  }

  async function runAssistantSearch(q) {
    if (!q) {
      assistResults.innerHTML = "";
      return;
    }
    assistResults.innerHTML =
      '<div class="assistant-status">העוזר החכם מחפש במאגר…</div>';
    let json = null;
    // Try same-origin first (in case the marketing is served from the app itself),
    // then try APP_BASE.
    const candidates = [
      "/api/assistant/search?q=" + encodeURIComponent(q),
      APP_BASE + "/api/assistant/search?q=" + encodeURIComponent(q),
    ];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { mode: "cors" });
        if (r.ok) {
          json = await r.json();
          break;
        }
      } catch (_) {
        // try next
      }
    }
    if (!json) {
      assistResults.innerHTML =
        '<div class="assistant-status assistant-status-err">לא הצלחנו להגיע למאגר ברגע זה. ' +
        'אפשר להמשיך ב<a href="' + APP_BASE + '/#/rights">רשימת הזכויות במערכת</a> ' +
        'או ליצור קשר מיידי בטלפון <a href="tel:023131500">02-3131500</a>.</div>';
      return;
    }
    renderAssistantResults(json, q);
  }

  function renderAssistantResults(json, q) {
    const rights = (json && json.rights) || [];
    const orgs = (json && json.orgs) || [];
    const suggestions = (json && json.suggestions) || [];
    if (!rights.length && !orgs.length) {
      assistResults.innerHTML =
        '<div class="assistant-status">לא נמצאו תוצאות ל-"' + escapeHtml(q) + '". ' +
        'נסו ניסוח אחר, או ' +
        '<a href="#contact">השאירו פרטים</a> ונחזור אליכם.</div>';
      return;
    }
    let html = "";
    if (rights.length) {
      html += '<h3 class="assistant-section-title">זכויות והטבות (' + rights.length + ')</h3>';
      html += '<ul class="assistant-list">';
      for (const r of rights) {
        const id = r.id || r.slug || "";
        const title = r.name || r.title || "זכות";
        const body = r.summary || r.description || r.category || "";
        html +=
          '<li>' +
          '<a class="assistant-link" href="' + APP_BASE + '/#/service/' + encodeURIComponent(id) + '">' +
          escapeHtml(title) +
          '</a>' +
          (body ? '<p>' + escapeHtml(body) + '</p>' : "") +
          '</li>';
      }
      html += "</ul>";
    }
    if (orgs.length) {
      html += '<h3 class="assistant-section-title">עמותות וארגוני סיוע (' + orgs.length + ')</h3>';
      html += '<ul class="assistant-list">';
      for (const o of orgs) {
        const id = o.id || o.slug || "";
        const title = o.name || "ארגון";
        const body = o.summary || o.description || "";
        html +=
          '<li>' +
          '<a class="assistant-link" href="' + APP_BASE + '/#/orgs/' + encodeURIComponent(id) + '">' +
          escapeHtml(title) +
          '</a>' +
          (body ? '<p>' + escapeHtml(body) + '</p>' : "") +
          '</li>';
      }
      html += "</ul>";
    }
    if (suggestions.length) {
      html += '<p class="assistant-followup">שאלה עוקבת לבירור:</p>';
      html += '<ul class="assistant-followups">';
      for (const s of suggestions) {
        html += '<li>' + escapeHtml(s) + '</li>';
      }
      html += "</ul>";
    }
    assistResults.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureStatus(form) {
    let s = form.querySelector(".form-status");
    if (s) return s;
    s = document.createElement("p");
    s.className = "form-status";
    s.style.fontSize = "0.875rem";
    s.style.marginTop = "0.5rem";
    s.setAttribute("role", "status");
    s.setAttribute("aria-live", "polite");
    form.appendChild(s);
    return s;
  }
})();
