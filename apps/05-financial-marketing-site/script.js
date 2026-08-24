// Public marketing site behavior: modals, smooth scroll, app links, lead form submission.
(function () {
  // ----- Configurable endpoints / app base -----
  // The main app base URL (where /#/user-login lives). Override via:
  //   1) ?app=https://app.example.com in the URL
  //   2) window.BKALUT_APP_BASE = "https://app.example.com" set before this script
  //   3) Default: "/app"
  //
  // ?app= is attacker-controlled (it comes straight from the URL a visitor
  // clicked). It gets written into [data-app-target] hrefs below and used to
  // build the lead-form POST endpoint further down. Without a scheme check,
  // a shared link like ?app=javascript:alert(document.cookie) would set
  // every wired app link's href to a javascript: URI that runs in this
  // page's origin the moment a visitor clicks it — a real reflected XSS.
  // ?app=https://attacker.example would also redirect lead-form submissions
  // (name/phone/email) to an attacker-controlled server. Only a relative
  // path or an http(s) URL is accepted; anything else falls back to the
  // same default as if ?app= had not been passed at all.
  function sanitizeAppBase(value) {
    if (!value) return null;
    const trimmed = value.replace(/\/+$/, "");
    if (trimmed.startsWith("//")) return null;
    if (trimmed.startsWith("/")) return trimmed;
    try {
      const u = new URL(trimmed, window.location.origin);
      if (u.protocol === "http:" || u.protocol === "https:") return trimmed;
    } catch (_) {}
    return null;
  }
  function getAppBase() {
    try {
      const urlParam = sanitizeAppBase(new URLSearchParams(window.location.search).get("app"));
      if (urlParam) return urlParam;
    } catch (_) {}
    if (typeof window.BKALUT_APP_BASE === "string" && window.BKALUT_APP_BASE) {
      return window.BKALUT_APP_BASE.replace(/\/+$/, "");
    }
    return "/app";
  }
  const APP_BASE = getAppBase();

  // Lead intake endpoints. Tries them in order until one succeeds.
  // Override globally via window.BKALUT_LEAD_ENDPOINTS = [ ... ] before script loads,
  // or via window.BKALUT_BACKEND_BASE = "https://api.example.com".
  function getLeadEndpoints() {
    if (Array.isArray(window.BKALUT_LEAD_ENDPOINTS) && window.BKALUT_LEAD_ENDPOINTS.length) {
      return window.BKALUT_LEAD_ENDPOINTS.slice();
    }
    const base = (typeof window.BKALUT_BACKEND_BASE === "string" && window.BKALUT_BACKEND_BASE)
      ? window.BKALUT_BACKEND_BASE.replace(/\/+$/, "")
      : "";
    const list = [];
    if (base) {
      list.push(base + "/api/inbound/leads");
      list.push(base + "/api/financial/leads");
      list.push(base + "/webhook/NEDARIM3873");
    }
    // Same-origin fallbacks (work when the marketing site is hosted under the main app).
    list.push("/api/inbound/leads");
    list.push("/api/financial/leads");
    // App-base relative (when marketing is on a different host but APP_BASE points at the app).
    if (APP_BASE && APP_BASE !== "/app") {
      list.push(APP_BASE + "/api/inbound/leads");
      list.push(APP_BASE + "/api/financial/leads");
    }
    // Last-resort: known external automation webhook.
    list.push("https://n8n.l023131500.work/webhook/NEDARIM3873");
    return list;
  }

  // ----- Modals -----
  document.addEventListener("click", function (event) {
    const trigger = event.target.closest("[data-modal]");
    if (trigger) {
      event.preventDefault();
      const id = "modal-" + trigger.getAttribute("data-modal");
      const dialog = document.getElementById(id);
      if (dialog && typeof dialog.showModal === "function") dialog.showModal();
      return;
    }
    const closer = event.target.closest("[data-close]");
    if (closer) {
      const dialog = closer.closest("dialog");
      if (dialog && dialog.open) dialog.close();
    }
  });

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

  // ----- Smooth scroll for in-page links -----
  document.querySelectorAll('a[href^="#"]:not([data-modal])').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // ----- Wire active app links (login, "כניסה למערכת") -----
  document.querySelectorAll("[data-app-target]").forEach(function (el) {
    const target = el.getAttribute("data-app-target") || "/#/user-login";
    el.setAttribute("href", APP_BASE + target);
    el.setAttribute("rel", "noopener");
  });

  // ----- Lead form submission -----
  const form = document.querySelector(".contact-form");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const status = ensureStatus(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    status.textContent = "שולח…";
    status.style.color = "var(--ink-soft)";

    const raw = Object.fromEntries(new FormData(form).entries());
    const payload = {
      // Public form fields
      full_name: (raw.full_name || "").trim(),
      phone: (raw.phone || "").trim(),
      email: (raw.email || "").trim(),
      notes: (raw.notes || "").trim(),
      // Canonical aliases the backend / webhook may prefer
      fullName: (raw.full_name || "").trim(),
      message: (raw.notes || "").trim(),
      // Metadata
      source: "financial-marketing-site",
      product: "ניהול פיננסי מבית בקלות",
      formName: form.getAttribute("data-form") || "financial-marketing-lead",
      requestType: raw.request_type || "info",
      page: window.location.pathname + window.location.hash,
      submittedAt: new Date().toISOString(),
      status: "new",
      legalAccepted: raw.legal_accepted ? { terms: "1.0", privacy: "1.0" } : null,
    };

    // Basic client-side validation (browser handles required, but keep an honest check)
    if (!payload.full_name || !payload.phone || !payload.email) {
      status.textContent = "אנא מלאו שם מלא, טלפון ודוא\"ל.";
      status.style.color = "var(--rose, #b7493e)";
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    if (!navigator.onLine) {
      status.innerHTML =
        "נראה שאין חיבור לאינטרנט כרגע. אפשר ליצור קשר ישירות: " +
        '<a href="https://wa.me/97223131500">WhatsApp</a> · ' +
        '<a href="tel:023131500">02-3131500</a>.';
      status.style.color = "var(--rose, #b7493e)";
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    const endpoints = getLeadEndpoints();
    let res = null;
    let lastErr = null;
    let succeededAt = null;
    for (const url of endpoints) {
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors",
        });
        if (res && res.ok) {
          succeededAt = url;
          break;
        }
        lastErr = new Error("HTTP " + (res ? res.status : "no-response") + " @ " + url);
      } catch (err) {
        lastErr = err;
      }
    }

    if (succeededAt) {
      status.textContent = "תודה — קיבלנו את הפרטים. נציג מצוות בקלות יחזור אליכם בהקדם.";
      status.style.color = "var(--ink-strong, var(--ink))";
      form.reset();
    } else {
      // Honest failure: tell the user, and offer direct contact channels.
      console.warn("Lead submit failed", lastErr);
      status.innerHTML =
        'לא הצלחנו לקלוט את הטופס כרגע. אפשר ליצור קשר ישירות: ' +
        '<a href="https://wa.me/97223131500">WhatsApp</a> · ' +
        '<a href="tel:023131500">02-3131500</a> · ' +
        '<a href="mailto:l023131500@gmail.com">l023131500@gmail.com</a>.';
      status.style.color = "var(--rose, #b7493e)";
    }
    if (submitBtn) submitBtn.disabled = false;
  });

  function ensureStatus(form) {
    let s = form.querySelector(".form-status");
    if (s) return s;
    s = document.createElement("p");
    s.className = "form-status";
    s.style.fontSize = "0.9rem";
    s.style.marginTop = "0.6rem";
    s.setAttribute("role", "status");
    s.setAttribute("aria-live", "polite");
    form.appendChild(s);
    return s;
  }
})();
