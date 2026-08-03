// Minimal client-side behaviors: modal open/close, hero tab toggle, demo form.
(function () {
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
      if (e.clientY < rect.top || e.clientY > rect.bottom || e.clientX < rect.left || e.clientX > rect.right) {
        d.close();
      }
    });
  });

  // Hero tabs (visual demo only)
  document.querySelectorAll(".hero-card-tabs .tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".hero-card-tabs .tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
    });
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]:not([data-modal])').forEach(function (a) {
    a.addEventListener("click", function (e) {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  const form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const status = document.createElement("p");
      status.className = "form-note";
      status.style.color = "#a36f1e";
      status.textContent = "תודה — באתר הדמו לא נשלחת בקשה. בייצור, הטופס נרשם ב-leads-api וב-CRM.";
      form.appendChild(status);
      setTimeout(() => status.remove(), 6000);
    });
  }
})();
